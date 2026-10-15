import { prisma } from "@/lib/prisma";
import { cekKaydet } from "./actions";

type Props = {
  searchParams: Promise<{
    tip?: string;
  }>;
};

function today() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default async function YeniCekPage({
  searchParams,
}: Props) {
  const params = await searchParams;

  const tip =
    params.tip === "VERILEN"
      ? "VERILEN"
      : "ALINAN";

  const sirket =
    await prisma.sirket.findUnique({
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

  const cariler =
    await prisma.cari.findMany({
      where: {
        sirketId: sirket.id,
        aktif: true,
      },

      orderBy: {
        unvan: "asc",
      },
    });

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
            Hal Komisyon & Soğuk Hava
          </p>

          <h1 className="mt-2 text-4xl font-black">
            {tip === "ALINAN"
              ? "Yeni Alınan Çek"
              : "Yeni Verilen Çek"}
          </h1>

          <p className="mt-2 text-slate-400">
            {tip === "ALINAN"
              ? "Müşteriden veya cariden alınan çek"
              : "Cari veya tedarikçiye verilen çek"}
          </p>
        </div>

        <form
          action={cekKaydet}
          className="rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8"
        >
          <input
            type="hidden"
            name="tip"
            value={tip}
          />

          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold">
                Cari *
              </label>

              <select
                name="cariId"
                required
                defaultValue=""
                className={inputClass}
              >
                <option value="">
                  Cari seçiniz
                </option>

                {cariler.map((cari) => (
                  <option
                    key={cari.id}
                    value={cari.id}
                  >
                    {cari.unvan}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Çek No
              </label>

              <input
                name="cekNo"
                placeholder="Örn: 1234567"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Tutar *
              </label>

              <input
                name="tutar"
                required
                inputMode="decimal"
                placeholder="Örn: 25.000,00"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Vade Tarihi *
              </label>

              <input
                type="date"
                name="vadeTarihi"
                required
                defaultValue={today()}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Çekin Bankası
              </label>

              <input
                name="banka"
                placeholder="Örn: Ziraat Bankası"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Şube
              </label>

              <input
                name="sube"
                placeholder="Şube adı / kodu"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Hesap No
              </label>

              <input
                name="hesapNo"
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold">
                Keşideci
              </label>

              <input
                name="kesideci"
                placeholder="Çeki düzenleyen kişi veya firma"
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold">
                Açıklama
              </label>

              <textarea
                name="aciklama"
                rows={3}
                placeholder="Çek ile ilgili açıklama..."
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
            {tip === "ALINAN" ? (
              <>
                <p className="font-bold text-emerald-400">
                  Alınan çek işlemi
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Çek kaydedildiğinde seçilen cariye
                  aynı tutarda alacak hareketi
                  yazılacaktır. Kasa veya banka
                  bakiyesi henüz değişmeyecektir.
                </p>
              </>
            ) : (
              <>
                <p className="font-bold text-red-400">
                  Verilen çek işlemi
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Çek kaydedildiğinde seçilen cariye
                  aynı tutarda borç hareketi
                  yazılacaktır. Banka bakiyesi çek
                  gerçekten ödendiğinde düşecektir.
                </p>
              </>
            )}
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:justify-end">
            <a
              href="/hal/cekler"
              className="rounded-xl border border-slate-700 px-6 py-3 text-center font-semibold text-slate-300"
            >
              Vazgeç
            </a>

            <button
              type="submit"
              className="rounded-xl bg-cyan-500 px-8 py-3 font-black text-slate-950 hover:bg-cyan-400"
            >
              Çeki Kaydet
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}