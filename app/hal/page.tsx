import { prisma } from "@/lib/prisma";



import {



  tcmbKurlariGetir,



  tlKarsiligi,



} from "@/lib/tcmb";



function money(value: number) {



  return new Intl.NumberFormat("tr-TR", {



    style: "currency",



    currency: "TRY",



    minimumFractionDigits: 2,



    maximumFractionDigits: 2,



  }).format(value);



}



type Props = {

  searchParams: Promise<{

    donem?: string;

    baslangic?: string;

    bitis?: string;

  }>;

};



export default async function HalPage({

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



        Hal Komisyon & Soğuk Hava şirketi bulunamadı.



      </main>



    );



  }



  const donem =

    query.donem || "TUMU";



  const bugun = new Date();

  bugun.setHours(0, 0, 0, 0);



  let donemBaslangic: Date | null = null;

  let donemBitis: Date | null = null;



  if (donem === "BUGUN") {

    donemBaslangic = new Date(bugun);

    donemBitis = new Date(bugun);

    donemBitis.setHours(23, 59, 59, 999);

  } else if (donem === "AY") {

    donemBaslangic = new Date(

      bugun.getFullYear(),

      bugun.getMonth(),

      1,

      0,

      0,

      0,

      0

    );



    donemBitis = new Date(

      bugun.getFullYear(),

      bugun.getMonth() + 1,

      0,

      23,

      59,

      59,

      999

    );

  } else if (donem === "YIL") {

    donemBaslangic = new Date(

      bugun.getFullYear(),

      0,

      1,

      0,

      0,

      0,

      0

    );



    donemBitis = new Date(

      bugun.getFullYear(),

      11,

      31,

      23,

      59,

      59,

      999

    );

  } else if (donem === "OZEL") {

    if (query.baslangic) {

      const baslangic = new Date(

        `${query.baslangic}T00:00:00`

      );



      if (!Number.isNaN(baslangic.getTime())) {

        donemBaslangic = baslangic;

      }

    }



    if (query.bitis) {

      const bitis = new Date(

        `${query.bitis}T23:59:59.999`

      );



      if (!Number.isNaN(bitis.getTime())) {

        donemBitis = bitis;

      }

    }

  }



  const tarihAraligindaMi = (tarih: Date) => {

    if (donemBaslangic && tarih < donemBaslangic) {

      return false;

    }



    if (donemBitis && tarih > donemBitis) {

      return false;

    }



    return true;

  };



  const donemAdi =

    donem === "BUGUN"

      ? "Bugün"

      : donem === "AY"

      ? "Bu Ay"

      : donem === "YIL"

      ? "Bu Yıl"

      : donem === "OZEL"

      ? "Özel Tarih Aralığı"

      : "Tüm Zamanlar";



  const seciliBaslangic =

    query.baslangic || "";



  const seciliBitis =

    query.bitis || "";







  const [



    finansHesaplari,



    cariler,



    cekler,



    krediler,



    faturalar,



    giderler,



    kurlar,



  ] = await Promise.all([



    prisma.finansHesap.findMany({



      where: {



        sirketId: sirket.id,



        aktif: true,



      },



      include: {



        hareketler: true,



      },



    }),



    prisma.cari.findMany({



      where: {



        sirketId: sirket.id,



        aktif: true,



      },



      include: {



        hareketler: true,



      },



    }),



    prisma.cek.findMany({



      where: {



        sirketId: sirket.id,



      },



      select: {



        tip: true,



        durum: true,



        tutar: true,



      },



    }),



    prisma.kredi.findMany({



      where: {



        sirketId: sirket.id,



        durum: "AKTIF",



      },



      select: {



        kalanBorc: true,



        paraBirimi: true,



      },



    }),



    prisma.fatura.findMany({



      where: {



        sirketId: sirket.id,



      },



      select: {



        tip: true,



        genelToplam: true,



        paraBirimi: true,



        tarih: true,



      },



    }),



    prisma.gider.findMany({



      where: {



        sirketId: sirket.id,



      },



      select: {



        tutar: true,



        tarih: true,



      },



    }),



    tcmbKurlariGetir(),



  ]);



  /*



    =========================================================



    KASA / BANKA BAKİYELERİ



    =========================================================



  */



  const hesapBakiyeleri =



    finansHesaplari.map(



      (hesap) => {



        const bakiye =



          hesap.hareketler.reduce(



            (toplam, hareket) => {



              const tutar =



                Number(



                  hareket.tutar



                );



              if (



                hareket.tip ===



                  "GIRIS" ||



                hareket.tip ===



                  "TRANSFER_GIRIS"



              ) {



                return (



                  toplam + tutar



                );



              }



              if (



                hareket.tip ===



                  "CIKIS" ||



                hareket.tip ===



                  "TRANSFER_CIKIS"



              ) {



                return (



                  toplam - tutar



                );



              }



              return toplam;



            },



            0



          );



        const tlDegeri =



          tlKarsiligi(



            bakiye,



            hesap.paraBirimi,



            kurlar



          );



        return {



          ...hesap,



          bakiye,



          tlDegeri,



        };



      }



    );



  const toplamKasaTl =



    hesapBakiyeleri



      .filter(



        (hesap) =>



          hesap.tip === "KASA"



      )



      .reduce(



        (toplam, hesap) =>



          toplam +



          hesap.tlDegeri,



        0



      );



  const toplamBankaTl =



    hesapBakiyeleri



      .filter(



        (hesap) =>



          hesap.tip === "BANKA"



      )



      .reduce(



        (toplam, hesap) =>



          toplam +



          hesap.tlDegeri,



        0



      );



  /*



    =========================================================



    CARİ BORÇ / ALACAK



    =========================================================



  */



  let toplamAlacak = 0;



  let toplamBorc = 0;



  for (const cari of cariler) {



    let borc =



      Number(



        cari.acilisBorc



      );



    let alacak =



      Number(



        cari.acilisAlacak



      );



    for (



      const hareket of



        cari.hareketler



    ) {



      borc +=



        Number(



          hareket.borc



        );



      alacak +=



        Number(



          hareket.alacak



        );



    }



    const bakiye =



      borc - alacak;



    if (bakiye > 0) {



      toplamAlacak +=



        bakiye;



    }



    if (bakiye < 0) {



      toplamBorc +=



        Math.abs(



          bakiye



        );



    }



  }



  /*



    =========================================================



    ÇEKLER



    =========================================================



  */



  const toplamAlinanCek =



    cekler



      .filter(



        (cek) =>



          cek.tip ===



            "ALINAN" &&



          (



            cek.durum ===



              "PORTFOYDE" ||



            cek.durum ===



              "BANKADA"



          )



      )



      .reduce(



        (toplam, cek) =>



          toplam +



          Number(



            cek.tutar



          ),



        0



      );



