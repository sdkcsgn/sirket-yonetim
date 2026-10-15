import Link from "next/link";
import { prisma } from "@/lib/prisma";

type PageProps = {
  searchParams: Promise<{
    donem?: string;
    baslangic?: string;
    bitis?: string;
  }>;
};

type SirketOzet = {
  kod: string;
  ad: string;
  satis: number;
  verilenHizmet: number;
  alis: number;
  alinanHizmet: number;
  gider: number;
  gelir: number;
  maliyet: number;
  net: number;
};

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function tarihInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function gunBaslangici(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function gunSonu(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export default async function Home({
  searchParams,
}: PageProps) {
  const params = await searchParams;

  const donem = params.donem ?? "ay";

  const simdi = new Date();

  let baslangic: Date | undefined;
  let bitis: Date | undefined;

  if (donem === "bugun") {
    baslangic = gunBaslangici(simdi);
    bitis = gunSonu(simdi);
  }

  if (donem === "ay") {
    baslangic = new Date(
      simdi.getFullYear(),
      simdi.getMonth(),
      1,
      0,
      0,
      0,
      0
    );

    bitis = gunSonu(simdi);
  }

  if (donem === "yil") {
    baslangic = new Date(
      simdi.getFullYear(),
      0,
      1,
      0,
      0,
      0,
      0
    );

    bitis = gunSonu(simdi);
  }

  if (
    donem === "ozel" &&
    params.baslangic &&
    params.bitis
  ) {
    baslangic = gunBaslangici(
      new Date(`${params.baslangic}T00:00:00`)
    );

    bitis = gunSonu(
      new Date(`${params.bitis}T00:00:00`)
    );
  }

  const tarihWhere =
    baslangic && bitis
      ? {
          gte: baslangic,
          lte: bitis,
        }
      : undefined;

  const sirketler =
    await prisma.sirket.findMany({
      where: {
        kod: {
          in: ["BEACH", "HAL"],
        },
      },
      select: {
        id: true,
        kod: true,
      },
    });

  const beach =
    sirketler.find(
      (sirket) => sirket.kod === "BEACH"
    );

  const hal =
    sirketler.find(
      (sirket) => sirket.kod === "HAL"
    );

  const sirketIdleri =
    sirketler.map(
      (sirket) => sirket.id
    );

  const [faturalar, giderler] =
    await Promise.all([
      prisma.fatura.findMany({
        where: {
          sirketId: {
            in: sirketIdleri,
          },

          ...(tarihWhere
            ? {
                tarih: tarihWhere,
              }
            : {}),
        },

        select: {
          sirketId: true,
          tip: true,
          genelToplam: true,
        },
      }),

      prisma.gider.findMany({
        where: {
          sirketId: {
            in: sirketIdleri,
          },

          ...(tarihWhere
            ? {
                tarih: tarihWhere,
              }
            : {}),
        },

        select: {
          sirketId: true,
          tutar: true,
        },
      }),
    ]);

  function sirketOzeti(
    sirketId: number | undefined,
    kod: string,
    ad: string
  ): SirketOzet {
    if (!sirketId) {
      return {
        kod,
        ad,
        satis: 0,
        verilenHizmet: 0,
        alis: 0,
        alinanHizmet: 0,
        gider: 0,
        gelir: 0,
        maliyet: 0,
        net: 0,
      };
    }

    const sirketFaturalari =
      faturalar.filter(
        (fatura) =>
          fatura.sirketId === sirketId
      );

    const sirketGiderleri =
      giderler.filter(
        (gider) =>
          gider.sirketId === sirketId
      );

    const satis =
      sirketFaturalari
        .filter(
          (fatura) =>
            fatura.tip === "SATIS"
        )
        .reduce(
          (toplam, fatura) =>
            toplam +
            Number(
              fatura.genelToplam
            ),
          0
        );

    const verilenHizmet =
      sirketFaturalari
        .filter(
          (fatura) =>
            fatura.tip ===
            "VERILEN_HIZMET"
        )
        .reduce(
          (toplam, fatura) =>
            toplam +
            Number(
              fatura.genelToplam
            ),
          0
        );

    const alis =
      sirketFaturalari
        .filter(
          (fatura) =>
            fatura.tip === "ALIS"
        )
        .reduce(
          (toplam, fatura) =>
            toplam +
            Number(
              fatura.genelToplam
            ),
          0
        );

    const alinanHizmet =
      sirketFaturalari
        .filter(
          (fatura) =>
            fatura.tip ===
            "ALINAN_HIZMET"
        )
        .reduce(
          (toplam, fatura) =>
            toplam +
            Number(
              fatura.genelToplam
            ),
          0
        );

    const gider =
      sirketGiderleri.reduce(
        (toplam, kayit) =>
          toplam +
          Number(kayit.tutar),
        0
      );

    const gelir =
      satis + verilenHizmet;

    const maliyet =
      alis +
      alinanHizmet +
      gider;

    const net =
      gelir - maliyet;

    return {
      kod,
      ad,
      satis,
      verilenHizmet,
      alis,
      alinanHizmet,
      gider,
      gelir,
      maliyet,
      net,
    };
  }

  const beachOzet =
    sirketOzeti(
      beach?.id,
      "BEACH",
      "Beach & Mağaza"
    );

  const halOzet =
    sirketOzeti(
      hal?.id,
      "HAL",
      "Hal Komisyon & Soğuk Hava"
    );

  const grupGelir =
    beachOzet.gelir +
    halOzet.gelir;

  const grupMaliyet =
    beachOzet.maliyet +
    halOzet.maliyet;

  const grupNet =
    grupGelir -
    grupMaliyet;

  const grupKarda =
    grupNet >= 0;

  const donemAdi =
    donem === "bugun"
      ? "Bugün"
      : donem === "ay"
      ? "Bu Ay"
      : donem === "yil"
      ? "Bu Yıl"
      : donem === "tumu"
      ? "Tüm Zamanlar"
      : "Özel Tarih";

  const bugun =
    tarihInputValue(simdi);

  const ayBasi =
    tarihInputValue(
      new Date(
        simdi.getFullYear(),
        simdi.getMonth(),
        1
      )
    );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* BAŞLIK */}

        <div className="mb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">
            Şirket Yönetim Sistemi
          </p>

          <h1 className="text-4xl font-black tracking-tight md:text-5xl">
            Grup Genel Görünümü
          </h1>

          <p className="mt-3 text-slate-400">
            Beach & Mağaza ile Hal
            Komisyon & Soğuk Hava
            şirketlerinin birleşik
            finansal görünümü.
          </p>
        </div>

        {/* DÖNEM FİLTRELERİ */}

        <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/?donem=bugun"
              className={`rounded-xl px-4 py-2 font-bold transition ${
                donem === "bugun"
                  ? "bg-cyan-500 text-slate-950"
                  : "border border-slate-700 text-slate-300 hover:bg-slate-800"
              }`}
            >
              Bugün
            </Link>

            <Link
              href="/?donem=ay"
              className={`rounded-xl px-4 py-2 font-bold transition ${
                donem === "ay"
                  ? "bg-cyan-500 text-slate-950"
                  : "border border-slate-700 text-slate-300 hover:bg-slate-800"
              }`}
            >
              Bu Ay
            </Link>

            <Link
              href="/?donem=yil"
              className={`rounded-xl px-4 py-2 font-bold transition ${
                donem === "yil"
                  ? "bg-cyan-500 text-slate-950"
                  : "border border-slate-700 text-slate-300 hover:bg-slate-800"
              }`}
            >
              Bu Yıl
            </Link>

            <Link
              href="/?donem=tumu"
              className={`rounded-xl px-4 py-2 font-bold transition ${
                donem === "tumu"
                  ? "bg-cyan-500 text-slate-950"
                  : "border border-slate-700 text-slate-300 hover:bg-slate-800"
              }`}
            >
              Tümü
            </Link>
          </div>

          <form
            method="GET"
            className="mt-5 flex flex-col gap-3 md:flex-row md:items-end"
          >
            <input
              type="hidden"
              name="donem"
              value="ozel"
            />

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-400">
                Başlangıç
              </label>

              <input
                type="date"
                name="baslangic"
                defaultValue={
                  params.baslangic ??
                  ayBasi
                }
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-400">
                Bitiş
              </label>

              <input
                type="date"
                name="bitis"
                defaultValue={
                  params.bitis ??
                  bugun
                }
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </div>

            <button
              type="submit"
              className="rounded-xl bg-white px-5 py-3 font-black text-slate-950 hover:bg-slate-200"
            >
              Tarihi Uygula
            </button>
          </form>
        </div>

        {/* DÖNEM */}

        <div className="mb-5">
          <span className="rounded-full bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300">
            Gösterilen dönem:{" "}
            {donemAdi}
          </span>
        </div>

        {/* GRUP TOPLAMLARI */}

        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-3xl border border-emerald-900/50 bg-emerald-950/20 p-7">
            <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Toplam Gelir
            </p>

            <p className="mt-3 text-3xl font-black text-emerald-400 md:text-4xl">
              {money(grupGelir)}
            </p>

            <p className="mt-3 text-sm text-slate-500">
              Satış + Verilen Hizmet
            </p>
          </div>

          <div className="rounded-3xl border border-orange-900/50 bg-orange-950/20 p-7">
            <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Toplam Maliyet / Gider
            </p>

            <p className="mt-3 text-3xl font-black text-orange-400 md:text-4xl">
              {money(grupMaliyet)}
            </p>

            <p className="mt-3 text-sm text-slate-500">
              Alış + Alınan Hizmet +
              Gider
            </p>
          </div>

          <div
            className={`rounded-3xl border p-7 ${
              grupKarda
                ? "border-emerald-700 bg-emerald-950/30"
                : "border-red-700 bg-red-950/30"
            }`}
          >
            <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Grup Net Kâr / Zarar
            </p>

            <p
              className={`mt-3 text-3xl font-black md:text-4xl ${
                grupKarda
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {money(grupNet)}
            </p>

            <div
              className={`mt-4 inline-flex rounded-full px-4 py-2 text-sm font-black ${
                grupKarda
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-red-500/15 text-red-400"
              }`}
            >
              {grupKarda
                ? "KÂR"
                : "ZARAR"}
            </div>
          </div>
        </div>

        {/* ŞİRKET ÖZETLERİ */}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* BEACH */}

          <div className="overflow-hidden rounded-3xl border border-cyan-900/50 bg-slate-900">
            <div className="border-b border-slate-800 p-6">
              <p className="text-sm font-bold uppercase tracking-wider text-cyan-400">
                Şirket 01
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Beach & Mağaza
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-px bg-slate-800">
              <div className="bg-slate-900 p-5">
                <p className="text-sm text-slate-400">
                  Gelir
                </p>

                <p className="mt-2 text-xl font-black text-emerald-400">
                  {money(
                    beachOzet.gelir
                  )}
                </p>
              </div>

              <div className="bg-slate-900 p-5">
                <p className="text-sm text-slate-400">
                  Maliyet / Gider
                </p>

                <p className="mt-2 text-xl font-black text-orange-400">
                  {money(
                    beachOzet.maliyet
                  )}
                </p>
              </div>
            </div>

            <div className="p-6">
              <p className="text-sm text-slate-400">
                Net Kâr / Zarar
              </p>

              <p
                className={`mt-2 text-3xl font-black ${
                  beachOzet.net >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {money(
                  beachOzet.net
                )}
              </p>

              <div className="mt-5 grid gap-2 text-sm text-slate-400">
                <div className="flex justify-between">
                  <span>Satış</span>
                  <span>
                    {money(
                      beachOzet.satis
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>
                    Verilen Hizmet
                  </span>
                  <span>
                    {money(
                      beachOzet.verilenHizmet
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Alış</span>
                  <span>
                    {money(
                      beachOzet.alis
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>
                    Alınan Hizmet
                  </span>
                  <span>
                    {money(
                      beachOzet.alinanHizmet
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Giderler</span>
                  <span>
                    {money(
                      beachOzet.gider
                    )}
                  </span>
                </div>
              </div>

              <Link
                href="/beach"
                className="mt-6 block rounded-xl bg-cyan-500 px-5 py-3 text-center font-black text-slate-950 transition hover:bg-cyan-400"
              >
                Beach'e Gir →
              </Link>
            </div>
          </div>

          {/* HAL */}

          <div className="overflow-hidden rounded-3xl border border-emerald-900/50 bg-slate-900">
            <div className="border-b border-slate-800 p-6">
              <p className="text-sm font-bold uppercase tracking-wider text-emerald-400">
                Şirket 02
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Hal Komisyon & Soğuk
                Hava
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-px bg-slate-800">
              <div className="bg-slate-900 p-5">
                <p className="text-sm text-slate-400">
                  Gelir
                </p>

                <p className="mt-2 text-xl font-black text-emerald-400">
                  {money(
                    halOzet.gelir
                  )}
                </p>
              </div>

              <div className="bg-slate-900 p-5">
                <p className="text-sm text-slate-400">
                  Maliyet / Gider
                </p>

                <p className="mt-2 text-xl font-black text-orange-400">
                  {money(
                    halOzet.maliyet
                  )}
                </p>
              </div>
            </div>

            <div className="p-6">
              <p className="text-sm text-slate-400">
                Net Kâr / Zarar
              </p>

              <p
                className={`mt-2 text-3xl font-black ${
                  halOzet.net >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {money(
                  halOzet.net
                )}
              </p>

              <div className="mt-5 grid gap-2 text-sm text-slate-400">
                <div className="flex justify-between">
                  <span>Satış</span>
                  <span>
                    {money(
                      halOzet.satis
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>
                    Verilen Hizmet
                  </span>
                  <span>
                    {money(
                      halOzet.verilenHizmet
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Alış</span>
                  <span>
                    {money(
                      halOzet.alis
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>
                    Alınan Hizmet
                  </span>
                  <span>
                    {money(
                      halOzet.alinanHizmet
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Giderler</span>
                  <span>
                    {money(
                      halOzet.gider
                    )}
                  </span>
                </div>
              </div>

              <Link
                href="/hal"
                className="mt-6 block rounded-xl bg-emerald-500 px-5 py-3 text-center font-black text-slate-950 transition hover:bg-emerald-400"
              >
                HAL'e Gir →
              </Link>
            </div>
          </div>
        </div>

        {/* HESAP MANTIĞI */}

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="font-black text-slate-300">
            Grup Kâr / Zarar Hesabı
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Toplam Gelir =
            Satış + Verilen Hizmet
            <br />
            Toplam Maliyet =
            Alış + Alınan Hizmet +
            Giderler
            <br />
            Net Kâr / Zarar =
            Toplam Gelir − Toplam
            Maliyet
          </p>

          <p
            className={`mt-4 text-xl font-black ${
              grupKarda
                ? "text-emerald-400"
                : "text-red-400"
            }`}
          >
            Grup sonucu:{" "}
            {grupKarda
              ? "KÂR"
              : "ZARAR"}{" "}
            {money(grupNet)}
          </p>
        </div>
      </div>
    </main>
  );
}