"use server";



  import { prisma } from "@/lib/prisma";

  import { revalidatePath } from "next/cache";

  import { redirect } from "next/navigation";



  /* =========================================================

    ÇEK GETİR

  ========================================================= */



  async function getCekOrThrow(id: number) {

    const cek = await prisma.cek.findUnique({

      where: {

        id,

      },



      include: {

        cari: true,

        sirket: true,

        bankaHesabi: true,

      },

    });



    if (!cek) {

      throw new Error("Çek bulunamadı.");

    }



    return cek;

  }



  /* =========================================================

    SAYFALARI YENİLE

  ========================================================= */



  function yenile(

    cekId: number,

    cariId?: number | null,

    ciroCariId?: number | null

  ) {

    revalidatePath("/hal");

    revalidatePath("/hal/cekler");

    revalidatePath(`/hal/cekler/${cekId}`);

    revalidatePath("/hal/cariler");

    revalidatePath("/hal/banka");

    revalidatePath("/hal/kasa");

    revalidatePath("/hal/kasa-banka");



    if (cariId) {

      revalidatePath(`/hal/cariler/${cariId}`);

    }



    if (ciroCariId) {

      revalidatePath(`/hal/cariler/${ciroCariId}`);

    }

  }



  /* =========================================================

    BANKAYA VER

  ========================================================= */



  export async function bankayaVer(

    cekId: number,

    formData: FormData

  ) {

    const bankaHesabiId = Number(

      formData.get("bankaHesabiId")

    );



    if (

      !Number.isInteger(bankaHesabiId) ||

      bankaHesabiId <= 0

    ) {

      throw new Error(

        "Banka hesabı seçmelisiniz."

      );

    }



    const cek =

      await getCekOrThrow(cekId);



    if (cek.tip !== "ALINAN") {

      throw new Error(

        "Sadece alınan çek bankaya verilebilir."

      );

    }



    if (cek.durum !== "PORTFOYDE") {

      throw new Error(

        "Sadece portföydeki çek bankaya verilebilir."

      );

    }



    if (cek.ciroCariIslendi) {

      throw new Error(

        "Ciro edilmiş çek bankaya verilemez."

      );

    }



    const bankaHesabi =

      await prisma.finansHesap.findUnique({

        where: {

          id: bankaHesabiId,

        },

      });



    if (!bankaHesabi) {

      throw new Error(

        "Banka hesabı bulunamadı."

      );

    }



    if (bankaHesabi.tip !== "BANKA") {

      throw new Error(

        "Seçilen hesap banka hesabı değil."

      );

    }



    if (

      bankaHesabi.sirketId !==

      cek.sirketId

    ) {

      throw new Error(

        "Çek ile banka hesabı aynı şirkete ait değil."

      );

    }



    await prisma.cek.update({

      where: {

        id: cek.id,

      },



      data: {

        durum: "BANKADA",

        bankaHesabiId:

          bankaHesabi.id,

      },

    });



    yenile(

      cek.id,

      cek.cariId,

      cek.ciroCariId

    );



    redirect(

      `/hal/cekler/${cek.id}`

    );

  }



  /* =========================================================

    TAHSİL ET

  ========================================================= */



  export async function tahsilEt(

    cekId: number,

    formData: FormData

  ) {

    const bankaHesabiId = Number(

      formData.get("bankaHesabiId")

    );



    if (

      !Number.isInteger(bankaHesabiId) ||

      bankaHesabiId <= 0

    ) {

      throw new Error(

        "Tahsilat yapılacak banka hesabını seçmelisiniz."

      );

    }



    const cek =

      await getCekOrThrow(cekId);



    if (cek.tip !== "ALINAN") {

      throw new Error(

        "Sadece alınan çek tahsil edilebilir."

      );

    }



    if (cek.ciroCariIslendi) {

      throw new Error(

        "Ciro edilmiş çek tarafımızdan tahsil edilemez."

      );

    }



    if (cek.bankaIslendi) {

      throw new Error(

        "Bu çek daha önce bankaya işlendi."

      );

    }



    if (

      cek.durum !== "PORTFOYDE" &&

      cek.durum !== "BANKADA"

    ) {

      throw new Error(

        "Bu çek tahsil edilemez."

      );

    }



    const bankaHesabi =

      await prisma.finansHesap.findUnique({

        where: {

          id: bankaHesabiId,

        },

      });



    if (!bankaHesabi) {

      throw new Error(

        "Banka hesabı bulunamadı."

      );

    }



    if (bankaHesabi.tip !== "BANKA") {

      throw new Error(

        "Seçilen hesap banka hesabı değil."

      );

    }



    if (

      bankaHesabi.sirketId !==

      cek.sirketId

    ) {

      throw new Error(

        "Çek ile banka hesabı aynı şirkete ait değil."

      );

    }



    await prisma.$transaction(

      async (tx) => {

        await tx.finansHareket.create({

          data: {

            finansHesapId:

              bankaHesabi.id,



            cariId:

              cek.cariId,



            tarih:

              new Date(),



            tip: "GIRIS",



            tutar:

              cek.tutar,



            aciklama:

              `Çek tahsilatı${

                cek.cekNo

                  ? ` - Çek No: ${cek.cekNo}`

                  : ""

              }`,



            belgeNo:
                cek.cekNo ?? String(cek.id),



            transferRef:

              `CEK-TAHSIL-${cek.id}`,

          },

        });



        await tx.cek.update({

          where: {

            id: cek.id,

          },



          data: {

            durum:

              "TAHSIL_EDILDI",



            bankaHesabiId:

              bankaHesabi.id,



            bankaIslendi:

              true,

          },

        });

      }

    );



    yenile(

      cek.id,

      cek.cariId,

      cek.ciroCariId

    );



    redirect(

      `/hal/cekler/${cek.id}`

    );

  }



  /* =========================================================

    TAHSİLATI GERİ AL

  ========================================================= */



  export async function tahsilatiGeriAl(

    cekId: number

  ) {

    const cek =

      await getCekOrThrow(cekId);



    if (cek.tip !== "ALINAN") {

      throw new Error(

        "Sadece alınan çek tahsilatı geri alınabilir."

      );

    }



    if (

      cek.durum !== "TAHSIL_EDILDI" &&

      !cek.bankaIslendi

    ) {

      throw new Error(

        "Bu çek tahsil edilmiş görünmüyor."

      );

    }



    const silinecekFinansIds:

      number[] = [];



    /*

      YENİ SİSTEM

    */



    const bagliHareketler =

      await prisma.finansHareket.findMany({

        where: {

          transferRef:

            `CEK-TAHSIL-${cek.id}`,

        },



        select: {

          id: true,

        },

      });



    silinecekFinansIds.push(

      ...bagliHareketler.map(

        (hareket) =>

          hareket.id

      )

    );



    /*

      ESKİ SİSTEM

    */



    if (

      silinecekFinansIds.length === 0 &&

      cek.bankaHesabiId

    ) {

      const adaylar =

        await prisma.finansHareket.findMany({

          where: {

            finansHesapId:

              cek.bankaHesabiId,



            tip: "GIRIS",



            tutar:

              cek.tutar,



            transferRef:

              null,



            ...(cek.cekNo

              ? {

                  belgeNo:
                cek.cekNo ?? String(cek.id),

                }

              : {}),

          },



          orderBy: {

            id: "desc",

          },

        });



      const tahsilatAdaylari =

        adaylar.filter(

          (hareket) => {

            const metin =

              (

                hareket.aciklama || ""

              ).toLocaleLowerCase(

                "tr-TR"

              );



            return (

              metin.includes(

                "çek tahsil"

              ) ||

              metin.includes(

                "cek tahsil"

              )

            );

          }

        );



      if (

        tahsilatAdaylari.length === 1

      ) {

        silinecekFinansIds.push(

          tahsilatAdaylari[0].id

        );

      } else if (

        tahsilatAdaylari.length === 0 &&

        adaylar.length === 1

      ) {

        silinecekFinansIds.push(

          adaylar[0].id

        );

      } else if (

        tahsilatAdaylari.length > 1

      ) {

        throw new Error(

          "Bu çeke ait birden fazla tahsilat hareketi bulundu."

        );

      } else if (

        adaylar.length > 1

      ) {

        throw new Error(

          "Bu çeke ait tahsilat hareketi güvenli şekilde eşleştirilemedi."

        );

      }

    }



    await prisma.$transaction(

      async (tx) => {

        if (

          silinecekFinansIds.length >

          0

        ) {

          await tx.finansHareket.deleteMany({

            where: {

              id: {

                in:

                  silinecekFinansIds,

              },

            },

          });

        }



        await tx.cek.update({

          where: {

            id: cek.id,

          },



          data: {

            durum:

              "PORTFOYDE",



            bankaIslendi:

              false,



            bankaHesabiId:

              null,

          },

        });

      }

    );



    yenile(

      cek.id,

      cek.cariId,

      cek.ciroCariId

    );



    redirect(

      `/hal/cekler/${cek.id}`

    );

  }



  /* =========================================================

    VERİLEN ÇEK ÖDENDİ

  ========================================================= */



  export async function odendi(

    cekId: number,

    formData: FormData

  ) {

    const bankaHesabiId =

      Number(

        formData.get(

          "bankaHesabiId"

        )

      );



    if (

      !Number.isInteger(

        bankaHesabiId

      ) ||

      bankaHesabiId <= 0

    ) {

      throw new Error(

        "Ödeme yapılacak banka hesabını seçmelisiniz."

      );

    }



    const cek =

      await getCekOrThrow(

        cekId

      );



    if (

      cek.tip !== "VERILEN"

    ) {

      throw new Error(

        "Sadece verilen çek ödendi olarak işaretlenebilir."

      );

    }



    if (

      cek.bankaIslendi

    ) {

      throw new Error(

        "Bu çek daha önce bankaya işlendi."

      );

    }



    if (

      cek.durum === "ODENDI" ||

      cek.durum === "IPTAL" ||

      cek.durum === "IADE_ALINDI"

    ) {

      throw new Error(

        "Bu çek için ödeme işlemi yapılamaz."

      );

    }



    const bankaHesabi =

      await prisma.finansHesap.findUnique({

        where: {

          id:

            bankaHesabiId,

        },

      });



    if (!bankaHesabi) {

      throw new Error(

        "Banka hesabı bulunamadı."

      );

    }



    if (

      bankaHesabi.tip !== "BANKA"

    ) {

      throw new Error(

        "Seçilen hesap banka hesabı değil."

      );

    }



    if (

      bankaHesabi.sirketId !==

      cek.sirketId

    ) {

      throw new Error(

        "Çek ile banka hesabı aynı şirkete ait değil."

      );

    }



    await prisma.$transaction(

      async (tx) => {

        await tx.finansHareket.create({

          data: {

            finansHesapId:

              bankaHesabi.id,



            cariId:

              cek.cariId,



            tarih:

              new Date(),



            tip:

              "CIKIS",



            tutar:

              cek.tutar,



            aciklama:

              `Verilen çek ödemesi${

                cek.cekNo

                  ? ` - Çek No: ${cek.cekNo}`

                  : ""

              }`,



            belgeNo:
                cek.cekNo ?? String(cek.id),



            transferRef:

              `CEK-ODEME-${cek.id}`,

          },

        });



        await tx.cek.update({

          where: {

            id:

              cek.id,

          },



          data: {

            durum:

              "ODENDI",



            bankaHesabiId:

              bankaHesabi.id,



            bankaIslendi:

              true,

          },

        });

      }

    );



    yenile(

      cek.id,

      cek.cariId,

      cek.ciroCariId

    );



    redirect(

      `/hal/cekler/${cek.id}`

    );

  }



  /* =========================================================

    ALINAN ÇEKİ MÜŞTERİYE İADE ET

  ========================================================= */



  export async function alinanCekiIadeEt(

    cekId: number

  ) {

    const cek =

      await getCekOrThrow(

        cekId

      );



    if (

      cek.tip !== "ALINAN"

    ) {

      throw new Error(

        "Bu işlem sadece alınan çeklerde kullanılabilir."

      );

    }



    if (

      !cek.cariId

    ) {

      throw new Error(

        "Çekin bağlı olduğu cari bulunamadı."

      );

    }



    if (

      cek.bankaIslendi ||

      cek.durum ===

        "TAHSIL_EDILDI"

    ) {

      throw new Error(

        "Tahsil edilmiş çek önce tahsilattan geri alınmalıdır."

      );

    }



    if (

      cek.ciroCariIslendi ||

      cek.durum ===

        "CIROLANDI"

    ) {

      throw new Error(

        "Ciro edilmiş çek önce cirodan geri alınmalıdır."

      );

    }



    if (

      cek.durum !==

        "PORTFOYDE" &&

      cek.durum !==

        "BANKADA"

    ) {

      throw new Error(

        "Bu çek müşteriye iade edilemez."

      );

    }



    await prisma.$transaction(

      async (tx) => {

        /*

          Çek alınırken müşteri carisine

          ALACAK yazılmıştı.



          İade edilince ters kayıt:

          BORÇ

        */



        await tx.cariHareket.create({

          data: {

            cariId:

              cek.cariId!,



            tarih:

              new Date(),



            tip:

              "BORC",



            islemTuru:

              "CEK_IADE",



            aciklama:

              `[Alınan Çek İade] ${

                cek.cekNo

                  ? `Çek No: ${cek.cekNo}`

                  : "Çek"

              } - Çek müşteriye iade edildi`,



            belgeNo:
                cek.cekNo ?? String(cek.id),



            borc:

              cek.tutar,



            alacak:

              0,

          },

        });



        await tx.cek.update({

          where: {

            id:

              cek.id,

          },



          data: {

            durum:

              "IADE_EDILDI",



            bankaHesabiId:

              null,



            bankaIslendi:

              false,

          },

        });

      }

    );



    yenile(

      cek.id,

      cek.cariId,

      cek.ciroCariId

    );



    redirect(

      `/hal/cekler/${cek.id}`

    );

  }



  /* =========================================================

    VERİLEN ÇEKİ GERİ AL

  ========================================================= */



  export async function verilenCekiGeriAl(

    cekId: number

  ) {

    const cek =

      await getCekOrThrow(

        cekId

      );



    if (

      cek.tip !== "VERILEN"

    ) {

      throw new Error(

        "Bu işlem sadece verilen çeklerde kullanılabilir."

      );

    }



    if (

      !cek.cariId

    ) {

      throw new Error(

        "Çekin bağlı olduğu cari bulunamadı."

      );

    }



    if (

      cek.bankaIslendi ||

      cek.durum ===

        "ODENDI"

    ) {

      throw new Error(

        "Ödenmiş çek geri alınamaz. Önce banka ödeme işlemi geri alınmalıdır."

      );

    }



    if (

      cek.durum ===

        "IPTAL" ||

      cek.durum ===

        "IADE_ALINDI"

    ) {

      throw new Error(

        "Bu çek geri alınamaz."

      );

    }



    await prisma.$transaction(

      async (tx) => {

        /*

          Verilen çek ilk kayıtta

          cariye BORÇ yazılarak bizim

          borcumuzu azaltıyordu.



          Çek geri alınırsa bu ödemenin

          etkisi geri dönmeli.



          Ters kayıt:

          ALACAK

        */



        await tx.cariHareket.create({

          data: {

            cariId:

              cek.cariId!,



            tarih:

              new Date(),



            tip:

              "ALACAK",



            islemTuru:

              "VERILEN_CEK_IADE",



            aciklama:

              `[Verilen Çek Geri Alındı] ${

                cek.cekNo

                  ? `Çek No: ${cek.cekNo}`

                  : "Çek"

              } - Verilen çek karşı taraftan geri alındı`,



            belgeNo:
                cek.cekNo ?? String(cek.id),



            borc:

              0,



            alacak:

              cek.tutar,

          },

        });



        await tx.cek.update({

          where: {

            id:

              cek.id,

          },



          data: {

            durum:

              "IADE_ALINDI",



            bankaHesabiId:

              null,



            bankaIslendi:

              false,

          },

        });

      }

    );



    yenile(

      cek.id,

      cek.cariId,

      cek.ciroCariId

    );



    redirect(

      `/hal/cekler/${cek.id}`

    );

  }



  /* =========================================================

    CİRO ET

  ========================================================= */



  export async function ciroEt(

    cekId: number,

    formData: FormData

  ) {

    const ciroCariId =

      Number(

        formData.get(

          "ciroCariId"

        )

      );



    if (

      !Number.isInteger(

        ciroCariId

      ) ||

      ciroCariId <= 0

    ) {

      throw new Error(

        "Çekin ciro edileceği cariyi seçmelisiniz."

      );

    }



    const cek =

      await getCekOrThrow(

        cekId

      );



    if (

      cek.tip !==

      "ALINAN"

    ) {

      throw new Error(

        "Sadece alınan çek ciro edilebilir."

      );

    }



    if (

      cek.durum !==

      "PORTFOYDE"

    ) {

      throw new Error(

        "Sadece portföydeki çek ciro edilebilir."

      );

    }



    if (

      cek.bankaIslendi

    ) {

      throw new Error(

        "Bankaya işlenmiş çek ciro edilemez."

      );

    }



    if (

      cek.ciroCariIslendi

    ) {

      throw new Error(

        "Bu çek daha önce ciro edilmiş."

      );

    }



    const ciroCari =

      await prisma.cari.findUnique({

        where: {

          id:

            ciroCariId,

        },

      });



    if (!ciroCari) {

      throw new Error(

        "Ciro edilecek cari bulunamadı."

      );

    }



    if (

      ciroCari.sirketId !==

      cek.sirketId

    ) {

      throw new Error(

        "Çek ile ciro edilecek cari aynı şirkete ait değil."

      );

    }



    if (

      !ciroCari.aktif

    ) {

      throw new Error(

        "Pasif cariye çek ciro edilemez."

      );

    }



    await prisma.$transaction(

      async (tx) => {

        await tx.cariHareket.create({

          data: {

            cariId:

              ciroCari.id,



            tarih:

              new Date(),



            tip:

              "BORC",



            islemTuru:

              "CEK_CIRO",



            aciklama:

              `[Ciro Çek] ${

                cek.cekNo

                  ? `Çek No: ${cek.cekNo}`

                  : "Çek"

              } - ${

                cek.cari?.unvan

                  ? `${cek.cari.unvan} firmasından alınan çek`

                  : "Alınan çek"

              }`,



            belgeNo:
                cek.cekNo ?? String(cek.id),



            borc:

              cek.tutar,



            alacak:

              0,

          },

        });



        await tx.cek.update({

          where: {

            id:

              cek.id,

          },



          data: {

            durum:

              "CIROLANDI",



            ciroCariId:

              ciroCari.id,



            ciroCariIslendi:

              true,

          },

        });

      }

    );



    yenile(

      cek.id,

      cek.cariId,

      ciroCari.id

    );



    redirect(

      `/hal/cekler/${cek.id}`

    );

  }



  /* =========================================================

    CİRO EDİLEN ÇEKİ GERİ AL

  ========================================================= */



  export async function ciroCekiniGeriAl(

    cekId: number

  ) {

    const cek =

      await getCekOrThrow(

        cekId

      );



    if (

      cek.tip !== "ALINAN"

    ) {

      throw new Error(

        "Sadece alınan ve ciro edilmiş çek geri alınabilir."

      );

    }



    if (

      cek.durum !==

        "CIROLANDI" ||

      !cek.ciroCariIslendi ||

      !cek.ciroCariId

    ) {

      throw new Error(

        "Bu çek aktif olarak ciro edilmiş görünmüyor."

      );

    }



    const eskiCiroCariId =

      cek.ciroCariId;



    await prisma.$transaction(

      async (tx) => {

        /*

          Ciro sırasında hedef cariye

          BORÇ yazılmıştı.



          Çek bize geri geldiğinde

          ters hareket:

          ALACAK

        */



        await tx.cariHareket.create({

          data: {

            cariId:

              eskiCiroCariId,



            tarih:

              new Date(),



            tip:

              "ALACAK",



            islemTuru:

              "CEK_CIRO_GERI_AL",



            aciklama:

              `[Ciro Çek Geri Alındı] ${

                cek.cekNo

                  ? `Çek No: ${cek.cekNo}`

                  : "Çek"

              } - Ciro edilen çek geri alındı`,



            belgeNo:
                cek.cekNo ?? String(cek.id),



            borc:

              0,



            alacak:

              cek.tutar,

          },

        });



        /*

          Çek tekrar bizim portföyümüze döner.

        */



        await tx.cek.update({

          where: {

            id:

              cek.id,

          },



          data: {

            durum:

              "PORTFOYDE",



            ciroCariId:

              null,



            ciroCariIslendi:

              false,



            bankaHesabiId:

              null,



            bankaIslendi:

              false,

          },

        });

      }

    );



    yenile(

      cek.id,

      cek.cariId,

      eskiCiroCariId

    );



    redirect(

      `/hal/cekler/${cek.id}`

    );

  }



  /* =========================================================

    KARŞILIKSIZ

  ========================================================= */



  export async function karsiliksizYap(

    cekId: number

  ) {

    const cek =

      await getCekOrThrow(

        cekId

      );



    if (

      cek.tip !== "ALINAN"

    ) {

      throw new Error(

        "Karşılıksız işlemi sadece alınan çekler için kullanılabilir."

      );

    }



    if (

      cek.bankaIslendi

    ) {

      throw new Error(

        "Tahsil edilmiş çek karşılıksız yapılamaz."

      );

    }



    if (

      cek.durum ===

        "TAHSIL_EDILDI" ||

      cek.durum ===

        "IPTAL" ||

      cek.durum ===

        "KARSILIKSIZ" ||

      cek.durum ===

        "IADE_EDILDI"

    ) {

      throw new Error(

        "Bu çek karşılıksız olarak işaretlenemez."

      );

    }



    const ciroGeriAlinacak =

      cek.durum ===

        "CIROLANDI" &&

      cek.ciroCariIslendi &&

      cek.ciroCariId;



    await prisma.$transaction(

      async (tx) => {

        if (

          ciroGeriAlinacak

        ) {

          await tx.cariHareket.create({

            data: {

              cariId:

                cek.ciroCariId!,



              tarih:

                new Date(),



              tip:

                "ALACAK",



              islemTuru:

                "CEK_CIRO_KARSILIKSIZ",



              aciklama:

                `[Ciro Çek Karşılıksız] ${

                  cek.cekNo

                    ? `Çek No: ${cek.cekNo}`

                    : "Çek"

                } - Ciro işlemi geri alındı`,



              belgeNo:
                cek.cekNo ?? String(cek.id),



              borc:

                0,



              alacak:

                cek.tutar,

            },

          });

        }



        /*

          Karşılıksız alınan çekin

          ilk tahsilat etkisini de müşteriye

          geri yansıtıyoruz.



          Müşteri tekrar borçlandırılır.

        */



        if (

          cek.cariIslendi &&

          cek.cariId

        ) {

          await tx.cariHareket.create({

            data: {

              cariId:

                cek.cariId,



              tarih:

                new Date(),



              tip:

                "BORC",



              islemTuru:

                "CEK_KARSILIKSIZ",



              aciklama:

                `[Karşılıksız Çek] ${

                  cek.cekNo

                    ? `Çek No: ${cek.cekNo}`

                    : "Çek"

                } - Müşteri tekrar borçlandırıldı`,



              belgeNo:
                cek.cekNo ?? String(cek.id),



              borc:

                cek.tutar,



              alacak:

                0,

            },

          });

        }



        await tx.cek.update({

          where: {

            id:

              cek.id,

          },



          data: {

            durum:

              "KARSILIKSIZ",



            bankaHesabiId:

              null,



            bankaIslendi:

              false,



            ciroCariIslendi:

              false,

          },

        });

      }

    );



    yenile(

      cek.id,

      cek.cariId,

      cek.ciroCariId

    );



    redirect(

      `/hal/cekler/${cek.id}`

    );

  }



  /* =========================================================

    İPTAL

  ========================================================= */



  export async function iptalEt(
  cekId: number
) {
  const cek = await getCekOrThrow(cekId);

  if (cek.bankaIslendi) {
    throw new Error(
      "Bankaya işlenmiş çek iptal edilemez."
    );
  }

  if (cek.durum === "IPTAL") {
    throw new Error(
      "Bu çek zaten iptal edilmiş."
    );
  }

  if (
    cek.durum === "TAHSIL_EDILDI" ||
    cek.durum === "ODENDI"
  ) {
    throw new Error(
      "Tahsil edilmiş veya ödenmiş çek iptal edilemez."
    );
  }

  if (
    cek.durum === "IADE_EDILDI" ||
    cek.durum === "IADE_ALINDI" ||
    cek.durum === "KARSILIKSIZ"
  ) {
    throw new Error(
      "İade edilmiş veya karşılıksız çek iptal edilemez."
    );
  }

  const ciroGeriAlinacak =
    cek.durum === "CIROLANDI" &&
    cek.ciroCariIslendi &&
    cek.ciroCariId;

  await prisma.$transaction(
    async (tx) => {
      /*
        Ciro edilmiş çek iptal ediliyorsa önce
        ciro edilen carideki BORÇ etkisini geri al.
      */
      if (ciroGeriAlinacak) {
        await tx.cariHareket.create({
          data: {
            cariId: cek.ciroCariId!,
            tarih: new Date(),
            tip: "ALACAK",
            islemTuru: "CEK_CIRO_IPTAL",
            aciklama: `[Ciro Çek İptal] ${
              cek.cekNo
                ? `Çek No: ${cek.cekNo}`
                : `Çek ID: ${cek.id}`
            } - Ciro işlemi geri alındı`,
            belgeNo:
              cek.cekNo ?? String(cek.id),
            borc: 0,
            alacak: cek.tutar,
          },
        });
      }

      /*
        Çek ilk kaydedildiğinde:

        ALINAN  -> kaynak cariye ALACAK
        VERILEN -> kaynak cariye BORÇ

        Çek iptal edilirse bu ilk kayıt da
        ters hareket ile geri alınmalıdır.
      */
      if (cek.cariIslendi && cek.cariId) {
        await tx.cariHareket.create({
          data: {
            cariId: cek.cariId,
            tarih: new Date(),
            tip:
              cek.tip === "ALINAN"
                ? "BORC"
                : "ALACAK",
            islemTuru:
              cek.tip === "ALINAN"
                ? "ALINAN_CEK_IPTAL"
                : "VERILEN_CEK_IPTAL",
            aciklama: `[Çek İptal] ${
              cek.cekNo
                ? `Çek No: ${cek.cekNo}`
                : `Çek ID: ${cek.id}`
            } - Cari etkisi geri alındı`,
            belgeNo:
              cek.cekNo ?? String(cek.id),
            borc:
              cek.tip === "ALINAN"
                ? cek.tutar
                : 0,
            alacak:
              cek.tip === "VERILEN"
                ? cek.tutar
                : 0,
          },
        });
      }

      await tx.cek.update({
        where: {
          id: cek.id,
        },

        data: {
          durum: "IPTAL",
          cariIslendi: false,
          ciroCariIslendi: false,
          bankaIslendi: false,
          bankaHesabiId: null,
        },
      });
    }
  );

  yenile(
    cek.id,
    cek.cariId,
    cek.ciroCariId
  );

  redirect(
    `/hal/cekler/${cek.id}`
  );
}



