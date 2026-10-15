import { prisma } from "@/lib/prisma";

function tipAdi(tip: string) {
  switch (tip) {
    case "KASA":
      return "Kasa";
    case "BANKA":
      return "Banka";
    case "KREDI_KARTI":
      return "Kredi Kartı / POS";
    default:
      return tip;
  }
}

function hesapBakiyesi(
  hareketler: {
    tip: string;
    tutar: unknown;
  }[]
) {
  return hareketler.reduce((toplam, hareket) => {
    const tutar = Number(hareket.tutar);

    if (
      hareket.tip === "GIRIS" ||
      hareket.tip === "TRANSFER_GIRIS"
    ) {
      return toplam + tutar;
    }

    if (
      hareket.tip === "CIKIS" ||
      hareket.tip === "TRANSFER_CIKIS"
    ) {
      return toplam - tutar;
    }

    return toplam;
  }, 0);
}

function para(
  value: number,
  paraBirimi: string
) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: paraBirimi,
  }).format(value);
}

export default async function FinansYonetimPage() {
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

  const hesaplar = await prisma.finansHesap.findMany({
    where: {
      sirketId: sirket.id,
    },

    include: {
      hareketler: {
        select: {
          tip: true,
          tutar: true,
        },
      },
    },

    orderBy: [
      {
        aktif: "desc",
      },
      {
        tip: "asc",
      },
      {
        ad: "asc",
      },
    ],
  });

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Yönetim Paneli
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Finans Hesapları
            </h1>

            <p className="mt-2 text-slate-400">
              Kasa, banka, kredi kartı ve POS hesaplarını yönetin.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/hal/yonetim"
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 hover:bg-slate-900"
            >
              ← Yönetim Paneli
            </a>

            <a
              href="/hal/kasa-banka/yeni"
              className="rounded-xl bg-cyan-500 px-5 py-3 font-black text-slate-950 hover:bg-cyan-400"
            >
              + Yeni Finans Hesabı
            </a>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Toplam Hesap
            </p>

            <p className="mt-2 text-3xl font-black">
              {hesaplar.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Aktif Hesap
            </p>

            <p className="mt-2 text-3xl font-black text-emerald-400">
              {
                hesaplar.filter(
                  (hesap) => hesap.aktif
                ).length
              }
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Pasif Hesap
            </p>

            <p className="mt-2 text-3xl font-black text-slate-400">
              {
                hesaplar.filter(
                  (hesap) => !hesap.aktif
                ).length
              }
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px]">
              <thead className="bg-slate-950/70">
                <tr className="text-left text-sm text-slate-400">
                  <th className="px-5 py-4">
                    Hesap
                  </th>

                  <th className="px-5 py-4">
                    Tür
                  </th>

                  <th className="px-5 py-4">
                    Banka
                  </th>

                  <th className="px-5 py-4">
                    Para Birimi
                  </th>

                  <th className="px-5 py-4">
                    IBAN / Hesap No
                  </th>

                  <th className="px-5 py-4 text-right">
                    Bakiye
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
                {hesaplar.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      Henüz finans hesabı bulunmuyor.
                    </td>
                  </tr>
                )}

                {hesaplar.map((hesap) => {
                  const bakiye =
                    hesapBakiyesi(
                      hesap.hareketler
                    );

                  return (
                    <tr
                      key={hesap.id}
                      className="border-t border-slate-800"
                    >
                      <td className="px-5 py-4">
                        <p className="font-bold">
                          {hesap.ad}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          ID: {hesap.id}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        {tipAdi(hesap.tip)}
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {hesap.bankaAdi ??
                          "-"}
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {hesap.paraBirimi}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-300">
                        {hesap.iban ??
                          hesap.hesapNo ??
                          "-"}
                      </td>

                      <td className="px-5 py-4 text-right font-black">
                        {para(
                          bakiye,
                          hesap.paraBirimi
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {hesap.aktif ? (
                          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                            Aktif
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-700 px-3 py-1 text-xs font-bold text-slate-400">
                            Pasif
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <a
                          href={`/hal/yonetim/finans/${hesap.id}`}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:border-cyan-500 hover:text-cyan-400"
                        >
                          Düzenle
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-cyan-900/50 bg-cyan-950/10 p-5">
          <p className="font-black text-cyan-400">
            Finans Hesabı Mantığı
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-300">
            Yeni banka, kasa veya kredi kartı hesabı buradan
            oluşturulacak. Hesabı silmek yerine pasife alacağız;
            böylece geçmiş faturalar ve finans hareketleri
            kaybolmayacak.
          </p>
        </div>
      </div>
    </main>
  );
}