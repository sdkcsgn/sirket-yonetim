import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { cariGuncelle } from "./actions";

type Props = {
  params: Promise<{ id: string }>;
};

function decimalInput(value: unknown) {
  return Number(value).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function CariDuzenlePage({ params }: Props) {
  const { id } = await params;
  const cariId = Number(id);

  if (!Number.isInteger(cariId)) notFound();

  const cari = await prisma.cari.findUnique({
    where: { id: cariId },
  });

  if (!cari) notFound();

  const action = cariGuncelle.bind(null, cari.id);

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Beach & Mağaza
            </p>
            <h1 className="mt-2 text-4xl font-black">Cari Düzenle</h1>
            <p className="mt-2 text-slate-400">{cari.unvan}</p>
          </div>

          <a
            href={`/beach/cariler/${cari.id}`}
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold"
          >
            ← Detaya Dön
          </a>
        </div>

        <form
          action={action}
          className="rounded-3xl border border-slate-800 bg-slate-900 p-8"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block">Cari Tipi</label>
              <select
                name="tip"
                defaultValue={cari.tip}
                className={inputClass}
              >
                <option value="MUSTERI">Müşteri</option>
                <option value="URETICI">Üretici</option>
                <option value="SATICI">Satıcı</option>
                <option value="UYE">Üye</option>
                <option value="BANKA">Banka</option>
                <option value="PERSONEL">Personel</option>
                <option value="YARDIMCI_HESAP">Yardımcı Hesap</option>
                <option value="DIGER">Diğer</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block">Atlas Kodu</label>
              <input
                name="atlasKodu"
                defaultValue={cari.atlasKodu ?? ""}
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block">Cari / Firma Ünvanı</label>
              <input
                name="unvan"
                required
                defaultValue={cari.unvan}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block">Yetkili</label>
              <input
                name="yetkili"
                defaultValue={cari.yetkili ?? ""}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block">Grup Kodu</label>
              <input
                name="grupKodu"
                defaultValue={cari.grupKodu ?? ""}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block">GSM</label>
              <input
                name="gsm"
                defaultValue={cari.gsm ?? ""}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block">Telefon</label>
              <input
                name="telefon"
                defaultValue={cari.telefon ?? ""}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block">Vergi No</label>
              <input
                name="vergiNo"
                defaultValue={cari.vergiNo ?? ""}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block">T.C. Kimlik No</label>
              <input
                name="tcNo"
                defaultValue={cari.tcNo ?? ""}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block">Vergi Dairesi</label>
              <input
                name="vergiDairesi"
                defaultValue={cari.vergiDairesi ?? ""}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block">E-posta</label>
              <input
                type="email"
                name="email"
                defaultValue={cari.email ?? ""}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block">Açılış Borcu</label>
              <input
                name="acilisBorc"
                defaultValue={decimalInput(cari.acilisBorc)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block">Açılış Alacağı</label>
              <input
                name="acilisAlacak"
                defaultValue={decimalInput(cari.acilisAlacak)}
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block">Adres</label>
              <textarea
                name="adres"
                rows={3}
                defaultValue={cari.adres ?? ""}
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block">Notlar</label>
              <textarea
                name="notlar"
                rows={3}
                defaultValue={cari.notlar ?? ""}
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t border-slate-800 pt-6">
            <a
              href={`/beach/cariler/${cari.id}`}
              className="rounded-xl border border-slate-700 px-6 py-3 font-semibold"
            >
              Vazgeç
            </a>

            <button
              type="submit"
              className="rounded-xl bg-cyan-500 px-8 py-3 font-black text-slate-950"
            >
              Değişiklikleri Kaydet
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}