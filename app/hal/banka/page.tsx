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



  const geriAlinanHareketIdleri =
    new Set<number>(
      bankalarBakiyeli
        .flatMap((banka) => banka.hareketler)
        .map((hareket) => hareket.transferRef)
        .filter(
          (ref): ref is string =>
            typeof ref === "string" &&
            ref.startsWith("GERI_AL:")
        )
        .map((ref) => Number(ref.replace("GERI_AL:", "")))
        .filter((id) => Number.isInteger(id) && id > 0)
    );



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



  async function geriAlmaIptalEt(
    formData: FormData
  ) {
    "use server";

    const tersHareketId = Number(
      formData.get("hareketId")
    );

    if (
      !Number.isInteger(tersHareketId) ||
      tersHareketId <= 0
    ) {
      throw new Error(
        "Geçersiz geri alma kaydı."
      );
    }

    const sirket = await prisma.sirket.findUnique({
      where: { kod: "HAL" },
    });

    if (!sirket) {
      throw new Error(
        "Hal Komisyon & Soğuk Hava şirketi bulunamadı."
      );
    }

    const tersHareket = await prisma.finansHareket.findUnique({
      where: { id: tersHareketId },
      include: {
        finansHesap: true,
        cari: true,
      },
    });

    if (
      !tersHareket ||
      tersHareket.finansHesap.sirketId !== sirket.id ||
      tersHareket.finansHesap.tip !== "BANKA" ||
      !tersHareket.transferRef?.startsWith("GERI_AL:")
    ) {
      throw new Error(
        "Geçerli bir geri alma kaydı bulunamadı."
      );
    }

    const orijinalHareketId = Number(
      tersHareket.transferRef.replace("GERI_AL:", "")
    );

    if (
      !Number.isInteger(orijinalHareketId) ||
      orijinalHareketId <= 0
    ) {
      throw new Error(
        "Geri alma kaydının kaynak hareketi geçersiz."
      );
    }

    const orijinalHareket = await prisma.finansHareket.findUnique({
      where: { id: orijinalHareketId },
      include: {
        finansHesap: true,
        cari: true,
      },
    });

    // Eski kayıtlarda kaynak manuel hareket daha önce silinmiş olabilir.
    // Bu durumda kalan [Geri Alındı] kaydını güvenli şekilde temizle.
    if (!orijinalHareket) {
      let tersCariHareketId: number | null = null;

      if (tersHareket.cariId) {
        const tersCariHareket = await prisma.cariHareket.findFirst({
          where: {
            cariId: tersHareket.cariId,
            islemTuru: "FINANS_GERI_AL",
            belgeNo: tersHareket.belgeNo,
            aciklama: tersHareket.aciklama,
          },
          orderBy: { id: "desc" },
          select: { id: true },
        });

        tersCariHareketId = tersCariHareket?.id ?? null;
      }

      await prisma.$transaction(async (tx) => {
        if (tersCariHareketId) {
          await tx.cariHareket.delete({
            where: { id: tersCariHareketId },
          });
        }

        await tx.finansHareket.delete({
          where: { id: tersHareket.id },
        });
      });

      revalidatePath("/hal/banka");
      revalidatePath("/hal");
      revalidatePath("/hal/cariler");

      if (tersHareket.cariId) {
        revalidatePath(`/hal/cariler/${tersHareket.cariId}`);
      }

      return;
    }

    const temelEslesme =
      orijinalHareket.finansHesap.sirketId === sirket.id &&
      orijinalHareket.finansHesap.tip === "BANKA" &&
      orijinalHareket.finansHesapId === tersHareket.finansHesapId &&
      Number(orijinalHareket.tutar) === Number(tersHareket.tutar);

    if (!temelEslesme) {
      throw new Error(
        "Kaynak banka hareketi ile geri alma kaydı güvenli şekilde eşleştirilemedi."
      );
    }

    let orijinalCariHareketId: number | null = null;
    let tersCariHareketId: number | null = null;

    if (orijinalHareket.cariId) {
      const orijinalIslemTuru =
        orijinalHareket.tip === "GIRIS"
          ? "GELEN_EFT"
          : "GIDEN_EFT";

      const orijinalCariHareket = await prisma.cariHareket.findFirst({
        where: {
          cariId: orijinalHareket.cariId,
          islemTuru: orijinalIslemTuru,
          belgeNo: orijinalHareket.belgeNo,
          ...(orijinalHareket.tip === "GIRIS"
            ? { alacak: orijinalHareket.tutar }
            : { borc: orijinalHareket.tutar }),
        },
        orderBy: { id: "desc" },
        select: { id: true },
      });

      orijinalCariHareketId = orijinalCariHareket?.id ?? null;

      const tersCariHareket = await prisma.cariHareket.findFirst({
        where: {
          cariId: orijinalHareket.cariId,
          islemTuru: "FINANS_GERI_AL",
          belgeNo: orijinalHareket.belgeNo,
          aciklama: { startsWith: "[Geri Alındı]" },
          ...(orijinalHareket.tip === "GIRIS"
            ? { borc: orijinalHareket.tutar }
            : { alacak: orijinalHareket.tutar }),
        },
        orderBy: { id: "desc" },
        select: { id: true },
      });

      tersCariHareketId = tersCariHareket?.id ?? null;
    }

    await prisma.$transaction(async (tx) => {
      if (orijinalCariHareketId) {
        await tx.cariHareket.delete({
          where: { id: orijinalCariHareketId },
        });
      }

      if (tersCariHareketId) {
        await tx.cariHareket.delete({
          where: { id: tersCariHareketId },
        });
      }

      await tx.finansHareket.delete({
        where: { id: tersHareket.id },
      });

      await tx.finansHareket.delete({
        where: { id: orijinalHareket.id },
      });
    });

    revalidatePath("/hal/banka");
    revalidatePath("/hal");
    revalidatePath("/hal/cariler");

    if (orijinalHareket.cariId) {
      revalidatePath(`/hal/cariler/${orijinalHareket.cariId}`);
    }
  }


  async function hareketSil(
    formData: FormData
  ) {
    "use server";

    const hareketId = Number(
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
        "Hal Komisyon & Soğuk Hava şirketi bulunamadı."
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
        "Otomatik, geri alma veya transfer kaynaklı hareketler buradan silinemez."
      );
    }

    if (
      hareket.tip !== "GIRIS" &&
      hareket.tip !== "CIKIS"
    ) {
      throw new Error(
        "Bu hareket türü silinemez."
      );
    }

    let cariHareketId: number | null = null;

    if (hareket.cariId) {
      const islemTuru =
        hareket.tip === "GIRIS"
          ? "GELEN_EFT"
          : "GIDEN_EFT";

      const cariHareket =
        await prisma.cariHareket.findFirst({
          where: {
            cariId: hareket.cariId,
            tarih: hareket.tarih,
            islemTuru,
            belgeNo: hareket.belgeNo,
            aciklama: {
              contains: hareket.aciklama,
            },
            ...(hareket.tip === "GIRIS"
              ? { alacak: hareket.tutar }
              : { borc: hareket.tutar }),
          },
          orderBy: {
            id: "desc",
          },
          select: {
            id: true,
          },
        });

      cariHareketId =
        cariHareket?.id ?? null;
    }

    await prisma.$transaction(
      async (tx) => {
        if (cariHareketId) {
          await tx.cariHareket.delete({
            where: {
              id: cariHareketId,
            },
          });
        }

        await tx.finansHareket.delete({
          where: {
            id: hareket.id,
          },
        });
      }
    );

    revalidatePath("/hal/banka");
    revalidatePath("/hal");
    revalidatePath("/hal/cariler");

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

                      const geriAlmaKaydi =
                        hareket.transferRef?.startsWith(
                          "GERI_AL:"
                        ) ?? false;

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



                            {geriAlmaKaydi ? (
                              <form
                                action={geriAlmaIptalEt}
                              >
                                <input
                                  type="hidden"
                                  name="hareketId"
                                  value={hareket.id}
                                />

                                <button
                                  type="submit"
                                  className="rounded-lg border border-amber-600 px-3 py-2 text-sm font-bold text-amber-400 transition hover:bg-amber-950/30"
                                >
                                  İptal Et
                                </button>
                              </form>
                            ) : geriAlinabilir ? (
                              <div className="flex justify-end gap-2">
                                <form
                                  action={hareketGeriAl}
                                >
                                  <input
                                    type="hidden"
                                    name="hareketId"
                                    value={hareket.id}
                                  />

                                  <button
                                    type="submit"
                                    className="rounded-lg border border-red-700 px-3 py-2 text-sm font-bold text-red-400 transition hover:bg-red-950/30"
                                  >
                                    Geri Al
                                  </button>
                                </form>

                                <form
                                  action={hareketSil}
                                >
                                  <input
                                    type="hidden"
                                    name="hareketId"
                                    value={hareket.id}
                                  />

                                  <button
                                    type="submit"
                                    className="rounded-lg bg-red-600 px-3 py-2 text-sm font-black text-white transition hover:bg-red-500"
                                  >
                                    Sil
                                  </button>
                                </form>
                              </div>
                            ) : dahaOnceGeriAlinmis ? (
                              <span className="text-xs font-bold text-amber-500">
                                Geri Alındı
                              </span>
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

            Geri Al / Sil Mantığı

          </p>

          <p className="mt-2 text-sm leading-6 text-slate-400">

            Manuel Gelen EFT ve Giden EFT kayıtlarında Geri Al veya Sil kullanılabilir.
            Geri Al, geçmişi koruyarak ters hareket oluşturur. Geri alma kaydında görünen
            İptal Et butonu, hem orijinal manuel hareketi hem de oluşturulan ters hareketi
            birlikte kaldırır; cariye bağlıysa iki cari hareketi de temizlenir. Fatura, kredi
            ve transfer kaynaklı otomatik hareketler buradan silinemez.

          </p>



        </div>



      </div>

    </main>

  );

}