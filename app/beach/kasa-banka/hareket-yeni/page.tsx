import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";

type Props = {
  searchParams: Promise<{
    tip?: string;
  }>;
};

function paraBirimiAdi(paraBirimi: string) {
  switch (paraBirimi) {
    case "TRY":
      return "TL";
    case "USD":
      return "USD";
    case "EUR":
      return "EUR";
    case "GBP":
      return "GBP";
    case "RUB":
      return "RUB";
    default:
      return paraBirimi;
  }
}

function parseMoney(
  formData: FormData,
  name: string
) {
  const raw = String(
    formData.get(name) ?? ""
  )
    .trim()
    .replace(/\s/g, "");

  if (!raw) {
    return 0;
  }

  let normalized = raw;

  if (
    raw.includes(".") &&
    raw.includes(",")
  ) {
    normalized = raw
      .replace(/\./g, "")
      .replace(",", ".");
  } else if (raw.includes(",")) {
    normalized = raw.replace(",", ".");
  }

  const value = Number(normalized);

  return Number.isFinite(value)
    ? value
    : 0;
}

function parseDate(
  formData: FormData,
  name: string
) {
  const raw = String(
    formData.get(name) ?? ""
  ).trim();

  if (!raw) {
    return null;
  }

  const tarih = new Date(
    `${raw}T12:00:00`
  );

  return Number.isNaN(tarih.getTime())
    ? null
    : tarih;
}

