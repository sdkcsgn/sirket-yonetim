import { prisma } from "@/lib/prisma";

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(value);
}

export default async function KasaBankaPage() {
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

  const hesaplar = await prisma.finansHesap.findMany({
    where: {
      sirketId: sirket.id,
      aktif: true,
    },
    include: {
      hareketler: {
        orderBy: {
          tarih: "asc",
        },
      },
    },
    orderBy: [
      {
        tip: "asc",
      },
      {
        ad: "asc",
      },
    ],
  });

  const hesaplarBakiyeli = hesaplar.map((hesap) => {
    const bakiye = hesap.hareketler.reduce((toplam, hareket) => {
      const tutar = Number(hareket.tutar);

      if (
        hareket.tip === "GIRIS" ||
        hareket.tip === "TRANSFER_GIRIS"
      ) {
        return toplam + tutar;
      }

      return toplam - tutar;
    }, 0);

    return {
      ...hesap,
      bakiye,
    };
  });

  const toplamKasa = hesaplarBakiyeli
    .filter((hesap) => hesap.tip === "KASA")
    .reduce((toplam, hesap) => toplam + hesap.bakiye, 0);

  const toplamBanka = hesaplarBakiyeli
    .filter((hesap) => hesap.tip === "BANKA")
    .reduce((toplam, hesap) => toplam + hesap.bakiye, 0);

  const toplamVarlik = toplamKasa + toplamBanka;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Beach & Mağaza
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Kasa & Banka
            </h1>

            <p className="mt-2 text-slate-400">
              Nakit, banka ve hesaplar arası para hareketleri
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
              className="rounded-xl border border-cyan-700 px-5 py-3 font-bold text-cyan-400"
            >
              + Yeni Kasa
            </a>

            <a
              href="/beach/kasa-banka/yeni?tip=BANKA"
              className="rounded-xl bg-cyan-500 px-5 py-3 font-black text-slate-950"
            >
              + Yeni Banka
            </a>
            <a
  href="/beach/kasa-banka/transfer"
  className="rounded-xl border border-amber-600 px-5 py-3 font-bold text-amber-400"
>
  ↔ Hesaplar Arası Transfer
</a>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Toplam Kasa
            </p>

            <p className="mt-3 text-3xl font-black text-emerald-400">
              {money(toplamKasa)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Toplam Banka
            </p>

            <p className="mt-3 text-3xl font-black text-cyan-400">
              {money(toplamBanka)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Toplam Varlık
            </p>

            <p className="mt-3 text-3xl font-black">
              {money(toplamVarlik)}
            </p>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-6">
            <h2 className="text-xl font-bold">
              Finans Hesapları
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Kasa ve banka hesaplarının güncel bakiyeleri
            </p>
          </div>

          {hesaplarBakiyeli.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl">🏦</div>

              <h3 className="mt-4 text-xl font-bold">
                Henüz kasa veya banka hesabı yok
              </h3>

              <p className="mt-2 text-slate-400">
                İlk finans hesabınızı oluşturabilirsiniz.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-sm text-slate-400">
                    <th className="px-6 py-4">Hesap</th>
                    <th className="px-6 py-4">Tip</th>
                    <th className="px-6 py-4">Banka</th>
                    <th className="px-6 py-4">IBAN</th>
                    <th className="px-6 py-4">Bakiye</th>
                  </tr>
                </thead>

                <tbody>
                  {hesaplarBakiyeli.map((hesap) => (
                    <tr
                      key={hesap.id}
                      className="border-b border-slate-800/70"
                    >
                      <td className="px-6 py-5 font-bold">
                        {hesap.ad}
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            hesap.tip === "KASA"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-cyan-500/10 text-cyan-400"
                          }`}
                        >
                          {hesap.tip === "KASA"
                            ? "Kasa"
                            : "Banka"}
                        </span>
                      </td>

                      <td className="px-6 py-5 text-slate-300">
                        {hesap.bankaAdi || "-"}
                      </td>

                      <td className="px-6 py-5 text-slate-400">
                        {hesap.iban || "-"}
                      </td>

                      <td
                        className={`px-6 py-5 text-lg font-black ${
                          hesap.bakiye >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {money(hesap.bakiye)}
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