const toplamVerilenCek =



  cekler



    .filter(



      (cek) =>



        cek.tip === "VERILEN" &&



        cek.durum !== "ODENDI" &&



        cek.durum !== "IPTAL" &&



        cek.durum !== "IADE_ALINDI"



    )



    .reduce(



      (toplam, cek) =>



        toplam + Number(cek.tutar),



      0



    );



    /*



    =========================================================



    ANLIK KÂR / ZARAR



    =========================================================



  */



  const donemFaturalari =

    faturalar.filter((fatura) =>

      tarihAraligindaMi(fatura.tarih)

    );



  const donemGiderleri =

    giderler.filter((gider) =>

      tarihAraligindaMi(gider.tarih)

    );



  const faturaTl = (



    tutar: number,



    paraBirimi: string



  ) =>



    tlKarsiligi(



      tutar,



      paraBirimi as "TRY" | "USD" | "EUR" | "GBP" | "RUB",



      kurlar



    );



  const toplamSatis = donemFaturalari



    .filter((fatura) => fatura.tip === "SATIS")



    .reduce(



      (toplam, fatura) =>



        toplam +



        faturaTl(



          Number(fatura.genelToplam),



          fatura.paraBirimi



        ),



      0



    );



  const toplamVerilenHizmet = donemFaturalari



    .filter(



      (fatura) =>



        fatura.tip === "VERILEN_HIZMET"



    )



    .reduce(



      (toplam, fatura) =>



        toplam +



        faturaTl(



          Number(fatura.genelToplam),



          fatura.paraBirimi



        ),



      0



    );



  const toplamAlis = donemFaturalari



    .filter((fatura) => fatura.tip === "ALIS")



    .reduce(



      (toplam, fatura) =>



        toplam +



        faturaTl(



          Number(fatura.genelToplam),



          fatura.paraBirimi



        ),



      0



    );



  const toplamAlinanHizmet = donemFaturalari



    .filter(



      (fatura) =>



        fatura.tip === "ALINAN_HIZMET"



    )



    .reduce(



      (toplam, fatura) =>



        toplam +



        faturaTl(



          Number(fatura.genelToplam),



          fatura.paraBirimi



        ),



      0



    );



  const toplamDigerGider = donemGiderleri.reduce(



    (toplam, gider) =>



      toplam + Number(gider.tutar),



    0



  );



  const toplamGelir =



    toplamSatis +



    toplamVerilenHizmet;



  const toplamMaliyetVeGider =



    toplamAlis +



    toplamAlinanHizmet +



    toplamDigerGider;



  const netKarZarar =



    toplamGelir -



    toplamMaliyetVeGider;



  const karMi =



    netKarZarar >= 0;



