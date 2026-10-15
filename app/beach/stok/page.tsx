import { prisma } from "@/lib/prisma";

function number(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);
}

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function StokPage() {
  const sirket = await prisma.sirket.findUnique({
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

  const stoklar = await prisma.stok.findMany({
    where: {
      sirketId: sirket.id,
      aktif: true,
    },

    include: {
      hareketler: {
        orderBy: {
          tarih: "desc",
        },
        take: 1,
      },
    },

    orderBy: {
      ad: "asc",
    },
  });

  const toplamUrun =
    stoklar.length;

  const kritikUrun =
    stoklar.filter(
      (stok) =>
        Number(stok.mevcutMiktar) <=
        Number(stok.minimumStok)
    ).length;

  const sifirStok =
    stoklar.filter(
      (stok) =>
        Number(stok.mevcutMiktar) <= 0
    ).length;

  const tahminiStokDegeri =
    stoklar.reduce(
      (toplam, stok) =>
        toplam +
        Number(stok.mevcutMiktar) *
          Number(stok.alisFiyati),
      0
    );

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
              Stok
            </h1>

            <p className="mt-2 text-slate-400">
              Ürün stokları ve giriş / çıkış hareketleri
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
              href="/beach/stok/yeni"
              className="rounded-xl bg-cyan-500 px-5 py-3 font-black text-slate-950 transition hover:bg-cyan-400"
            >
              + Yeni Ürün
            </a>

          </div>

        </div>

        {/* ÖZET */}

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <p className="text-sm text-slate-400">
              Toplam Ürün
            </p>

            <p className="mt-3 text-3xl font-black">
              {toplamUrun}
            </p>

          </div>

          <div className="rounded-2xl border border-amber-900/50 bg-slate-900 p-6">

            <p className="text-sm text-slate-400">
              Kritik Stok
            </p>

            <p className="mt-3 text-3xl font-black text-amber-400">
              {kritikUrun}
            </p>

          </div>

          <div className="rounded-2xl border border-red-900/50 bg-slate-900 p-6">

            <p className="text-sm text-slate-400">
              Stokta Yok
            </p>

            <p className="mt-3 text-3xl font-black text-red-400">
              {sifirStok}
            </p>

          </div>

          <div className="rounded-2xl border border-emerald-900/50 bg-slate-900 p-6">

            <p className="text-sm text-slate-400">
              Tahmini Stok Değeri
            </p>

            <p className="mt-3 text-3xl font-black text-emerald-400">
              {money(tahminiStokDegeri)}
            </p>

          </div>

        </div>

        {/* TABLO */}

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

          <div className="border-b border-slate-800 p-6">

            <h2 className="text-xl font-black">
              Ürünler
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Güncel stok durumları
            </p>

          </div>

          {stoklar.length === 0 ? (
            <div className="p-14 text-center">

              <div className="text-5xl">
                📦
              </div>

              <h3 className="mt-5 text-xl font-black">
                Henüz ürün yok
              </h3>

              <p className="mt-2 text-slate-400">
                İlk ürününüzü ekleyebilirsiniz.
              </p>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[1100px]">

                <thead>
                  <tr className="border-b border-slate-800 text-left text-sm text-slate-400">

                    <th className="px-5 py-4">
                      Kod
                    </th>

                    <th className="px-5 py-4">
                      Ürün
                    </th>

                    <th className="px-5 py-4">
                      Kategori
                    </th>

                    <th className="px-5 py-4 text-right">
                      Stok
                    </th>

                    <th className="px-5 py-4 text-right">
                      Minimum
                    </th>

                    <th className="px-5 py-4 text-right">
                      Alış
                    </th>

                    <th className="px-5 py-4 text-right">
                      Satış
                    </th>

                    <th className="px-5 py-4">
                      Son Hareket
                    </th>

                    <th className="px-5 py-4 text-right">
                      İşlem
                    </th>

                  </tr>
                </thead>

                <tbody>
                  {stoklar.map((stok) => {
                    const mevcut =
                      Number(
                        stok.mevcutMiktar
                      );

                    const minimum =
                      Number(
                        stok.minimumStok
                      );

                    const kritik =
                      mevcut <= minimum;

                    const sonHareket =
                      stok.hareketler[0];

                    return (
                      <tr
                        key={stok.id}
                        className="border-b border-slate-800/70 transition hover:bg-slate-800/30"
                      >

                        <td className="px-5 py-5 text-slate-400">
                          {stok.kod}
                        </td>

                        <td className="px-5 py-5">

                          <p className="font-black">
                            {stok.ad}
                          </p>

                          {stok.depoBolumu && (
                            <p className="mt-1 text-xs text-slate-500">
                              {stok.depoBolumu}
                            </p>
                          )}

                        </td>

                        <td className="px-5 py-5 text-slate-300">
                          {stok.kategori || "-"}
                        </td>

                        <td
                          className={`whitespace-nowrap px-5 py-5 text-right text-lg font-black ${
                            mevcut <= 0
                              ? "text-red-400"
                              : kritik
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {number(mevcut)}{" "}
                          {stok.birim}
                        </td>

                        <td className="whitespace-nowrap px-5 py-5 text-right text-slate-300">
                          {number(minimum)}{" "}
                          {stok.birim}
                        </td>

                        <td className="whitespace-nowrap px-5 py-5 text-right text-slate-300">
                          {money(
                            Number(
                              stok.alisFiyati
                            )
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-5 text-right text-slate-300">
                          {money(
                            Number(
                              stok.satisFiyati
                            )
                          )}
                        </td>

                        <td className="px-5 py-5">

                          {sonHareket ? (
                            <div>
                              <p className="text-sm font-semibold">
                                {Number(
                                  sonHareket.giris
                                ) > 0
                                  ? `+${number(
                                      Number(
                                        sonHareket.giris
                                      )
                                    )} ${stok.birim}`
                                  : `-${number(
                                      Number(
                                        sonHareket.cikis
                                      )
                                    )} ${stok.birim}`}
                              </p>

                              <p className="mt-1 max-w-[220px] truncate text-xs text-slate-500">
                                {sonHareket.aciklama ||
                                  "-"}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-500">
                              -
                            </span>
                          )}

                        </td>

                        <td className="px-5 py-5">

                          <div className="flex justify-end gap-2">

                            <a
                              href={`/beach/stok/${stok.id}`}
                              className="rounded-lg border border-cyan-700 px-3 py-2 text-sm font-bold text-cyan-400 transition hover:bg-cyan-950/30"
                            >
                              Detay
                            </a>

                            <a
                              href={`/beach/stok/${stok.id}/hareket?tip=GIRIS`}
                              className="rounded-lg border border-emerald-700 px-3 py-2 text-sm font-bold text-emerald-400 transition hover:bg-emerald-950/30"
                            >
                              + Giriş
                            </a>

                            <a
                              href={`/beach/stok/${stok.id}/hareket?tip=CIKIS`}
                              className="rounded-lg border border-red-700 px-3 py-2 text-sm font-bold text-red-400 transition hover:bg-red-950/30"
                            >
                              − Çıkış
                            </a>

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