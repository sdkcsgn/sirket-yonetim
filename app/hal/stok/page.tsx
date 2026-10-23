import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

type Props = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function StokPage({
  searchParams,
}: Props) {
  const query = await searchParams;
  const sirket = await prisma.sirket.findUnique({
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

  async function stokSil(formData: FormData) {
    "use server";

    const stokId = Number(formData.get("stokId"));

    const hata = (mesaj: string): never => {
      redirect(`/hal/stok?error=${encodeURIComponent(mesaj)}`);
    };

    if (!Number.isInteger(stokId) || stokId <= 0) {
      return hata("Geçersiz stok kaydı.");
    }

    const sirket = await prisma.sirket.findUnique({
      where: {
        kod: "HAL",
      },
    });

    if (!sirket) {
      throw new Error("Hal Komisyon & Soğuk Hava şirketi bulunamadı.");
    }

    const stok = await prisma.stok.findFirst({
      where: {
        id: stokId,
        sirketId: sirket.id,
      },
    });

    if (!stok) {
      return hata("Silinecek ürün bulunamadı.");
    }

    const [hareketSayisi, faturaKalemiSayisi] = await Promise.all([
      prisma.stokHareket.count({
        where: {
          stokId: stok.id,
        },
      }),
      prisma.faturaKalemi.count({
        where: {
          stokId: stok.id,
        },
      }),
    ]);

    if (
      hareketSayisi > 0 ||
      faturaKalemiSayisi > 0 ||
      Number(stok.mevcutMiktar) !== 0
    ) {
      return hata(
        `${stok.kod} - ${stok.ad} silinmedi. Ürünün stok hareketi, fatura geçmişi veya mevcut miktarı var. Geçmiş kayıtları korumak için ürünü düzenleyin ya da pasife alın.`
      );
    }

    await prisma.stok.delete({
      where: {
        id: stok.id,
      },
    });

    revalidatePath("/hal");
    revalidatePath("/hal/stok");
    revalidatePath("/hal/yonetim/stok");
    revalidatePath("/hal/faturalar/yeni");

    redirect("/hal/stok");
  }

  const hareketler = await prisma.stokHareket.findMany({
    where: {
      stok: {
        sirketId: sirket.id,
      },
    },
    include: {
      stok: true,
    },
    orderBy: [
      {
        tarih: "desc",
      },
      {
        id: "desc",
      },
    ],
    take: 100,
  });

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
              Hal Komisyon & Soğuk Hava
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
    href="/hal"
    className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 transition hover:bg-slate-900"
  >
    ← Panele Dön
  </a>

  <a
    href="/hal/stok/excel"
    className="rounded-xl border border-emerald-700 bg-emerald-950/30 px-5 py-3 font-black text-emerald-400 transition hover:bg-emerald-950/60"
  >
    📊 Excel'e Aktar
  </a>

  <a
    href="/hal/stok/yeni"
    className="rounded-xl bg-cyan-500 px-5 py-3 font-black text-slate-950 transition hover:bg-cyan-400"
  >
    + Yeni Ürün
  </a>

</div>

        </div>

        {query.error && (
          <div className="mb-6 rounded-xl border border-red-800 bg-red-950/30 p-4 text-sm font-semibold text-red-300">
            {query.error}
          </div>
        )}

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
                              href={`/hal/stok/${stok.id}`}
                              className="rounded-lg border border-cyan-700 px-3 py-2 text-sm font-bold text-cyan-400 transition hover:bg-cyan-950/30"
                            >
                              Detay
                            </a>

                      
  

<a
  href={`/hal/yonetim/stok/${stok.id}/duzenle`}
  className="rounded-lg border border-amber-700 px-3 py-2 text-sm font-bold text-amber-400 transition hover:bg-amber-950/30"
>
  Düzenle
</a>


                            <a
                              href={`/hal/stok/${stok.id}/hareket?tip=GIRIS`}
                              className="rounded-lg border border-emerald-700 px-3 py-2 text-sm font-bold text-emerald-400 transition hover:bg-emerald-950/30"
                            >
                              + Giriş
                            </a>

                            <a
                              href={`/hal/stok/${stok.id}/hareket?tip=CIKIS`}
                              className="rounded-lg border border-red-700 px-3 py-2 text-sm font-bold text-red-400 transition hover:bg-red-950/30"
                            >
                              − Çıkış
                            </a>

                            <form action={stokSil}>
                              <input
                                type="hidden"
                                name="stokId"
                                value={stok.id}
                              />
                              <button
                                type="submit"
                                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-black text-white transition hover:bg-red-500"
                              >
                                Sil
                              </button>
                            </form>

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

        {/* STOK HAREKETLERİ */}

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-6">
            <h2 className="text-xl font-black">
              Stok Giriş / Çıkış Hareketleri
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Son 100 stok hareketi — fatura ve manuel giriş / çıkışlar birlikte gösterilir.
            </p>
          </div>

          {hareketler.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              Henüz stok giriş / çıkış hareketi bulunmuyor.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px]">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-sm text-slate-400">
                    <th className="px-5 py-4">Tarih</th>
                    <th className="px-5 py-4">Kod</th>
                    <th className="px-5 py-4">Ürün</th>
                    <th className="px-5 py-4">Hareket</th>
                    <th className="px-5 py-4 text-right">Giriş</th>
                    <th className="px-5 py-4 text-right">Çıkış</th>
                    <th className="px-5 py-4">Belge No</th>
                    <th className="px-5 py-4">Açıklama</th>
                  </tr>
                </thead>

                <tbody>
                  {hareketler.map((hareket) => {
                    const giris = Number(hareket.giris);
                    const cikis = Number(hareket.cikis);

                    return (
                      <tr
                        key={hareket.id}
                        className="border-b border-slate-800/70 transition hover:bg-slate-800/30"
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-slate-300">
                          {new Intl.DateTimeFormat("tr-TR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          }).format(hareket.tarih)}
                        </td>

                        <td className="px-5 py-4 text-slate-400">
                          {hareket.stok.kod}
                        </td>

                        <td className="px-5 py-4 font-bold">
                          {hareket.stok.ad}
                        </td>

                        <td className="px-5 py-4">
                          {giris > 0 ? (
                            <span className="rounded-full bg-emerald-950/50 px-3 py-1 text-xs font-black text-emerald-400">
                              GİRİŞ
                            </span>
                          ) : (
                            <span className="rounded-full bg-red-950/50 px-3 py-1 text-xs font-black text-red-400">
                              ÇIKIŞ
                            </span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right font-black text-emerald-400">
                          {giris > 0
                            ? `+${number(giris)} ${hareket.stok.birim}`
                            : "-"}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right font-black text-red-400">
                          {cikis > 0
                            ? `-${number(cikis)} ${hareket.stok.birim}`
                            : "-"}
                        </td>

                        <td className="px-5 py-4 text-slate-300">
                          {hareket.belgeNo || "-"}
                        </td>

                        <td className="max-w-[320px] px-5 py-4 text-slate-400">
                          {hareket.aciklama || "-"}
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