/*



    =========================================================



    KREDİLER



    =========================================================



  */



  const toplamKrediBorcu =



    krediler.reduce(



      (toplam, kredi) =>



        toplam +



        tlKarsiligi(



          Number(



            kredi.kalanBorc



          ),



          kredi.paraBirimi,



          kurlar



        ),



      0



    );



  /*



    =========================================================



    ÖZET KARTLARI



    =========================================================



  */



  const kartlar = [



    {



      baslik: "Alacak",



      deger:



        toplamAlacak,



      renk:



        "text-emerald-400",



    },



    {



      baslik: "Borç",



      deger:



        toplamBorc,



      renk:



        "text-red-400",



    },



    {



      baslik: "Kasa",



      deger:



        toplamKasaTl,



      renk:



        toplamKasaTl >= 0



          ? "text-emerald-400"



          : "text-red-400",



    },



    {



      baslik: "Banka",



      deger:



        toplamBankaTl,



      renk:



        toplamBankaTl >= 0



          ? "text-cyan-400"



          : "text-red-400",



    },



    {



      baslik:



        "Alınan Çek",



      deger:



        toplamAlinanCek,



      renk:



        "text-emerald-400",



    },



    {



      baslik:



        "Verilen Çek",



      deger:



        toplamVerilenCek,



      renk:



        "text-orange-400",



    },



    {



      baslik:



        "Kredi Borcu",



      deger:



        toplamKrediBorcu,



      renk:



        "text-violet-400",



    },



  ];



  /*



    =========================================================



    ANA MENÜ



    =========================================================



  */



  const moduller = [



    {



      baslik: "Cari",



      aciklama:



        "Cari kartları, borç, alacak ve ekstre",



      ikon: "👥",



      href:



        "/hal/cariler",



    },



    {



      baslik: "Kasa",



      aciklama:



        "Nakit giriş, çıkış, tahsilat ve ödeme",



      ikon: "💵",



      href:



        "/hal/kasa",



    },



    {



      baslik: "Banka",



      aciklama:



        "Gelen EFT, giden EFT ve banka hareketleri",



      ikon: "🏦",



      href:



        "/hal/banka",



    },



    {



      baslik: "Satış",



      aciklama:



        "Yeni ürün veya hizmet satışı oluştur",



      ikon: "📈",



      href:



        "/hal/faturalar/yeni?tip=SATIS&tur=URUN",



    },



    {



      baslik: "Alış",



      aciklama:



        "Yeni ürün veya hizmet alışı oluştur",



      ikon: "📉",



      href:



        "/hal/faturalar/yeni?tip=ALIS&tur=URUN",



    },



    {



      baslik:



        "Faturalar",



      aciklama:



        "Tüm alış, satış ve hizmet faturalarını görüntüle",



      ikon: "🧾",



      href:



        "/hal/faturalar",



    },



    {



      baslik: "Gider",



      aciklama:



        "Günlük işletme giderleri",



      ikon: "💸",



      href:



        "/hal/giderler",



    },



    {



      baslik: "Çekler",



      aciklama:



        "Alınan, verilen ve ciro edilen çekler",



      ikon: "🧾",



      href:



        "/hal/cekler",



    },



    {



      baslik:



        "Krediler",



      aciklama:



        "Taksitli, spot ve rotatif krediler",



      ikon: "💳",



      href:



        "/hal/krediler",



    },



    {



      baslik: "Stok",



      aciklama:



        "Ürün stokları, giriş ve çıkış hareketleri",



      ikon: "📦",



      href:



        "/hal/stok",



    },



    {



      baslik:



        "Atlas Aktar",



      aciklama:



        "Cari ve çek kayıtlarını Excel'den aktar",



      ikon: "📊",



      href:



        "/hal/atlas-aktar",



    },



  ];



  return (



    <main className="min-h-screen bg-slate-950 text-white">



      <div className="mx-auto max-w-7xl px-6 py-10">



        {/* BAŞLIK */}



        <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">



          <div>



            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">



              Şirket 02



            </p>



            <h1 className="mt-2 text-4xl font-black">



              Hal Komisyon & Soğuk Hava



            </h1>



            <p className="mt-2 text-slate-400">



              Finans ve cari yönetimi



            </p>



          </div>



          <a



            href="/"



            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 transition hover:bg-slate-900"



          >



            ← Şirket Seçimi



          </a>



        </div>



        {/* ÖZET */}



        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">



          {kartlar.map(



            (kart) => (



              <div



                key={



                  kart.baslik



                }



                className="rounded-2xl border border-slate-800 bg-slate-900 p-5"



              >



                <p className="text-xs font-semibold text-slate-400">



                  {



                    kart.baslik



                  }



                </p>



                <p



                  className={`mt-3 whitespace-nowrap text-lg font-black tracking-tight xl:text-xl ${kart.renk}`}



                >



                  {money(



                    kart.deger



                  )}



                </p>



              </div>



            )



          )}



        </div>



                {/* ANLIK KÂR / ZARAR */}



        <div className="mt-10">



          <div className="mb-5">



            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">



              Finansal Durum



            </p>



            <h2 className="mt-2 text-2xl font-black">



              Anlık Kâr / Zarar



            </h2>



            <p className="mt-1 text-sm leading-6 text-slate-500">



              Satış + verilen hizmet gelirlerinden; alış + alınan hizmet + giderler düşülür.



              Çekler ödeme/tahsilat aracı olduğu için kâr-zarara ikinci kez eklenmez.



            </p>



          </div>



          <div className="mb-5">

            <p className="mb-3 text-sm font-bold text-cyan-400">

              Gösterilen dönem: {donemAdi}

            </p>



            <div className="flex flex-wrap gap-2">

              <a

                href="/hal?donem=BUGUN"

                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${

                  donem === "BUGUN"

                    ? "bg-cyan-500 text-slate-950"

                    : "border border-slate-700 text-slate-300 hover:bg-slate-900"

                }`}

              >

                Bugün

              </a>



              <a

                href="/hal?donem=AY"

                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${

                  donem === "AY"

                    ? "bg-cyan-500 text-slate-950"

                    : "border border-slate-700 text-slate-300 hover:bg-slate-900"

                }`}

              >

                Bu Ay

              </a>



              <a

                href="/hal?donem=YIL"

                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${

                  donem === "YIL"

                    ? "bg-cyan-500 text-slate-950"

                    : "border border-slate-700 text-slate-300 hover:bg-slate-900"

                }`}

              >

                Bu Yıl

              </a>



              <a

                href="/hal"

                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${

                  donem === "TUMU"

                    ? "bg-cyan-500 text-slate-950"

                    : "border border-slate-700 text-slate-300 hover:bg-slate-900"

                }`}

              >

                Tümü

              </a>

            </div>

          </div>



          <form

            method="GET"

            className="mb-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end"

          >

            <input

              type="hidden"

              name="donem"

              value="OZEL"

            />



            <div>

              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">

                Başlangıç Tarihi

              </label>



              <input

                type="date"

                name="baslangic"

                defaultValue={seciliBaslangic}

                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"

              />

            </div>



            <div>

              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">

                Bitiş Tarihi

              </label>



              <input

                type="date"

                name="bitis"

                defaultValue={seciliBitis}

                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"

              />

            </div>



            <button

              type="submit"

              className="rounded-xl bg-cyan-500 px-5 py-3 font-black text-slate-950 transition hover:bg-cyan-400"

            >

              Tarihi Uygula

            </button>

          </form>





          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">



            <div className="rounded-2xl border border-emerald-900/50 bg-emerald-950/10 p-5">



              <p className="text-xs font-semibold text-slate-400">



                Satış Faturaları



              </p>



              <p className="mt-3 text-2xl font-black text-emerald-400">



                {money(toplamSatis)}



              </p>



            </div>



            <div className="rounded-2xl border border-sky-900/50 bg-sky-950/10 p-5">



              <p className="text-sm font-semibold text-slate-400">



                Verilen Hizmet



              </p>



              <p className="mt-3 text-2xl font-black text-sky-400">



                {money(toplamVerilenHizmet)}



              </p>



            </div>



            <div className="rounded-2xl border border-emerald-700 bg-slate-900 p-5">



              <p className="text-sm font-semibold text-slate-400">



                Toplam Gelir



              </p>



              <p className="mt-3 text-2xl font-black text-emerald-400">



                {money(toplamGelir)}



              </p>



            </div>



            <div className="rounded-2xl border border-orange-900/50 bg-orange-950/10 p-5">



              <p className="text-sm font-semibold text-slate-400">



                Alış Faturaları



              </p>



              <p className="mt-3 text-2xl font-black text-orange-400">



                {money(toplamAlis)}



              </p>



            </div>



            <div className="rounded-2xl border border-violet-900/50 bg-violet-950/10 p-5">



              <p className="text-sm font-semibold text-slate-400">



                Alınan Hizmet



              </p>



              <p className="mt-3 text-2xl font-black text-violet-400">



                {money(toplamAlinanHizmet)}



              </p>



            </div>



            <div className="rounded-2xl border border-red-900/50 bg-red-950/10 p-5">



              <p className="text-sm font-semibold text-slate-400">



                Diğer Giderler



              </p>



              <p className="mt-3 text-2xl font-black text-red-400">



                {money(toplamDigerGider)}



              </p>



            </div>



            <div className="rounded-2xl border border-red-700 bg-slate-900 p-5">



              <p className="text-sm font-semibold text-slate-400">



                Toplam Maliyet + Gider



              </p>



              <p className="mt-3 text-2xl font-black text-red-400">



                {money(toplamMaliyetVeGider)}



              </p>



            </div>



            <div



              className={`rounded-2xl border p-5 ${



                karMi



                  ? "border-emerald-500 bg-emerald-950/20"



                  : "border-red-500 bg-red-950/20"



              }`}



            >



              <p className="text-sm font-black uppercase tracking-wide text-slate-300">



                {karMi ? "NET KÂR" : "NET ZARAR"}



              </p>



              <p



                className={`mt-3 text-3xl font-black ${



                  karMi



                    ? "text-emerald-400"



                    : "text-red-400"



                }`}



              >



                {money(Math.abs(netKarZarar))}



              </p>



              <p className="mt-2 text-xs leading-5 text-slate-400">



                (Satış + Verilen Hizmet) - (Alış + Alınan Hizmet + Gider)



              </p>



            </div>



          </div>



          <p className="mt-6 mb-3 text-xs font-bold uppercase tracking-[0.15em] text-slate-500">

            Anlık durum — dönem filtresinden bağımsız

          </p>



          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">



            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">



              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">



                Alınan Çekler



              </p>



              <p className="mt-2 text-xl font-black text-emerald-400">



                {money(toplamAlinanCek)}



              </p>



            </div>



            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">



              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">



                Verilen Çekler



              </p>



              <p className="mt-2 text-xl font-black text-orange-400">



                {money(toplamVerilenCek)}



              </p>



            </div>



            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">



              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">



                Carilerden Alacağımız



              </p>



              <p className="mt-2 text-xl font-black text-emerald-400">



                {money(toplamAlacak)}



              </p>



            </div>



            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">



              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">



                Carilere Borcumuz



              </p>



              <p className="mt-2 text-xl font-black text-red-400">



                {money(toplamBorc)}



              </p>



            </div>



          </div>



        </div>



{/* İŞLEMLER */}



        <div className="mt-10">



          <div>



            <h2 className="text-2xl font-black">



              İşlemler



            </h2>



            <p className="mt-1 text-sm text-slate-500">



              Yapmak istediğiniz işlemi seçin.



            </p>



          </div>



          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">



            {moduller.map(



              (modul) => (



                <a



                  key={



                    modul.baslik



                  }



                  href={



                    modul.href



                  }



                  className="group rounded-2xl border border-slate-800 bg-slate-900 p-7 transition hover:-translate-y-1 hover:border-cyan-600"



                >



                  <div className="text-4xl">



                    {



                      modul.ikon



                    }



                  </div>



                  <h3 className="mt-5 text-2xl font-black">



                    {



                      modul.baslik



                    }



                  </h3>



                  <p className="mt-2 leading-6 text-slate-400">



                    {



                      modul.aciklama



                    }



                  </p>



                  <div className="mt-6 font-bold text-cyan-400">



                    Aç →



                  </div>



                </a>



              )



            )}



          </div>



        </div>



      </div>



    </main>



  );



}
