import { prisma } from "@/lib/prisma";
import { transferKaydet } from "./actions";

function today() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default async function TransferPage() {
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

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
            Hal Komisyon & Soğuk Hava
          </p>

          <h1 className="mt-2 text-4xl font-black">
            Hesaplar Arası Transfer
          </h1>

          <p className="mt-2 text-slate-400">
            Kasa, banka ve banka hesapları arasında para aktarımı
          </p>
        </div>

        <form
          action={transferKaydet}
          className="rounded-3xl border border-slate-800 bg-slate-900 p-8"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-semibold">
                Kaynak Hesap *
              </label>

              <select
                name="kaynakId"
                required
                className={inputClass}
              >
                <option value="">Seçiniz</option>

                {hesaplar.map((hesap) => (
                  <option key={hesap.id} value={hesap.id}>
                    {hesap.ad} - {hesap.tip === "KASA" ? "Kasa" : "Banka"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block font-semibold">
                Hedef Hesap *
              </label>

              <select
                name="hedefId"
                required
                className={inputClass}
              >
                <option value="">Seçiniz</option>

                {hesaplar.map((hesap) => (
                  <option key={hesap.id} value={hesap.id}>
                    {hesap.ad} - {hesap.tip === "KASA" ? "Kasa" : "Banka"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block font-semibold">
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

            <div>
              <label className="mb-2 block font-semibold">
                Tutar *
              </label>

              <input
                name="tutar"
                required
                inputMode="decimal"
                placeholder="0,00"
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block font-semibold">
                Açıklama
              </label>

              <input
                name="aciklama"
                placeholder="Örn: Bankaya nakit yatırma"
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
            <p className="font-bold text-slate-300">
              Transfer mantığı
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Kaynak hesaptan tutar düşer, hedef hesaba aynı tutar eklenir.
              Bu işlem gelir veya gider değildir; toplam varlığınızı değiştirmez.
            </p>
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t border-slate-800 pt-6">
            <a
              href="/hal/kasa-banka"
              className="rounded-xl border border-slate-700 px-6 py-3 font-semibold"
            >
              Vazgeç
            </a>

            <button
              type="submit"
              className="rounded-xl bg-cyan-500 px-8 py-3 font-black text-slate-950"
            >
              Transferi Kaydet
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}