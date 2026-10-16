import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

type UiTip = "SATIS" | "ALIS";
type UiTur = "URUN" | "HIZMET";
type OdemeSekli =
  | "ACIK_HESAP"
  | "NAKIT"
  | "EFT_HAVALE"
  | "KREDI_KARTI";

function parseNumber(formData: FormData, name: string) {
  const raw = String(formData.get(name) ?? "")
    .trim()
    .replace(/\s/g, "");

  if (!raw) return 0;

  let normalized = raw;

  if (raw.includes(".") && raw.includes(",")) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if (raw.includes(",")) {
    normalized = raw.replace(",", ".");
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}

function parseDate(formData: FormData, name: string) {
  const raw = String(formData.get(name) ?? "").trim();
  if (!raw) return null;

  const value = new Date(`${raw}T12:00:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}

function inputDate(value: Date | null) {
  if (!value) return "";
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function FaturaDuzenlePage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const query = await searchParams;

  const faturaId = Number(id);

  if (!Number.isInteger(faturaId) || faturaId <= 0) {
    notFound();
  }

  const sirket = await prisma.sirket.findUnique({
    where: { kod: "HAL" },
  });

  if (!sirket) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Hal Komisyon & Soğuk Hava bulunamadı.
      </main>
    );
  }

  const fatura = await prisma.fatura.findFirst({
    where: {
      id: faturaId,
      sirketId: sirket.id,
    },
    include: {
      kalemler: true,
      cari: true,
    },
  });

  if (!fatura) {
    notFound();
  }

  const ilkKalem = fatura.kalemler[0] ?? null;

  if (!ilkKalem) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Faturanın kalemi bulunamadı.
      </main>
    );
  }

  const uiTip: UiTip =
    fatura.tip === "SATIS" || fatura.tip === "VERILEN_HIZMET"
      ? "SATIS"
      : "ALIS";

  const uiTur: UiTur =
    fatura.tip === "VERILEN_HIZMET" ||
    fatura.tip === "ALINAN_HIZMET"
      ? "HIZMET"
      : "URUN";

  const [cariler, hesaplar, stoklar] = await Promise.all([
    prisma.cari.findMany({
      where: {
        sirketId: sirket.id,
        aktif: true,
      },
      orderBy: { unvan: "asc" },
      select: {
        id: true,
        unvan: true,
        atlasKodu: true,
      },
    }),

    prisma.finansHesap.findMany({
      where: {
        sirketId: sirket.id,
        aktif: true,
      },
      orderBy: { ad: "asc" },
      select: {
        id: true,
        ad: true,
        tip: true,
        paraBirimi: true,
        bankaAdi: true,
      },
    }),

    prisma.stok.findMany({
      where: {
        sirketId: sirket.id,
        aktif: true,
      },
      orderBy: { ad: "asc" },
      select: {
        id: true,
        kod: true,
        ad: true,
        birim: true,
        mevcutMiktar: true,
      },
    }),
  ]);

  async function faturaGuncelle(formData: FormData) {
    "use server";

    const sirket = await prisma.sirket.findUnique({
      where: { kod: "HAL" },
    });

    if (!sirket) {
      throw new Error("Hal Komisyon & Soğuk Hava bulunamadı.");
    }

    const mevcut = await prisma.fatura.findFirst({
      where: {
        id: faturaId,
        sirketId: sirket.id,
      },
      include: {
        kalemler: true,
        cari: true,
      },
    });

    if (!mevcut) {
      throw new Error("Fatura bulunamadı.");
    }

    const geriDon = (mesaj: string): never => {
      redirect(
        `/hal/faturalar/${faturaId}/duzenle?error=${encodeURIComponent(
          mesaj
        )}`
      );
    };

    const uiTip = String(formData.get("uiTip") ?? "") as UiTip;
    const uiTur = String(formData.get("uiTur") ?? "") as UiTur;

    if (uiTip !== "SATIS" && uiTip !== "ALIS") {
      return geriDon("Geçersiz işlem türü.");
    }

    if (uiTur !== "URUN" && uiTur !== "HIZMET") {
      return geriDon("Geçersiz ürün/hizmet seçimi.");
    }

    const cariId = Number(formData.get("cariId"));

    if (!Number.isInteger(cariId) || cariId <= 0) {
      return geriDon("Cari seçiniz.");
    }

    const cari = await prisma.cari.findFirst({
      where: {
        id: cariId,
        sirketId: sirket.id,
        aktif: true,
      },
    });

    if (!cari) {
      return geriDon("Seçilen cari bulunamadı.");
    }

    const faturaNo =
      String(formData.get("faturaNo") ?? "").trim() || null;

    const tarih = parseDate(formData, "tarih");

    if (!tarih) {
      return geriDon("Fatura tarihi zorunludur.");
    }

    const vadeTarihi = parseDate(formData, "vadeTarihi");

    const paraBirimi = String(
      formData.get("paraBirimi") ?? "TRY"
    );

    if (
      !["TRY", "USD", "EUR", "GBP", "RUB"].includes(paraBirimi)
    ) {
      return geriDon("Geçersiz para birimi.");
    }

    const odemeSekli = String(
      formData.get("odemeSekli") ?? "ACIK_HESAP"
    ) as OdemeSekli;

    if (
      ![
        "ACIK_HESAP",
        "NAKIT",
        "EFT_HAVALE",
        "KREDI_KARTI",
      ].includes(odemeSekli)
    ) {
      return geriDon("Geçersiz ödeme şekli.");
    }

    const miktar = parseNumber(formData, "miktar");
    const birimFiyat = parseNumber(formData, "birimFiyat");
    const kdvOrani = parseNumber(formData, "kdvOrani");

    if (miktar <= 0) {
      return geriDon("Miktar sıfırdan büyük olmalıdır.");
    }

    if (birimFiyat < 0) {
      return geriDon("Birim fiyat geçersiz.");
    }

    if (kdvOrani < 0 || kdvOrani > 100) {
      return geriDon("KDV oranı geçersiz.");
    }

    const araToplam = miktar * birimFiyat;
    const kdvToplam = araToplam * (kdvOrani / 100);
    const genelToplam = araToplam + kdvToplam;

    if (genelToplam <= 0) {
      return geriDon("Fatura toplamı sıfırdan büyük olmalıdır.");
    }

    let stokId: number | null = null;
    let kalemAciklama = "";
    let birim: string | null = null;

    if (uiTur === "URUN") {
      stokId = Number(formData.get("stokId"));

      if (!Number.isInteger(stokId) || stokId <= 0) {
        return geriDon("Ürün seçiniz.");
      }

      const stok = await prisma.stok.findFirst({
        where: {
          id: stokId,
          sirketId: sirket.id,
          aktif: true,
        },
      });

      if (!stok) {
        return geriDon("Ürün bulunamadı.");
      }

      kalemAciklama = stok.ad;
      birim = stok.birim;
    } else {
      kalemAciklama = String(
        formData.get("hizmetAciklama") ?? ""
      ).trim();

      if (!kalemAciklama) {
        return geriDon("Hizmet açıklaması giriniz.");
      }

      birim = "Hizmet";
    }

    let finansHesapId: number | null = null;

    if (odemeSekli !== "ACIK_HESAP") {
      finansHesapId = Number(
        formData.get("finansHesapId")
      );

      if (
        !Number.isInteger(finansHesapId) ||
        finansHesapId <= 0
      ) {
        return geriDon("Ödeme hesabı seçiniz.");
      }

      const finansHesap = await prisma.finansHesap.findFirst({
        where: {
          id: finansHesapId,
          sirketId: sirket.id,
          aktif: true,
        },
      });

      if (!finansHesap) {
        return geriDon("Finans hesabı bulunamadı.");
      }

      const beklenenTip =
        odemeSekli === "NAKIT"
          ? "KASA"
          : odemeSekli === "EFT_HAVALE"
          ? "BANKA"
          : "KREDI_KARTI";

      if (finansHesap.tip !== beklenenTip) {
        return geriDon(
          "Seçilen hesap ödeme şekliyle uyumlu değil."
        );
      }

      if (finansHesap.paraBirimi !== paraBirimi) {
        return geriDon(
          `Fatura ${paraBirimi}, seçilen hesap ${finansHesap.paraBirimi}. Aynı para birimindeki hesabı seçiniz.`
        );
      }
    }

    const aciklama =
      String(formData.get("aciklama") ?? "").trim() || null;

    const yeniFaturaTipi =
      uiTip === "SATIS" && uiTur === "URUN"
        ? "SATIS"
        : uiTip === "SATIS" && uiTur === "HIZMET"
        ? "VERILEN_HIZMET"
        : uiTip === "ALIS" && uiTur === "HIZMET"
        ? "ALINAN_HIZMET"
        : "ALIS";

    const eskiKalemler = mevcut.kalemler;

    const eskiReferans =
      mevcut.faturaNo || `Fatura #${mevcut.id}`;

    const eskiAnaIslemTuru =
      mevcut.tip === "SATIS"
        ? eskiKalemler.some((k) => k.stokId !== null)
          ? "SATIS_URUN"
          : "SATIS_HIZMET"
        : mevcut.tip === "VERILEN_HIZMET"
        ? "SATIS_HIZMET"
        : mevcut.tip === "ALINAN_HIZMET"
        ? "ALIS_HIZMET"
        : "ALIS_URUN";

    const eskiOdemeIslemTuru =
      mevcut.tip === "SATIS" ||
      mevcut.tip === "VERILEN_HIZMET"
        ? "FATURA_TAHSILAT"
        : "FATURA_ODEME";

    const eskiFinansTip =
      mevcut.tip === "SATIS" ||
      mevcut.tip === "VERILEN_HIZMET"
        ? "GIRIS"
        : "CIKIS";

    const eskiFinansAciklama =
      mevcut.tip === "SATIS" ||
      mevcut.tip === "VERILEN_HIZMET"
        ? "[Satış Tahsilatı]"
        : mevcut.tip === "ALINAN_HIZMET"
        ? "[Hizmet Ödemesi]"
        : "[Alış Ödemesi]";

    const eskiCariHareketler =
      mevcut.cariId !== null
        ? await prisma.cariHareket.findMany({
            where: {
              cariId: mevcut.cariId,
              tarih: mevcut.tarih,
              islemTuru: {
                in: [
                  eskiAnaIslemTuru,
                  eskiOdemeIslemTuru,
                ],
              },
              OR: [
                {
                  aciklama: {
                    contains: eskiReferans,
                  },
                },
                ...(mevcut.faturaNo
                  ? [{ belgeNo: mevcut.faturaNo }]
                  : []),
              ],
            },
            select: { id: true },
          })
        : [];

    const eskiFinansHareket =
      mevcut.odemeSekli !== "ACIK_HESAP" &&
      mevcut.finansHesapId
        ? await prisma.finansHareket.findFirst({
            where: {
              finansHesapId: mevcut.finansHesapId,
              cariId: mevcut.cariId,
              tarih: mevcut.tarih,
              tip: eskiFinansTip,
              tutar: mevcut.genelToplam,
              aciklama: {
                startsWith: eskiFinansAciklama,
              },
              ...(mevcut.faturaNo
                ? { belgeNo: mevcut.faturaNo }
                : { belgeNo: null }),
            },
            orderBy: { id: "desc" },
            select: { id: true },
          })
        : null;

    const eskiStokHareketIdleri: number[] = [];

    for (const kalem of eskiKalemler) {
      if (!kalem.stokId) continue;

      const h = await prisma.stokHareket.findFirst({
        where: {
          stokId: kalem.stokId,
          tarih: mevcut.tarih,
          ...(mevcut.faturaNo
            ? { belgeNo: mevcut.faturaNo }
            : { belgeNo: null }),
          ...(mevcut.tip === "SATIS"
            ? { cikis: kalem.miktar }
            : mevcut.tip === "ALIS"
            ? { giris: kalem.miktar }
            : {}),
        },
        orderBy: { id: "desc" },
        select: { id: true },
      });

      if (h) {
        eskiStokHareketIdleri.push(h.id);
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const kalem of eskiKalemler) {
        if (!kalem.stokId) continue;

        if (mevcut.tip === "SATIS") {
          await tx.stok.update({
            where: { id: kalem.stokId },
            data: {
              mevcutMiktar: {
                increment: kalem.miktar,
              },
            },
          });
        } else if (mevcut.tip === "ALIS") {
          await tx.stok.update({
            where: { id: kalem.stokId },
            data: {
              mevcutMiktar: {
                decrement: kalem.miktar,
              },
            },
          });
        }
      }

      if (eskiStokHareketIdleri.length > 0) {
        await tx.stokHareket.deleteMany({
          where: {
            id: {
              in: eskiStokHareketIdleri,
            },
          },
        });
      }

      if (eskiCariHareketler.length > 0) {
        await tx.cariHareket.deleteMany({
          where: {
            id: {
              in: eskiCariHareketler.map((h) => h.id),
            },
          },
        });
      }

      if (eskiFinansHareket) {
        await tx.finansHareket.delete({
          where: {
            id: eskiFinansHareket.id,
          },
        });
      }

      if (uiTur === "URUN" && stokId) {
        const stok = await tx.stok.findFirst({
          where: {
            id: stokId,
            sirketId: sirket.id,
            aktif: true,
          },
        });

        if (!stok) {
          throw new Error("Ürün bulunamadı.");
        }

        if (
          uiTip === "SATIS" &&
          Number(stok.mevcutMiktar) < miktar
        ) {
          throw new Error(
            `Yetersiz stok. Mevcut: ${Number(
              stok.mevcutMiktar
            ).toLocaleString("tr-TR")} ${stok.birim}`
          );
        }
      }

      await tx.fatura.update({
        where: { id: mevcut.id },
        data: {
          cariId: cari.id,
          finansHesapId,
          tip: yeniFaturaTipi,
          odemeSekli,
          paraBirimi: paraBirimi as
            | "TRY"
            | "USD"
            | "EUR"
            | "GBP"
            | "RUB",
          faturaNo,
          tarih,
          vadeTarihi,
          aciklama,
          araToplam,
          kdvToplam,
          genelToplam,
          odendi: odemeSekli !== "ACIK_HESAP",
        },
      });

      await tx.faturaKalemi.deleteMany({
        where: {
          faturaId: mevcut.id,
        },
      });

      await tx.faturaKalemi.create({
        data: {
          faturaId: mevcut.id,
          stokId:
            uiTur === "URUN"
              ? stokId
              : null,
          aciklama: kalemAciklama,
          miktar,
          birim,
          birimFiyat,
          kdvOrani,
          toplam: genelToplam,
        },
      });

      if (uiTur === "URUN" && stokId) {
        if (uiTip === "SATIS") {
          await tx.stok.update({
            where: { id: stokId },
            data: {
              mevcutMiktar: {
                decrement: miktar,
              },
            },
          });

          await tx.stokHareket.create({
            data: {
              stokId,
              tarih,
              giris: 0,
              cikis: miktar,
              belgeNo: faturaNo,
              aciklama: `Satış faturası${
                faturaNo ? ` - ${faturaNo}` : ""
              }`,
            },
          });
        } else {
          await tx.stok.update({
            where: { id: stokId },
            data: {
              mevcutMiktar: {
                increment: miktar,
              },
            },
          });

          await tx.stokHareket.create({
            data: {
              stokId,
              tarih,
              giris: miktar,
              cikis: 0,
              belgeNo: faturaNo,
              aciklama: `Alış faturası${
                faturaNo ? ` - ${faturaNo}` : ""
              }`,
            },
          });
        }
      }

      if (uiTip === "SATIS") {
        await tx.cariHareket.create({
          data: {
            cariId: cari.id,
            tarih,
            tip: "BORC",
            islemTuru:
              uiTur === "URUN"
                ? "SATIS_URUN"
                : "SATIS_HIZMET",
            aciklama: `[Satış] ${
              faturaNo || `Fatura #${mevcut.id}`
            }`,
            belgeNo: faturaNo,
            borc: genelToplam,
            alacak: 0,
          },
        });
      } else {
        await tx.cariHareket.create({
          data: {
            cariId: cari.id,
            tarih,
            tip: "ALACAK",
            islemTuru:
              uiTur === "URUN"
                ? "ALIS_URUN"
                : "ALIS_HIZMET",
            aciklama: `[${
              uiTur === "URUN"
                ? "Alış"
                : "Alınan Hizmet"
            }] ${
              faturaNo || `Fatura #${mevcut.id}`
            }`,
            belgeNo: faturaNo,
            borc: 0,
            alacak: genelToplam,
          },
        });
      }

      if (
        odemeSekli !== "ACIK_HESAP" &&
        finansHesapId
      ) {
        if (uiTip === "SATIS") {
          await tx.cariHareket.create({
            data: {
              cariId: cari.id,
              tarih,
              tip: "ALACAK",
              islemTuru: "FATURA_TAHSILAT",
              aciklama: `[Tahsilat] ${
                faturaNo || `Fatura #${mevcut.id}`
              }`,
              belgeNo: faturaNo,
              borc: 0,
              alacak: genelToplam,
            },
          });

          await tx.finansHareket.create({
            data: {
              finansHesapId,
              cariId: cari.id,
              tarih,
              tip: "GIRIS",
              tutar: genelToplam,
              aciklama: `[Satış Tahsilatı] ${cari.unvan}`,
              belgeNo: faturaNo,
            },
          });
        } else {
          await tx.cariHareket.create({
            data: {
              cariId: cari.id,
              tarih,
              tip: "BORC",
              islemTuru: "FATURA_ODEME",
              aciklama: `[Ödeme] ${
                faturaNo || `Fatura #${mevcut.id}`
              }`,
              belgeNo: faturaNo,
              borc: genelToplam,
              alacak: 0,
            },
          });

          await tx.finansHareket.create({
            data: {
              finansHesapId,
              cariId: cari.id,
              tarih,
              tip: "CIKIS",
              tutar: genelToplam,
              aciklama: `[${
                uiTur === "URUN"
                  ? "Alış Ödemesi"
                  : "Hizmet Ödemesi"
              }] ${cari.unvan}`,
              belgeNo: faturaNo,
            },
          });
        }
      }
    });

    revalidatePath("/hal");
    revalidatePath("/hal/faturalar");
    revalidatePath("/hal/cariler");
    revalidatePath(`/hal/cariler/${cari.id}`);
    revalidatePath("/hal/kasa");
    revalidatePath("/hal/banka");
    revalidatePath("/hal/stok");
    revalidatePath("/hal/yonetim/stok");

    redirect("/hal/faturalar");
  }

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500";

  const labelClass =
    "mb-2 block text-sm font-bold text-slate-300";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-400">
              Hal Komisyon & Soğuk Hava
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Fatura Düzenle
            </h1>

            <p className="mt-2 text-slate-400">
              Fatura #{fatura.id} — mevcut kayıt güncellenecek.
            </p>
          </div>

          <a
            href="/hal/faturalar"
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 transition hover:bg-slate-900"
          >
            ← Faturalara Dön
          </a>
        </div>

        {query.error && (
          <div className="mb-6 rounded-xl border border-red-800 bg-red-950/30 p-4 font-semibold text-red-300">
            {query.error}
          </div>
        )}

        <form
          action={faturaGuncelle}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8"
        >
          <input
            type="hidden"
            name="uiTip"
            value={uiTip}
          />

          <input
            type="hidden"
            name="uiTur"
            value={uiTur}
          />

          <div className="mb-6 grid grid-cols-2 gap-3">
            <div
              className={`rounded-xl border p-4 text-center font-black ${
                uiTip === "SATIS"
                  ? "border-emerald-500 bg-emerald-950/20 text-emerald-400"
                  : "border-slate-800 text-slate-500"
              }`}
            >
              Satış
            </div>

            <div
              className={`rounded-xl border p-4 text-center font-black ${
                uiTip === "ALIS"
                  ? "border-orange-500 bg-orange-950/20 text-orange-400"
                  : "border-slate-800 text-slate-500"
              }`}
            >
              Alış
            </div>
          </div>

          <div className="mb-7 grid grid-cols-2 gap-3">
            <div
              className={`rounded-xl border p-4 text-center font-black ${
                uiTur === "URUN"
                  ? "border-cyan-500 bg-cyan-950/20 text-cyan-400"
                  : "border-slate-800 text-slate-500"
              }`}
            >
              📦 Ürün
            </div>

            <div
              className={`rounded-xl border p-4 text-center font-black ${
                uiTur === "HIZMET"
                  ? "border-violet-500 bg-violet-950/20 text-violet-400"
                  : "border-slate-800 text-slate-500"
              }`}
            >
              🧾 Hizmet
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={labelClass}>
                Cari *
              </label>

              <select
                name="cariId"
                required
                defaultValue={
                  fatura.cariId !== null
                    ? String(fatura.cariId)
                    : ""
                }
                className={inputClass}
              >
                <option value="">
                  Cari seçiniz
                </option>

                {cariler.map((cari) => (
                  <option
                    key={cari.id}
                    value={cari.id}
                  >
                    {cari.atlasKodu
                      ? `${cari.atlasKodu} - `
                      : ""}
                    {cari.unvan}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Fatura No
              </label>

              <input
                name="faturaNo"
                defaultValue={fatura.faturaNo ?? ""}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Tarih *
              </label>

              <input
                type="date"
                name="tarih"
                required
                defaultValue={inputDate(fatura.tarih)}
                className={inputClass}
              />
            </div>

            {uiTur === "URUN" && (
              <div className="md:col-span-2">
                <label className={labelClass}>
                  Ürün *
                </label>

                <select
                  name="stokId"
                  required
                  defaultValue={
                    ilkKalem.stokId !== null
                      ? String(ilkKalem.stokId)
                      : ""
                  }
                  className={inputClass}
                >
                  <option value="">
                    Ürün seçiniz
                  </option>

                  {stoklar.map((stok) => (
                    <option
                      key={stok.id}
                      value={stok.id}
                    >
                      {stok.kod} - {stok.ad} | Stok:{" "}
                      {Number(
                        stok.mevcutMiktar
                      ).toLocaleString("tr-TR")}{" "}
                      {stok.birim}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {uiTur === "HIZMET" && (
              <div className="md:col-span-2">
                <label className={labelClass}>
                  Hizmet Açıklaması *
                </label>

                <input
                  name="hizmetAciklama"
                  required
                  defaultValue={ilkKalem.aciklama}
                  className={inputClass}
                />
              </div>
            )}

            <div>
              <label className={labelClass}>
                Miktar *
              </label>

              <input
                name="miktar"
                required
                inputMode="decimal"
                defaultValue={String(
                  Number(ilkKalem.miktar)
                )}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Birim Fiyat *
              </label>

              <input
                name="birimFiyat"
                required
                inputMode="decimal"
                defaultValue={String(
                  Number(ilkKalem.birimFiyat)
                )}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                KDV %
              </label>

              <input
                name="kdvOrani"
                inputMode="decimal"
                defaultValue={String(
                  Number(ilkKalem.kdvOrani)
                )}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Para Birimi
              </label>

              <select
                name="paraBirimi"
                defaultValue={fatura.paraBirimi}
                className={inputClass}
              >
                <option value="TRY">
                  TRY - Türk Lirası
                </option>
                <option value="USD">
                  USD - Dolar
                </option>
                <option value="EUR">
                  EUR - Euro
                </option>
                <option value="GBP">
                  GBP - Sterlin
                </option>
                <option value="RUB">
                  RUB - Ruble
                </option>
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Ödeme Şekli
              </label>

              <select
                name="odemeSekli"
                defaultValue={fatura.odemeSekli}
                className={inputClass}
              >
                <option value="ACIK_HESAP">
                  Açık Hesap
                </option>
                <option value="NAKIT">
                  Nakit
                </option>
                <option value="EFT_HAVALE">
                  EFT / Havale
                </option>
                <option value="KREDI_KARTI">
                  Kredi Kartı
                </option>
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Kasa / Banka / Kart
              </label>

              <select
                name="finansHesapId"
                defaultValue={
                  fatura.finansHesapId !== null
                    ? String(fatura.finansHesapId)
                    : ""
                }
                className={inputClass}
              >
                <option value="">
                  Açık hesapsa boş bırakın
                </option>

                {hesaplar.map((hesap) => (
                  <option
                    key={hesap.id}
                    value={hesap.id}
                  >
                    {hesap.ad}
                    {hesap.bankaAdi
                      ? ` - ${hesap.bankaAdi}`
                      : ""}
                    {" | "}
                    {hesap.tip}
                    {" | "}
                    {hesap.paraBirimi}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Vade Tarihi
              </label>

              <input
                type="date"
                name="vadeTarihi"
                defaultValue={inputDate(
                  fatura.vadeTarihi
                )}
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>
                Açıklama
              </label>

              <textarea
                name="aciklama"
                rows={3}
                defaultValue={fatura.aciklama ?? ""}
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-7 rounded-xl border border-amber-900/50 bg-amber-950/10 p-5">
            <p className="font-black text-amber-400">
              Düzenleme mantığı
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              Kaydettiğinizde eski faturanın stok,
              cari ve varsa kasa/banka etkisi geri
              alınır; ardından faturanın yeni hali
              yeniden işlenir.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-amber-500 px-6 py-4 text-lg font-black text-slate-950 transition hover:bg-amber-400"
            >
              Değişiklikleri Kaydet
            </button>

            <a
              href="/hal/faturalar"
              className="rounded-xl border border-slate-700 px-6 py-4 text-center font-bold text-slate-300 transition hover:bg-slate-800"
            >
              Vazgeç
            </a>
          </div>
        </form>
      </div>
    </main>
  );
}
