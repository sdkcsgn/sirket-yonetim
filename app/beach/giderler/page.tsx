import { prisma } from "@/lib/prisma";

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

function giderTipiAdi(tip: string) {
  switch (tip) {
    case "ELEKTRIK":
      return "Elektrik";
    case "SU":
      return "Su";
    case "PERSONEL":
      return "Personel";
    case "NAKLIYE":
      return "Nakliye";
    case "KIRA":
      return "Kira";
    case "YAKIT":
      return "Yakıt";
    case "BAKIM_ONARIM":
      return "Bakım / Onarım";
    case "MUHASEBE":
      return "Muhasebe";
    case "KOMISYON":
      return "Komisyon";
    case "VERGI_HARC":
      return "Vergi / Harç";
    case "TELEFON_INTERNET":
      return "Telefon / İnternet";
    case "NOTER":
      return "Noter";
    case "ODA_AIDAT":
      return "Oda Aidatı";
    case "DIGER_ARAC_GIDERLERI":
      return "Diğer Araç Giderleri";
    case "MARKET":
      return "Market";
    case "ORTULU_ODENEK":
      return "Örtülü Ödenek";
    case "DIGER":
      return "Diğer";
    default:
      return tip;
  }
}

export default async function GiderlerPage() {
  const sirket = await prisma.sirket.findUnique({
    where: {
      kod: "BEACH",
    },
  });

  if (!sirket) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        BEACH şirketi bulunamadı.
      </main>
    );
  }

  const giderler = await prisma.gider.findMany({
    where: {
      sirketId: sirket.id,
    },

    include: {
      cari: true,
      finansHesap: true,
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

  const toplamGider = giderler.reduce(
    (toplam, gider) =>
      toplam + Number(gider.tutar),
    0
  );

  const kategoriToplamlari = giderler.reduce<
    Record<string, number>
  >((acc, gider) => {
    acc[gider.tip] =
      (acc[gider.tip] || 0) +
      Number(gider.tutar);

    return acc;
  }, {});

  const kategoriSirali = Object.entries(
    kategoriToplamlari
  ).sort((a, b) => b[1] - a[1]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Beach & Mağaza
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Giderler
            </h1>

            <p className="mt-2 text-slate-400">
              Şirket giderlerini, cari ve kasa/banka
              bağlantılarıyla takip edin.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/beach"
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 hover:bg-slate-900"
            >
              ← Ana Panel
            </a>

            <a
              href="/beach/giderler/yeni"
              className="rounded-xl bg-cyan-500 px-5 py-3 font-black text-slate-950 hover:bg-cyan-400"
            >
              + Yeni Gider
            </a>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Toplam Gider
            </p>

            <p className="mt-3 text-3xl font-black text-red-400">
              {money(toplamGider)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Gider Kaydı
            </p>

            <p className="mt-3 text-3xl font-black">
              {giderler.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Gider Kategorisi
            </p>

            <p className="mt-3 text-3xl font-black text-cyan-400">
              {kategoriSirali.length}
            </p>
          </div>
        </div>

        {kategoriSirali.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-xl font-black">
              Kategori Toplamları
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {kategoriSirali.map(
                ([tip, toplam]) => (
                  <div
                    key={tip}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                  >
                    <p className="text-sm font-semibold text-slate-400">
                      {giderTipiAdi(tip)}
                    </p>

                    <p className="mt-2 text-xl font-black text-red-400">
                      {money(toplam)}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-6 py-5">
            <h2 className="text-xl font-black">
              Gider Hareketleri
            </h2>
          </div>

          {giderler.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-slate-400">
                Henüz gider kaydı bulunmuyor.
              </p>

              <a
                href="/beach/giderler/yeni"
                className="mt-5 inline-block rounded-xl bg-cyan-500 px-5 py-3 font-black text-slate-950"
              >
                İlk Gideri Ekle
              </a>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px]">
                <thead className="bg-slate-950/60">
                  <tr className="text-left text-sm text-slate-400">
                    <th className="px-6 py-4">
                      Tarih
                    </th>

                    <th className="px-6 py-4">
                      Gider Tipi
                    </th>

                    <th className="px-6 py-4">
                      Açıklama
                    </th>

                    <th className="px-6 py-4">
                      Cari
                    </th>

                    <th className="px-6 py-4">
                      Kasa / Banka
                    </th>

                    <th className="px-6 py-4">
                      Belge
                    </th>

                    <th className="px-6 py-4 text-right">
                      Tutar
                    </th>

                    <th className="px-6 py-4 text-right">
                      İşlem
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {giderler.map(
                    (gider) => (
                      <tr
                        key={gider.id}
                        className="border-t border-slate-800"
                      >
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-300">
                          {date(gider.tarih)}
                        </td>

                        <td className="px-6 py-4">
                          <span className="rounded-full border border-cyan-900/60 bg-cyan-950/20 px-3 py-1 text-xs font-bold text-cyan-400">
                            {giderTipiAdi(
                              gider.tip
                            )}
                          </span>
                        </td>

                        <td className="max-w-[280px] px-6 py-4">
                          <p className="truncate font-semibold">
                            {gider.aciklama}
                          </p>

                          {gider.faturaNo && (
                            <p className="mt-1 text-xs text-slate-500">
                              Fatura:{" "}
                              {gider.faturaNo}
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-4 text-sm">
                          {gider.cari ? (
                            <a
                              href={`/beach/cariler/${gider.cari.id}`}
                              className="font-semibold text-cyan-400 hover:text-cyan-300"
                            >
                              {
                                gider.cari
                                  .unvan
                              }
                            </a>
                          ) : (
                            <span className="text-slate-500">
                              -
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-300">
                          {gider.finansHesap
                            ? `${
                                gider
                                  .finansHesap
                                  .tip ===
                                "KASA"
                                  ? "Kasa"
                                  : "Banka"
                              } - ${
                                gider
                                  .finansHesap
                                  .ad
                              }`
                            : "-"}
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-400">
                          {gider.belgeNo ||
                            gider.faturaNo ||
                            "-"}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-right text-lg font-black text-red-400">
                          {money(
                            Number(
                              gider.tutar
                            )
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <a
                            href={`/beach/giderler/${gider.id}`}
                            className="inline-block rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800"
                          >
                            Detay
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
      </div>
    </main>
  );
}