import { prisma } from "@/lib/prisma";

import {

  tcmbKurlariGetir,

  tlKarsiligi,

} from "@/lib/tcmb";

import { revalidatePath } from "next/cache";



function money(value: number) {

  return new Intl.NumberFormat("tr-TR", {

    style: "currency",

    currency: "TRY",

    minimumFractionDigits: 2,

    maximumFractionDigits: 2,

  }).format(value);

}



function currencyMoney(

  value: number,

  currency: string

) {

  return new Intl.NumberFormat("tr-TR", {

    style: "currency",

    currency,

    minimumFractionDigits: 2,

    maximumFractionDigits: 2,

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



function hareketAdi(tip: string) {

  switch (tip) {

    case "GIRIS":

      return "Giriş";



    case "CIKIS":

      return "Çıkış";



    case "TRANSFER_GIRIS":

      return "Transfer Giriş";



    case "TRANSFER_CIKIS":

      return "Transfer Çıkış";



    default:

      return tip;

  }

}



function otomatikHareketMi(

  tip: string,

  aciklama: string,

  transferRef: string | null

) {

  if (

    tip === "TRANSFER_GIRIS" ||

    tip === "TRANSFER_CIKIS"

  ) {

    return true;

  }



  if (

    transferRef?.startsWith("GERI_AL:")

  ) {

    return true;

  }



  if (

    aciklama.trim().startsWith("[")

  ) {

    return true;

  }



  const alt =

    aciklama.toLocaleLowerCase(

      "tr-TR"

    );



  if (

    alt.includes("kredi ödemesi") ||

    alt.includes("çek ödemesi") ||

    alt.includes("verilen çek") ||

    alt.includes("alınan çek") ||

    alt.includes("satış tahsilatı") ||

    alt.includes("alış ödemesi") ||

    alt.includes("hizmet ödemesi")

  ) {

    return true;

  }



  return false;

}



export default async function KasaPage() {

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



  const [kasalar, kurlar] =

    await Promise.all([

      prisma.finansHesap.findMany({

        where: {

          sirketId: sirket.id,

          aktif: true,

          tip: "KASA",

        },



        include: {

          hareketler: {

            include: {

              cari: true,

            },



            orderBy: [

              {

                tarih: "desc",

              },

              {

                id: "desc",

              },

            ],

          },

        },



        orderBy: {

          ad: "asc",

        },

      }),



      tcmbKurlariGetir(),

    ]);



  /*

    ==================================================

    KASA BAKİYELERİ

    ==================================================

  */



  const kasalarBakiyeli =

    kasalar.map((kasa) => {

      const bakiye =

        kasa.hareketler.reduce(

          (toplam, hareket) => {

            const tutar =

              Number(hareket.tutar);



            if (

              hareket.tip === "GIRIS" ||

              hareket.tip ===

                "TRANSFER_GIRIS"

            ) {

              return toplam + tutar;

            }



            if (

              hareket.tip === "CIKIS" ||

              hareket.tip ===

                "TRANSFER_CIKIS"

            ) {

              return toplam - tutar;

            }



            return toplam;

          },

          0

        );



      const tlDegeri =

        tlKarsiligi(

          bakiye,

          kasa.paraBirimi,

          kurlar

        );



      return {

        ...kasa,

        bakiye,

        tlDegeri,

      };

    });



  const toplamKasaTl =

    kasalarBakiyeli.reduce(

      (toplam, kasa) =>

        toplam + kasa.tlDegeri,

      0

    );



  /*

    ==================================================

    TÜM KASA HAREKETLERİ

    ==================================================

  */



  const tumHareketler =

    kasalarBakiyeli

      .flatMap((kasa) =>

        kasa.hareketler.map(

          (hareket) => ({

            ...hareket,



            finansHesap: {

              id: kasa.id,

              ad: kasa.ad,

              paraBirimi:

                kasa.paraBirimi,

            },

          })

        )

      )

      .sort((a, b) => {

        const tarihFarki =

          b.tarih.getTime() -

          a.tarih.getTime();



        if (tarihFarki !== 0) {

          return tarihFarki;

        }



        return b.id - a.id;

      });



  /*

    Daha önce geri alınmış hareketler

  */



  const geriAlinanHareketIdleri =

    new Set<number>();



  for (const hareket of tumHareketler) {

    if (

      hareket.transferRef?.startsWith(

        "GERI_AL:"

      )

    ) {

      const orijinalId =

        Number(

          hareket.transferRef.replace(

            "GERI_AL:",

            ""

          )

        );



      if (

        Number.isInteger(orijinalId)

      ) {

        geriAlinanHareketIdleri.add(

          orijinalId

        );

      }

    }

  }



  const sonHareketler =

    tumHareketler.slice(0, 50);



  /*

    ==================================================

    GERİ AL

    ==================================================

  */



  async function hareketGeriAl(

    formData: FormData

  ) {

    "use server";



    const hareketId =

      Number(

        formData.get("hareketId")

      );



    if (

      !Number.isInteger(hareketId) ||

      hareketId <= 0

    ) {

      throw new Error(

        "Geçersiz hareket."

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

      await prisma.finansHareket.findUnique({

        where: {

          id: hareketId,

        },



        include: {

          finansHesap: true,

          cari: true,

        },

      });



    if (

      !hareket ||

      hareket.finansHesap.sirketId !==

        sirket.id ||

      hareket.finansHesap.tip !==

        "KASA"

    ) {

      throw new Error(

        "Kasa hareketi bulunamadı."

      );

    }



    if (

      otomatikHareketMi(

        hareket.tip,

        hareket.aciklama,

        hareket.transferRef

      )

    ) {

      throw new Error(

        "Bu hareket geri alınamaz. İsterseniz Sil butonuyla silebilirsiniz."

      );

    }



    if (

      hareket.tip !== "GIRIS" &&

      hareket.tip !== "CIKIS"

    ) {

      throw new Error(

        "Bu hareket türü geri alınamaz."

      );

    }



    const geriAlRef =

      `GERI_AL:${hareket.id}`;



    const zatenGeriAlinmis =

      await prisma.finansHareket.findFirst({

        where: {

          transferRef:

            geriAlRef,

        },



        select: {

          id: true,

        },

      });



    if (zatenGeriAlinmis) {

      throw new Error(

        "Bu hareket daha önce geri alınmış."

      );

    }



    const tersFinansTipi =

      hareket.tip === "GIRIS"

        ? "CIKIS"

        : "GIRIS";



    const simdi = new Date();



    await prisma.$transaction(

      async (tx) => {

        await tx.finansHareket.create({

          data: {

            finansHesapId:

              hareket.finansHesapId,



            cariId:

              hareket.cariId,



            tarih:

              simdi,



            tip:

              tersFinansTipi,



            tutar:

              hareket.tutar,



            aciklama:

              `[Geri Alındı] ${hareket.aciklama}`,



            belgeNo:

              hareket.belgeNo,



            transferRef:

              geriAlRef,

          },

        });



        if (hareket.cariId) {

          if (

            hareket.tip === "GIRIS"

          ) {

            await tx.cariHareket.create({

              data: {

                cariId:

                  hareket.cariId,



                tarih:

                  simdi,



                tip: "BORC",



                islemTuru:

                  "FINANS_GERI_AL",



                aciklama:

                  `[Geri Alındı] ${hareket.aciklama}`,



                belgeNo:

                  hareket.belgeNo,



                borc:

                  hareket.tutar,



                alacak: 0,

              },

            });

          } else {

            await tx.cariHareket.create({

              data: {

                cariId:

                  hareket.cariId,



                tarih:

                  simdi,



                tip: "ALACAK",



                islemTuru:

                  "FINANS_GERI_AL",



                aciklama:

                  `[Geri Alındı] ${hareket.aciklama}`,



                belgeNo:

                  hareket.belgeNo,



                borc: 0,



                alacak:

                  hareket.tutar,

              },

            });

          }

        }

      }

    );



    revalidatePath("/hal");

    revalidatePath("/hal/kasa");

    revalidatePath("/hal/banka");

    revalidatePath("/hal/cariler");



    if (hareket.cariId) {

      revalidatePath(

        `/hal/cariler/${hareket.cariId}`

      );

    }

  }



  /*

    ==================================================

    HAREKET SİL

    ==================================================



    Kullanıcı istediği için:

    - manuel

    - otomatik

    - geri alınmış

    - transfer



    tüm finans hareketleri silinebilir.

  */



  async function hareketSil(

    formData: FormData

  ) {

    "use server";



    const hareketId =

      Number(

        formData.get("hareketId")

      );



    if (

      !Number.isInteger(hareketId) ||

      hareketId <= 0

    ) {

      throw new Error(

        "Geçersiz hareket."

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

      await prisma.finansHareket.findUnique({

        where: {

          id: hareketId,

        },



        include: {

          finansHesap: true,

        },

      });



    if (

      !hareket ||

      hareket.finansHesap.sirketId !==

        sirket.id

    ) {

      throw new Error(

        "Hareket bulunamadı."

      );

    }



    /*

      Silinecek finans hareketlerinin ID'leri.

    */



    const silinecekIdler =

      new Set<number>();



    silinecekIdler.add(

      hareket.id

    );



    /*

      --------------------------------------------------

      1) TRANSFER İSE KARŞI TARAFI DA SİL

      --------------------------------------------------



      Örneğin:

      Kasa -40.000

      Banka +40.000



      Bunların bir tarafını silip diğerini bırakmıyoruz.

    */



    if (

      (hareket.tip ===

        "TRANSFER_GIRIS" ||

        hareket.tip ===

          "TRANSFER_CIKIS") &&

      hareket.transferRef

    ) {

      const transferHareketleri =

        await prisma.finansHareket.findMany({

          where: {

            transferRef:

              hareket.transferRef,



            finansHesap: {

              sirketId:

                sirket.id,

            },

          },



          select: {

            id: true,

          },

        });



      for (

        const transferHareketi of

          transferHareketleri

      ) {

        silinecekIdler.add(

          transferHareketi.id

        );

      }

    }



    /*

      --------------------------------------------------

      2) ORİJİNAL HAREKET GERİ ALINMIŞSA

         TERS KAYDI DA SİL

      --------------------------------------------------

    */



    const tersKayitlar =

      await prisma.finansHareket.findMany({

        where: {

          transferRef:

            `GERI_AL:${hareket.id}`,

        },



        select: {

          id: true,

        },

      });



    for (

      const tersKayit of tersKayitlar

    ) {

      silinecekIdler.add(

        tersKayit.id

      );

    }



    /*

      --------------------------------------------------

      3) TIKLANAN KAYIT BİR GERİ ALMA KAYDIYSA

         ORİJİNALİNİ DE SİL

      --------------------------------------------------

    */



    if (

      hareket.transferRef?.startsWith(

        "GERI_AL:"

      )

    ) {

      const orijinalId =

        Number(

          hareket.transferRef.replace(

            "GERI_AL:",

            ""

          )

        );



      if (

        Number.isInteger(orijinalId) &&

        orijinalId > 0

      ) {

        const orijinal =

          await prisma.finansHareket.findFirst({

            where: {

              id: orijinalId,



              finansHesap: {

                sirketId:

                  sirket.id,

              },

            },



            select: {

              id: true,

            },

          });



        if (orijinal) {

          silinecekIdler.add(

            orijinal.id

          );

        }

      }

    }



    /*

      Silinecek hareketleri tam olarak tekrar çekiyoruz.

      Cari bağlantılarını da temizleyebilmek için.

    */



    const silinecekHareketler =

      await prisma.finansHareket.findMany({

        where: {

          id: {

            in: Array.from(

              silinecekIdler

            ),

          },

        },



        include: {

          finansHesap: true,

        },

      });



    /*

      Etkilenen carileri sayfa yenileme için sakla.

    */



    const etkilenenCariIdleri =

      new Set<number>();



    await prisma.$transaction(

      async (tx) => {

        /*

          ------------------------------------------------

          CARİYE BAĞLI FİNANS KAYITLARININ

          KARŞILIK GELEN CARİ HAREKETLERİNİ BUL

          ------------------------------------------------

        */



        for (

          const finansHareket of

            silinecekHareketler

        ) {

          if (

            !finansHareket.cariId

          ) {

            continue;

          }



          etkilenenCariIdleri.add(

            finansHareket.cariId

          );



          /*

            Finans GİRİŞ:

            Normal tahsilatta Cari ALACAK.



            Finans ÇIKIŞ:

            Normal ödemede Cari BORÇ.



            Geri alma kayıtlarında da aynı yön

            mantığı geçerli.

          */



          const cariTipi =

            finansHareket.tip ===

              "GIRIS" ||

            finansHareket.tip ===

              "TRANSFER_GIRIS"

              ? "ALACAK"

              : "BORC";



          const tutar =

            finansHareket.tutar;



          /*

            Önce aynı tarih + cari + tutar

            eşleşmesi aranır.

          */



          const cariHareket =

            await tx.cariHareket.findFirst({

              where: {

                cariId:

                  finansHareket.cariId,



                tarih:

                  finansHareket.tarih,



                tip:

                  cariTipi,



                ...(cariTipi ===

                "ALACAK"

                  ? {

                      alacak:

                        tutar,

                    }

                  : {

                      borc:

                        tutar,

                    }),



                ...(finansHareket.belgeNo

                  ? {

                      belgeNo:

                        finansHareket.belgeNo,

                    }

                  : {}),

              },



              orderBy: {

                id: "desc",

              },



              select: {

                id: true,

              },

            });



          if (cariHareket) {

            await tx.cariHareket.delete({

              where: {

                id:

                  cariHareket.id,

              },

            });

          }

        }



        /*

          ------------------------------------------------

          FİNANS HAREKETLERİNİ KALICI SİL

          ------------------------------------------------

        */



        await tx.finansHareket.deleteMany({

          where: {

            id: {

              in: Array.from(

                silinecekIdler

              ),

            },

          },

        });

      }

    );



    revalidatePath("/hal");

    revalidatePath("/hal/kasa");

    revalidatePath("/hal/banka");

    revalidatePath("/hal/cariler");

    revalidatePath(

      "/hal/kasa-banka"

    );



    for (

      const cariId of

        etkilenenCariIdleri

    ) {

      revalidatePath(

        `/hal/cariler/${cariId}`

      );

    }

  }



  return (

    <main className="min-h-screen bg-slate-950 text-white">

      <div className="mx-auto max-w-7xl px-6 py-10">



        {/* BAŞLIK */}



        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">



          <div>

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">

              Hal Komisyon & Soğuk Hava

            </p>



            <h1 className="mt-2 text-4xl font-black">

              Kasa

            </h1>



            <p className="mt-2 text-slate-400">

              Nakit kasalar, giriş, çıkış,

              tahsilat ve ödeme işlemleri

            </p>

          </div>



          <div className="flex flex-wrap gap-3">



            <a

              href="/hal"

              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 hover:bg-slate-900"

            >

              ← Panele Dön

            </a>



            <a

              href="/hal/kasa-banka/yeni?tip=KASA"

              className="rounded-xl border border-emerald-700 px-5 py-3 font-bold text-emerald-400 hover:bg-emerald-950/30"

            >

              + Yeni Kasa

            </a>



            <a

              href="/hal/kasa-banka/hareket-yeni?tip=GIRIS"

              className="rounded-xl bg-emerald-500 px-5 py-3 font-black text-slate-950 hover:bg-emerald-400"

            >

              + Kasa Girişi

            </a>



            <a

              href="/hal/kasa-banka/hareket-yeni?tip=CIKIS"

              className="rounded-xl border border-red-700 px-5 py-3 font-bold text-red-400 hover:bg-red-950/30"

            >

              − Kasa Çıkışı

            </a>



          </div>



        </div>



        {/* TOPLAM */}



        <div className="mb-8 rounded-3xl border border-emerald-900/50 bg-emerald-950/10 p-8">



          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">

            Toplam Kasa

          </p>



          <p

            className={`mt-3 text-4xl font-black md:text-5xl ${

              toplamKasaTl >= 0

                ? "text-emerald-400"

                : "text-red-400"

            }`}

          >

            {money(toplamKasaTl)}

          </p>



          <p className="mt-3 text-sm text-slate-500">

            Tüm TL ve döviz kasalarının

            TCMB kuru ile TL karşılığı

          </p>



        </div>



        {/* HIZLI İŞLEMLER */}



        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">



          <a

            href="/hal/kasa-banka/hareket-yeni?tip=GIRIS"

            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-emerald-600"

          >

            <div className="text-3xl">

              💵

            </div>



            <h2 className="mt-4 text-xl font-black">

              Manuel Giriş

            </h2>



            <p className="mt-2 text-sm text-slate-400">

              Kasaya manuel para girişi yap

            </p>

          </a>



          <a

            href="/hal/kasa-banka/hareket-yeni?tip=CIKIS"

            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-red-600"

          >

            <div className="text-3xl">

              💸

            </div>



            <h2 className="mt-4 text-xl font-black">

              Manuel Çıkış

            </h2>



            <p className="mt-2 text-sm text-slate-400">

              Kasadan manuel para çıkışı yap

            </p>

          </a>



          <a

            href="/hal/kasa-banka/hareket-yeni?tip=GIRIS"

            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-cyan-600"

          >

            <div className="text-3xl">

              👤

            </div>



            <h2 className="mt-4 text-xl font-black">

              Cari Tahsilat

            </h2>



            <p className="mt-2 text-sm text-slate-400">

              Cariden nakit tahsilat al

            </p>

          </a>



          <a

            href="/hal/kasa-banka/hareket-yeni?tip=CIKIS"

            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-orange-600"

          >

            <div className="text-3xl">

              🤝

            </div>



            <h2 className="mt-4 text-xl font-black">

              Cari Ödeme

            </h2>



            <p className="mt-2 text-sm text-slate-400">

              Cariye nakit ödeme yap

            </p>

          </a>



        </div>



        {/* TRANSFER */}



        <div className="mb-8">



          <a

            href="/hal/kasa-banka/transfer"

            className="flex items-center justify-between rounded-2xl border border-amber-900/50 bg-amber-950/10 p-6 transition hover:border-amber-600"

          >

            <div>



              <h2 className="text-xl font-black text-amber-400">

                ↔ Kasa / Banka Transferi

              </h2>



              <p className="mt-1 text-sm text-slate-400">

                Kasadan bankaya veya bankadan

                kasaya para aktar

              </p>



            </div>



            <span className="text-2xl text-amber-400">

              →

            </span>



          </a>



        </div>



        {/* KASALAR */}



        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">



          <div className="border-b border-slate-800 p-6">



            <h2 className="text-xl font-black">

              Kasalar

            </h2>



            <p className="mt-1 text-sm text-slate-400">

              Tanımlı tüm aktif kasalar

            </p>



          </div>



          {kasalarBakiyeli.length === 0 ? (

            <div className="p-12 text-center">



              <div className="text-5xl">

                💵

              </div>



              <h3 className="mt-4 text-xl font-black">

                Henüz kasa tanımlanmamış

              </h3>



              <p className="mt-2 text-slate-400">

                İlk kasanızı oluşturarak başlayabilirsiniz.

              </p>



              <a

                href="/hal/kasa-banka/yeni?tip=KASA"

                className="mt-6 inline-block rounded-xl bg-emerald-500 px-6 py-3 font-black text-slate-950"

              >

                + Yeni Kasa

              </a>



            </div>

          ) : (

            <div className="overflow-x-auto">



              <table className="w-full min-w-[800px]">



                <thead>

                  <tr className="border-b border-slate-800 text-left text-sm text-slate-400">



                    <th className="px-6 py-4">

                      Kasa

                    </th>



                    <th className="px-6 py-4">

                      Para Birimi

                    </th>



                    <th className="px-6 py-4 text-right">

                      Bakiye

                    </th>



                    <th className="px-6 py-4 text-right">

                      TL Karşılığı

                    </th>

                    <th className="px-6 py-4 text-right">

                      İşlem

                    </th>



                  </tr>

                </thead>



                <tbody>



                  {kasalarBakiyeli.map(

                    (kasa) => (

                      <tr

                        key={kasa.id}

                        className="border-b border-slate-800/70 last:border-0"

                      >



                        <td className="px-6 py-5">



                          <div className="font-black">

                            {kasa.ad}

                          </div>



                          {kasa.hesapNo && (

                            <div className="mt-1 text-xs text-slate-500">

                              {kasa.hesapNo}

                            </div>

                          )}



                        </td>



                        <td className="px-6 py-5">



                          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">

                            {kasa.paraBirimi}

                          </span>



                        </td>



                        <td

                          className={`px-6 py-5 text-right text-lg font-black ${

                            kasa.bakiye >= 0

                              ? "text-emerald-400"

                              : "text-red-400"

                          }`}

                        >

                          {currencyMoney(

                            kasa.bakiye,

                            kasa.paraBirimi

                          )}

                        </td>



                        <td

                          className={`px-6 py-5 text-right font-black ${

                            kasa.tlDegeri >= 0

                              ? "text-slate-200"

                              : "text-red-400"

                          }`}

                        >

                          {money(

                            kasa.tlDegeri

                          )}

                        </td>

                        <td className="px-6 py-5 text-right">

                          <a

                            href={`/hal/kasa-banka/${kasa.id}/duzenle`}

                            className="inline-block rounded-lg border border-amber-600 px-3 py-2 text-sm font-bold text-amber-400 transition hover:bg-amber-950/30"

                          >

                            Düzenle

                          </a>

                        </td>



                      </tr>

                    )

                  )}



                </tbody>



              </table>



            </div>

          )}



        </div>



        {/* HAREKETLER */}



        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">



          <div className="border-b border-slate-800 p-6">



            <h2 className="text-xl font-black">

              Son Kasa Hareketleri

            </h2>



            <p className="mt-1 text-sm text-slate-400">

              Son 50 kasa hareketi

            </p>



          </div>



          {sonHareketler.length === 0 ? (

            <div className="p-12 text-center text-slate-400">

              Henüz kasa hareketi bulunmuyor.

            </div>

          ) : (

            <div className="overflow-x-auto">



              <table className="w-full min-w-[1350px]">



                <thead>

                  <tr className="border-b border-slate-800 text-left text-sm text-slate-400">



                    <th className="px-5 py-4">

                      Tarih

                    </th>



                    <th className="px-5 py-4">

                      Kasa

                    </th>



                    <th className="px-5 py-4">

                      Cari

                    </th>



                    <th className="px-5 py-4">

                      İşlem

                    </th>



                    <th className="px-5 py-4">

                      Açıklama

                    </th>



                    <th className="px-5 py-4">

                      Belge

                    </th>



                    <th className="px-5 py-4 text-right">

                      Tutar

                    </th>



                    <th className="px-5 py-4 text-right">

                      İşlemler

                    </th>



                  </tr>

                </thead>



                <tbody>



                  {sonHareketler.map(

                    (hareket) => {

                      const dahaOnceGeriAlinmis =

                        geriAlinanHareketIdleri.has(

                          hareket.id

                        );



                      const otomatik =

                        otomatikHareketMi(

                          hareket.tip,

                          hareket.aciklama,

                          hareket.transferRef

                        );



                      const geriAlinabilir =

                        !otomatik &&

                        !dahaOnceGeriAlinmis;



                      const tutar =

                        Number(

                          hareket.tutar

                        );



                      const giris =

                        hareket.tip ===

                          "GIRIS" ||

                        hareket.tip ===

                          "TRANSFER_GIRIS";



                      return (

                        <tr

                          key={hareket.id}

                          className="border-b border-slate-800/70 transition hover:bg-slate-800/30"

                        >



                          <td className="whitespace-nowrap px-5 py-5 text-sm text-slate-300">

                            {dateTime(

                              hareket.tarih

                            )}

                          </td>



                          <td className="px-5 py-5">



                            <p className="font-bold">

                              {

                                hareket

                                  .finansHesap

                                  .ad

                              }

                            </p>



                            <p className="mt-1 text-xs text-slate-500">

                              {

                                hareket

                                  .finansHesap

                                  .paraBirimi

                              }

                            </p>



                          </td>



                          <td className="px-5 py-5">



                            {hareket.cari ? (

                              <a

                                href={`/hal/cariler/${hareket.cari.id}`}

                                className="font-semibold text-cyan-400 hover:underline"

                              >

                                {

                                  hareket

                                    .cari

                                    .unvan

                                }

                              </a>

                            ) : (

                              <span className="text-slate-500">

                                -

                              </span>

                            )}



                          </td>



                          <td className="px-5 py-5">



                            <span

                              className={`rounded-full px-3 py-1 text-xs font-bold ${

                                giris

                                  ? "bg-emerald-500/10 text-emerald-400"

                                  : "bg-red-500/10 text-red-400"

                              }`}

                            >

                              {hareketAdi(

                                hareket.tip

                              )}

                            </span>



                          </td>



                          <td className="px-5 py-5 text-slate-300">

                            {hareket.aciklama}

                          </td>



                          <td className="px-5 py-5 text-slate-400">

                            {hareket.belgeNo ||

                              "-"}

                          </td>



                          <td

                            className={`whitespace-nowrap px-5 py-5 text-right text-lg font-black ${

                              giris

                                ? "text-emerald-400"

                                : "text-red-400"

                            }`}

                          >

                            {giris

                              ? "+"

                              : "-"}

                            {currencyMoney(

                              tutar,

                              hareket

                                .finansHesap

                                .paraBirimi

                            )}

                          </td>



                          <td className="px-5 py-5">



                            <div className="flex justify-end gap-2">



                              {dahaOnceGeriAlinmis ? (

                                <span className="whitespace-nowrap rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-400">

                                  ✓ Geri Alındı

                                </span>

                              ) : geriAlinabilir ? (

                                <form

                                  action={

                                    hareketGeriAl

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

                                    className="whitespace-nowrap rounded-lg border border-amber-700 px-3 py-2 text-sm font-bold text-amber-400 transition hover:bg-amber-950/30"

                                  >

                                    Geri Al

                                  </button>

                                </form>

                              ) : (

                                <span className="whitespace-nowrap rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-500">

                                  Otomatik

                                </span>

                              )}



                              {/* HER HAREKETTE SİL */}



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

                                  className="whitespace-nowrap rounded-lg bg-red-600 px-3 py-2 text-sm font-black text-white transition hover:bg-red-500"

                                >

                                  Sil

                                </button>

                              </form>



                            </div>



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



        <div className="mt-6 rounded-xl border border-red-900/50 bg-red-950/10 p-5">



          <p className="font-black text-red-400">

            Silme İşlemi

          </p>



          <p className="mt-2 text-sm leading-6 text-slate-400">

            Sil butonu hareketi kalıcı olarak

            kaldırır. Transfer hareketlerinde karşı

            banka veya kasa hareketi de birlikte

            silinir. Cari bağlantılı tahsilat ve

            ödemelerde eşleşen cari hareketi de

            temizlenir.

          </p>



          <p className="mt-2 text-sm font-semibold leading-6 text-amber-400">

            Fatura, kredi veya çekten otomatik

            oluşturulmuş bir finans hareketini

            silerseniz kaynak fatura, kredi veya çek

            kaydı silinmez. Bu nedenle Sil işlemini

            hatalı veya test kayıtlarını temizlemek

            için kullanın.

          </p>



        </div>



      </div>

    </main>

  );

}
