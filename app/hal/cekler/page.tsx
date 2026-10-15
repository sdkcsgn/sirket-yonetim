import { prisma } from "@/lib/prisma";

import { cekSil } from "./[id]/actions";
import CekExcelAktarButonu from "./CekExcelAktarButonu";



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



function durumAdi(durum: string) {

  const durumlar: Record<string, string> = {

    PORTFOYDE: "Portföyde",

    BANKADA: "Bankada",

    CIROLANDI: "Ciro Edildi",

    TAHSIL_EDILDI: "Tahsil Edildi",

    ODENDI: "Ödendi",

    KARSILIKSIZ: "Karşılıksız",

    IPTAL: "İptal",
    IADE_EDILDI: "İade Edildi",
    IADE_ALINDI: "İade Alındı",

  };



  return durumlar[durum] ?? durum;

}



function durumClass(durum: string) {

  switch (durum) {

    case "PORTFOYDE":

      return "bg-cyan-500/10 text-cyan-400";



    case "BANKADA":

      return "bg-blue-500/10 text-blue-400";



    case "CIROLANDI":

      return "bg-violet-500/10 text-violet-400";



    case "TAHSIL_EDILDI":

    case "ODENDI":

      return "bg-emerald-500/10 text-emerald-400";



    case "KARSILIKSIZ":

      return "bg-red-500/10 text-red-400";



    case "IPTAL":

      return "bg-slate-700 text-slate-300";



    default:

      return "bg-slate-700 text-slate-300";

  }

}



type Props = {

  searchParams: Promise<{

    gorunum?: string;

  }>;

};



