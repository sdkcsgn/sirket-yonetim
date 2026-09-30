import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { cariHareketKaydet } from "./actions";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function today() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default async function CariHareketYeniPage({ params }: Props) {
  const { id } = await params;
  const cariId = Number(id);

  if (!Number.isInteger(cariId)) {
    notFound();
  }

  const cari = await prisma.cari.findUnique({
    where: {
      id: cariId,
    },
  });

  if (!cari) {
    notFound();
  }

  const finansHesaplari = await prisma.finansHesap.findMany({
    where: {
      sirketId: cari.sirketId,
      aktif: true,
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

  const action = cariHareketKaydet.bind(null, cari.id);

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Beach & Mağaza
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Yeni Cari Hareketi
            </h1>

            <p className="mt-2 text-slate-400">
              {cari.unvan}
            </p>
          </div>

          <a
            href={`/beach/cariler/${cari.id}`}
            className="rounded-xl border border-slate-700 px-5 py-3 text-center font-semibold text-slate-300 hover:bg-slate-900"
          >
            ← Cari Detayına Dön
          </a>
        </div>

        <form
          action={action}
          className="rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                İşlem Türü *
              </label>

              <select
                name="islemTuru"
                required
                defaultValue="SATIS"
                className={inputClass}
              >
                <option value="SATIS">Satış</option>
                <option value="ALIS">Alış</option>
                <option value="TAHSILAT">Tahsilat</option>
                <option value="ODEME">Ödeme</option>
                <option value="DEVIR_BORC">Devir Borç</option>
                <option value="DEVIR_ALACAK">Devir Alacak</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Tarih *
              </label>

              <input
                type="date"
                name="tarih"
                required
                defaultValue={today()}
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Tutar *
              </label>

              <input
                name="tutar"
                required
                inputMode="decimal"
                placeholder="Örn: 10.000,00"
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Açıklama *
              </label>

              <input
                name="aciklama"
                required
                placeholder="Örn: Ürün satışı, nakit tahsilat, banka ödemesi..."
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Belge No
              </label>

              <input
                name="belgeNo"
                placeholder="Örn: FTR-001, MAKBUZ-001"
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Kasa / Banka Hesabı
              </label>

              <select
                name="finansHesapId"
                defaultValue=""
                className={inputClass}
              >
                <option value="">
                  Tahsilat veya ödeme değilse boş bırakabilirsiniz
                </option>

                {finansHesaplari.map((hesap) => (
                  <option
                    key={hesap.id}
                    value={hesap.id}
                  >
                    {hesap.ad} -{" "}
                    {hesap.tip === "KASA"
                      ? "Kasa"
                      : "Banka"}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Tahsilat işleminde para seçilen kasa/banka hesabına girer.
                Ödeme işleminde para seçilen hesaptan çıkar.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-900/50 bg-emerald-950/20 p-5">
              <p className="font-bold text-emerald-400">
                Tahsilat
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Cari hesabına alacak hareketi yazılır ve seçilen kasa veya banka
                hesabının bakiyesi artar.
              </p>
            </div>

            <div className="rounded-2xl border border-red-900/50 bg-red-950/20 p-5">
              <p className="font-bold text-red-400">
                Ödeme
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Cari hesabına borç hareketi yazılır ve seçilen kasa veya banka
                hesabının bakiyesi azalır.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
            <p className="text-sm font-bold text-slate-300">
              Diğer işlemler
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Satış, alış ve devir işlemleri yalnızca cari hesabı etkiler.
              Bunlarda kasa veya banka hesabı seçmek zorunlu değildir.
            </p>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:justify-end">
            <a
              href={`/beach/cariler/${cari.id}`}
              className="rounded-xl border border-slate-700 px-6 py-3 text-center font-semibold text-slate-300 hover:bg-slate-800"
            >
              Vazgeç
            </a>

            <button
              type="submit"
              className="rounded-xl bg-cyan-500 px-8 py-3 font-black text-slate-950 hover:bg-cyan-400"
            >
              Hareketi Kaydet
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}