export default async function YeniFinansHareketPage({
  searchParams,
}: Props) {
  const query = await searchParams;

  const varsayilanTip =
    query.tip === "CIKIS"
      ? "CIKIS"
      : query.tip === "GIRIS"
      ? "GIRIS"
      : "";

  /*
    Bu sayfa her açıldığında benzersiz işlem kodu oluşturulur.
    Aynı form ikinci kez gönderilirse sistem ikinci kaydı oluşturmaz.
  */
  const islemRef =
    `MANUEL:${randomUUID()}`;

  const sirket =
    await prisma.sirket.findUnique({
      where: {
        kod: "BEACH",
      },
    });

  if (!sirket) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Beach & Mağaza şirketi bulunamadı.
      </main>
    );
  }

  const [hesaplar, cariler] =
    await Promise.all([
      prisma.finansHesap.findMany({
        where: {
          sirketId: sirket.id,
          aktif: true,
        },

        orderBy: [
          {
            tip: "asc",
          },
          {
            paraBirimi: "asc",
          },
          {
            ad: "asc",
          },
        ],
      }),

      prisma.cari.findMany({
        where: {
          sirketId: sirket.id,
          aktif: true,
        },

        orderBy: {
          unvan: "asc",
        },

        select: {
          id: true,
          atlasKodu: true,
          unvan: true,
        },
      }),
    ]);

  const bugun =
    new Date()
      .toISOString()
      .slice(0, 10);

  async function finansHareketKaydet(
    formData: FormData
  ) {
    "use server";

    const sirket =
      await prisma.sirket.findUnique({
        where: {
          kod: "BEACH",
        },
      });

    if (!sirket) {
      throw new Error(
        "Beach & Mağaza bulunamadı."
      );
    }

    /*
      ÇİFT KAYIT KORUMASI
    */

    const islemRef =
      String(
        formData.get("islemRef") ?? ""
      ).trim();

    if (
      !islemRef ||
      !islemRef.startsWith("MANUEL:")
    ) {
      throw new Error(
        "İşlem güvenlik kodu bulunamadı."
      );
    }

    const finansHesapId =
      Number(
        formData.get(
          "finansHesapId"
        )
      );

    if (
      !Number.isInteger(
        finansHesapId
      ) ||
      finansHesapId <= 0
    ) {
      throw new Error(
        "Finans hesabı seçiniz."
      );
    }

    const finansHesap =
      await prisma.finansHesap.findFirst({
        where: {
          id: finansHesapId,
          sirketId: sirket.id,
          aktif: true,
        },
      });

    if (!finansHesap) {
      throw new Error(
        "Finans hesabı bulunamadı."
      );
    }

    const tip =
      String(
        formData.get("tip") ?? ""
      );

    if (
      tip !== "GIRIS" &&
      tip !== "CIKIS"
    ) {
      throw new Error(
        "İşlem tipi seçiniz."
      );
    }

    const tarih =
      parseDate(
        formData,
        "tarih"
      );

    if (!tarih) {
      throw new Error(
        "Geçerli bir tarih giriniz."
      );
    }

    const tutar =
      parseMoney(
        formData,
        "tutar"
      );

    if (tutar <= 0) {
      throw new Error(
        "Tutar sıfırdan büyük olmalıdır."
      );
    }

    const belgeNo =
      String(
        formData.get("belgeNo") ??
          ""
      ).trim() || null;

    const aciklama =
      String(
        formData.get("aciklama") ??
          ""
      ).trim();

    if (!aciklama) {
      throw new Error(
        "Açıklama zorunludur."
      );
    }

    const cariRaw =
      String(
        formData.get("cariId") ??
          ""
      ).trim();

    const cariId =
      cariRaw
        ? Number(cariRaw)
        : null;

    let cari:
      | {
          id: number;
          unvan: string;
        }
      | null = null;

    if (cariId !== null) {
      if (
        !Number.isInteger(cariId) ||
        cariId <= 0
      ) {
        throw new Error(
          "Geçersiz cari."
        );
      }

      cari =
        await prisma.cari.findFirst({
          where: {
            id: cariId,
            sirketId: sirket.id,
            aktif: true,
          },

          select: {
            id: true,
            unvan: true,
          },
        });

      if (!cari) {
        throw new Error(
          "Seçilen cari bulunamadı."
        );
      }
    }

    /*
      TEK TRANSACTION

      Aynı islemRef daha önce kullanıldıysa
      hiçbir kayıt oluşturulmaz.
    */

    await prisma.$transaction(
      async (tx) => {
        const mevcutKayit =
          await tx.finansHareket.findFirst({
            where: {
              transferRef:
                islemRef,
            },

            select: {
              id: true,
            },
          });

        if (mevcutKayit) {
          return;
        }

        /*
          FİNANS HAREKETİ
        */

        await tx.finansHareket.create({
          data: {
            finansHesapId:
              finansHesap.id,

            cariId:
              cari?.id ?? null,

            tarih,

            tip,

            tutar,

            aciklama,

            belgeNo,

            /*
              Manuel işlemin benzersiz kodu
            */
            transferRef:
              islemRef,
          },
        });

        /*
          CARİ SEÇİLDİYSE
        */

        if (cari) {
          if (tip === "GIRIS") {
            /*
              Para bize geldi.

              Banka/Kasa +
              Cari ALACAK

              Carinin bize olan borcu azalır.
            */

            await tx.cariHareket.create({
              data: {
                cariId:
                  cari.id,

                tarih,

                tip: "ALACAK",

                islemTuru:
                  finansHesap.tip ===
                  "BANKA"
                    ? "GELEN_EFT"
                    : finansHesap.tip ===
                      "KASA"
                    ? "NAKIT_TAHSILAT"
                    : "FINANS_GIRIS",

                aciklama:
                  `[Tahsilat] ${aciklama}`,

                belgeNo,

                borc: 0,

                alacak:
                  tutar,
              },
            });
          } else {
            /*
              Para bizden çıktı.

              Banka/Kasa -
              Cari BORÇ

              Bizim cariye olan borcumuz azalır.
            */

            await tx.cariHareket.create({
              data: {
                cariId:
                  cari.id,

                tarih,

                tip: "BORC",

                islemTuru:
                  finansHesap.tip ===
                  "BANKA"
                    ? "GIDEN_EFT"
                    : finansHesap.tip ===
                      "KASA"
                    ? "NAKIT_ODEME"
                    : "FINANS_CIKIS",

                aciklama:
                  `[Ödeme] ${aciklama}`,

                belgeNo,

                borc:
                  tutar,

                alacak: 0,
              },
            });
          }
        }
      }
    );

    revalidatePath(
      "/beach"
    );

    revalidatePath(
      "/beach/cariler"
    );

    if (cari) {
      revalidatePath(
        `/beach/cariler/${cari.id}`
      );
    }

    revalidatePath(
      "/beach/banka"
    );

    revalidatePath(
      "/beach/kasa"
    );

    revalidatePath(
      "/beach/kasa-banka"
    );

    if (
      finansHesap.tip === "BANKA"
    ) {
      redirect(
        "/beach/banka"
      );
    }

    if (
      finansHesap.tip === "KASA"
    ) {
      redirect(
        "/beach/kasa"
      );
    }

    redirect(
      "/beach"
    );
  }

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-10">

        {/* BAŞLIK */}

        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Beach & Mağaza
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Para Giriş / Çıkış
            </h1>

            <p className="mt-2 text-slate-400">
              Kasa, banka ve cari hareketi
            </p>
          </div>

          <a
            href="/beach"
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 hover:bg-slate-900"
          >
            ← Panele Dön
          </a>

        </div>

        <form
          action={finansHareketKaydet}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8"
        >

          {/* ÇİFT KAYIT KORUMA ANAHTARI */}

          <input
            type="hidden"
            name="islemRef"
            value={islemRef}
          />

          <div className="grid gap-6 md:grid-cols-2">

            {/* HESAP */}

            <div className="md:col-span-2">

              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Hesap *
              </label>

              <select
                name="finansHesapId"
                required
                defaultValue=""
                className={inputClass}
              >

                <option value="">
                  Hesap seçiniz
                </option>

                {hesaplar.map(
                  (hesap) => (
                    <option
                      key={hesap.id}
                      value={hesap.id}
                    >
                      {hesap.tip ===
                      "KASA"
                        ? "Kasa"
                        : hesap.tip ===
                            "BANKA"
                        ? "Banka"
                        : "Kredi Kartı"}{" "}
                      - {hesap.ad} -{" "}
                      {paraBirimiAdi(
                        hesap.paraBirimi
                      )}
                    </option>
                  )
                )}

              </select>

              <p className="mt-2 text-xs text-slate-500">
                Tutar seçilen hesabın kendi para
                biriminde kaydedilir.
              </p>

            </div>

            {/* CARİ */}

            <div className="md:col-span-2">

              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Cari
              </label>

              <select
                name="cariId"
                defaultValue=""
                className={inputClass}
              >

                <option value="">
                  Cari seçmeden manuel işlem
                </option>

                {cariler.map(
                  (cari) => (
                    <option
                      key={cari.id}
                      value={cari.id}
                    >
                      {cari.atlasKodu
                        ? `${cari.atlasKodu} - `
                        : ""}
                      {cari.unvan}
                    </option>
                  )
                )}

              </select>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Cari seçerseniz işlem aynı anda
                cari hesabına da otomatik işlenir.
                Cari seçmezseniz yalnızca kasa /
                banka hareketi oluşur.
              </p>

            </div>

            {/* İŞLEM */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-300">
                İşlem *
              </label>

              <select
                name="tip"
                required
                defaultValue={
                  varsayilanTip
                }
                className={inputClass}
              >

                <option value="">
                  İşlem seçiniz
                </option>

                <option value="GIRIS">
                  Para Girişi / Tahsilat
                </option>

                <option value="CIKIS">
                  Para Çıkışı / Ödeme
                </option>

              </select>

            </div>

            {/* TARİH */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Tarih *
              </label>

              <input
                type="date"
                name="tarih"
                required
                defaultValue={bugun}
                className={inputClass}
              />

            </div>

            {/* TUTAR */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Tutar *
              </label>

              <input
                type="text"
                name="tutar"
                required
                placeholder="Örn: 1.000,00"
                className={inputClass}
              />

            </div>

            {/* BELGE NO */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Belge No
              </label>

              <input
                type="text"
                name="belgeNo"
                placeholder="Varsa belge no"
                className={inputClass}
              />

            </div>

            {/* AÇIKLAMA */}

            <div className="md:col-span-2">

              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Açıklama *
              </label>

              <textarea
                name="aciklama"
                required
                rows={4}
                placeholder="Örn: ABC Market gelen EFT"
                className={inputClass}
              />

            </div>

          </div>

          {/* CARİ MANTIĞI */}

          <div className="mt-8 rounded-xl border border-emerald-900/50 bg-emerald-950/10 p-5">

            <p className="font-black text-emerald-400">
              Cari Bağlantısı
            </p>

            <div className="mt-3 space-y-2 text-sm leading-6 text-slate-300">

              <p>
                <span className="font-bold text-emerald-400">
                  Para Girişi:
                </span>{" "}
                kasa/banka artar. Cari seçilmişse
                tahsilat cariye de işlenir.
              </p>

              <p>
                <span className="font-bold text-red-400">
                  Para Çıkışı:
                </span>{" "}
                kasa/banka azalır. Cari seçilmişse
                ödeme cariye de işlenir.
              </p>

            </div>

          </div>

          {/* ÇİFT KAYIT KORUMASI */}

          <div className="mt-5 rounded-xl border border-violet-900/50 bg-violet-950/10 p-5">

            <p className="font-black text-violet-400">
              Çift Kayıt Koruması
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Kaydet butonuna yanlışlıkla iki kez
              basılsa bile aynı form ikinci kez
              banka, kasa veya cari hareketi
              oluşturmaz.
            </p>

          </div>

          {/* DÖVİZ */}

          <div className="mt-5 rounded-xl border border-cyan-900/50 bg-cyan-950/10 p-5">

            <p className="font-black text-cyan-400">
              Döviz Mantığı
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              Örneğin USD banka hesabını seçip
              1.000 girerseniz sistem bunu
              1.000 USD olarak kaydeder. Ana
              panel TL karşılığını TCMB kuru ile
              hesaplar.
            </p>

          </div>

          <button
            type="submit"
            className="mt-6 w-full rounded-xl bg-cyan-500 px-5 py-4 text-lg font-black text-slate-950 hover:bg-cyan-400"
          >
            Hareketi Kaydet
          </button>

        </form>

      </div>
    </main>
  );
}