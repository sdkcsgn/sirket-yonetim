import { prisma } from "@/lib/prisma";

import SilButonu from "./SilButonu";

import ExcelAktarButonu from "./ExcelAktarButonu";

function money(value: number) {

  return new Intl.NumberFormat("tr-TR", {

    style: "currency",

    currency: "TRY",

    minimumFractionDigits: 2,

    maximumFractionDigits: 2,

  }).format(value);

}

function cariTipiYaz(tip: string) {

  const tipler: Record<string, string> = {

    DIGER: "Diğer",

    MUSTERI: "Müşteri",

    ALICI: "Alıcı",

    URETICI: "Üretici",

    SATICI: "Satıcı",

    UYE: "Üye",

    BANKA: "Banka",

    PERSONEL: "Personel",

    YARDIMCI_HESAP: "Yardımcı Hesap",

  };

  return tipler[tip] ?? tip;

}

type Props = {

  searchParams: Promise<{

    q?: string;

  }>;

};

export default async function CarilerPage({

  searchParams,

}: Props) {

  const { q = "" } = await searchParams;

  const arama = q.trim();

  const beach = await prisma.sirket.findUnique({

    where: {

      kod: "BEACH",

    },

  });

  if (!beach) {

    return (

      <main className="min-h-screen bg-slate-950 p-10 text-white">

        Beach & Mağaza şirket kaydı bulunamadı.

      </main>

    );

  }

  const cariler = await prisma.cari.findMany({

    where: {

      sirketId: beach.id,

      aktif: true,

      ...(arama

        ? {

            OR: [

              {

                unvan: {

                  contains: arama,

                  mode: "insensitive",

                },

              },

              {

                atlasKodu: {

                  contains: arama,

                  mode: "insensitive",

                },

              },

              {

                gsm: {

                  contains: arama,

                  mode: "insensitive",

                },

              },

              {

                telefon: {

                  contains: arama,

                  mode: "insensitive",

                },

              },

              {

                vergiNo: {

                  contains: arama,

                  mode: "insensitive",

                },

              },

              {

                tcNo: {

                  contains: arama,

                  mode: "insensitive",

                },

              },

            ],

          }

        : {}),

    },

    include: {

      hareketler: {

        orderBy: {

          tarih: "asc",

        },

      },

    },

    orderBy: {

      unvan: "asc",

    },

  });

  /*

    CARİ HESAPLARI

    Bakiye = Borç - Alacak

    Pozitif bakiye:

    Cari bize borçlu = bizim alacağımız

    Negatif bakiye:

    Biz cariye borçluyuz = bizim borcumuz

  */

  const carilerBakiyeli = cariler.map((cari) => {

    let borc = Number(cari.acilisBorc);

    let alacak = Number(cari.acilisAlacak);

    for (const hareket of cari.hareketler) {

      borc += Number(hareket.borc);

      alacak += Number(hareket.alacak);

    }

    const bakiye = borc - alacak;

    return {

      ...cari,

      borc,

      alacak,

      bakiye,

    };

  });

  const toplamAlacak =

    carilerBakiyeli.reduce(

      (toplam, cari) => {

        if (cari.bakiye > 0) {

          return toplam + cari.bakiye;

        }

        return toplam;

      },

      0

    );

  const toplamBorc =

    carilerBakiyeli.reduce(

      (toplam, cari) => {

        if (cari.bakiye < 0) {

          return toplam + Math.abs(cari.bakiye);

        }

        return toplam;

      },

      0

    );

  const netCari =

    toplamAlacak - toplamBorc;

  return (

    <main className="min-h-screen bg-slate-950 text-white">

      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* BAŞLIK */}

        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

          <div>

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">

              Beach & Mağaza

            </p>

            <h1 className="mt-2 text-4xl font-black">

              Cari Hesaplar

            </h1>

            <p className="mt-2 text-slate-400">

              Müşteri, tedarikçi ve diğer cari hesapların

              borç, alacak ve ekstre takibi

            </p>

          </div>

          <div className="flex flex-wrap gap-3">

            <a

              href="/beach"

              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 transition hover:bg-slate-900"

            >

              ← Panele Dön

            </a>

            <a

              href="/beach/atlas-aktar"

              className="rounded-xl border border-emerald-700 px-5 py-3 font-bold text-emerald-400 transition hover:bg-emerald-950/30"

            >

              📊 Atlas Cari Aktar

            </a>

            <ExcelAktarButonu

              kayitlar={carilerBakiyeli.map((cari) => ({

                kod: cari.atlasKodu || "",

                cari: cari.unvan,

                tip: cariTipiYaz(cari.tip),

                telefon: cari.gsm || cari.telefon || "",

                vergiTc: cari.vergiNo || cari.tcNo || "",

                borc: cari.borc,

                alacak: cari.alacak,

                bakiye: Math.abs(cari.bakiye),

                durum:

                  cari.bakiye > 0

                    ? "Alacağımız"

                    : cari.bakiye < 0

                    ? "Borcumuz"

                    : "Kapalı",

              }))}

              filtreli={Boolean(arama)}

            />

            <a

              href="/beach/cariler/yeni"

              className="rounded-xl bg-cyan-500 px-5 py-3 font-black text-slate-950 transition hover:bg-cyan-400"

            >

              + Yeni Cari

            </a>

          </div>

        </div>

        {/* ÖZET */}

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <p className="text-sm text-slate-400">

              Toplam Cari

            </p>

            <p className="mt-3 text-3xl font-black">

              {carilerBakiyeli.length}

            </p>

          </div>

          <div className="rounded-2xl border border-emerald-900/50 bg-slate-900 p-6">

            <p className="text-sm text-slate-400">

              Toplam Alacağımız

            </p>

            <p className="mt-3 text-3xl font-black text-emerald-400">

              {money(toplamAlacak)}

            </p>

            <p className="mt-2 text-xs text-slate-500">

              Carilerin bize olan borcu

            </p>

          </div>

          <div className="rounded-2xl border border-red-900/50 bg-slate-900 p-6">

            <p className="text-sm text-slate-400">

              Toplam Borcumuz

            </p>

            <p className="mt-3 text-3xl font-black text-red-400">

              {money(toplamBorc)}

            </p>

            <p className="mt-2 text-xs text-slate-500">

              Bizim carilere olan borcumuz

            </p>

          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">

            <p className="text-sm text-slate-400">

              Cari Net

            </p>

            <p

              className={`mt-3 text-3xl font-black ${

                netCari >= 0

                  ? "text-emerald-400"

                  : "text-red-400"

              }`}

            >

              {money(Math.abs(netCari))}

            </p>

            <p className="mt-2 text-xs text-slate-500">

              {netCari > 0

                ? "Net alacak"

                : netCari < 0

                ? "Net borç"

                : "Borç / alacak dengede"}

            </p>

          </div>

        </div>

        {/* LİSTE */}

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

          <div className="border-b border-slate-800 p-6">

            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

              <div>

                <h2 className="text-xl font-black">

                  Cari Listesi

                </h2>

                <p className="mt-1 text-sm text-slate-400">

                  Güncel borç ve alacak bakiyeleri

                </p>

              </div>

              <form

                method="GET"

                className="flex w-full gap-2 md:w-auto"

              >

                <input

                  type="text"

                  name="q"

                  defaultValue={arama}

                  placeholder="Cari adı, kod, telefon..."

                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-500 md:w-80"

                />

                <button

                  type="submit"

                  className="rounded-xl bg-slate-800 px-5 py-3 font-bold hover:bg-slate-700"

                >

                  Ara

                </button>

                {arama && (

                  <a

                    href="/beach/cariler"

                    className="rounded-xl border border-slate-700 px-4 py-3 font-bold text-slate-400 hover:bg-slate-800"

                  >

                    Temizle

                  </a>

                )}

              </form>

            </div>

          </div>

          {carilerBakiyeli.length === 0 ? (

            <div className="p-12 text-center">

              <div className="text-5xl">

                👥

              </div>

              <h3 className="mt-4 text-xl font-black">

                {arama

                  ? "Aramaya uygun cari bulunamadı"

                  : "Henüz cari kaydı bulunmuyor"}

              </h3>

              {!arama && (

                <>

                  <p className="mt-2 text-slate-400">

                    Cariyi manuel ekleyebilir veya

                    Atlas Excel dosyasından aktarabilirsiniz.

                  </p>

                  <div className="mt-6 flex flex-wrap justify-center gap-3">

                    <a

                      href="/beach/cariler/yeni"

                      className="rounded-xl bg-cyan-500 px-6 py-3 font-black text-slate-950"

                    >

                      + Yeni Cari

                    </a>

                    <a

                      href="/beach/atlas-aktar"

                      className="rounded-xl border border-emerald-700 px-6 py-3 font-bold text-emerald-400"

                    >

                      📊 Atlas'tan Aktar

                    </a>

                  </div>

                </>

              )}

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full min-w-[1200px]">

                <thead>

                  <tr className="border-b border-slate-800 text-left text-sm text-slate-400">

                    <th className="px-6 py-4">

                      Kod

                    </th>

                    <th className="px-6 py-4">

                      Cari

                    </th>

                    <th className="px-6 py-4">

                      Tip

                    </th>

                    <th className="px-6 py-4">

                      Telefon

                    </th>

                    <th className="px-6 py-4 text-right">

                      Borç

                    </th>

                    <th className="px-6 py-4 text-right">

                      Alacak

                    </th>

                    <th className="px-6 py-4 text-right">

                      Bakiye

                    </th>

                    <th className="px-6 py-4">

                      Durum

                    </th>

                    <th className="px-6 py-4"></th>

                  </tr>

                </thead>

                <tbody>

                  {carilerBakiyeli.map((cari) => {

                    const bizimAlacagimiz =

                      cari.bakiye > 0;

                    const bizimBorcumuz =

                      cari.bakiye < 0;

                    return (

                      <tr

                        key={cari.id}

                        className="border-b border-slate-800/70 transition hover:bg-slate-800/40"

                      >

                        <td className="px-6 py-5 text-sm text-slate-400">

                          {cari.atlasKodu || "-"}

                        </td>

                        <td className="px-6 py-5">

                          <a

                            href={`/beach/cariler/${cari.id}`}

                            className="font-black transition hover:text-cyan-400"

                          >

                            {cari.unvan}

                          </a>

                          {(cari.vergiNo || cari.tcNo) && (

                            <p className="mt-1 text-xs text-slate-500">

                              {cari.vergiNo ||

                                cari.tcNo}

                            </p>

                          )}

                        </td>

                        <td className="px-6 py-5">

                          <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-400">

                            {cariTipiYaz(

                              cari.tip

                            )}

                          </span>

                        </td>

                        <td className="px-6 py-5 text-slate-300">

                          {cari.gsm ||

                            cari.telefon ||

                            "-"}

                        </td>

                        <td className="px-6 py-5 text-right font-semibold text-red-300">

                          {money(cari.borc)}

                        </td>

                        <td className="px-6 py-5 text-right font-semibold text-emerald-300">

                          {money(cari.alacak)}

                        </td>

                        <td

                          className={`px-6 py-5 text-right text-lg font-black ${

                            bizimAlacagimiz

                              ? "text-emerald-400"

                              : bizimBorcumuz

                              ? "text-red-400"

                              : "text-slate-400"

                          }`}

                        >

                          {money(

                            Math.abs(

                              cari.bakiye

                            )

                          )}

                        </td>

                        <td className="px-6 py-5">

                          {bizimAlacagimiz && (

                            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">

                              Alacağımız

                            </span>

                          )}

                          {bizimBorcumuz && (

                            <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400">

                              Borcumuz

                            </span>

                          )}

                          {!bizimAlacagimiz &&

                            !bizimBorcumuz && (

                              <span className="rounded-full bg-slate-500/10 px-3 py-1 text-xs font-bold text-slate-400">

                                Kapalı

                              </span>

                            )}

                        </td>

                        <td className="px-6 py-5">

                          <div className="flex items-center justify-end gap-2">

                            <a

                              href={`/beach/cariler/${cari.id}`}

                              className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-400"

                            >

                              Ekstre

                            </a>

                            <a

                              href={`/beach/cariler/${cari.id}/hareket-yeni`}

                              className="rounded-lg border border-emerald-700 px-3 py-2 text-sm font-bold text-emerald-400 transition hover:bg-emerald-950/30"

                            >

                              + Hareket

                            </a>

                            <a

                              href={`/beach/cariler/${cari.id}/duzenle`}

                              className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"

                            >

                              Düzenle

                            </a>

                            <SilButonu

                              cariId={cari.id}

                              unvan={cari.unvan}

                            />

                          </div>

                        </td>

                      </tr>

                    );

                  })}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </div>

    </main>

  );

}
