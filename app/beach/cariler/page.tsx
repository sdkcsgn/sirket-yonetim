import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL bulunamadı.");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(value);
}

function cariTipiYaz(tip: string) {
  const tipler: Record<string, string> = {
    DIGER: "Diğer",
    MUSTERI: "Müşteri",
    URETICI: "Üretici",
    SATICI: "Satıcı",
    UYE: "Üye",
    BANKA: "Banka",
    PERSONEL: "Personel",
    YARDIMCI_HESAP: "Yardımcı Hesap",
  };

  return tipler[tip] ?? tip;
}

export default async function CarilerPage() {
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
    },
    orderBy: {
      unvan: "asc",
    },
  });

  const toplamAlacak = cariler.reduce(
    (toplam, cari) => toplam + Number(cari.acilisAlacak),
    0
  );

  const toplamBorc = cariler.reduce(
    (toplam, cari) => toplam + Number(cari.acilisBorc),
    0
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Beach & Mağaza
            </p>

            <h1 className="mt-2 text-4xl font-black">Cari Hesaplar</h1>

            <p className="mt-2 text-slate-400">
              Müşteri, satıcı, personel ve diğer cari hesapların takibi
            </p>
          </div>

          <div className="flex gap-3">
            <a
              href="/beach"
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 transition hover:bg-slate-900"
            >
              ← Panele Dön
            </a>

            <a
              href="/beach/cariler/yeni"
              className="rounded-xl bg-cyan-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-400"
            >
              + Yeni Cari
            </a>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Toplam Cari</p>
            <p className="mt-3 text-3xl font-black">{cariler.length}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Toplam Alacak</p>
            <p className="mt-3 text-3xl font-black text-emerald-400">
              {money(toplamAlacak)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Toplam Borç</p>
            <p className="mt-3 text-3xl font-black text-red-400">
              {money(toplamBorc)}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold">Cari Listesi</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Beach & Mağaza şirketine ait gerçek veritabanı kayıtları.
                </p>
              </div>

              <input
                type="text"
                placeholder="Cari ara..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 md:w-72"
              />
            </div>
          </div>

          {cariler.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-5xl">👥</div>

              <h3 className="mt-4 text-xl font-bold">
                Henüz cari kaydı bulunmuyor
              </h3>

              <p className="mt-2 text-slate-400">
                İlk müşteri, satıcı veya diğer cari hesabınızı ekleyebilirsiniz.
              </p>

              <a
                href="/beach/cariler/yeni"
                className="mt-6 inline-block rounded-xl bg-cyan-500 px-6 py-3 font-bold text-slate-950 hover:bg-cyan-400"
              >
                + İlk Cariyi Ekle
              </a>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-sm text-slate-400">
                    <th className="px-6 py-4">Kod</th>
                    <th className="px-6 py-4">Cari Adı</th>
                    <th className="px-6 py-4">Cari Tipi</th>
                    <th className="px-6 py-4">Telefon</th>
                    <th className="px-6 py-4">Vergi No / T.C.</th>
                    <th className="px-6 py-4">Borç</th>
                    <th className="px-6 py-4">Alacak</th>
                    <th className="px-6 py-4">Bakiye</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>

                <tbody>
                  {cariler.map((cari) => {
                    const borc = Number(cari.acilisBorc);
                    const alacak = Number(cari.acilisAlacak);
                    const bakiye = alacak - borc;

                    return (
                      <tr
                        key={cari.id}
                        className="border-b border-slate-800/70 transition hover:bg-slate-800/40"
                      >
                        <td className="px-6 py-5 text-slate-400">
                          {cari.atlasKodu ?? "-"}
                        </td>

                        <td className="px-6 py-5 font-semibold">
                          {cari.unvan}
                        </td>

                        <td className="px-6 py-5">
                          <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-400">
                            {cariTipiYaz(cari.tip)}
                          </span>
                        </td>

                        <td className="px-6 py-5 text-slate-300">
                          {cari.gsm || cari.telefon || "-"}
                        </td>

                        <td className="px-6 py-5 text-slate-300">
                          {cari.vergiNo || cari.tcNo || "-"}
                        </td>

                        <td className="px-6 py-5 font-semibold text-red-400">
                          {money(borc)}
                        </td>

                        <td className="px-6 py-5 font-semibold text-emerald-400">
                          {money(alacak)}
                        </td>

                        <td
                          className={`px-6 py-5 font-black ${
                            bakiye >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {money(Math.abs(bakiye))}
                        </td>

                       <td className="px-6 py-5">
  <div className="flex items-center justify-end gap-2">
    <a
      href={`/beach/cariler/${cari.id}`}
      className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
    >
      Detay
    </a>

    <a
      href={`/beach/cariler/${cari.id}/duzenle`}
      className="rounded-lg border border-cyan-700 px-3 py-2 text-sm font-semibold text-cyan-400 transition hover:bg-cyan-500/10"
    >
      Düzenle
    </a>

    <a
      href={`/beach/cariler/${cari.id}/sil`}
      className="rounded-lg border border-red-800 px-3 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
    >
      Sil
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