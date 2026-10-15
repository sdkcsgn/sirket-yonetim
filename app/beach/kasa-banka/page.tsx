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

export default async function KasaPage() {
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

  const [kasalar, kurlar] = await Promise.all([
    prisma.finansHesap.findMany({
      where: {
        sirketId: sirket.id,
        aktif: true,
        tip: "KASA",
      },

      include: {
        hareketler: {
          orderBy: {
            tarih: "desc",
          },
        },
      },

      orderBy: {
        ad: "asc",
      },
    }),

    tcmbKurlariGetir(),
  ]);

  const kasalarBakiyeli = kasalar.map((kasa) => {
    const bakiye = kasa.hareketler.reduce(
      (toplam, hareket) => {
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
      },
      0
    );

    const tlDegeri = tlKarsiligi(
      bakiye,
      kasa.paraBirimi,
      kurlar
    );

    return {
      ...kasa,
      bakiye,
      tlDegeri,
    };
  });

  const toplamKasaTl = kasalarBakiyeli.reduce(
    (toplam, kasa) =>
      toplam + kasa.tlDegeri,
    0
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* BAŞLIK */}

        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
              Beach & Mağaza
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Kasa
            </h1>

            <p className="mt-2 text-slate-400">
              Nakit kasalar, manuel giriş/çıkış,
              tahsilat ve ödeme işlemleri
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/beach"
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 hover:bg-slate-900"
            >
              ← Panele Dön
            </a>

            <a
              href="/beach/kasa-banka/yeni?tip=KASA"
              className="rounded-xl border border-emerald-700 px-5 py-3 font-bold text-emerald-400 hover:bg-emerald-950/30"
            >
              + Yeni Kasa
            </a>

            <a
              href="/beach/kasa-banka/hareket-yeni?tip=GIRIS"
              className="rounded-xl bg-emerald-500 px-5 py-3 font-black text-slate-950 hover:bg-emerald-400"
            >
              + Kasa Girişi
            </a>

            <a
              href="/beach/kasa-banka/hareket-yeni?tip=CIKIS"
              className="rounded-xl border border-red-700 px-5 py-3 font-bold text-red-400 hover:bg-red-950/30"
            >
              − Kasa Çıkışı
            </a>
          </div>
        </div>

        {/* TOPLAM KASA */}

        <div className="mb-8 rounded-3xl border border-emerald-900/50 bg-emerald-950/10 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">
            Toplam Kasa
          </p>

          <p
            className={`mt-3 text-4xl font-black md:text-5xl ${
              toplamKasaTl >= 0
                ? "text-emerald-400"
                : "text-red-400"
            }`}
          >
            {money(toplamKasaTl)}
          </p>

          <p className="mt-3 text-sm text-slate-500">
            Tüm TL ve döviz kasalarının
            TCMB kuru ile TL karşılığı
          </p>
        </div>

        {/* HIZLI İŞLEMLER */}

        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">

          <a
            href="/beach/kasa-banka/hareket-yeni?tip=GIRIS"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-emerald-600"
          >
            <div className="text-3xl">💵</div>

            <h2 className="mt-4 text-xl font-black">
              Manuel Giriş
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Kasaya manuel para girişi yap
            </p>
          </a>

          <a
            href="/beach/kasa-banka/hareket-yeni?tip=CIKIS"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-red-600"
          >
            <div className="text-3xl">💸</div>

            <h2 className="mt-4 text-xl font-black">
              Manuel Çıkış
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Kasadan manuel para çıkışı yap
            </p>
          </a>

          <a
            href="/beach/kasa-banka/hareket-yeni?tip=GIRIS"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-cyan-600"
          >
            <div className="text-3xl">👤</div>

            <h2 className="mt-4 text-xl font-black">
              Cari Tahsilat
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Cariden nakit tahsilat al
            </p>
          </a>

          <a
            href="/beach/kasa-banka/hareket-yeni?tip=CIKIS"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-orange-600"
          >
            <div className="text-3xl">🤝</div>

            <h2 className="mt-4 text-xl font-black">
              Cari Ödeme
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Cariye nakit ödeme yap
            </p>
          </a>
        </div>

        {/* TRANSFER */}

        <div className="mb-8">
          <a
            href="/beach/kasa-banka/transfer"
            className="flex items-center justify-between rounded-2xl border border-amber-900/50 bg-amber-950/10 p-6 transition hover:border-amber-600"
          >
            <div>
              <h2 className="text-xl font-black text-amber-400">
                ↔ Kasa / Banka Transferi
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Kasadan bankaya veya bankadan kasaya para aktar
              </p>
            </div>

            <span className="text-2xl text-amber-400">
              →
            </span>
          </a>
        </div>

        {/* KASALAR */}

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

          <div className="border-b border-slate-800 p-6">
            <h2 className="text-xl font-black">
              Kasalar
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Tanımlı tüm aktif kasalar
            </p>
          </div>

          {kasalarBakiyeli.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl">
                💵
              </div>

              <h3 className="mt-4 text-xl font-black">
                Henüz kasa tanımlanmamış
              </h3>

              <p className="mt-2 text-slate-400">
                İlk kasanızı oluşturarak başlayabilirsiniz.
              </p>

              <a
                href="/beach/kasa-banka/yeni?tip=KASA"
                className="mt-6 inline-block rounded-xl bg-emerald-500 px-6 py-3 font-black text-slate-950"
              >
                + Yeni Kasa
              </a>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">

                <thead>
                  <tr className="border-b border-slate-800 text-left text-sm text-slate-400">
                    <th className="px-6 py-4">
                      Kasa
                    </th>

                    <th className="px-6 py-4">
                      Para Birimi
                    </th>

                    <th className="px-6 py-4 text-right">
                      Bakiye
                    </th>

                    <th className="px-6 py-4 text-right">
                      TL Karşılığı
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {kasalarBakiyeli.map((kasa) => (
                    <tr
                      key={kasa.id}
                      className="border-b border-slate-800/70 last:border-0"
                    >
                      <td className="px-6 py-5">
                        <div className="font-black">
                          {kasa.ad}
                        </div>

                        {kasa.hesapNo && (
                          <div className="mt-1 text-xs text-slate-500">
                            {kasa.hesapNo}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                          {kasa.paraBirimi}
                        </span>
                      </td>

                      <td
                        className={`px-6 py-5 text-right text-lg font-black ${
                          kasa.bakiye >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {currencyMoney(
                          kasa.bakiye,
                          kasa.paraBirimi
                        )}
                      </td>

                      <td
                        className={`px-6 py-5 text-right font-black ${
                          kasa.tlDegeri >= 0
                            ? "text-slate-200"
                            : "text-red-400"
                        }`}
                      >
                        {money(kasa.tlDegeri)}
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}