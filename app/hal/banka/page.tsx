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

  /*

    Transfer hareketlerini tek taraftan geri almak

    hesapları bozacağı için izin vermiyoruz.

  */

  if (

    tip === "TRANSFER_GIRIS" ||

    tip === "TRANSFER_CIKIS"

  ) {

    return true;

  }



  /*

    Geri alma sonucu oluşan ters kayıt tekrar

    geri alınamaz.

  */

  if (

    transferRef?.startsWith(

      "GERI_AL:"

    )

  ) {

    return true;

  }



  /*

    Uygulamanın otomatik oluşturduğu hareketlerin

    açıklamaları [ ... ] ile başlıyor.



    Örnek:

    [Satış Tahsilatı]

    [Alış Ödemesi]

    [Hizmet Ödemesi]

    [Kredi Ödemesi]



    Bunları banka ekranından tek başına geri almıyoruz.

  */

  if (

    aciklama.trim().startsWith("[")

  ) {

    return true;

  }



  return false;

}



export default async function BankaPage() {

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



  const [bankalar, kurlar] =

    await Promise.all([

      prisma.finansHesap.findMany({

        where: {

          sirketId: sirket.id,

          aktif: true,

          tip: "BANKA",

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



  const bankalarBakiyeli =

    bankalar.map((banka) => {

      const bakiye =

        banka.hareketler.reduce(

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

          banka.paraBirimi,

          kurlar

        );



      return {

        ...banka,

        bakiye,

        tlDegeri,

      };

    });



  const toplamBankaTl =

    bankalarBakiyeli.reduce(

      (toplam, banka) =>

        toplam + banka.tlDegeri,

      0

    );



  /*

    Tüm banka hesaplarındaki hareketleri

    tek listede birleştiriyoruz.

  */



  const tumHareketler =

    bankalarBakiyeli

      .flatMap((banka) =>

        banka.hareketler.map(

          (hareket) => ({

            ...hareket,



            finansHesap: {

              id: banka.id,

              ad: banka.ad,

              bankaAdi:

                banka.bankaAdi,

              paraBirimi:

                banka.paraBirimi,

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

      })

      .slice(0, 50);



  async function hareketGeriAl(

    formData: FormData

  ) {

    "use server";



    const hareketId =

      Number(

        formData.get("hareketId")

      );



    if (

      !Number.isInteger(

        hareketId

      ) ||

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

        "BANKA"

    ) {

      throw new Error(

        "Banka hareketi bulunamadı."

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

        "Bu hareket otomatik veya transfer kaynaklı olduğu için buradan geri alınamaz."

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

      });



    if (zatenGeriAlinmis) {

      throw new Error(

        "Bu hareket daha önce geri alınmış."

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



    const tersFinansTipi =

      hareket.tip === "GIRIS"

        ? "CIKIS"

        : "GIRIS";



    await prisma.$transaction(

      async (tx) => {

        /*

          BANKA TERS KAYDI

        */



        await tx.finansHareket.create({

          data: {

            finansHesapId:

              hareket.finansHesapId,



            cariId:

              hareket.cariId,



            tarih:

              new Date(),



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



        /*

          ORİJİNAL HAREKET CARİYE BAĞLIYSA

          CARİYİ DE TERS KAYITLA DÜZELT

        */



        if (hareket.cariId) {

          if (

            hareket.tip === "GIRIS"

          ) {

            /*

              Orijinal para girişi sırasında

              cariye ALACAK yazılmıştı.



              Geri alırken BORÇ yazıyoruz.

            */



            await tx.cariHareket.create({

              data: {

                cariId:

                  hareket.cariId,



                tarih:

                  new Date(),



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

            /*

              Orijinal para çıkışı sırasında

              cariye BORÇ yazılmıştı.



              Geri alırken ALACAK yazıyoruz.

            */



            await tx.cariHareket.create({

              data: {

                cariId:

                  hareket.cariId,



                tarih:

                  new Date(),



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



    revalidatePath(

      "/hal/banka"

    );



    revalidatePath(

      "/hal"

    );



    revalidatePath(

      "/hal/cariler"

    );



    if (hareket.cariId) {

      revalidatePath(

        `/hal/cariler/${hareket.cariId}`

      );

    }

  }



  return (

    <main className="min-h-screen bg-slate-950 text-white">

      <div className="mx-auto max-w-7xl px-6 py-10">



        {/* BAŞLIK */}



        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">



          <div>

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">

              Hal Komisyon & Soğuk Hava

            </p>



            <h1 className="mt-2 text-4xl font-black">

              Banka

            </h1>



            <p className="mt-2 text-slate-400">

              Banka hesapları, EFT ve banka hareketleri

            </p>

          </div>



          <div className="flex flex-wrap gap-3">



            <a

              href="/hal"

              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 transition hover:bg-slate-900"

            >

              ← Panele Dön

            </a>



            <a

              href="/hal/kasa-banka/yeni?tip=BANKA"

              className="rounded-xl border border-cyan-700 px-5 py-3 font-bold text-cyan-400 transition hover:bg-cyan-950/30"

            >

              + Yeni Banka

            </a>



            <a

              href="/hal/kasa-banka/hareket-yeni?tip=GIRIS"

              className="rounded-xl bg-emerald-500 px-5 py-3 font-black text-slate-950 transition hover:bg-emerald-400"

            >

              + Gelen EFT

            </a>



            <a

              href="/hal/kasa-banka/hareket-yeni?tip=CIKIS"

              className="rounded-xl border border-red-700 px-5 py-3 font-bold text-red-400 transition hover:bg-red-950/30"

            >

              − Giden EFT

            </a>



          </div>



        </div>



        {/* TOPLAM */}



        <div className="mb-8 rounded-3xl border border-cyan-900/50 bg-cyan-950/10 p-8">



          <p className="text-sm font-bold uppercase tracking-[0.15em] text-slate-400">

            Toplam Banka

          </p>



          <p

            className={`mt-3 text-4xl font-black md:text-5xl ${

              toplamBankaTl >= 0

                ? "text-cyan-400"

                : "text-red-400"

            }`}

          >

            {money(toplamBankaTl)}

          </p>



          <p className="mt-3 text-sm text-slate-500">

            Tüm aktif banka hesaplarının TL karşılığı

          </p>



        </div>



        {/* HIZLI İŞLEMLER */}



        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">



          <a

            href="/hal/kasa-banka/hareket-yeni?tip=GIRIS"

            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-emerald-600"

          >

            <div className="text-3xl">

              📥

            </div>



            <h2 className="mt-4 text-xl font-black">

              Gelen EFT

            </h2>



            <p className="mt-2 text-sm text-slate-400">

              Bankaya gelen ödemeyi kaydet

            </p>

          </a>



          <a

            href="/hal/kasa-banka/hareket-yeni?tip=CIKIS"

            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-red-600"

          >

            <div className="text-3xl">

              📤

            </div>



            <h2 className="mt-4 text-xl font-black">

              Giden EFT

            </h2>



            <p className="mt-2 text-sm text-slate-400">

              Bankadan yapılan ödemeyi kaydet

            </p>

          </a>



          <a

            href="/hal/giderler/yeni"

            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-orange-600"

          >

            <div className="text-3xl">

              🧾

            </div>



            <h2 className="mt-4 text-xl font-black">

              Banka Masrafı

            </h2>



            <p className="mt-2 text-sm text-slate-400">

              Komisyon ve banka gideri gir

            </p>

          </a>



          <a

            href="/hal/kasa-banka/transfer"

            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-amber-600"

          >

            <div className="text-3xl">

              🔄

            </div>



            <h2 className="mt-4 text-xl font-black">

              Kasa / Banka Transferi

            </h2>



            <p className="mt-2 text-sm text-slate-400">

              Kasadan bankaya veya bankadan kasaya aktar

            </p>

          </a>



        </div>



        {/* BANKA HESAPLARI */}



        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">



          <div className="border-b border-slate-800 p-6">



            <h2 className="text-xl font-black">

              Banka Hesapları

            </h2>



            <p className="mt-1 text-sm text-slate-400">

              Tanımlı aktif banka hesapları

            </p>



          </div>



          {bankalarBakiyeli.length === 0 ? (

            <div className="p-14 text-center">



              <div className="text-5xl">

                🏦

              </div>



              <h3 className="mt-5 text-xl font-black">

                Henüz banka hesabı yok

              </h3>



              <p className="mt-2 text-slate-400">

                İlk banka hesabınızı oluşturabilirsiniz.

              </p>



            </div>

          ) : (

            <div className="overflow-x-auto">



              <table className="w-full min-w-[1000px]">



                <thead>

                  <tr className="border-b border-slate-800 text-left text-sm text-slate-400">



                    <th className="px-5 py-4">

                      Hesap

                    </th>



                    <th className="px-5 py-4">

                      Banka

                    </th>



                    <th className="px-5 py-4">

                      Döviz

                    </th>



                    <th className="px-5 py-4">

                      IBAN

                    </th>



                    <th className="px-5 py-4 text-right">

                      Bakiye

                    </th>



                    <th className="px-5 py-4 text-right">

                      TL Karşılığı

                    </th>

                    <th className="px-5 py-4 text-right">

                      İşlem

                    </th>



                  </tr>

                </thead>



                <tbody>



                  {bankalarBakiyeli.map(

                    (banka) => (

                      <tr

                        key={banka.id}

                        className="border-b border-slate-800/70"

                      >



                        <td className="px-5 py-5 font-black">

                          {banka.ad}

                        </td>



                        <td className="px-5 py-5 text-slate-300">

                          {banka.bankaAdi || "-"}

                        </td>



                        <td className="px-5 py-5">

                          {banka.paraBirimi}

                        </td>



                        <td className="px-5 py-5 text-sm text-slate-400">

                          {banka.iban || "-"}

                        </td>



                        <td

                          className={`whitespace-nowrap px-5 py-5 text-right text-lg font-black ${

                            banka.bakiye >= 0

                              ? "text-cyan-400"

                              : "text-red-400"

                          }`}

                        >

                          {currencyMoney(

                            banka.bakiye,

                            banka.paraBirimi

                          )}

                        </td>



                        <td className="whitespace-nowrap px-5 py-5 text-right font-black">

                          {money(

                            banka.tlDegeri

                          )}

                        </td>

                        <td className="px-5 py-5 text-right">

                          <a

                            href={`/hal/kasa-banka/${banka.id}/duzenle`}

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



        {/* SON HAREKETLER */}



        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">



          <div className="border-b border-slate-800 p-6">



            <h2 className="text-xl font-black">

              Son Banka Hareketleri

            </h2>



            <p className="mt-1 text-sm text-slate-400">

              Son 50 banka hareketi

            </p>



          </div>



          {tumHareketler.length === 0 ? (

            <div className="p-12 text-center text-slate-400">

              Henüz banka hareketi bulunmuyor.

            </div>

          ) : (

            <div className="overflow-x-auto">



              <table className="w-full min-w-[1200px]">



                <thead>

                  <tr className="border-b border-slate-800 text-left text-sm text-slate-400">



                    <th className="px-5 py-4">

                      Tarih

                    </th>



                    <th className="px-5 py-4">

                      Hesap

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

                      İşlem

                    </th>



                  </tr>

                </thead>



                <tbody>



                  {tumHareketler.map(

                    (hareket) => {

                      const geriAlinabilir =

                        !otomatikHareketMi(

                          hareket.tip,

                          hareket.aciklama,

                          hareket.transferRef

                        );



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

                                  hareket.cari

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



                          <td className="px-5 py-5 text-right">



                            {geriAlinabilir ? (

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

                                  className="rounded-lg border border-red-700 px-3 py-2 text-sm font-bold text-red-400 transition hover:bg-red-950/30"

                                >

                                  Geri Al

                                </button>



                              </form>

                            ) : (

                              <span className="text-xs text-slate-600">

                                Otomatik

                              </span>

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



        <div className="mt-6 rounded-xl border border-amber-900/50 bg-amber-950/10 p-5">



          <p className="font-black text-amber-400">

            Geri Alma Mantığı

          </p>



          <p className="mt-2 text-sm leading-6 text-slate-400">

            Manuel banka hareketleri silinmez.

            Geri Al dediğinizde sistem aynı tutarda

            ters hareket oluşturur. Hareket bir cariye

            bağlıysa cari hesabında da ters kayıt

            oluşturulur. Böylece işlem geçmişi

            kaybolmaz.

          </p>



        </div>



      </div>

    </main>

  );

}