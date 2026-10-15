import { prisma } from "@/lib/prisma";



import { revalidatePath } from "next/cache";







type Props = {



  searchParams: Promise<{



    tip?: string;



  }>;



};







function money(



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







function date(value: Date) {



  return new Intl.DateTimeFormat("tr-TR", {



    day: "2-digit",



    month: "2-digit",



    year: "numeric",



  }).format(value);



}







function tipAdi(tip: string) {



  switch (tip) {



    case "SATIS":



      return "Satış";







    case "ALIS":



      return "Alış";

    case "VERILEN_HIZMET":
      return "Verilen Hizmet";







    case "ALINAN_HIZMET":



      return "Alınan Hizmet";







    default:



      return tip;



  }



}







function odemeAdi(odemeSekli: string) {



  switch (odemeSekli) {



    case "ACIK_HESAP":



      return "Açık Hesap";







    case "NAKIT":



      return "Nakit";







    case "EFT_HAVALE":



      return "EFT / Havale";







    case "KREDI_KARTI":



      return "Kredi Kartı";







    default:



      return odemeSekli;



  }



}







export default async function FaturalarPage({



  searchParams,



}: Props) {



  const query = await searchParams;







  const sirket =



    await prisma.sirket.findUnique({



      where: {



        kod: "HAL",



      },



    });







  if (!sirket) {



    return (



      <main className="min-h-screen bg-slate-950 p-10 text-white">



        Hal Komisyon & Soğuk Hava bulunamadı.



      </main>



    );



  }







  /*



    ==================================================



    FATURA SİL



    ==================================================



  */







  async function faturaSil(



    formData: FormData



  ) {



    "use server";







    const faturaId =



      Number(



        formData.get("faturaId")



      );







    if (



      !Number.isInteger(faturaId) ||



      faturaId <= 0



    ) {



      throw new Error(



        "Geçersiz fatura."



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







    const fatura =



      await prisma.fatura.findFirst({



        where: {



          id: faturaId,



          sirketId: sirket.id,



        },







        include: {



          cari: true,



        },



      });







    if (!fatura) {



      throw new Error(



        "Fatura bulunamadı."



      );



    }







    /*



      Fatura kalemlerini ayrıca çekiyoruz.



    */







    const kalemler =



      await prisma.faturaKalemi.findMany({



        where: {



          faturaId:



            fatura.id,



        },



      });







    /*



      ==================================================



      EŞLEŞEN CARİ HAREKETLERİ



      ==================================================



    */







    const cariHareketIdleri:



      number[] = [];







    const faturaReferansi =



      fatura.faturaNo ||



      `Fatura #${fatura.id}`;







    /*



      Ana fatura hareketi



    */







    const anaIslemTuru =

      fatura.tip === "SATIS"

        ? kalemler.some(

            (kalem) =>

              kalem.stokId !== null

          )

          ? "SATIS_URUN"

          : "SATIS_HIZMET"

        : fatura.tip === "VERILEN_HIZMET"

        ? "SATIS_HIZMET"

        : fatura.tip === "ALINAN_HIZMET"

        ? "ALIS_HIZMET"

        : "ALIS_URUN";



    const anaCariHareket =



      await prisma.cariHareket.findFirst({



        where: {



       cariId: fatura.cariId ?? undefined,







          tarih:



            fatura.tarih,







          islemTuru:



            anaIslemTuru,







          aciklama: {



            contains:



              faturaReferansi,



          },







          ...(fatura.faturaNo



            ? {



                belgeNo:



                  fatura.faturaNo,



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







    if (anaCariHareket) {



      cariHareketIdleri.push(



        anaCariHareket.id



      );



    }







    /*



      Peşin ödeme/tahsilat cari hareketi



    */







    if (



      fatura.odemeSekli !==



      "ACIK_HESAP"



    ) {



      const satisTarafi =

        fatura.tip === "SATIS" ||

        fatura.tip === "VERILEN_HIZMET";



      const odemeCariIslemTuru =

        satisTarafi

          ? "FATURA_TAHSILAT"

          : "FATURA_ODEME";



      const odemeCariHareket =



        await prisma.cariHareket.findFirst({



          where: {


cariId: fatura.cariId ?? undefined,







            tarih:



              fatura.tarih,







            islemTuru:



              odemeCariIslemTuru,







            aciklama: {



              contains:



                faturaReferansi,



            },







            ...(fatura.faturaNo



              ? {



                  belgeNo:



                    fatura.faturaNo,



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







      if (odemeCariHareket) {



        cariHareketIdleri.push(



          odemeCariHareket.id



        );



      }



    }







    /*



      ==================================================



      EŞLEŞEN FİNANS HAREKETİ



      ==================================================



    */







    let finansHareketId:



      number | null = null;







    if (



      fatura.odemeSekli !==



        "ACIK_HESAP" &&



      fatura.finansHesapId



    ) {



      const satisTarafi =

        fatura.tip === "SATIS" ||

        fatura.tip === "VERILEN_HIZMET";



      const finansTip =

        satisTarafi

          ? "GIRIS"

          : "CIKIS";



      const finansAciklama =

        satisTarafi

          ? "[Satış Tahsilatı]"

          : fatura.tip === "ALINAN_HIZMET"

          ? "[Hizmet Ödemesi]"

          : "[Alış Ödemesi]";



      const finansHareket =



        await prisma.finansHareket.findFirst({



          where: {



            finansHesapId:



              fatura.finansHesapId,







            cariId:



              fatura.cariId,







            tarih:



              fatura.tarih,







            tip:



              finansTip,







            tutar:



              fatura.genelToplam,







            aciklama: {



              startsWith:



                finansAciklama,



            },







            ...(fatura.faturaNo



              ? {



                  belgeNo:



                    fatura.faturaNo,



                }



              : {



                  belgeNo: null,



                }),



          },







          orderBy: {



            id: "desc",



          },







          select: {



            id: true,



          },



        });







      if (finansHareket) {



        finansHareketId =



          finansHareket.id;



      }



    }







    /*



      ==================================================



      STOK HAREKETLERİNİ BUL



      ==================================================



    */







    const stokHareketIdleri:



      number[] = [];







    for (const kalem of kalemler) {



      if (!kalem.stokId) {



        continue;



      }







      const stokHareket =



        await prisma.stokHareket.findFirst({



          where: {



            stokId:



              kalem.stokId,







            tarih:



              fatura.tarih,







            ...(fatura.faturaNo



              ? {



                  belgeNo:



                    fatura.faturaNo,



                }



              : {



                  belgeNo: null,



                }),







            ...(fatura.tip ===



            "SATIS"



              ? {



                  cikis:



                    kalem.miktar,



                }



              : {



                  giris:



                    kalem.miktar,



                }),



          },







          orderBy: {



            id: "desc",



          },







          select: {



            id: true,



          },



        });







      if (stokHareket) {



        stokHareketIdleri.push(



          stokHareket.id



        );



      }



    }







    /*



      ==================================================



      TÜM SİLME / GERİ ALMA İŞLEMİ



      ==================================================



    */







    await prisma.$transaction(



      async (tx) => {



        /*



          1) STOK MİKTARINI GERİ AL







          SATIŞ siliniyorsa:



          Daha önce stok azalmıştı.



          Şimdi geri artır.







          ALIŞ siliniyorsa:



          Daha önce stok artmıştı.



          Şimdi geri azalt.



        */







        for (const kalem of kalemler) {



          if (!kalem.stokId) {



            continue;



          }







          if (



            fatura.tip === "SATIS"



          ) {



            await tx.stok.update({



              where: {



                id:



                  kalem.stokId,



              },







              data: {



                mevcutMiktar: {



                  increment:



                    kalem.miktar,



                },



              },



            });



          } else if (



            fatura.tip === "ALIS"



          ) {



            await tx.stok.update({



              where: {



                id:



                  kalem.stokId,



              },







              data: {



                mevcutMiktar: {



                  decrement:



                    kalem.miktar,



                },



              },



            });



          }



        }







        /*



          2) STOK HAREKETLERİNİ SİL



        */







        if (



          stokHareketIdleri.length >



          0



        ) {



          await tx.stokHareket.deleteMany({



            where: {



              id: {



                in:



                  stokHareketIdleri,



              },



            },



          });



        }







        /*



          3) CARİ HAREKETLERİNİ SİL



        */







        if (



          cariHareketIdleri.length >



          0



        ) {



          await tx.cariHareket.deleteMany({



            where: {



              id: {



                in:



                  cariHareketIdleri,



              },



            },



          });



        }







        /*



          4) KASA / BANKA / KREDİ KARTI



             HAREKETİNİ SİL



        */







        if (finansHareketId) {



          await tx.finansHareket.delete({



            where: {



              id:



                finansHareketId,



            },



          });



        }







        /*



          5) FATURA KALEMLERİNİ SİL



        */







        await tx.faturaKalemi.deleteMany({



          where: {



            faturaId:



              fatura.id,



          },



        });







        /*



          6) FATURAYI SİL



        */







        await tx.fatura.delete({



          where: {



            id:



              fatura.id,



          },



        });



      }



    );







    /*



      ==================================================



      SAYFALARI YENİLE



      ==================================================



    */







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



      `/hal/cariler/${fatura.cariId}`



    );







    revalidatePath(



      "/hal/kasa"



    );







    revalidatePath(



      "/hal/banka"



    );







    revalidatePath(



      "/hal/stok"



    );







    revalidatePath(



      "/hal/yonetim/stok"



    );



  }







  /*



    ==================================================



    FATURALAR



    ==================================================



  */







  const tumFaturalar =



    await prisma.fatura.findMany({



      where: {



        sirketId: sirket.id,



      },







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



    });







  /*



    ==================================================



    FİLTRE



    ==================================================



  */







  const aktifFiltre =



    query.tip || "TUMU";







  const faturalar =

    aktifFiltre === "SATIS"

      ? tumFaturalar.filter(

          (fatura) =>

            fatura.tip === "SATIS"

        )

      : aktifFiltre === "ALIS"

      ? tumFaturalar.filter(

          (fatura) =>

            fatura.tip === "ALIS"

        )

      : aktifFiltre === "VERILEN_HIZMET"

      ? tumFaturalar.filter(

          (fatura) =>

            fatura.tip === "VERILEN_HIZMET"

        )

      : aktifFiltre === "ALINAN_HIZMET"

      ? tumFaturalar.filter(

          (fatura) =>

            fatura.tip === "ALINAN_HIZMET"

        )

      : tumFaturalar;



  return (



    <main className="min-h-screen bg-slate-950 text-white">







      <div className="mx-auto w-full max-w-[1550px] px-4 py-8 md:px-6">







        {/* BAŞLIK */}







        <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">







          <div>







            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">



              Hal Komisyon & Soğuk Hava



            </p>







            <h1 className="mt-2 text-3xl font-black md:text-4xl">



              Faturalar



            </h1>







            <p className="mt-2 text-sm text-slate-400">



              Alış, satış, verilen ve alınan hizmet faturaları



            </p>







          </div>







          <div className="flex flex-wrap gap-2">







            <a



              href="/hal"



              className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-900"



            >



              ← Ana Panel



            </a>







            <a



              href="/hal/faturalar/yeni?tip=SATIS&tur=URUN"



              className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-emerald-400"



            >



              + Satış



            </a>







            <a



              href="/hal/faturalar/yeni?tip=ALIS&tur=URUN"



              className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-orange-400"



            >



              + Alış



            </a>







            <a

              href="/hal/faturalar/yeni?tip=SATIS&tur=HIZMET"

              className="rounded-xl border border-sky-600 px-4 py-2.5 text-sm font-black text-sky-400 hover:bg-sky-950/30"

            >

              + Verilen Hizmet

            </a>



            <a

              href="/hal/faturalar/yeni?tip=ALIS&tur=HIZMET"

              className="rounded-xl border border-violet-600 px-4 py-2.5 text-sm font-black text-violet-400 hover:bg-violet-950/30"

            >

              + Alınan Hizmet

            </a>







          </div>







        </div>







        {/* FİLTRELER */}







        <div className="mb-5 flex flex-wrap gap-2">







          <a



            href="/hal/faturalar"



            className={`rounded-xl px-4 py-2 text-sm font-bold ${



              aktifFiltre === "TUMU"



                ? "bg-cyan-500 text-slate-950"



                : "border border-slate-700 text-slate-300"



            }`}



          >



            Tümü



          </a>







          <a



            href="/hal/faturalar?tip=SATIS"



            className={`rounded-xl px-4 py-2 text-sm font-bold ${



              aktifFiltre === "SATIS"



                ? "bg-emerald-500 text-slate-950"



                : "border border-slate-700 text-slate-300"



            }`}



          >



            Satış



          </a>







          <a



            href="/hal/faturalar?tip=ALIS"



            className={`rounded-xl px-4 py-2 text-sm font-bold ${



              aktifFiltre === "ALIS"



                ? "bg-orange-500 text-slate-950"



                : "border border-slate-700 text-slate-300"



            }`}



          >



            Alış



          </a>







          <a

            href="/hal/faturalar?tip=VERILEN_HIZMET"

            className={`rounded-xl px-4 py-2 text-sm font-bold ${

              aktifFiltre === "VERILEN_HIZMET"

                ? "bg-sky-500 text-slate-950"

                : "border border-slate-700 text-slate-300"

            }`}

          >

            Verilen Hizmet

          </a>



          <a



            href="/hal/faturalar?tip=ALINAN_HIZMET"



            className={`rounded-xl px-4 py-2 text-sm font-bold ${



              aktifFiltre ===



              "ALINAN_HIZMET"



                ? "bg-violet-500 text-white"



                : "border border-slate-700 text-slate-300"



            }`}



          >



            Alınan Hizmet



          </a>







        </div>







        {/* ÖZET */}







        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 px-5 py-4">







          <span className="text-sm text-slate-400">



            Gösterilen kayıt:



          </span>







          <span className="ml-2 font-black text-white">



            {faturalar.length}



          </span>







        </div>







        {/* TABLO */}







        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">







          {faturalar.length === 0 ? (



            <div className="p-12 text-center">







              <div className="text-4xl">



                🧾



              </div>







              <p className="mt-4 font-bold text-slate-300">



                Henüz fatura kaydı yok.



              </p>







            </div>



          ) : (



            <div className="overflow-x-auto">







              <table className="w-full min-w-[1050px] text-sm">







                <thead className="bg-slate-950/70">







                  <tr className="text-left text-xs text-slate-400">







                    <th className="px-4 py-4">



                      Tarih



                    </th>







                    <th className="px-4 py-4">



                      Tür



                    </th>







                    <th className="px-4 py-4">



                      Fatura No



                    </th>







                    <th className="px-4 py-4">



                      Cari



                    </th>







                    <th className="px-4 py-4">



                      Ödeme



                    </th>







                    <th className="px-4 py-4">



                      Döviz



                    </th>







                    <th className="px-4 py-4 text-right">



                      Toplam



                    </th>







                    <th className="px-4 py-4 text-right">



                      İşlem



                    </th>







                  </tr>







                </thead>







                <tbody>







                  {faturalar.map(



                    (fatura) => (



                      <tr



                        key={fatura.id}



                        className="border-t border-slate-800 transition hover:bg-slate-800/30"



                      >







                        {/* TARİH */}







                        <td className="whitespace-nowrap px-4 py-4 text-slate-300">



                          {date(



                            fatura.tarih



                          )}



                        </td>







                        {/* TÜR */}







                        <td className="px-4 py-4">







                          <span



                            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${



                              fatura.tip ===
                              "SATIS"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : fatura.tip ===
                                  "ALIS"
                                ? "bg-orange-500/10 text-orange-400"
                                : fatura.tip ===
                                  "VERILEN_HIZMET"
                                ? "bg-sky-500/10 text-sky-400"
                                : "bg-violet-500/10 text-violet-400"



                            }`}



                          >



                            {tipAdi(



                              fatura.tip



                            )}



                          </span>







                        </td>







                        {/* FATURA NO */}







                        <td className="px-4 py-4 font-semibold text-slate-300">



                          {fatura.faturaNo ??



                            `#${fatura.id}`}



                        </td>







                        {/* CARİ */}







                        <td className="px-4 py-4">







                          {fatura.cari ? (



                            <a



                              href={`/hal/cariler/${fatura.cari.id}`}



                              className="font-semibold text-cyan-400 hover:underline"



                            >



                              {



                                fatura.cari



                                  .unvan



                              }



                            </a>



                          ) : (



                            "-"



                          )}







                        </td>







                        {/* ÖDEME */}







                        <td className="px-4 py-4 text-xs text-slate-300">







                          {odemeAdi(



                            fatura.odemeSekli



                          )}







                          {fatura.odendi && (



                            <div className="mt-1 text-[10px] font-bold text-emerald-400">



                              ÖDENDİ



                            </div>



                          )}







                        </td>







                        {/* PARA BİRİMİ */}







                        <td className="px-4 py-4 font-bold">



                          {



                            fatura.paraBirimi



                          }



                        </td>







                        {/* TOPLAM */}







                        <td className="whitespace-nowrap px-4 py-4 text-right text-base font-black">







                          {money(



                            Number(



                              fatura.genelToplam



                            ),



                            fatura.paraBirimi



                          )}







                        </td>







                        {/* İŞLEM */}







                        <td className="px-4 py-4">







                          <div className="flex justify-end gap-2">







                            {fatura.cari && (



                              <a



                                href={`/hal/cariler/${fatura.cari.id}`}



                                className="rounded-lg border border-cyan-700 px-3 py-2 text-xs font-bold text-cyan-400 hover:bg-cyan-950/30"



                              >



                                Cari



                              </a>



                            )}







                            <form



                              action={



                                faturaSil



                              }



                            >







                              <input



                                type="hidden"



                                name="faturaId"



                                value={



                                  fatura.id



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







        <div className="mt-6 rounded-xl border border-red-900/50 bg-red-950/10 p-5">







          <p className="font-black text-red-400">



            Fatura Silme



          </p>







          <p className="mt-2 text-sm leading-6 text-slate-400">



            Bir fatura silindiğinde faturanın



            oluşturduğu cari hareketleri de



            kaldırılır. Peşin ödenmiş faturada



            eşleşen kasa, banka veya kredi kartı



            hareketi de silinir.



          </p>







          <p className="mt-2 text-sm leading-6 text-slate-400">



            Ürün satış faturası silinirse ürün



            stoğa geri eklenir. Ürün alış faturası



            silinirse faturayla eklenen miktar



            stoktan geri düşülür ve ilgili stok



            hareketi kaldırılır.



          </p>







          <p className="mt-2 text-sm font-bold text-amber-400">



            Silme işlemi kalıcıdır. Gerçek



            muhasebe kayıtlarında yalnızca yanlış



            veya test faturalarında kullanın.



          </p>







        </div>







      </div>







    </main>



  );



}
