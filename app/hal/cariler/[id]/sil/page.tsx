import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { cariKaliciSil, cariPasifeAl } from "./actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CariSilPage({ params }: Props) {
  const { id } = await params;
  const cariId = Number(id);

  if (!Number.isInteger(cariId)) notFound();

  const cari = await prisma.cari.findUnique({
    where: { id: cariId },
    include: {
      hareketler: true,
      faturalar: true,
      giderler: true,
      cekler: true,
      odemeler: true,
    },
  });

  if (!cari) notFound();

  const bagliKayitSayisi =
    cari.hareketler.length +
    cari.faturalar.length +
    cari.giderler.length +
    cari.cekler.length +
    cari.odemeler.length;

  const pasifeAl = cariPasifeAl.bind(null, cari.id);
  const kaliciSil = cariKaliciSil.bind(null, cari.id);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-3xl border border-red-900/50 bg-slate-900 p-8">
          <div className="text-5xl">⚠️</div>

          <p className="mt-5 font-bold uppercase tracking-widest text-red-400">
            Cari İşlemi
          </p>

          <h1 className="mt-2 text-3xl font-black">
            {cari.unvan}
          </h1>

          <p className="mt-4 text-slate-400">
            Bu cari için pasife alma veya kalıcı silme işlemi yapabilirsiniz.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
            <p className="text-slate-400">Bağlı finansal kayıt</p>
            <p className="mt-2 text-2xl font-black">
              {bagliKayitSayisi}
            </p>
          </div>

          {bagliKayitSayisi > 0 && (
            <div className="mt-5 rounded-xl border border-red-800 bg-red-950/30 p-4 text-red-300">
              Bağlı finansal kayıt bulunduğu için kalıcı silme yapılamaz.
              Carinin pasife alınması gerekir.
            </div>
          )}

          <div className="mt-8 flex flex-wrap justify-end gap-3">
            <a
              href="/hal/cariler"
              className="rounded-xl border border-slate-700 px-6 py-3 font-bold"
            >
              Vazgeç
            </a>

            <form action={pasifeAl}>
              <button
                type="submit"
                className="rounded-xl bg-amber-500 px-6 py-3 font-black text-slate-950"
              >
                Pasife Al
              </button>
            </form>

            <form action={kaliciSil}>
              <button
                type="submit"
                disabled={bagliKayitSayisi > 0}
                className="rounded-xl bg-red-600 px-6 py-3 font-black disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                Kalıcı Sil
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}