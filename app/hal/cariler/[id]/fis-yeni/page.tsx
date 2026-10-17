
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { cariFisKaydet } from "./actions";

type Props = {
  params: Promise<{ id: string }>;
};

function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default async function CariFisYeniPage({ params }: Props) {
  const { id } = await params;
  const cariId = Number(id);

  if (!Number.isInteger(cariId) || cariId <= 0) {
    notFound();
  }

  const cari = await prisma.cari.findUnique({
    where: { id: cariId },
    include: { sirket: true },
  });

  if (!cari || cari.sirket.kod !== "HAL" || !cari.aktif) {
    notFound();
  }

  const action = cariFisKaydet.bind(null, cari.id);

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Hal Komisyon & Soğuk Hava
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Yeni Cari Fişi
            </h1>

            <p className="mt-2 text-slate-400">{cari.unvan}</p>
          </div>

          <a
            href={`/hal/cariler/${cari.id}`}
            className="rounded-xl border border-slate-700 px-5 py-3 text-center font-semibold text-slate-300 hover:bg-slate-900"
          >
            ← Cari Ekstreye Dön
          </a>
        </div>

        <form
          action={action}
          className="rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8"
        >
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Fiş Tarihi *
              </label>
              <input
                type="date"
                name="tarih"
                required
                defaultValue={today()}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Cari İşlem Yönü *
              </label>
              <select
                name="yon"
                required
                defaultValue="BORC"
                className={inputClass}
              >
                <option value="BORC">
                  Borç — carinin borç tutarını artır
                </option>
                <option value="ALACAK">
                  Alacak — carinin alacak tutarını artır
                </option>
              </select>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Borç fişi cari bakiyesini artırır; alacak fişi cari bakiyesini
                azaltır. Bu işlem yalnızca cari ekstresine kaydedilir.
              </p>
            </div>

            <div>
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

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Açıklama *
              </label>
              <textarea
                name="aciklama"
                required
                maxLength={500}
                rows={4}
                placeholder="Örn: Önceki dönem bakiye düzeltmesi"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Belge No (isteğe bağlı)
              </label>
              <input
                name="belgeNo"
                maxLength={100}
                placeholder="Örn: FIS-001"
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-900/50 bg-amber-950/20 p-5">
            <p className="font-bold text-amber-400">Bilgilendirme</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Bu fiş kasa, banka, fatura, gider ve stok hareketi oluşturmaz.
              Kaydedildiğinde cari ekstrede açıklaması ve tutarıyla görünür.
            </p>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:justify-end">
            <a
              href={`/hal/cariler/${cari.id}`}
              className="rounded-xl border border-slate-700 px-6 py-3 text-center font-semibold text-slate-300 hover:bg-slate-800"
            >
              Vazgeç
            </a>

            <button
              type="submit"
              className="rounded-xl bg-cyan-500 px-8 py-3 font-black text-slate-950 hover:bg-cyan-400"
            >
              Fişi Kaydet
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
