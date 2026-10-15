import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function date(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function giderTipiAdi(tip: string) {
  switch (tip) {
    case "ELEKTRIK":
      return "Elektrik";

    case "SU":
      return "Su";

    case "PERSONEL":
      return "Personel";

    case "NAKLIYE":
      return "Nakliye";

    case "KIRA":
      return "Kira";

    case "YAKIT":
      return "Yakıt";

    case "BAKIM_ONARIM":
      return "Bakım / Onarım";

    case "MUHASEBE":
      return "Muhasebe";

    case "KOMISYON":
      return "Komisyon";

    case "VERGI_HARC":
      return "Vergi / Harç";

    case "TELEFON_INTERNET":
      return "Telefon / İnternet";

    case "NOTER":
      return "Noter";

    case "ODA_AIDAT":
      return "Oda Aidatı";

    case "DIGER_ARAC_GIDERLERI":
      return "Diğer Araç Giderleri";

    case "MARKET":
      return "Market";

    case "ORTULU_ODENEK":
      return "Örtülü Ödenek";

    case "DIGER":
      return "Diğer";

    default:
      return tip;
  }
}

function odemeSekliAdi(
  odemeSekli: string
) {
  switch (odemeSekli) {
    case "NAKIT":
      return "Nakit";

    case "EFT_HAVALE":
      return "EFT / Havale";

    case "KREDI_KARTI":
      return "Kredi Kartı";

    case "ACIK_HESAP":
      return "Açık Hesap";

    default:
      return odemeSekli;
  }
}

function finansTipiAdi(
  tip: string
) {
  switch (tip) {
    case "KASA":
      return "Kasa";

    case "BANKA":
      return "Banka";

    case "KREDI_KARTI":
      return "Kredi Kartı";

    default:
      return tip;
  }
}

export default async function GiderlerPage() {
  /*
    ==================================================
    GİDER SİL
    ==================================================
  */

  async function giderSil(
    formData: FormData
  ) {
    "use server";

    const giderId = Number(
      formData.get("giderId")
    );

    if (
      !Number.isInteger(giderId) ||
      giderId <= 0
    ) {
      throw new Error(
        "Geçersiz gider kaydı."
      );
    }

    const sirket =
      await prisma.sirket.findUnique({
        where: {
          kod: "HAL",
        },
      });

    if (!sirket) {
      throw new Error(
        "HAL şirketi bulunamadı."
      );
    }

    const gider =
      await prisma.gider.findFirst({
        where: {
          id: giderId,
          sirketId: sirket.id,
        },

        include: {
          cari: true,
          finansHesap: true,
        },
      });

    if (!gider) {
      throw new Error(
        "Gider kaydı bulunamadı."
      );
    }

    const tipAdi =
      giderTipiAdi(
        String(gider.tip)
      );

    const odemeAdi =
      odemeSekliAdi(
        String(gider.odemeSekli)
      );

    const belgeNo =
      gider.belgeNo ||
      gider.faturaNo ||
      null;

    /*
      Gider oluşturulurken kullanılan
      açıklamaları birebir yeniden kuruyoruz.
    */

    const giderCariAciklama =
      `[Gider - ${tipAdi} - ${odemeAdi}] ${gider.aciklama}`;

    const giderOdemeCariAciklama =
      `[Gider Ödemesi - ${odemeAdi}] ${tipAdi} - ${gider.aciklama}`;

    await prisma.$transaction(
      async (tx) => {
        /*
          ==============================================
          1. FİNANS HAREKETİNİ SİL
          ==============================================

          actions.ts içinde:

          transferRef: GIDER-{gider.id}

          oluşturulduğu için en güvenli eşleşme budur.
        */

        await tx.finansHareket.deleteMany({
          where: {
            transferRef:
              `GIDER-${gider.id}`,
          },
        });

        /*
          ==============================================
          2. CARİ HAREKETLERİNİ SİL
          ==============================================
        */

        if (gider.cariId) {
          /*
            Gider kaydı:

            Cari ALACAK
            islemTuru = GIDER
          */

          await tx.cariHareket.deleteMany({
            where: {
              cariId:
                gider.cariId,

              tarih:
                gider.tarih,

              tip:
                "ALACAK",

              islemTuru:
                "GIDER",

              aciklama:
                giderCariAciklama,

              alacak:
                gider.tutar,

              ...(belgeNo
                ? {
                    belgeNo,
                  }
                : {
                    belgeNo:
                      null,
                  }),
            },
          });

          /*
            Açık hesap değilse ve ödeme
            yapılmışsa ikinci cari hareketi:

            Cari BORÇ
            islemTuru = GIDER_ODEME
          */

          if (
            gider.odemeSekli !==
            "ACIK_HESAP"
          ) {
            await tx.cariHareket.deleteMany({
              where: {
                cariId:
                  gider.cariId,

                tarih:
                  gider.tarih,

                tip:
                  "BORC",

                islemTuru:
                  "GIDER_ODEME",

                aciklama:
                  giderOdemeCariAciklama,

                borc:
                  gider.tutar,

                ...(belgeNo
                  ? {
                      belgeNo,
                    }
                  : {
                      belgeNo:
                        null,
                    }),
              },
            });
          }
        }

        /*
          ==============================================
          3. GİDER KAYDINI SİL
          ==============================================
        */

        await tx.gider.delete({
          where: {
            id: gider.id,
          },
        });
      }
    );

    /*
      ==============================================
      SAYFALARI YENİLE
      ==============================================
    */

    revalidatePath(
      "/hal"
    );

    revalidatePath(
      "/hal/giderler"
    );

    revalidatePath(
      "/hal/giderler/yeni"
    );

    revalidatePath(
      "/hal/kasa"
    );

    revalidatePath(
      "/hal/banka"
    );

    revalidatePath(
      "/hal/kasa-banka"
    );

    revalidatePath(
      "/hal/cariler"
    );

    if (gider.cariId) {
      revalidatePath(
        `/hal/cariler/${gider.cariId}`
      );
    }
  }

  /*
    ==================================================
    ŞİRKET
    ==================================================
  */

  const sirket =
    await prisma.sirket.findUnique({
      where: {
        kod: "HAL",
      },
    });

  if (!sirket) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        HAL şirketi bulunamadı.
      </main>
    );
  }

  /*
    ==================================================
    GİDERLER
    ==================================================
  */

  const giderler =
    await prisma.gider.findMany({
      where: {
        sirketId:
          sirket.id,
      },

      include: {
        cari: true,
        finansHesap: true,
      },

      orderBy: [
        {
          tarih: "desc",
        },
        {
          id: "desc",
        },
      ],
    });

  /*
    ==================================================
    TOPLAMLAR
    ==================================================
  */

  const toplamGider =
    giderler.reduce(
      (toplam, gider) =>
        toplam +
        Number(
          gider.tutar
        ),
      0
    );

  const kategoriToplamlari =
    giderler.reduce<
      Record<string, number>
    >(
      (acc, gider) => {
        acc[gider.tip] =
          (
            acc[
              gider.tip
            ] || 0
          ) +
          Number(
            gider.tutar
          );

        return acc;
      },
      {}
    );

  const kategoriSirali =
    Object.entries(
      kategoriToplamlari
    ).sort(
      (a, b) =>
        b[1] - a[1]
    );

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <div className="mx-auto max-w-[1500px] px-4 py-8 md:px-6">

        {/* BAŞLIK */}

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Hal Komisyon & Soğuk Hava
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Giderler
            </h1>

            <p className="mt-2 text-slate-400">
              Şirket giderlerini,
              cari ve kasa/banka
              bağlantılarıyla takip edin.
            </p>

          </div>

          <div className="flex flex-wrap gap-3">

            <a
              href="/hal"
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 hover:bg-slate-900"
            >
              ← Ana Panel
            </a>

            <a
              href="/hal/giderler/yeni"
              className="rounded-xl bg-cyan-500 px-5 py-3 font-black text-slate-950 hover:bg-cyan-400"
            >
              + Yeni Gider
            </a>

          </div>

        </div>

        {/* ÖZET */}

        <div className="grid gap-5 md:grid-cols-3">

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <p className="text-sm text-slate-400">
              Toplam Gider
            </p>

            <p className="mt-3 text-3xl font-black text-red-400">
              {money(
                toplamGider
              )}
            </p>

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <p className="text-sm text-slate-400">
              Gider Kaydı
            </p>

            <p className="mt-3 text-3xl font-black">
              {giderler.length}
            </p>

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <p className="text-sm text-slate-400">
              Gider Kategorisi
            </p>

            <p className="mt-3 text-3xl font-black text-cyan-400">
              {
                kategoriSirali.length
              }
            </p>

          </div>

        </div>

        {/* KATEGORİLER */}

        {kategoriSirali.length >
          0 && (
          <div className="mt-8">

            <h2 className="mb-4 text-xl font-black">
              Kategori Toplamları
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              {kategoriSirali.map(
                ([tip, toplam]) => (
                  <div
                    key={tip}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                  >

                    <p className="text-sm font-semibold text-slate-400">
                      {giderTipiAdi(
                        tip
                      )}
                    </p>

                    <p className="mt-2 text-xl font-black text-red-400">
                      {money(
                        toplam
                      )}
                    </p>

                  </div>
                )
              )}

            </div>

          </div>
        )}

        {/* GİDER HAREKETLERİ */}

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

          <div className="border-b border-slate-800 px-6 py-5">

            <h2 className="text-xl font-black">
              Gider Hareketleri
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Silinen giderin bağlı
              finans ve cari hareketleri
              de kaldırılır.
            </p>

          </div>

          {giderler.length ===
          0 ? (
            <div className="px-6 py-12 text-center">

              <p className="text-slate-400">
                Henüz gider kaydı
                bulunmuyor.
              </p>

              <a
                href="/hal/giderler/yeni"
                className="mt-5 inline-block rounded-xl bg-cyan-500 px-5 py-3 font-black text-slate-950"
              >
                İlk Gideri Ekle
              </a>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[1200px]">

                <thead className="bg-slate-950/60">

                  <tr className="text-left text-sm text-slate-400">

                    <th className="px-4 py-4">
                      Tarih
                    </th>

                    <th className="px-4 py-4">
                      Gider Tipi
                    </th>

                    <th className="px-4 py-4">
                      Açıklama
                    </th>

                    <th className="px-4 py-4">
                      Ödeme
                    </th>

                    <th className="px-4 py-4">
                      Cari
                    </th>

                    <th className="px-4 py-4">
                      Kasa / Banka
                    </th>

                    <th className="px-4 py-4">
                      Belge
                    </th>

                    <th className="px-4 py-4 text-right">
                      Tutar
                    </th>

                    <th className="px-4 py-4 text-right">
                      İşlem
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {giderler.map(
                    (gider) => (
                      <tr
                        key={
                          gider.id
                        }
                        className="border-t border-slate-800 transition hover:bg-slate-800/30"
                      >

                        {/* TARİH */}

                        <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-300">
                          {date(
                            gider.tarih
                          )}
                        </td>

                        {/* GİDER TİPİ */}

                        <td className="px-4 py-4">

                          <span className="rounded-full border border-cyan-900/60 bg-cyan-950/20 px-3 py-1 text-xs font-bold text-cyan-400">
                            {giderTipiAdi(
                              gider.tip
                            )}
                          </span>

                        </td>

                        {/* AÇIKLAMA */}

                        <td className="max-w-[260px] px-4 py-4">

                          <p className="font-semibold">
                            {
                              gider.aciklama
                            }
                          </p>

                          {gider.faturaNo && (
                            <p className="mt-1 text-xs text-slate-500">
                              Fatura:{" "}
                              {
                                gider.faturaNo
                              }
                            </p>
                          )}

                        </td>

                        {/* ÖDEME */}

                        <td className="whitespace-nowrap px-4 py-4 text-sm">

                          <span className="rounded-lg bg-slate-800 px-2.5 py-1.5 font-semibold text-slate-300">
                            {odemeSekliAdi(
                              String(
                                gider.odemeSekli
                              )
                            )}
                          </span>

                        </td>

                        {/* CARİ */}

                        <td className="px-4 py-4 text-sm">

                          {gider.cari ? (
                            <a
                              href={`/hal/cariler/${gider.cari.id}`}
                              className="font-semibold text-cyan-400 hover:text-cyan-300"
                            >
                              {
                                gider.cari
                                  .unvan
                              }
                            </a>
                          ) : (
                            <span className="text-slate-500">
                              -
                            </span>
                          )}

                        </td>

                        {/* FİNANS */}

                        <td className="px-4 py-4 text-sm text-slate-300">

                          {gider.finansHesap
                            ? `${finansTipiAdi(
                                String(
                                  gider
                                    .finansHesap
                                    .tip
                                )
                              )} - ${
                                gider
                                  .finansHesap
                                  .ad
                              }`
                            : gider.odemeSekli ===
                              "ACIK_HESAP"
                            ? "Açık Hesap"
                            : "-"}

                        </td>

                        {/* BELGE */}

                        <td className="px-4 py-4 text-sm text-slate-400">

                          {gider.belgeNo ||
                            gider.faturaNo ||
                            "-"}

                        </td>

                        {/* TUTAR */}

                        <td className="whitespace-nowrap px-4 py-4 text-right text-lg font-black text-red-400">

                          {money(
                            Number(
                              gider.tutar
                            )
                          )}

                        </td>

                        {/* İŞLEM */}

                        <td className="px-4 py-4">

                          <div className="flex justify-end gap-2">

                            <a
                              href={`/hal/giderler/${gider.id}`}
                              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800"
                            >
                              Detay
                            </a>

                            <form
                              action={
                                giderSil
                              }
                            >

                              <input
                                type="hidden"
                                name="giderId"
                                value={
                                  gider.id
                                }
                              />

                              <button
                                type="submit"
                                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-black text-white hover:bg-red-500"
                              >
                                Sil
                              </button>

                            </form>

                          </div>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

        {/* BİLGİ */}

        <div className="mt-6 rounded-xl border border-amber-900/40 bg-amber-950/10 p-5">

          <p className="font-black text-amber-400">
            Silme İşlemi
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Bir gider silindiğinde gider
            kaydıyla birlikte oluşturulan
            kasa, banka veya kredi kartı
            hareketi kaldırılır. Cari
            seçilmişse gider ve ödeme
            cari hareketleri de kaldırılır.
          </p>

        </div>

      </div>

    </main>
  );
}