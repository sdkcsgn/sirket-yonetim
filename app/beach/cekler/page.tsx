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

function durumAdi(durum: string) {
  switch (durum) {
    case "PORTFOYDE":
      return "Portföyde";

    case "BANKADA":
      return "Bankada";

    case "CIROLANDI":
      return "Cirolandı";

    case "TAHSIL_EDILDI":
      return "Tahsil Edildi";

    case "ODENDI":
      return "Ödendi";

    case "KARSILIKSIZ":
      return "Karşılıksız";

    case "IPTAL":
      return "İptal";

    default:
      return durum;
  }
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
      return "bg-emerald-500/10 text-emerald-400";

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

export default async function CeklerPage() {
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

  const cekler = await prisma.cek.findMany({
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

  const alinanToplam = cekler
    .filter(
      (cek) =>
        cek.tip === "ALINAN" &&
        cek.durum !== "IPTAL"
    )
    .reduce(
      (toplam, cek) =>
        toplam + Number(cek.tutar),
      0
    );

  const verilenToplam = cekler
    .filter(
      (cek) =>
        cek.tip === "VERILEN" &&
        cek.durum !== "IPTAL"
    )
    .reduce(
      (toplam, cek) =>
        toplam + Number(cek.tutar),
      0
    );

  const portfoyToplam = cekler
    .filter(
      (cek) =>
        cek.tip === "ALINAN" &&
        cek.durum === "PORTFOYDE"
    )
    .reduce(
      (toplam, cek) =>
        toplam + Number(cek.tutar),
      0
    );

  const bankadaToplam = cekler
    .filter(
      (cek) =>
        cek.tip === "ALINAN" &&
        cek.durum === "BANKADA"
    )
    .reduce(
      (toplam, cek) =>
        toplam + Number(cek.tutar),
      0
    );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Beach & Mağaza
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Çekler
            </h1>

            <p className="mt-2 text-slate-400">
              Alınan ve verilen çeklerin takibi
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
              href="/beach/cekler/yeni?tip=ALINAN"
              className="rounded-xl border border-emerald-700 px-5 py-3 font-bold text-emerald-400"
            >
              + Alınan Çek
            </a>

            <a
              href="/beach/cekler/yeni?tip=VERILEN"
              className="rounded-xl bg-cyan-500 px-5 py-3 font-black text-slate-950"
            >
              + Verilen Çek
            </a>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Alınan Çekler
            </p>

            <p className="mt-3 text-3xl font-black text-emerald-400">
              {money(alinanToplam)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Verilen Çekler
            </p>

            <p className="mt-3 text-3xl font-black text-red-400">
              {money(verilenToplam)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Portföyde
            </p>

            <p className="mt-3 text-3xl font-black text-cyan-400">
              {money(portfoyToplam)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Bankada
            </p>

            <p className="mt-3 text-3xl font-black text-blue-400">
              {money(bankadaToplam)}
            </p>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-6">
            <h2 className="text-xl font-bold">
              Çek Listesi
            </h2>
          </div>

          {cekler.length === 0 ? (
            <div className="p-14 text-center">
              <div className="text-5xl">
                🧾
              </div>

              <h3 className="mt-5 text-xl font-bold">
                Henüz çek kaydı yok
              </h3>

              <p className="mt-2 text-slate-400">
                İlk alınan veya verilen çekinizi
                ekleyebilirsiniz.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
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

                    <th className="px-5 py-4">
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
                  {cekler.map((cek) => (
                    <tr
                      key={cek.id}
                      className="border-b border-slate-800/70 hover:bg-slate-800/30"
                    >
                      <td className="px-5 py-5">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            cek.tip === "ALINAN"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {cek.tip === "ALINAN"
                            ? "Alınan"
                            : "Verilen"}
                        </span>
                      </td>

                      <td className="px-5 py-5 font-semibold">
                        {cek.cari?.unvan || "-"}
                      </td>

                      <td className="px-5 py-5 text-slate-300">
                        {cek.cekNo || "-"}
                      </td>

                      <td className="px-5 py-5 text-slate-300">
                        {cek.banka || "-"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-5">
                        {date(cek.vadeTarihi)}
                      </td>

                      <td
                        className={`whitespace-nowrap px-5 py-5 text-lg font-black ${
                          cek.tip === "ALINAN"
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {money(Number(cek.tutar))}
                      </td>

                      <td className="px-5 py-5">
                        <span
                          className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${durumClass(
                            cek.durum
                          )}`}
                        >
                          {durumAdi(cek.durum)}
                        </span>
                      </td>

                      <td className="px-5 py-5">
                        <a
                          href={`/beach/cekler/${cek.id}`}
                          className="font-bold text-cyan-400 hover:text-cyan-300"
                        >
                          Detay →
                        </a>
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