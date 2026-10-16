import { prisma } from "@/lib/prisma";



import { revalidatePath } from "next/cache";



import { redirect } from "next/navigation";







type Props = {



  searchParams: Promise<{



    tip?: string;



    tur?: string;



    error?: string;

    kopya?: string;



  }>;



};







type UiTip = "SATIS" | "ALIS";



type UiTur = "URUN" | "HIZMET";







type OdemeSekli =



  | "ACIK_HESAP"



  | "NAKIT"



  | "EFT_HAVALE"



  | "KREDI_KARTI";







function parseNumber(



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







  const value = new Date(



    `${raw}T12:00:00`



  );







  return Number.isNaN(value.getTime())



    ? null



    : value;



}







function money(value: number) {



  return new Intl.NumberFormat("tr-TR", {



    style: "currency",



    currency: "TRY",



    minimumFractionDigits: 2,



    maximumFractionDigits: 2,



  }).format(value);



}







export default async function YeniFaturaPage({



  searchParams,



}: Props) {



  const query = await searchParams;







  const kopyaId = Number(query.kopya ?? 0);







  const sirket =



    await prisma.sirket.findUnique({



      where: {



        kod: "HAL",



      },



    });







  if (!sirket) {



    return (



      <main className="min-h-screen bg-slate-950 p-10 text-white">



        Hal Komisyon & Soğuk Hava şirketi



        bulunamadı.



      </main>



    );



  }



  const kopyaFatura =
    Number.isInteger(kopyaId) && kopyaId > 0
      ? await prisma.fatura.findFirst({
          where: {
            id: kopyaId,
            sirketId: sirket.id,
          },
          include: {
            kalemler: {
              orderBy: {
                id: "asc",
              },
            },
          },
        })
      : null;

  const uiTip: UiTip =
    kopyaFatura
      ? kopyaFatura.tip === "SATIS" ||
        kopyaFatura.tip === "VERILEN_HIZMET"
        ? "SATIS"
        : "ALIS"
      : query.tip === "ALIS"
      ? "ALIS"
      : "SATIS";

  const uiTur: UiTur =
    kopyaFatura
      ? kopyaFatura.tip === "VERILEN_HIZMET" ||
        kopyaFatura.tip === "ALINAN_HIZMET"
        ? "HIZMET"
        : "URUN"
      : query.tur === "HIZMET"
      ? "HIZMET"
      : "URUN";

  const kopyaKasa =
    kopyaFatura?.kalemler.find(
      (kalem) => kalem.aciklama === "[KASA]"
    ) ?? null;

  const kopyaPalet =
    kopyaFatura?.kalemler.find(
      (kalem) => kalem.aciklama === "[PALET]"
    ) ?? null;

  const kopyaAnaKalem =
    kopyaFatura?.kalemler.find(
      (kalem) =>
        kalem.aciklama !== "[KASA]" &&
        kalem.aciklama !== "[PALET]"
    ) ?? null;

  const defaultCariId =
    kopyaFatura?.cariId
      ? String(kopyaFatura.cariId)
      : "";

  const defaultStokId =
    kopyaAnaKalem?.stokId
      ? String(kopyaAnaKalem.stokId)
      : "";

  const defaultHizmetAciklama =
    uiTur === "HIZMET"
      ? kopyaAnaKalem?.aciklama ?? ""
      : "";

  const defaultMiktar =
    kopyaAnaKalem
      ? String(Number(kopyaAnaKalem.miktar))
      : "1";

  const defaultBirimFiyat =
    kopyaAnaKalem
      ? String(Number(kopyaAnaKalem.birimFiyat))
      : "";

  const defaultKdvOrani =
    kopyaAnaKalem
      ? String(Number(kopyaAnaKalem.kdvOrani))
      : "20";

  const defaultKasaAdedi =
    kopyaKasa
      ? String(Number(kopyaKasa.miktar))
      : "0";

  const defaultKasaFiyati =
    kopyaKasa
      ? String(Number(kopyaKasa.birimFiyat))
      : "0";

  const defaultPaletAdedi =
    kopyaPalet
      ? String(Number(kopyaPalet.miktar))
      : "0";

  const defaultPaletFiyati =
    kopyaPalet
      ? String(Number(kopyaPalet.birimFiyat))
      : "0";

  const defaultParaBirimi =
    kopyaFatura?.paraBirimi ?? "TRY";

  const defaultOdemeSekli =
    kopyaFatura?.odemeSekli ?? "ACIK_HESAP";

  const defaultFinansHesapId =
    kopyaFatura?.finansHesapId
      ? String(kopyaFatura.finansHesapId)
      : "";

  const defaultVadeTarihi =
    kopyaFatura?.vadeTarihi
      ? kopyaFatura.vadeTarihi
          .toISOString()
          .slice(0, 10)
      : "";

  const defaultAciklama =
    kopyaFatura?.aciklama ?? "";







  const [



    cariler,



    hesaplar,



    stoklar,



  ] = await Promise.all([



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



        unvan: true,



        atlasKodu: true,



      },



    }),







    prisma.finansHesap.findMany({



      where: {



        sirketId: sirket.id,



        aktif: true,



      },







      orderBy: {



        ad: "asc",



      },







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







      orderBy: {



        ad: "asc",



      },







      select: {



        id: true,



        kod: true,



        ad: true,



        birim: true,



        mevcutMiktar: true,



      },



    }),



  ]);







  const bugun =



    new Date()



      .toISOString()



      .slice(0, 10);







  async function faturaKaydet(



    formData: FormData



  ) {



    "use server";







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







    const uiTip =



      String(



        formData.get("uiTip") ?? ""



      ) as UiTip;







    const uiTur =



      String(



        formData.get("uiTur") ?? ""



      ) as UiTur;







    const geriDon = (
       mesaj: string
     ): never => {



      redirect(



        `/hal/faturalar/yeni?tip=${uiTip}&tur=${uiTur}&error=${encodeURIComponent(



          mesaj



        )}`



      );



    };







    if (



      uiTip !== "SATIS" &&



      uiTip !== "ALIS"



    ) {



      return geriDon(



        "Geçersiz işlem türü."



      );



    }







    if (



      uiTur !== "URUN" &&



      uiTur !== "HIZMET"



    ) {



      return geriDon(



        "Geçersiz ürün/hizmet seçimi."



      );



    }







    const cariId =



      Number(



        formData.get("cariId")



      );







    if (



      !Number.isInteger(cariId) ||



      cariId <= 0



    ) {



      return geriDon(



        "Cari seçiniz."



      );



    }







    const cari =



      await prisma.cari.findFirst({



        where: {



          id: cariId,



          sirketId: sirket.id,



          aktif: true,



        },



      });







    if (!cari) {



      return geriDon(



        "Seçilen cari bulunamadı."



      );



    }







    const faturaNo =



      String(



        formData.get("faturaNo") ??



          ""



      ).trim() || null;







    const tarih =



      parseDate(



        formData,



        "tarih"



      );







    if (!tarih) {



      return geriDon(



        "Fatura tarihi zorunludur."



      );



    }







    const vadeTarihi =



      parseDate(



        formData,



        "vadeTarihi"



      );







    const paraBirimi =



      String(



        formData.get(



          "paraBirimi"



        ) ?? "TRY"



      );







    if (



      ![



        "TRY",



        "USD",



        "EUR",



        "GBP",



        "RUB",



      ].includes(paraBirimi)



    ) {



      return geriDon(



        "Geçersiz para birimi."



      );



    }







    const odemeSekli =



      String(



        formData.get(



          "odemeSekli"



        ) ?? "ACIK_HESAP"



      ) as OdemeSekli;







    if (



      ![



        "ACIK_HESAP",



        "NAKIT",



        "EFT_HAVALE",



        "KREDI_KARTI",



      ].includes(odemeSekli)



    ) {



      return geriDon(



        "Geçersiz ödeme şekli."



      );



    }







    const miktar =



      parseNumber(



        formData,



        "miktar"



      );







    const birimFiyat =



      parseNumber(



        formData,



        "birimFiyat"



      );







    const kdvOrani =



      parseNumber(



        formData,



        "kdvOrani"



      );







    
    const kasaAdedi =
      uiTur === "URUN"
        ? parseNumber(formData, "kasaAdedi")
        : 0;

    const kasaFiyati =
      uiTur === "URUN"
        ? parseNumber(formData, "kasaFiyati")
        : 0;

    const paletAdedi =
      uiTur === "URUN"
        ? parseNumber(formData, "paletAdedi")
        : 0;

    const paletFiyati =
      uiTur === "URUN"
        ? parseNumber(formData, "paletFiyati")
        : 0;

if (miktar <= 0) {



      return geriDon(



        "Miktar sıfırdan büyük olmalıdır."



      );



    }







    if (birimFiyat < 0) {



      return geriDon(



        "Birim fiyat geçersiz."



      );



    }







    if (



      kdvOrani < 0 ||



      kdvOrani > 100



    ) {



      return geriDon(



        "KDV oranı geçersiz."



      );



    }







    if (
      kasaAdedi < 0 ||
      kasaFiyati < 0 ||
      paletAdedi < 0 ||
      paletFiyati < 0
    ) {
      return geriDon(
        "Kasa ve palet adet/fiyat bilgileri eksi olamaz."
      );
    }

    const urunAraToplam =
      miktar * birimFiyat;

    const kasaAraToplam =
      kasaAdedi * kasaFiyati;

    const paletAraToplam =
      paletAdedi * paletFiyati;

    const araToplam =
      urunAraToplam +
      kasaAraToplam +
      paletAraToplam;

    const kdvToplam =
      araToplam *
      (kdvOrani / 100);

    const genelToplam =
      araToplam + kdvToplam;

    const urunGenelToplam =
      urunAraToplam +
      urunAraToplam * (kdvOrani / 100);

    const kasaGenelToplam =
      kasaAraToplam +
      kasaAraToplam * (kdvOrani / 100);

    const paletGenelToplam =
      paletAraToplam +
      paletAraToplam * (kdvOrani / 100);







    if (genelToplam <= 0) {



      return geriDon(



        "Fatura toplamı sıfırdan büyük olmalıdır."



      );



    }







    let stokId:



      number | null = null;







    let kalemAciklama = "";







    let birim:



      string | null = null;







    if (uiTur === "URUN") {



      stokId =



        Number(



          formData.get("stokId")



        );







      if (



        !Number.isInteger(



          stokId



        ) ||



        stokId <= 0



      ) {



        return geriDon(



          "Ürün seçiniz."



        );



      }







      const stok =



        await prisma.stok.findFirst({



          where: {



            id: stokId,



            sirketId:



              sirket.id,



            aktif: true,



          },



        });







      if (!stok) {



        return geriDon(



          "Ürün bulunamadı."



        );



      }







      if (



        uiTip === "SATIS" &&



        Number(



          stok.mevcutMiktar



        ) < miktar



      ) {



        return geriDon(



          `Yetersiz stok. Mevcut: ${Number(



            stok.mevcutMiktar



          ).toLocaleString(



            "tr-TR"



          )} ${stok.birim}`



        );



      }







      kalemAciklama =



        stok.ad;







      birim =



        stok.birim;



    } else {



      kalemAciklama =



        String(



          formData.get(



            "hizmetAciklama"



          ) ?? ""



        ).trim();







      if (!kalemAciklama) {



        return geriDon(



          "Hizmet açıklaması giriniz."



        );



      }







      birim = "Hizmet";



    }







    let finansHesapId:



      number | null = null;







    if (



      odemeSekli !==



      "ACIK_HESAP"



    ) {



      finansHesapId =



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



        return geriDon(



          "Ödeme hesabı seçiniz."



        );



      }







      const finansHesap =



        await prisma.finansHesap.findFirst({



          where: {



            id:



              finansHesapId,



            sirketId:



              sirket.id,



            aktif: true,



          },



        });







      if (!finansHesap) {



        return geriDon(



          "Finans hesabı bulunamadı."



        );



      }







      const beklenenTip =



        odemeSekli === "NAKIT"



          ? "KASA"



          : odemeSekli ===



            "EFT_HAVALE"



          ? "BANKA"



          : "KREDI_KARTI";







      if (



        finansHesap.tip !==



        beklenenTip



      ) {



        return geriDon(



          "Seçilen hesap ödeme şekliyle uyumlu değil."



        );



      }







      if (



        finansHesap.paraBirimi !==



        paraBirimi



      ) {



        return geriDon(



          `Fatura ${paraBirimi}, seçilen hesap ${finansHesap.paraBirimi}. Aynı para birimindeki hesabı seçiniz.`



        );



      }



    }







    const aciklama =



      String(



        formData.get(



          "aciklama"



        ) ?? ""



      ).trim() || null;







    const faturaTipi =

      uiTip === "SATIS" && uiTur === "URUN"

        ? "SATIS"

        : uiTip === "SATIS" && uiTur === "HIZMET"

        ? "VERILEN_HIZMET"

        : uiTip === "ALIS" && uiTur === "HIZMET"

        ? "ALINAN_HIZMET"

        : "ALIS";







    await prisma.$transaction(



      async (tx) => {



        const fatura =



          await tx.fatura.create({



            data: {



              sirketId:



                sirket.id,







              cariId:



                cari.id,







              finansHesapId,







              tip:



                faturaTipi,







              odemeSekli,







              paraBirimi:



                paraBirimi as



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







              odendi:



                odemeSekli !==



                "ACIK_HESAP",



            },



          });







        await tx.faturaKalemi.create({



          data: {



            faturaId:



              fatura.id,







            stokId:



              uiTur === "URUN"



                ? stokId



                : null,







            aciklama:



              kalemAciklama,







            miktar,







            birim,







            birimFiyat,







            kdvOrani,







            toplam:



              urunGenelToplam,



          },



        });







        
        if (uiTur === "URUN" && kasaAdedi > 0) {
          await tx.faturaKalemi.create({
            data: {
              faturaId: fatura.id,
              stokId: null,
              aciklama: "[KASA]",
              miktar: kasaAdedi,
              birim: "ADET",
              birimFiyat: kasaFiyati,
              kdvOrani,
              toplam: kasaGenelToplam,
            },
          });
        }

        if (uiTur === "URUN" && paletAdedi > 0) {
          await tx.faturaKalemi.create({
            data: {
              faturaId: fatura.id,
              stokId: null,
              aciklama: "[PALET]",
              miktar: paletAdedi,
              birim: "ADET",
              birimFiyat: paletFiyati,
              kdvOrani,
              toplam: paletGenelToplam,
            },
          });
        }

/*



          STOK



        */







        if (



          uiTur === "URUN" &&



          stokId



        ) {



          if (



            uiTip === "SATIS"



          ) {



            await tx.stok.update({



              where: {



                id: stokId,



              },







              data: {



                mevcutMiktar: {



                  decrement:



                    miktar,



                },



              },



            });







            await tx.stokHareket.create({



              data: {



                stokId,







                tarih,







                giris: 0,







                cikis:



                  miktar,







                belgeNo:



                  faturaNo,







                aciklama:



                  `Satış faturası${



                    faturaNo



                      ? ` - ${faturaNo}`



                      : ""



                  }`,



              },



            });



          } else {



            await tx.stok.update({



              where: {



                id: stokId,



              },







              data: {



                mevcutMiktar: {



                  increment:



                    miktar,



                },



              },



            });







            await tx.stokHareket.create({



              data: {



                stokId,







                tarih,







                giris:



                  miktar,







                cikis: 0,







                belgeNo:



                  faturaNo,







                aciklama:



                  `Alış faturası${



                    faturaNo



                      ? ` - ${faturaNo}`



                      : ""



                  }`,



              },



            });



          }



        }







        /*



          CARİ FATURA HAREKETİ



        */







        if (



          uiTip === "SATIS"



        ) {



          await tx.cariHareket.create({



            data: {



              cariId:



                cari.id,







              tarih,







              tip: "BORC",







              islemTuru:



                uiTur ===



                "URUN"



                  ? "SATIS_URUN"



                  : "SATIS_HIZMET",







              aciklama:



                `[Satış] ${



                  faturaNo ||



                  `Fatura #${fatura.id}`



                }`,







              belgeNo:



                faturaNo,







              borc:



                genelToplam,







              alacak: 0,



            },



          });



        } else {



          await tx.cariHareket.create({



            data: {



              cariId:



                cari.id,







              tarih,







              tip: "ALACAK",







              islemTuru:



                uiTur ===



                "URUN"



                  ? "ALIS_URUN"



                  : "ALIS_HIZMET",







              aciklama:



                `[${



                  uiTur ===



                  "URUN"



                    ? "Alış"



                    : "Alınan Hizmet"



                }] ${



                  faturaNo ||



                  `Fatura #${fatura.id}`



                }`,







              belgeNo:



                faturaNo,







              borc: 0,







              alacak:



                genelToplam,



            },



          });



        }







        /*



          ÖDEME / TAHSİLAT



        */







        if (



          odemeSekli !==



            "ACIK_HESAP" &&



          finansHesapId



        ) {



          if (



            uiTip === "SATIS"



          ) {



            /*



              Müşteriden tahsilat:



              Cari alacak hareketi



              + finans hesabına giriş



            */







            await tx.cariHareket.create({



              data: {



                cariId:



                  cari.id,







                tarih,







                tip: "ALACAK",







                islemTuru:



                  "FATURA_TAHSILAT",







                aciklama:



                  `[Tahsilat] ${



                    faturaNo ||



                    `Fatura #${fatura.id}`



                  }`,







                belgeNo:



                  faturaNo,







                borc: 0,







                alacak:



                  genelToplam,



              },



            });







            await tx.finansHareket.create({



              data: {



                finansHesapId,







                cariId:



                  cari.id,







                tarih,







                tip: "GIRIS",







                tutar:



                  genelToplam,







                aciklama:



                  `[Satış Tahsilatı] ${cari.unvan}`,







                belgeNo:



                  faturaNo,



              },



            });



          } else {



            /*



              Tedarikçiye ödeme:



              Cari borç hareketi



              + finans hesabından çıkış



            */







            await tx.cariHareket.create({



              data: {



                cariId:



                  cari.id,







                tarih,







                tip: "BORC",







                islemTuru:



                  "FATURA_ODEME",







                aciklama:



                  `[Ödeme] ${



                    faturaNo ||



                    `Fatura #${fatura.id}`



                  }`,







                belgeNo:



                  faturaNo,







                borc:



                  genelToplam,







                alacak: 0,



              },



            });







            await tx.finansHareket.create({



              data: {



                finansHesapId,







                cariId:



                  cari.id,







                tarih,







                tip: "CIKIS",







                tutar:



                  genelToplam,







                aciklama:



                  `[${



                    uiTur ===



                    "URUN"



                      ? "Alış Ödemesi"



                      : "Hizmet Ödemesi"



                  }] ${cari.unvan}`,







                belgeNo:



                  faturaNo,



              },



            });



          }



        }



      }



    );







    revalidatePath(



      "/hal"



    );







    revalidatePath(



      "/hal/faturalar"



    );







    revalidatePath(



      "/hal/cariler"



    );







    revalidatePath(



      `/hal/cariler/${cari.id}`



    );







    revalidatePath(



      "/hal/kasa"



    );







    revalidatePath(



      "/hal/banka"



    );







    revalidatePath(



      "/hal/yonetim/stok"



    );







    redirect(



      "/hal/faturalar"



    );



  }







  const inputClass =



    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500";







  const labelClass =



    "mb-2 block text-sm font-bold text-slate-300";







  const baslik =

    uiTip === "SATIS"

      ? uiTur === "HIZMET"

        ? "Verilen Hizmet Faturası"

        : "Satış Faturası"

      : uiTur === "HIZMET"

      ? "Alınan Hizmet Faturası"

      : "Alış Faturası";







  return (



    <main className="min-h-screen bg-slate-950 text-white">



      <div className="mx-auto max-w-4xl px-6 py-10">







        {/* BAŞLIK */}







        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">







          <div>



            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">



              Hal Komisyon & Soğuk Hava



            </p>







            <h1 className="mt-2 text-4xl font-black">



              {baslik}



            </h1>







            <p className="mt-2 text-slate-400">



              Ürün veya hizmet işlemini



              hızlıca kaydedin.



            </p>



          </div>







          <a



            href="/hal"



            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 transition hover:bg-slate-900"



          >



            ← Panele Dön



          </a>







        </div>







        {/* SATIŞ / ALIŞ */}







        <div className="mb-4 grid grid-cols-2 gap-3">







          <a



            href={`/hal/faturalar/yeni?tip=SATIS&tur=${uiTur}`}



            className={`rounded-2xl border p-5 text-center transition ${



              uiTip === "SATIS"



                ? "border-emerald-500 bg-emerald-950/20"



                : "border-slate-800 bg-slate-900"



            }`}



          >



            <div className="text-3xl">



              📈



            </div>







            <p className="mt-2 font-black">



              Satış



            </p>



          </a>







          <a



            href={`/hal/faturalar/yeni?tip=ALIS&tur=${uiTur}`}



            className={`rounded-2xl border p-5 text-center transition ${



              uiTip === "ALIS"



                ? "border-orange-500 bg-orange-950/20"



                : "border-slate-800 bg-slate-900"



            }`}



          >



            <div className="text-3xl">



              📉



            </div>







            <p className="mt-2 font-black">



              Alış



            </p>



          </a>







        </div>







        {/* ÜRÜN / HİZMET */}







        <div className="mb-7 grid grid-cols-2 gap-3">







          <a



            href={`/hal/faturalar/yeni?tip=${uiTip}&tur=URUN${kopyaFatura ? `&kopya=${kopyaFatura.id}` : ""}`}



            className={`rounded-xl border px-5 py-4 text-center font-black transition ${



              uiTur === "URUN"



                ? "border-cyan-500 bg-cyan-950/20 text-cyan-400"



                : "border-slate-800 bg-slate-900 text-slate-400"



            }`}



          >



            📦 Ürün



          </a>







          <a



            href={`/hal/faturalar/yeni?tip=${uiTip}&tur=HIZMET${kopyaFatura ? `&kopya=${kopyaFatura.id}` : ""}`}



            className={`rounded-xl border px-5 py-4 text-center font-black transition ${



              uiTur === "HIZMET"



                ? "border-violet-500 bg-violet-950/20 text-violet-400"



                : "border-slate-800 bg-slate-900 text-slate-400"



            }`}



          >



            🧾 Hizmet



          </a>







        </div>







        {/* HATA */}







        {query.error && (



          <div className="mb-6 rounded-xl border border-red-800 bg-red-950/30 p-4 font-semibold text-red-300">



            {query.error}



          </div>



        )}







        {kopyaFatura && (
          <div className="mb-6 rounded-xl border border-violet-700 bg-violet-950/20 p-4 text-sm text-violet-200">
            <span className="font-black">Çoğaltma modu:</span>{" "}
            Kaynak fatura #{kopyaFatura.faturaNo || kopyaFatura.id}.
            Cari ve fatura detayları kopyalandı. Yeni fatura numarasını girip kaydedebilirsiniz.
          </div>
        )}

        {/* FORM */}







        <form



          action={faturaKaydet}



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







          <div className="grid gap-5 md:grid-cols-2">







            {/* CARİ */}







            <div className="md:col-span-2">



              <label className={labelClass}>



                Cari *



              </label>







              <select



                name="cariId"



                required



                defaultValue={defaultCariId}



                className={inputClass}



              >



                <option value="">



                  Cari seçiniz



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



            </div>







            {/* FATURA NO */}







            <div>



              <label className={labelClass}>



                Fatura No



              </label>







              <input



                name="faturaNo"



                placeholder="Varsa"



                className={inputClass}



              />



            </div>







            {/* TARİH */}







            <div>



              <label className={labelClass}>



                Tarih *



              </label>







              <input



                type="date"



                name="tarih"



                defaultValue={bugun}



                required



                className={inputClass}



              />



            </div>







            {/* ÜRÜN */}







            {uiTur === "URUN" && (



              <div className="md:col-span-2">







                <label className={labelClass}>



                  Ürün *



                </label>







                <select



                  name="stokId"



                  required



                  defaultValue={defaultStokId}



                  className={inputClass}



                >







                  <option value="">



                    Ürün seçiniz



                  </option>







                  {stoklar.map(



                    (stok) => (



                      <option



                        key={stok.id}



                        value={stok.id}



                      >



                        {stok.kod} -{" "}



                        {stok.ad} | Stok:{" "}



                        {Number(



                          stok.mevcutMiktar



                        ).toLocaleString(



                          "tr-TR"



                        )}{" "}



                        {stok.birim}



                      </option>



                    )



                  )}







                </select>



              </div>



            )}







            {/* HİZMET */}







            {uiTur ===



              "HIZMET" && (



              <div className="md:col-span-2">







                <label className={labelClass}>



                  Hizmet Açıklaması *



                </label>







                <input



                  name="hizmetAciklama"



                  defaultValue={defaultHizmetAciklama}



                  required



                  placeholder={



                    uiTip === "SATIS"



                      ? "Örn: Verilen paketleme / hizmet faturası"



                      : "Örn: Alınan muhasebe / nakliye hizmeti"



                  }



                  className={inputClass}



                />







              </div>



            )}







            {/* MİKTAR */}







            <div>



              <label className={labelClass}>



                Miktar *



              </label>







              <input



                name="miktar"



                defaultValue={defaultMiktar}



                required



                inputMode="decimal"



                className={inputClass}



              />



            </div>







            {/* BİRİM FİYAT */}







            <div>



              <label className={labelClass}>



                Birim Fiyat *



              </label>







              <input



                name="birimFiyat"



                defaultValue={defaultBirimFiyat}



                required



                inputMode="decimal"



                placeholder="Örn: 10.000"



                className={inputClass}



              />



            </div>







            {uiTur === "URUN" && (
              <>
                <div>
                  <label className={labelClass}>
                    Kasa Adedi
                  </label>
                  <input
                    name="kasaAdedi"
                    defaultValue={defaultKasaAdedi}
                    inputMode="decimal"
                    placeholder="Örn: 500"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Kasa Birim Fiyatı
                  </label>
                  <input
                    name="kasaFiyati"
                    defaultValue={defaultKasaFiyati}
                    inputMode="decimal"
                    placeholder="Örn: 15"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Palet Adedi
                  </label>
                  <input
                    name="paletAdedi"
                    defaultValue={defaultPaletAdedi}
                    inputMode="decimal"
                    placeholder="Örn: 10"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Palet Birim Fiyatı
                  </label>
                  <input
                    name="paletFiyati"
                    defaultValue={defaultPaletFiyati}
                    inputMode="decimal"
                    placeholder="Örn: 250"
                    className={inputClass}
                  />
                </div>
              </>
            )}

            {/* KDV */}







            <div>



              <label className={labelClass}>



                KDV %



              </label>







              <input



                name="kdvOrani"



                defaultValue={defaultKdvOrani}



                inputMode="decimal"



                className={inputClass}



              />



            </div>







            {/* PARA BİRİMİ */}







            <div>



              <label className={labelClass}>



                Para Birimi



              </label>







              <select



                name="paraBirimi"



                defaultValue={defaultParaBirimi}



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







            {/* ÖDEME */}







            <div>



              <label className={labelClass}>



                Ödeme Şekli



              </label>







              <select



                name="odemeSekli"



                defaultValue={defaultOdemeSekli}



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







            {/* HESAP */}







            <div>



              <label className={labelClass}>



                Kasa / Banka / Kart



              </label>







              <select



                name="finansHesapId"



                defaultValue={defaultFinansHesapId}



                className={inputClass}



              >



                <option value="">



                  Açık hesapsa boş bırakın



                </option>







                {hesaplar.map(



                  (hesap) => (



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



                  )



                )}







              </select>







              <p className="mt-2 text-xs leading-5 text-slate-500">



                Nakit için KASA, EFT için BANKA,



                kredi kartı için KREDİ KARTI hesabı seçin.



              </p>



            </div>







            {/* VADE */}







            <div>



              <label className={labelClass}>



                Vade Tarihi



              </label>







              <input



                type="date"



                name="vadeTarihi"



                defaultValue={defaultVadeTarihi}



                className={inputClass}



              />



            </div>







            {/* AÇIKLAMA */}







            <div className="md:col-span-2">







              <label className={labelClass}>



                Açıklama



              </label>







              <textarea



                name="aciklama"



                defaultValue={defaultAciklama}



                rows={3}



                placeholder="İsteğe bağlı"



                className={inputClass}



              />







            </div>







          </div>







          {/* MANTIK */}







          <div className="mt-7 rounded-xl border border-cyan-900/50 bg-cyan-950/10 p-5">







            {uiTip ===



              "SATIS" ? (



              <>



                <p className="font-black text-emerald-400">



                  Satış



                </p>







                <p className="mt-2 text-sm leading-6 text-slate-300">



                  Cari borcu artar.



                  Ödeme alındıysa cari kapanır



                  ve seçilen kasa/banka hesabına



                  para girişi yapılır.



                  {uiTur === "URUN" &&



                    " Ürün stoğu azalır."}



                </p>



              </>



            ) : (



              <>



                <p className="font-black text-orange-400">



                  Alış



                </p>







                <p className="mt-2 text-sm leading-6 text-slate-300">



                  Cariye olan borcumuz artar.



                  Ödeme yapıldıysa cari kapanır



                  ve seçilen kasa/banka hesabından



                  para çıkışı yapılır.



                  {uiTur === "URUN" &&



                    " Ürün stoğu artar."}



                </p>



              </>



            )}







          </div>







          {/* BUTON */}







          <div className="mt-8 flex flex-col gap-3 sm:flex-row">







            <button



              type="submit"



              className={`flex-1 rounded-xl px-6 py-4 text-lg font-black transition ${



                uiTip === "SATIS"



                  ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"



                  : "bg-orange-500 text-slate-950 hover:bg-orange-400"



              }`}



            >



              {uiTip === "SATIS"

                ? uiTur === "HIZMET"

                  ? "Verilen Hizmeti Kaydet"

                  : "Satışı Kaydet"

                : uiTur === "HIZMET"

                ? "Alınan Hizmeti Kaydet"

                : "Alışı Kaydet"}



            </button>







            <a



              href="/hal"



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