export default async function CeklerPage({

  searchParams,

}: Props) {

  const { gorunum = "TUMU" } =

    await searchParams;



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



  const cekler =

    await prisma.cek.findMany({

      where: {

        sirketId: sirket.id,

      },



      include: {

        cari: true,

        bankaHesabi: true,

      },



      orderBy: [

        {

          vadeTarihi: "asc",

        },

        {

          id: "desc",

        },

      ],

    });



  /*

    =========================================================

    ÖZET

    =========================================================

  */



  const alinanCekler =

    cekler.filter(

      (cek) =>

        cek.tip === "ALINAN" &&

        (

          cek.durum === "PORTFOYDE" ||

          cek.durum === "BANKADA"

        )

    );



 const verilenCekler = cekler.filter(

  (cek) =>

    cek.tip === "VERILEN" &&

    cek.durum !== "ODENDI" &&

    cek.durum !== "IPTAL" &&

    cek.durum !== "IADE_ALINDI"

);



  const ciroCekler =

    cekler.filter(

      (cek) =>

        cek.tip === "ALINAN" &&

        cek.durum === "CIROLANDI"

    );



  const alinanToplam =

    alinanCekler.reduce(

      (toplam, cek) =>

        toplam + Number(cek.tutar),

      0

    );



  const verilenToplam =

    verilenCekler.reduce(

      (toplam, cek) =>

        toplam + Number(cek.tutar),

      0

    );



  const ciroToplam =

    ciroCekler.reduce(

      (toplam, cek) =>

        toplam + Number(cek.tutar),

      0

    );



  /*

    =========================================================

    FİLTRE

    =========================================================

  */



  const listelenecekCekler =

    gorunum === "ALINAN"

      ? cekler.filter(

          (cek) =>

            cek.tip === "ALINAN" &&

            cek.durum !== "CIROLANDI"

        )

      : gorunum === "VERILEN"

      ? cekler.filter(

          (cek) =>

            cek.tip === "VERILEN"

        )

      : gorunum === "CIRO"

      ? cekler.filter(

          (cek) =>

            cek.tip === "ALINAN" &&

            cek.durum === "CIROLANDI"

        )

      : cekler;



  return (

    <main className="min-h-screen bg-slate-950 text-white">

      <div className="mx-auto max-w-7xl px-6 py-10">



        {/* BAŞLIK */}



        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">



          <div>

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">

              Hal Komisyon & Soğuk Hava

            </p>



            <h1 className="mt-2 text-4xl font-black">

              Çekler

            </h1>



            <p className="mt-2 text-slate-400">

              Alınan, verilen ve ciro edilen

              çeklerin takibi

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

              href="/hal/atlas-aktar"

              className="rounded-xl border border-violet-700 px-5 py-3 font-bold text-violet-400 transition hover:bg-violet-950/30"

            >

              📊 Atlas'tan Aktar

            </a>



            <CekExcelAktarButonu
              gorunum={gorunum}
              kayitlar={listelenecekCekler.map((cek) => ({
                cekNo: cek.cekNo || "",
                cari: cek.cari?.unvan || "",
                tip:
                  cek.durum === "CIROLANDI"
                    ? "Ciro"
                    : cek.tip === "ALINAN"
                    ? "Alınan"
                    : "Verilen",
                durum: durumAdi(cek.durum),
                banka:
                  cek.bankaHesabi?.ad ||
                  cek.banka ||
                  "",
                sube: cek.sube || "",
                vadeTarihi: cek.vadeTarihi.toISOString(),
                tutar: Number(cek.tutar),
                kesideci: cek.kesideci || "",
                aciklama: cek.aciklama || "",
              }))}
            />

            <a

              href="/hal/cekler/yeni?tip=ALINAN"

              className="rounded-xl border border-emerald-700 px-5 py-3 font-bold text-emerald-400 transition hover:bg-emerald-950/30"

            >

              + Alınan Çek

            </a>



            <a

              href="/hal/cekler/yeni?tip=VERILEN"

              className="rounded-xl bg-red-500 px-5 py-3 font-black text-white transition hover:bg-red-400"

            >

              + Verilen Çek

            </a>



          </div>



        </div>



        {/* ÖZET */}



        <div className="grid gap-5 md:grid-cols-3">



          <a

            href="/hal/cekler?gorunum=ALINAN"

            className="rounded-2xl border border-emerald-900/50 bg-slate-900 p-6 transition hover:border-emerald-600"

          >

            <p className="text-sm text-slate-400">

              Alınan Çekler

            </p>



            <p className="mt-3 text-3xl font-black text-emerald-400">

              {money(alinanToplam)}

            </p>



            <p className="mt-2 text-xs text-slate-500">

              {alinanCekler.length} aktif çek

            </p>

          </a>



          <a

            href="/hal/cekler?gorunum=VERILEN"

            className="rounded-2xl border border-red-900/50 bg-slate-900 p-6 transition hover:border-red-600"

          >

            <p className="text-sm text-slate-400">

              Verilen Çekler

            </p>



            <p className="mt-3 text-3xl font-black text-red-400">

              {money(verilenToplam)}

            </p>



            <p className="mt-2 text-xs text-slate-500">

              {verilenCekler.length} açık çek

            </p>

          </a>



          <a

            href="/hal/cekler?gorunum=CIRO"

            className="rounded-2xl border border-violet-900/50 bg-slate-900 p-6 transition hover:border-violet-600"

          >

            <p className="text-sm text-slate-400">

              Ciro Edilen Çekler

            </p>



            <p className="mt-3 text-3xl font-black text-violet-400">

              {money(ciroToplam)}

            </p>



            <p className="mt-2 text-xs text-slate-500">

              {ciroCekler.length} ciro edilmiş çek

            </p>

          </a>



        </div>



        {/* SEKMELER */}



        <div className="mt-8 flex flex-wrap gap-2">



          <a

            href="/hal/cekler"

            className={`rounded-xl px-5 py-3 text-sm font-bold transition ${

              gorunum === "TUMU"

                ? "bg-cyan-500 text-slate-950"

                : "border border-slate-700 text-slate-300 hover:bg-slate-900"

            }`}

          >

            Tümü

          </a>



          <a

            href="/hal/cekler?gorunum=ALINAN"

            className={`rounded-xl px-5 py-3 text-sm font-bold transition ${

              gorunum === "ALINAN"

                ? "bg-emerald-500 text-slate-950"

                : "border border-slate-700 text-slate-300 hover:bg-slate-900"

            }`}

          >

            Alınan

          </a>



          <a

            href="/hal/cekler?gorunum=VERILEN"

            className={`rounded-xl px-5 py-3 text-sm font-bold transition ${

              gorunum === "VERILEN"

                ? "bg-red-500 text-white"

                : "border border-slate-700 text-slate-300 hover:bg-slate-900"

            }`}

          >

            Verilen

          </a>



          <a

            href="/hal/cekler?gorunum=CIRO"

            className={`rounded-xl px-5 py-3 text-sm font-bold transition ${

              gorunum === "CIRO"

                ? "bg-violet-500 text-white"

                : "border border-slate-700 text-slate-300 hover:bg-slate-900"

            }`}

          >

            Ciro Edilen

          </a>



        </div>



        {/* LİSTE */}



        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">



          <div className="border-b border-slate-800 p-6">



            <h2 className="text-xl font-black">

              {gorunum === "ALINAN"

                ? "Alınan Çekler"

                : gorunum === "VERILEN"

                ? "Verilen Çekler"

                : gorunum === "CIRO"

                ? "Ciro Edilen Çekler"

                : "Tüm Çekler"}

            </h2>



            <p className="mt-1 text-sm text-slate-400">

              {listelenecekCekler.length} kayıt

            </p>



          </div>



          {listelenecekCekler.length === 0 ? (



            <div className="p-14 text-center">



              <div className="text-5xl">

                🧾

              </div>



              <h3 className="mt-5 text-xl font-black">

                Bu bölümde çek bulunmuyor

              </h3>



              <p className="mt-2 text-slate-400">

                Yeni çek ekleyebilir veya Atlas

                Excel dosyasından aktarabilirsiniz.

              </p>



            </div>



          ) : (



            <div className="overflow-x-auto">



              <table className="w-full min-w-[1150px]">



                <thead>



                  <tr className="border-b border-slate-800 text-left text-sm text-slate-400">



                    <th className="px-5 py-4">

                      Tip

                    </th>



                    <th className="px-5 py-4">

                      Cari

                    </th>



                    <th className="px-5 py-4">

                      Çek No

                    </th>



                    <th className="px-5 py-4">

                      Banka

                    </th>



                    <th className="px-5 py-4">

                      Vade

                    </th>



                    <th className="px-5 py-4 text-right">

                      Tutar

                    </th>



                    <th className="px-5 py-4">

                      Durum

                    </th>



                    <th className="px-5 py-4">

                      İşlem

                    </th>



                  </tr>



                </thead>



                <tbody>



                  {listelenecekCekler.map(

                    (cek) => {



                      const silAction =

                        cekSil.bind(

                          null,

                          cek.id

                        );



                      return (

                        <tr

                          key={cek.id}

                          className="border-b border-slate-800/70 transition hover:bg-slate-800/30"

                        >



                          <td className="px-5 py-5">



                            {cek.durum ===

                            "CIROLANDI" ? (



                              <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-400">

                                Ciro

                              </span>



                            ) : (



                              <span

                                className={`rounded-full px-3 py-1 text-xs font-bold ${

                                  cek.tip ===

                                  "ALINAN"

                                    ? "bg-emerald-500/10 text-emerald-400"

                                    : "bg-red-500/10 text-red-400"

                                }`}

                              >

                                {cek.tip ===

                                "ALINAN"

                                  ? "Alınan"

                                  : "Verilen"}

                              </span>



                            )}



                          </td>



                          <td className="px-5 py-5">



                            {cek.cari ? (



                              <a

                                href={`/hal/cariler/${cek.cari.id}`}

                                className="font-bold transition hover:text-cyan-400"

                              >

                                {cek.cari.unvan}

                              </a>



                            ) : (



                              <span className="text-slate-500">

                                -

                              </span>



                            )}



                          </td>



                          <td className="px-5 py-5 text-slate-300">

                            {cek.cekNo || "-"}

                          </td>



                          <td className="px-5 py-5">



                            <div className="text-slate-300">

                              {cek.banka || "-"}

                            </div>



                            {cek.bankaHesabi && (

                              <div className="mt-1 text-xs text-slate-500">

                                {

                                  cek

                                    .bankaHesabi

                                    .ad

                                }

                              </div>

                            )}



                          </td>



                          <td className="whitespace-nowrap px-5 py-5 font-semibold">

                            {date(

                              cek.vadeTarihi

                            )}

                          </td>



                          <td

                            className={`whitespace-nowrap px-5 py-5 text-right text-lg font-black ${

                              cek.durum ===

                              "CIROLANDI"

                                ? "text-violet-400"

                                : cek.tip ===

                                  "ALINAN"

                                ? "text-emerald-400"

                                : "text-red-400"

                            }`}

                          >

                            {money(

                              Number(

                                cek.tutar

                              )

                            )}

                          </td>



                          <td className="px-5 py-5">



                            <span

                              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${durumClass(

                                cek.durum

                              )}`}

                            >

                              {durumAdi(

                                cek.durum

                              )}

                            </span>



                          </td>



                          <td className="px-5 py-5">



                            <div className="flex items-center gap-2">



                              <a

                                href={`/hal/cekler/${cek.id}`}

                                className="rounded-lg border border-cyan-700 px-3 py-2 text-sm font-bold text-cyan-400 transition hover:bg-cyan-950/30"

                              >

                                Aç →

                              </a>



                              <form

                                action={

                                  silAction

                                }

                              >

                                <button

                                  type="submit"

                                  className="rounded-lg border border-red-700 px-3 py-2 text-sm font-black text-red-400 transition hover:bg-red-950/30"

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



        {/* AÇIKLAMA */}



        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">



          <h2 className="font-black">

            Çek İşlem Mantığı

          </h2>



          <div className="mt-4 grid gap-4 text-sm leading-6 text-slate-400 md:grid-cols-3">



            <div>

              <span className="font-bold text-emerald-400">

                Alınan Çek

              </span>



              <p className="mt-1">

                Müşteriden çek alındığında

                çek kaydı ve cari tahsilat

                birlikte işlenir.

              </p>

            </div>



            <div>

              <span className="font-bold text-red-400">

                Verilen Çek

              </span>



              <p className="mt-1">

                Firmaya kendi çekimiz

                verildiğinde çek ve cari ödeme

                birlikte işlenir.

              </p>

            </div>



            <div>

              <span className="font-bold text-violet-400">

                Sil

              </span>



              <p className="mt-1">

                Çek silindiğinde ilgili cari,

                ciro ve banka hareketleri de

                mümkün olan güvenli eşleşmelerle

                birlikte temizlenir.

              </p>

            </div>



          </div>



        </div>



      </div>

    </main>

  );

}