/* =========================================================

    ÇEK SİL

  ========================================================= */



  export async function cekSil(

    cekId: number

  ) {

    const cek =

      await getCekOrThrow(

        cekId

      );



    const finansHareketIds:

      number[] = [];



    /*

      ========================================================

      YENİ SİSTEM BANKA HAREKETLERİ

      ========================================================

    */



    const yeniSistemHareketleri =

      await prisma.finansHareket.findMany({

        where: {

          transferRef: {

            in: [

              `CEK-TAHSIL-${cek.id}`,

              `CEK-ODEME-${cek.id}`,

            ],

          },

        },



        select: {

          id: true,

        },

      });



    finansHareketIds.push(

      ...yeniSistemHareketleri.map(

        (hareket) =>

          hareket.id

      )

    );



    /*

      ========================================================

      ESKİ SİSTEM BANKA HAREKETLERİ

      ========================================================

    */



    if (

      cek.bankaIslendi &&

      cek.bankaHesabiId &&

      finansHareketIds.length === 0

    ) {

      const finansAdaylari =

        await prisma.finansHareket.findMany({

          where: {

            finansHesapId:

              cek.bankaHesabiId,



            tutar:

              cek.tutar,



            transferRef:

              null,



            ...(cek.cekNo

              ? {

                  belgeNo:
                cek.cekNo ?? String(cek.id),

                }

              : {}),



            ...(cek.tip ===

            "ALINAN"

              ? {

                  tip:

                    "GIRIS",

                }

              : {

                  tip:

                    "CIKIS",

                }),

          },



          orderBy: {

            id: "desc",

          },

        });



      const cekAdaylari =

        finansAdaylari.filter(

          (hareket) => {

            const metin =

              (

                hareket.aciklama ||

                ""

              ).toLocaleLowerCase(

                "tr-TR"

              );



            if (

              cek.tip ===

              "ALINAN"

            ) {

              return (

                metin.includes(

                  "çek tahsil"

                ) ||

                metin.includes(

                  "cek tahsil"

                )

              );

            }



            return (

              metin.includes(

                "verilen çek"

              ) ||

              metin.includes(

                "verilen cek"

              ) ||

              metin.includes(

                "çek ödem"

              ) ||

              metin.includes(

                "cek odem"

              )

            );

          }

        );



      if (

        cekAdaylari.length ===

        1

      ) {

        finansHareketIds.push(

          cekAdaylari[0].id

        );

      } else if (

        cekAdaylari.length ===

          0 &&

        finansAdaylari.length ===

          1

      ) {

        finansHareketIds.push(

          finansAdaylari[0].id

        );

      } else if (

        cekAdaylari.length >

        1

      ) {

        throw new Error(

          "Bu çeke ait birden fazla banka hareketi bulundu. Yanlış banka hareketini silmemek için işlem durduruldu."

        );

      } else if (

        finansAdaylari.length >

        1

      ) {

        throw new Error(

          "Bu çeke ait banka hareketi güvenli şekilde eşleştirilemedi."

        );

      }

    }



    await prisma.$transaction(

      async (tx) => {

        /*

          BANKA HAREKETLERİ

        */



        if (

          finansHareketIds.length >

          0

        ) {

          await tx.finansHareket.deleteMany({

            where: {

              id: {

                in:

                  finansHareketIds,

              },

            },

          });

        }



        /*

          ÇEKLE İLGİLİ CARİ HAREKETLERİNİ

          GÜVENLİ ŞEKİLDE BULUP TEMİZLE

        */



        const ilgiliCariIdler =

          new Set<number>();



        if (cek.cariId) {

          ilgiliCariIdler.add(

            cek.cariId

          );

        }



        if (cek.ciroCariId) {

          ilgiliCariIdler.add(

            cek.ciroCariId

          );

        }



        for (

          const cariId of

          ilgiliCariIdler

        ) {

          const cariHareketleri =

            await tx.cariHareket.findMany({

              where: {
                cariId,
                belgeNo:
                  cek.cekNo ?? String(cek.id),
              },

              select: {

                id: true,

                aciklama: true,

              },

            });



          const cekleIlgili =

            cariHareketleri.filter(

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

                    "çek"

                  ) ||

                  metin.includes(

                    "cek"

                  )

                );

              }

            );



          if (

            cekleIlgili.length >

            0

          ) {

            await tx.cariHareket.deleteMany({

              where: {

                id: {

                  in:

                    cekleIlgili.map(

                      (hareket) =>

                        hareket.id

                    ),

                },

              },

            });

          }

        }



        /*

          ÇEK KAYDI

        */



        await tx.cek.delete({

          where: {

            id:

              cek.id,

          },

        });

      }

    );



    revalidatePath("/hal");

    revalidatePath("/hal/cekler");

    revalidatePath("/hal/banka");

    revalidatePath("/hal/kasa");

    revalidatePath("/hal/kasa-banka");

    revalidatePath("/hal/cariler");



    if (cek.cariId) {

      revalidatePath(

        `/hal/cariler/${cek.cariId}`

      );

    }



    if (cek.ciroCariId) {

      revalidatePath(

        `/hal/cariler/${cek.ciroCariId}`

      );

    }



    redirect("/hal/cekler");

  }
