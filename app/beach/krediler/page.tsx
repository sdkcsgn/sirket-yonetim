import { prisma } from "@/lib/prisma";
import {
  tcmbKurlariGetir,
  tlKarsiligi,
} from "@/lib/tcmb";

function money(
  value: number,
  currency = "TRY"
) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function date(value: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function krediTipiYaz(tip: string) {
  const tipler: Record<string, string> = {
    TAKSITLI: "Taksitli Kredi",
    SPOT: "Spot Kredi",
    ROTATIF: "Rotatif Kredi",
  };

  return tipler[tip] ?? tip;
}

function krediTipiClass(tip: string) {
  switch (tip) {
    case "TAKSITLI":
      return "bg-cyan-500/10 text-cyan-400";

    case "SPOT":
      return "bg-amber-500/10 text-amber-400";

    case "ROTATIF":
      return "bg-violet-500/10 text-violet-400";

    default:
      return "bg-slate-700 text-slate-300";
  }
}

export default async function KredilerPage() {
  const sirket =
    await prisma.sirket.findUnique({
      where: {
        kod: "BEACH",
      },
    });

  if (!sirket) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Beach & Mağaza şirketi bulunamadı.
      </main>
    );
  }

  const [krediler, kurlar] =
    await Promise.all([
      prisma.kredi.findMany({
        where: {
          sirketId: sirket.id,
        },

        include: {
          finansHesap: true,
        },

        orderBy: [
          {
            durum: "asc",
          },
          {
            vadeTarihi: "asc",
          },
          {
            id: "desc",
          },
        ],
      }),

      tcmbKurlariGetir(),
    ]);

  const aktifKrediler =
    krediler.filter(
      (kredi) =>
        kredi.durum === "AKTIF"
    );

  const toplamKrediBorcuTl =
    aktifKrediler.reduce(
      (toplam, kredi) => {
        return (
          toplam +
          tlKarsiligi(
            Number(kredi.kalanBorc),
            kredi.paraBirimi,
            kurlar
          )
        );
      },
      0
    );

  const taksitliToplamTl =
    aktifKrediler
      .filter(
        (kredi) =>
          kredi.tip === "TAKSITLI"
      )
      .reduce(
        (toplam, kredi) =>
          toplam +
          tlKarsiligi(
            Number(kredi.kalanBorc),
            kredi.paraBirimi,
            kurlar
          ),
        0
      );

  const spotToplamTl =
    aktifKrediler
      .filter(
        (kredi) =>
          kredi.tip === "SPOT"
      )
      .reduce(
        (toplam, kredi) =>
          toplam +
          tlKarsiligi(
            Number(kredi.kalanBorc),
            kredi.paraBirimi,
            kurlar
          ),
        0
      );

  const rotatifToplamTl =
    aktifKrediler
      .filter(
        (kredi) =>
          kredi.tip === "ROTATIF"
      )
      .reduce(
        (toplam, kredi) =>
          toplam +
          tlKarsiligi(
            Number(kredi.kalanBorc),
            kredi.paraBirimi,
            kurlar
          ),
        0
      );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* BAŞLIK */}

        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">

          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-400">
              Beach & Mağaza
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Krediler
            </h1>

            <p className="mt-2 text-slate-400">
              Taksitli, spot ve rotatif kredilerin takibi
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
              href="/beach/krediler/yeni"
              className="rounded-xl bg-violet-500 px-5 py-3 font-black text-white transition hover:bg-violet-400"
            >
              + Yeni Kredi
            </a>

          </div>
        </div>

        {/* TOPLAM */}

        <div className="mb-8 rounded-3xl border border-violet-900/50 bg-violet-950/10 p-8">

          <p className="text-sm font-bold uppercase tracking-[0.15em] text-slate-400">
            Toplam Kredi Borcu
          </p>

          <p className="mt-3 text-4xl font-black text-violet-400 md:text-5xl">
            {money(toplamKrediBorcuTl)}
          </p>

          <p className="mt-3 text-sm text-slate-500">
            Aktif kredilerin TL karşılığı
          </p>

        </div>

        {/* ÖZET */}

        <div className="grid gap-5 md:grid-cols-3">

          <div className="rounded-2xl border border-cyan-900/50 bg-slate-900 p-6">

            <p className="text-sm text-slate-400">
              Taksitli Krediler
            </p>

            <p className="mt-3 text-3xl font-black text-cyan-400">
              {money(taksitliToplamTl)}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              {
                aktifKrediler.filter(
                  (kredi) =>
                    kredi.tip === "TAKSITLI"
                ).length
              }{" "}
              aktif kredi
            </p>

          </div>

          <div className="rounded-2xl border border-amber-900/50 bg-slate-900 p-6">

            <p className="text-sm text-slate-400">
              Spot Krediler
            </p>

            <p className="mt-3 text-3xl font-black text-amber-400">
              {money(spotToplamTl)}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              {
                aktifKrediler.filter(
                  (kredi) =>
                    kredi.tip === "SPOT"
                ).length
              }{" "}
              aktif kredi
            </p>

          </div>

          <div className="rounded-2xl border border-violet-900/50 bg-slate-900 p-6">

            <p className="text-sm text-slate-400">
              Rotatif Krediler
            </p>

            <p className="mt-3 text-3xl font-black text-violet-400">
              {money(rotatifToplamTl)}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              {
                aktifKrediler.filter(
                  (kredi) =>
                    kredi.tip === "ROTATIF"
                ).length
              }{" "}
              aktif kredi
            </p>

          </div>

        </div>

        {/* KREDİ LİSTESİ */}

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

          <div className="border-b border-slate-800 p-6">

            <h2 className="text-xl font-black">
              Kredi Listesi
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              {krediler.length} kredi kaydı
            </p>

          </div>

          {krediler.length === 0 ? (
            <div className="p-14 text-center">

              <div className="text-5xl">
                💳
              </div>

              <h3 className="mt-5 text-xl font-black">
                Henüz kredi kaydı yok
              </h3>

              <p className="mt-2 text-slate-400">
                Taksitli, spot veya rotatif
                kredinizi ekleyebilirsiniz.
              </p>

              <a
                href="/beach/krediler/yeni"
                className="mt-6 inline-block rounded-xl bg-violet-500 px-6 py-3 font-black text-white"
              >
                + İlk Krediyi Ekle
              </a>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[1300px]">

                <thead>
                  <tr className="border-b border-slate-800 text-left text-sm text-slate-400">

                    <th className="px-5 py-4">
                      Kredi
                    </th>

                    <th className="px-5 py-4">
                      Tip
                    </th>

                    <th className="px-5 py-4">
                      Banka
                    </th>

                    <th className="px-5 py-4">
                      Ana Para
                    </th>

                    <th className="px-5 py-4">
                      Kalan Borç
                    </th>

                    <th className="px-5 py-4">
                      Faiz
                    </th>

                    <th className="px-5 py-4">
                      Sonraki Ödeme
                    </th>

                    <th className="px-5 py-4">
                      Vade
                    </th>

                    <th className="px-5 py-4">
                      Durum
                    </th>

                    <th className="px-5 py-4 text-right">
                      İşlem
                    </th>

                  </tr>
                </thead>

                <tbody>
                  {krediler.map(
                    (kredi) => (
                      <tr
                        key={kredi.id}
                        className="border-b border-slate-800/70 transition hover:bg-slate-800/30"
                      >

                        <td className="px-5 py-5">

                          <a
                            href={`/beach/krediler/${kredi.id}`}
                            className="font-black transition hover:text-violet-400"
                          >
                            {kredi.ad}
                          </a>

                          {kredi.krediNo && (
                            <p className="mt-1 text-xs text-slate-500">
                              No: {kredi.krediNo}
                            </p>
                          )}

                        </td>

                        <td className="px-5 py-5">

                          <span
                            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${krediTipiClass(
                              kredi.tip
                            )}`}
                          >
                            {krediTipiYaz(
                              kredi.tip
                            )}
                          </span>

                        </td>

                        <td className="px-5 py-5">

                          <p className="font-semibold text-slate-300">
                            {kredi.finansHesap
                              ?.bankaAdi ||
                              kredi.finansHesap
                                ?.ad ||
                              "-"}
                          </p>

                        </td>

                        <td className="whitespace-nowrap px-5 py-5">
                          {money(
                            Number(
                              kredi.anaPara
                            ),
                            kredi.paraBirimi
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-5 text-lg font-black text-red-400">
                          {money(
                            Number(
                              kredi.kalanBorc
                            ),
                            kredi.paraBirimi
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-5 text-slate-300">
                          {kredi.faizOrani
                            ? `%${Number(
                                kredi.faizOrani
                              ).toLocaleString(
                                "tr-TR"
                              )}`
                            : "-"}
                        </td>

                        <td className="whitespace-nowrap px-5 py-5">
                          {date(
                            kredi.sonrakiOdemeTarihi
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-5">
                          {date(
                            kredi.vadeTarihi
                          )}
                        </td>

                        <td className="px-5 py-5">

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              kredi.durum ===
                              "AKTIF"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-slate-700 text-slate-300"
                            }`}
                          >
                            {kredi.durum ===
                            "AKTIF"
                              ? "Aktif"
                              : "Kapandı"}
                          </span>

                        </td>

                        <td className="px-5 py-5 text-right">

                          <div className="flex justify-end gap-2">

                            <a
                              href={`/beach/krediler/${kredi.id}`}
                              className="rounded-lg border border-violet-700 px-4 py-2 text-sm font-bold text-violet-400 transition hover:bg-violet-950/30"
                            >
                              Detay
                            </a>

                            {kredi.durum ===
                              "AKTIF" && (
                              <a
                                href={`/beach/krediler/${kredi.id}/odeme`}
                                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-emerald-400"
                              >
                                Ödeme
                              </a>
                            )}

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

      </div>
    </main>
  );
}