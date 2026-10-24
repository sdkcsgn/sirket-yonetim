import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function number(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);
}

function dateTime(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function faturaKaynakliMi(
  aciklama: string | null
) {
  const metin =
    (aciklama || "")
      .trim()
      .toLocaleLowerCase("tr-TR");

  return (
    metin.startsWith(
      "satış faturası"
    ) ||
    metin.startsWith(
      "alış faturası"
    )
  );
}

export default async function StokDetayPage({
  params,
}: Props) {
  const { id } = await params;

  const stokId =
    Number(id);

  if (
    !Number.isInteger(stokId) ||
    stokId <= 0
  ) {
    notFound();
  }

  const sirket =
    await prisma.sirket.findUnique({
      where: {
        kod: "HAL",
      },
    });

  if (!sirket) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Hal Komisyon & Soğuk Hava şirketi bulunamadı.
      </main>
    );
  }

  /*
    ==================================================
    STOK HAREKETİ SİL
    ==================================================

    Manuel giriş silinirse:
    stoktan düş.

    Manuel çıkış silinirse:
    stoğa geri ekle.

    Fatura kaynaklı hareketler
    buradan silinmez.
  */

  async function hareketSil(
    formData: FormData
  ) {
    "use server";

    const hareketId =
      Number(
        formData.get(
          "hareketId"
        )
      );

    if (
      !Number.isInteger(
        hareketId
      ) ||
      hareketId <= 0
    ) {
      throw new Error(
        "Geçersiz stok hareketi."
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
        "Hal Komisyon & Soğuk Hava bulunamadı."
      );
    }

    const hareket =
      await prisma.stokHareket.findUnique({
        where: {
          id: hareketId,
        },

        include: {
          stok: true,
        },
      });

    if (
      !hareket ||
      hareket.stokId !==
        stokId ||
      hareket.stok.sirketId !==
        sirket.id
    ) {
      throw new Error(
        "Stok hareketi bulunamadı."
      );
    }

    /*
      Fatura kaynaklı hareketleri
      stok ekranından sildirmiyoruz.
    */

    if (
      faturaKaynakliMi(
        hareket.aciklama
      )
    ) {
      throw new Error(
        "Bu hareket faturadan oluşmuştur. İlgili faturayı Faturalar ekranından siliniz."
      );
    }

    const giris =
      Number(
        hareket.giris
      );

    const cikis =
      Number(
        hareket.cikis
      );

    if (
      giris <= 0 &&
      cikis <= 0
    ) {
      throw new Error(
        "Hareket miktarı geçersiz."
      );
    }

    await prisma.$transaction(
      async (tx) => {
        /*
          GİRİŞ SİLİNİYORSA

          Daha önce stok:
          +10 olmuştu.

          Şimdi:
          -10 yap.
        */

        if (giris > 0) {
          await tx.stok.update({
            where: {
              id:
                hareket.stokId,
            },

            data: {
              mevcutMiktar: {
                decrement:
                  hareket.giris,
              },
            },
          });
        }

        /*
          ÇIKIŞ SİLİNİYORSA

          Daha önce stok:
          -10 olmuştu.

          Şimdi:
          +10 yap.
        */

        if (cikis > 0) {
          await tx.stok.update({
            where: {
              id:
                hareket.stokId,
            },

            data: {
              mevcutMiktar: {
                increment:
                  hareket.cikis,
              },
            },
          });
        }

        /*
          HAREKETİ SİL
        */

       /*
  CARİ BORCUNU GERİ AL

  Yalnızca silinen stok girişine ait
  STOK_ALIS cari hareketini sil.
*/
if (
  giris > 0 &&
  hareket.cariId &&
  Number(hareket.toplamTutar) > 0
) {
  const cariHareket = await tx.cariHareket.findFirst({
    where: {
      cariId: hareket.cariId,
      tip: "BORC",
      islemTuru: "STOK_ALIS",
      aciklama: `Stok alış girişi: ${hareket.stok.ad} - ${hareket.aciklama || ""}`,
      belgeNo: hareket.belgeNo,
      borc: Number(hareket.toplamTutar),
      alacak: 0,
    },
    orderBy: {
      id: "desc",
    },
  });

  if (cariHareket) {
    await tx.cariHareket.delete({
      where: {
        id: cariHareket.id,
      },
    });
  }
}

/*
  STOK HAREKETİNİ SİL
*/
await tx.stokHareket.delete({
  where: {
    id: hareket.id,
  },
});
      }
    );

    revalidatePath(
      "/hal"
    );

    revalidatePath(
      "/hal/stok"
    );

    revalidatePath(
      `/hal/stok/${stokId}`
    );

    revalidatePath(
      "/hal/yonetim/stok"
    );
  }

  /*
    ==================================================
    STOK
    ==================================================
  */

  const stok =
    await prisma.stok.findFirst({
      where: {
        id: stokId,
        sirketId:
          sirket.id,
      },
    });

  if (!stok) {
    notFound();
  }

  /*
    ==================================================
    HAREKETLER
    ==================================================
  */

  const hareketler =
    await prisma.stokHareket.findMany({
      where: {
        stokId:
          stok.id,
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
    HAREKET TOPLAMLARI
    ==================================================
  */

  const toplamGiris =
    hareketler.reduce(
      (toplam, hareket) =>
        toplam +
        Number(
          hareket.giris
        ),
      0
    );

  const toplamCikis =
    hareketler.reduce(
      (toplam, hareket) =>
        toplam +
        Number(
          hareket.cikis
        ),
      0
    );

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <div className="mx-auto w-full max-w-[1450px] px-4 py-8 md:px-6">

        {/* BAŞLIK */}

        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

          <div>

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Hal Komisyon & Soğuk Hava
            </p>

            <h1 className="mt-2 text-3xl font-black md:text-4xl">
              {stok.ad}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2">

              <span className="rounded-full bg-slate-800 px-3 py-1 text-sm font-bold text-slate-300">
                Kod: {stok.kod}
              </span>

              <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-sm font-bold text-cyan-400">
                {stok.birim}
              </span>

              {stok.aktif ? (
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-bold text-emerald-400">
                  Aktif
                </span>
              ) : (
                <span className="rounded-full bg-red-500/10 px-3 py-1 text-sm font-bold text-red-400">
                  Pasif
                </span>
              )}

            </div>

          </div>

          <div className="flex flex-wrap gap-2">

            <a
              href="/hal/stok"
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-slate-900"
            >
              ← Stok Listesi
            </a>

          <a
  href={`/hal/stok/${stok.id}`}
  className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-slate-900"
>
  ← Stok Detayı
</a>

            <a
              href={`/hal/stok/${stok.id}/hareket?tip=CIKIS`}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white hover:bg-red-500"
            >
              − Stok Çıkışı
            </a>

          </div>

        </div>

        {/* ÖZET */}

        <div className="grid gap-4 md:grid-cols-3">

          {/* MEVCUT */}

          <div className="rounded-2xl border border-cyan-900/50 bg-cyan-950/10 p-6">

            <p className="text-sm text-slate-400">
              Mevcut Stok
            </p>

            <p
              className={`mt-3 text-4xl font-black ${
                Number(
                  stok.mevcutMiktar
                ) >= 0
                  ? "text-cyan-400"
                  : "text-red-400"
              }`}
            >
              {number(
                Number(
                  stok.mevcutMiktar
                )
              )}
            </p>

            <p className="mt-2 text-sm font-bold text-slate-400">
              {stok.birim}
            </p>

          </div>

          {/* GİRİŞ */}

          <div className="rounded-2xl border border-emerald-900/50 bg-emerald-950/10 p-6">

            <p className="text-sm text-slate-400">
              Toplam Giriş
            </p>

            <p className="mt-3 text-4xl font-black text-emerald-400">
              +{number(
                toplamGiris
              )}
            </p>

            <p className="mt-2 text-sm font-bold text-slate-400">
              {stok.birim}
            </p>

          </div>

          {/* ÇIKIŞ */}

          <div className="rounded-2xl border border-red-900/50 bg-red-950/10 p-6">

            <p className="text-sm text-slate-400">
              Toplam Çıkış
            </p>

            <p className="mt-3 text-4xl font-black text-red-400">
              -{number(
                toplamCikis
              )}
            </p>

            <p className="mt-2 text-sm font-bold text-slate-400">
              {stok.birim}
            </p>

          </div>

        </div>

        {/* HAREKETLER */}

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

          <div className="border-b border-slate-800 p-5">

            <h2 className="text-xl font-black">
              Stok Hareketleri
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Tüm giriş ve çıkış hareketleri
            </p>

          </div>

          {hareketler.length ===
          0 ? (
            <div className="p-12 text-center">

              <div className="text-4xl">
                📦
              </div>

              <p className="mt-4 font-bold text-slate-300">
                Henüz stok hareketi yok.
              </p>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[980px] text-sm">

                <thead className="bg-slate-950/60">

                  <tr className="text-left text-xs text-slate-400">

                    <th className="px-4 py-4">
                      Tarih
                    </th>

                    <th className="px-4 py-4">
                      İşlem
                    </th>

                    <th className="px-4 py-4">
                      Açıklama
                    </th>

                    <th className="px-4 py-4">
                      Belge No
                    </th>

                    <th className="px-4 py-4 text-right">
                      Giriş
                    </th>

                    <th className="px-4 py-4 text-right">
                      Çıkış
                    </th>

                    <th className="px-4 py-4 text-right">
                      İşlem
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {hareketler.map(
                    (hareket) => {
                      const giris =
                        Number(
                          hareket.giris
                        );

                      const cikis =
                        Number(
                          hareket.cikis
                        );

                      const hareketGiris =
                        giris > 0;

                      const faturaKaynakli =
                        faturaKaynakliMi(
                          hareket.aciklama
                        );

                      return (
                        <tr
                          key={
                            hareket.id
                          }
                          className="border-t border-slate-800 transition hover:bg-slate-800/30"
                        >

                          {/* TARİH */}

                          <td className="whitespace-nowrap px-4 py-4 text-slate-300">
                            {dateTime(
                              hareket.tarih
                            )}
                          </td>

                          {/* İŞLEM */}

                          <td className="px-4 py-4">

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                hareketGiris
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-red-500/10 text-red-400"
                              }`}
                            >
                              {hareketGiris
                                ? "Giriş"
                                : "Çıkış"}
                            </span>

                          </td>

                          {/* AÇIKLAMA */}

                          <td className="px-4 py-4 font-semibold text-slate-300">
                            {hareket.aciklama ||
                              "-"}
                          </td>

                          {/* BELGE */}

                          <td className="px-4 py-4 text-slate-400">
                            {hareket.belgeNo ||
                              "-"}
                          </td>

                          {/* GİRİŞ */}

                          <td className="whitespace-nowrap px-4 py-4 text-right font-black text-emerald-400">

                            {giris > 0
                              ? `+${number(
                                  giris
                                )} ${
                                  stok.birim
                                }`
                              : "-"}

                          </td>

                          {/* ÇIKIŞ */}

                          <td className="whitespace-nowrap px-4 py-4 text-right font-black text-red-400">

                            {cikis > 0
                              ? `-${number(
                                  cikis
                                )} ${
                                  stok.birim
                                }`
                              : "-"}

                          </td>

                          {/* İŞLEM */}

                          <td className="px-4 py-4 text-right">

                            {faturaKaynakli ? (
                              <div className="flex flex-col items-end gap-1">

                                <span className="whitespace-nowrap rounded-lg bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-400">
                                  Fatura Kaynaklı
                                </span>

                                <a
                                  href="/hal/faturalar"
                                  className="text-[11px] font-bold text-cyan-400 hover:underline"
                                >
                                  Faturalara Git
                                </a>

                              </div>
                            ) : (
                              <form
                                action={
                                  hareketSil
                                }
                              >

                                <input
                                  type="hidden"
                                  name="hareketId"
                                  value={
                                    hareket.id
                                  }
                                />

                                <button
                                  type="submit"
                                  className="rounded-lg bg-red-600 px-4 py-2 text-xs font-black text-white hover:bg-red-500"
                                >
                                  Sil
                                </button>

                              </form>
                            )}

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

        {/* BİLGİ */}

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">

          <p className="font-black text-cyan-400">
            Stok Hareket Mantığı
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Manuel stok girişi silinirse giriş
            miktarı mevcut stoktan geri düşülür.
            Manuel stok çıkışı silinirse çıkış
            miktarı mevcut stoğa geri eklenir.
          </p>

          <p className="mt-2 text-sm font-semibold leading-6 text-violet-400">
            Satış veya alış faturası tarafından
            oluşturulmuş hareketler stok ekranından
            silinmez. Bu kayıtları kaldırmak için
            ilgili faturayı Faturalar ekranından
            silin.
          </p>

        </div>

      </div>

    </main>
  );
}