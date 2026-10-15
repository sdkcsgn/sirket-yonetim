import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function money(
  value: number,
  currency = "TRY"
) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function date(value: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function krediTipiYaz(tip: string) {
  switch (tip) {
    case "TAKSITLI":
      return "Taksitli Kredi";

    case "SPOT":
      return "Spot Kredi";

    case "ROTATIF":
      return "Rotatif Kredi";

    default:
      return tip;
  }
}

function durumYaz(durum: string) {
  switch (durum) {
    case "AKTIF":
      return "Aktif";

    case "KAPANDI":
      return "Kapandı";

    default:
      return durum;
  }
}

function toplam(
  hareketler: {
    tutar: unknown;
  }[]
) {
  return hareketler.reduce(
    (sonuc, hareket) =>
      sonuc + Number(hareket.tutar),
    0
  );
}

function tutarEsit(
  a: number,
  b: number
) {
  return Math.abs(a - b) < 0.01;
}

export default async function KrediDetayPage({
  params,
}: Props) {
  const { id } = await params;

  const krediId = Number(id);

  if (
    !Number.isInteger(krediId) ||
    krediId <= 0
  ) {
    notFound();
  }

  async function krediSil(
    formData: FormData
  ) {
    "use server";

    const krediId = Number(
      formData.get("krediId")
    );

    if (
      !Number.isInteger(krediId) ||
      krediId <= 0
    ) {
      throw new Error(
        "Geçersiz kredi."
      );
    }

    const kredi =
      await prisma.kredi.findUnique({
        where: {
          id: krediId,
        },

        include: {
          sirket: true,
        },
      });

    if (
      !kredi ||
      kredi.sirket.kod !== "BEACH"
    ) {
      throw new Error(
        "Kredi bulunamadı."
      );
    }

    /*
      ==============================================
      YENİ SİSTEM ÖDEMELERİ
      ==============================================
    */

    const bagliHareketler =
      await prisma.finansHareket.findMany({
        where: {
          transferRef:
            `KREDI-ODEME-${kredi.id}`,
        },
      });

    const bagliToplam =
      toplam(bagliHareketler);

    /*
      ==============================================
      ESKİ ÖDEME TUTARI
      ==============================================
    */

    let eskiOdemeBeklenen = 0;

    if (
      kredi.tip === "TAKSITLI" ||
      kredi.tip === "SPOT"
    ) {
      eskiOdemeBeklenen =
        Math.max(
          0,
          Number(kredi.anaPara) -
            Number(kredi.kalanBorc) -
            bagliToplam
        );
    }

    const eskiHareketIds: number[] = [];

    /*
      ==============================================
      ESKİ HAREKETİ BULMAYI DENE
      ==============================================

      Bulursak sileriz.
      Bulamazsak kredi silmeye yine devam ederiz.
    */

    if (
      eskiOdemeBeklenen > 0.001
    ) {
      let adaylar =
        await prisma.finansHareket.findMany({
          where: {
            tip: "CIKIS",

            tarih: {
              gte:
                kredi.baslangicTarihi,
            },

            transferRef: null,
          },

          include: {
            finansHesap: true,
          },

          orderBy: [
            {
              tarih: "asc",
            },
            {
              id: "asc",
            },
          ],
        });

      adaylar =
        adaylar.filter(
          (hareket) =>
            hareket.finansHesap
              .sirketId ===
              kredi.sirketId &&
            hareket.finansHesap
              .tip ===
              "BANKA" &&
            hareket.finansHesap
              .paraBirimi ===
              kredi.paraBirimi
        );

      let bulunan:
        typeof adaylar = [];

      /*
        1. Kredi numarası
      */

      if (kredi.krediNo) {
        const krediNoAdaylari =
          adaylar.filter(
            (hareket) =>
              hareket.belgeNo ===
              kredi.krediNo
          );

        if (
          krediNoAdaylari.length > 0 &&
          tutarEsit(
            toplam(
              krediNoAdaylari
            ),
            eskiOdemeBeklenen
          )
        ) {
          bulunan =
            krediNoAdaylari;
        }
      }

      /*
        2. Bağlı banka + kredi açıklaması
      */

      if (
        bulunan.length === 0 &&
        kredi.finansHesapId
      ) {
        const bankaAdaylari =
          adaylar.filter(
            (hareket) =>
              hareket.finansHesapId ===
              kredi.finansHesapId
          );

        const krediOdemeBanka =
          bankaAdaylari.filter(
            (hareket) => {
              const metin =
                (
                  hareket.aciklama ||
                  ""
                ).toLocaleLowerCase(
                  "tr-TR"
                );

              return (
                metin.includes(
                  "kredi"
                ) ||
                metin.includes(
                  kredi.ad.toLocaleLowerCase(
                    "tr-TR"
                  )
                )
              );
            }
          );

        if (
          krediOdemeBanka.length >
            0 &&
          tutarEsit(
            toplam(
              krediOdemeBanka
            ),
            eskiOdemeBeklenen
          )
        ) {
          bulunan =
            krediOdemeBanka;
        }
      }

      /*
        3. Kredi adı
      */

      if (
        bulunan.length === 0
      ) {
        const isimAdaylari =
          adaylar.filter(
            (hareket) =>
              (
                hareket.aciklama ||
                ""
              )
                .toLocaleLowerCase(
                  "tr-TR"
                )
                .includes(
                  kredi.ad.toLocaleLowerCase(
                    "tr-TR"
                  )
                )
          );

        if (
          isimAdaylari.length >
            0 &&
          tutarEsit(
            toplam(
              isimAdaylari
            ),
            eskiOdemeBeklenen
          )
        ) {
          bulunan =
            isimAdaylari;
        }
      }

      /*
        4. Aynı tutarda tek hareket
      */

      if (
        bulunan.length === 0
      ) {
        const tamTutarAdaylari =
          adaylar.filter(
            (hareket) =>
              tutarEsit(
                Number(
                  hareket.tutar
                ),
                eskiOdemeBeklenen
              )
          );

        if (
          kredi.finansHesapId
        ) {
          const ayniBankaTamTutar =
            tamTutarAdaylari.filter(
              (hareket) =>
                hareket.finansHesapId ===
                kredi.finansHesapId
            );

          if (
            ayniBankaTamTutar.length ===
            1
          ) {
            bulunan =
              ayniBankaTamTutar;
          }
        }

        if (
          bulunan.length === 0 &&
          tamTutarAdaylari.length ===
            1
        ) {
          bulunan =
            tamTutarAdaylari;
        }
      }

      /*
        Bulunduysa yalnızca toplam tutar
        gerçekten beklenen tutara eşitse sil.
      */

      if (
        bulunan.length > 0
      ) {
        const bulunanToplam =
          toplam(bulunan);

        if (
          tutarEsit(
            bulunanToplam,
            eskiOdemeBeklenen
          )
        ) {
          eskiHareketIds.push(
            ...bulunan.map(
              (hareket) =>
                hareket.id
            )
          );
        }
      }

      /*
        Hiç hareket bulunamadıysa
        hata atmıyoruz.

        Çünkü banka hareketi daha önce
        manuel silinmiş olabilir.
      */
    }

    /*
      ==============================================
      KREDİ + BAĞLI BANKA HAREKETLERİNİ SİL
      ==============================================
    */

    await prisma.$transaction(
      async (tx) => {
        /*
          ==========================================
          1. KREDİ KULLANIMI BANKA GİRİŞİ
          ==========================================

          Kredi oluşturulurken bankaya giren
          tutarı kaldırır.
        */

        await tx.finansHareket.deleteMany({
          where: {
            transferRef:
              `KREDI-KULLANIM-${kredi.id}`,
          },
        });

        /*
          ==========================================
          2. KREDİ ÖDEME HAREKETLERİ
          ==========================================

          Kredi ödemelerinde bankadan çıkan
          hareketleri kaldırır.
        */

        await tx.finansHareket.deleteMany({
          where: {
            transferRef:
              `KREDI-ODEME-${kredi.id}`,
          },
        });

        /*
          ==========================================
          3. ESKİ SİSTEM ÖDEMELERİ
          ==========================================
        */

        if (
          eskiHareketIds.length >
          0
        ) {
          await tx.finansHareket.deleteMany({
            where: {
              id: {
                in:
                  eskiHareketIds,
              },
            },
          });
        }

        /*
          ==========================================
          4. KREDİ KAYDI
          ==========================================
        */

        await tx.kredi.delete({
          where: {
            id:
              kredi.id,
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
      "/beach"
    );

    revalidatePath(
      "/beach/krediler"
    );

    revalidatePath(
      "/beach/banka"
    );

    revalidatePath(
      "/beach/kasa-banka"
    );

    redirect(
      "/beach/krediler"
    );
  }

  /*
    ==============================================
    KREDİ
    ==============================================
  */

  const kredi =
    await prisma.kredi.findUnique({
      where: {
        id: krediId,
      },

      include: {
        sirket: true,
        finansHesap: true,
      },
    });

  if (
    !kredi ||
    kredi.sirket.kod !== "BEACH"
  ) {
    notFound();
  }

  const anaPara =
    Number(
      kredi.anaPara
    );

  const kalanBorc =
    Number(
      kredi.kalanBorc
    );

  const odenen =
    kredi.tip === "ROTATIF"
      ? 0
      : Math.max(
          0,
          anaPara -
            kalanBorc
        );

  const yuzde =
    anaPara > 0 &&
    kredi.tip !== "ROTATIF"
      ? Math.min(
          100,
          Math.max(
            0,
            (odenen /
              anaPara) *
              100
          )
        )
      : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">

        {/* BAŞLIK */}

        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

          <div>

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-400">
              Beach & Mağaza
            </p>

            <h1 className="mt-2 text-3xl font-black md:text-4xl">
              {kredi.ad}
            </h1>

            <div className="mt-3 flex flex-wrap gap-2">

              <span className="rounded-full bg-violet-500/10 px-3 py-1 text-sm font-bold text-violet-400">
                {krediTipiYaz(
                  kredi.tip
                )}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-sm font-bold ${
                  kredi.durum ===
                  "AKTIF"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                {durumYaz(
                  kredi.durum
                )}
              </span>

              <span className="rounded-full bg-slate-800 px-3 py-1 text-sm font-bold text-slate-300">
                {kredi.paraBirimi}
              </span>

            </div>

          </div>

          <div className="flex flex-wrap gap-2">

            <a
              href="/beach/krediler"
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-slate-900"
            >
              ← Krediler
            </a>

            <a
              href={`/beach/krediler/${kredi.id}/duzenle`}
              className="rounded-xl border border-amber-600 px-4 py-2.5 text-sm font-black text-amber-400 hover:bg-amber-950/20"
            >
              ✏️ Düzelt
            </a>

            {kredi.durum ===
              "AKTIF" && (
              <a
                href={`/beach/krediler/${kredi.id}/odeme`}
                className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-emerald-400"
              >
                ₺ Ödeme Yap
              </a>
            )}

          </div>

        </div>

        {/* ÖZET */}

        <div className="grid gap-5 md:grid-cols-3">

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <p className="text-sm text-slate-400">
              Ana Para
            </p>

            <p className="mt-3 text-3xl font-black">
              {money(
                anaPara,
                kredi.paraBirimi
              )}
            </p>

          </div>

          <div className="rounded-2xl border border-red-900/50 bg-red-950/10 p-6">

            <p className="text-sm text-slate-400">
              Kalan Borç
            </p>

            <p className="mt-3 text-3xl font-black text-red-400">
              {money(
                kalanBorc,
                kredi.paraBirimi
              )}
            </p>

          </div>

          <div className="rounded-2xl border border-emerald-900/50 bg-emerald-950/10 p-6">

            <p className="text-sm text-slate-400">
              Ödenen
            </p>

            <p className="mt-3 text-3xl font-black text-emerald-400">

              {kredi.tip ===
              "ROTATIF"
                ? "-"
                : money(
                    odenen,
                    kredi.paraBirimi
                  )}

            </p>

          </div>

        </div>

        {/* TAKSİTLİ KREDİ */}

        {kredi.tip ===
          "TAKSITLI" && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <div className="flex items-center justify-between">

              <div>

                <p className="font-black">
                  Kredi Ödeme Durumu
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  Ödenen borç oranı
                </p>

              </div>

              <p className="text-xl font-black text-emerald-400">
                %{yuzde.toFixed(
                  1
                )}
              </p>

            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">

              <div
                className="h-full rounded-full bg-emerald-500"
                style={{
                  width:
                    `${yuzde}%`,
                }}
              />

            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">

              <div>

                <p className="text-xs text-slate-500">
                  Taksit Sayısı
                </p>

                <p className="mt-1 font-black">
                  {kredi.taksitSayisi ??
                    "-"}
                </p>

              </div>

              <div>

                <p className="text-xs text-slate-500">
                  Ödenen Taksit
                </p>

                <p className="mt-1 font-black text-emerald-400">
                  {
                    kredi.odenenTaksitSayisi
                  }
                </p>

              </div>

              <div>

                <p className="text-xs text-slate-500">
                  Aylık Taksit
                </p>

                <p className="mt-1 font-black">

                  {kredi.aylikTaksit
                    ? money(
                        Number(
                          kredi.aylikTaksit
                        ),
                        kredi.paraBirimi
                      )
                    : "-"}

                </p>

              </div>

            </div>

          </div>
        )}

        {/* KREDİ BİLGİLERİ */}

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900">

          <div className="border-b border-slate-800 px-6 py-5">

            <h2 className="text-xl font-black">
              Kredi Bilgileri
            </h2>

          </div>

          <div className="grid gap-x-8 gap-y-6 p-6 md:grid-cols-2">

            <Bilgi
              baslik="Kredi Adı"
              deger={
                kredi.ad
              }
            />

            <Bilgi
              baslik="Kredi No"
              deger={
                kredi.krediNo ||
                "-"
              }
            />

            <Bilgi
              baslik="Kredi Tipi"
              deger={krediTipiYaz(
                kredi.tip
              )}
            />

            <Bilgi
              baslik="Durum"
              deger={durumYaz(
                kredi.durum
              )}
            />

            <Bilgi
              baslik="Banka"
              deger={
                kredi.finansHesap
                  ?.bankaAdi ||
                kredi.finansHesap
                  ?.ad ||
                "-"
              }
            />

            <Bilgi
              baslik="Para Birimi"
              deger={
                kredi.paraBirimi
              }
            />

            <Bilgi
              baslik="Faiz Oranı"
              deger={
                kredi.faizOrani !==
                null
                  ? `%${Number(
                      kredi.faizOrani
                    )}`
                  : "-"
              }
            />

            <Bilgi
              baslik="Başlangıç Tarihi"
              deger={date(
                kredi.baslangicTarihi
              )}
            />

            <Bilgi
              baslik="Vade Tarihi"
              deger={date(
                kredi.vadeTarihi
              )}
            />

            <Bilgi
              baslik="Sonraki Ödeme"
              deger={date(
                kredi.sonrakiOdemeTarihi
              )}
            />

            {kredi.tip ===
              "ROTATIF" && (
              <>

                <Bilgi
                  baslik="Kredi Limiti"
                  deger={
                    kredi.krediLimiti
                      ? money(
                          Number(
                            kredi.krediLimiti
                          ),
                          kredi.paraBirimi
                        )
                      : "-"
                  }
                />

                <Bilgi
                  baslik="Kullanılan Limit"
                  deger={
                    kredi.kullanilanLimit
                      ? money(
                          Number(
                            kredi.kullanilanLimit
                          ),
                          kredi.paraBirimi
                        )
                      : "-"
                  }
                />

              </>
            )}

          </div>

        </div>

        {/* AÇIKLAMA */}

        {kredi.aciklama && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <p className="text-sm font-bold text-slate-400">
              Açıklama
            </p>

            <p className="mt-3 leading-7 text-slate-200">
              {kredi.aciklama}
            </p>

          </div>
        )}

        {/* İŞLEMLER */}

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">

          <h2 className="text-xl font-black">
            İşlemler
          </h2>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">

            {kredi.durum ===
              "AKTIF" && (
              <a
                href={`/beach/krediler/${kredi.id}/odeme`}
                className="rounded-xl bg-emerald-500 px-5 py-3 text-center font-black text-slate-950 hover:bg-emerald-400"
              >
                Ödeme Yap
              </a>
            )}

            <a
              href={`/beach/krediler/${kredi.id}/duzenle`}
              className="rounded-xl border border-amber-700 px-5 py-3 text-center font-black text-amber-400 hover:bg-amber-950/20"
            >
              Düzelt
            </a>

          </div>

        </div>

        {/* SİL */}

        <div className="mt-6 rounded-2xl border border-red-900/50 bg-red-950/10 p-6">

          <h2 className="text-xl font-black text-red-400">
            Krediyi Sil
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Kredi silindiğinde kredi kullanımı sırasında bankaya giren
            tutar ve bu krediye bağlı ödeme hareketleri de kaldırılır.
            Böylece banka bakiyesi kredi oluşturulmadan önceki durumuna döner.
            Banka hareketlerinden biri daha önce manuel olarak silinmişse
            mevcut kayıtlar silinir ve kredi kaydı kaldırılır.
          </p>

          <form
            action={krediSil}
            className="mt-5"
          >

            <input
              type="hidden"
              name="krediId"
              value={
                kredi.id
              }
            />

            <button
              type="submit"
              className="rounded-xl bg-red-600 px-6 py-3 font-black text-white hover:bg-red-500"
            >
              Krediyi Kalıcı Olarak Sil
            </button>

          </form>

        </div>

      </div>

    </main>
  );
}

function Bilgi({
  baslik,
  deger,
}: {
  baslik: string;
  deger: string;
}) {
  return (
    <div>

      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {baslik}
      </p>

      <p className="mt-2 font-bold text-slate-200">
        {deger}
      </p>

    </div>
  );
}