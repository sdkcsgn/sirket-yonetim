import { yeniCariKaydet } from "./actions";

export default function YeniCariPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Beach & Mağaza
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Yeni Cari
            </h1>

            <p className="mt-2 text-slate-400">
              Yeni müşteri, satıcı, personel veya diğer cari hesabı oluşturun.
            </p>
          </div>

          <a
            href="/beach/cariler"
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 transition hover:bg-slate-900"
          >
            ← Cari Listesine Dön
          </a>
        </div>

        <form
          action={yeniCariKaydet}
          className="rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Cari Tipi *
              </label>

            <select
  name="tip"
  required
  defaultValue="MUSTERI"
  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
>
  <option value="MUSTERI">Müşteri</option>
  <option value="ALICI">Alıcı</option>
  <option value="SATICI">Satıcı</option>
  <option value="PERSONEL">Personel</option>
  <option value="URETICI">Üretici</option>
  <option value="UYE">Üye</option>
  <option value="BANKA">Banka</option>
  <option value="YARDIMCI_HESAP">Yardımcı Hesap</option>
  <option value="DIGER">Diğer</option>
</select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Atlas Cari Kodu
              </label>

              <input
                name="atlasKodu"
                placeholder="Örn: M000001"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Cari / Firma Ünvanı *
              </label>

              <input
                name="unvan"
                required
                placeholder="Firma veya kişi adı"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Yetkili Kişi
              </label>

              <input
                name="yetkili"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Grup Kodu
              </label>

              <input
                name="grupKodu"
                placeholder="Örn: OTEL"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                GSM
              </label>

              <input
                name="gsm"
                placeholder="05xx xxx xx xx"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Telefon
              </label>

              <input
                name="telefon"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Vergi No
              </label>

              <input
                name="vergiNo"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                T.C. Kimlik No
              </label>

              <input
                name="tcNo"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Vergi Dairesi
              </label>

              <input
                name="vergiDairesi"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                E-posta
              </label>

              <input
                type="email"
                name="email"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Açılış Borcu
              </label>

              <input
                name="acilisBorc"
                inputMode="decimal"
                placeholder="0,00"
                className="w-full rounded-xl border border-red-900/50 bg-slate-950 px-4 py-3 outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Açılış Alacağı
              </label>

              <input
                name="acilisAlacak"
                inputMode="decimal"
                placeholder="0,00"
                className="w-full rounded-xl border border-emerald-900/50 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Adres
              </label>

              <textarea
                name="adres"
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Not
              </label>

              <textarea
                name="notlar"
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:justify-end">
            <a
              href="/beach/cariler"
              className="rounded-xl border border-slate-700 px-6 py-3 text-center font-semibold text-slate-300 hover:bg-slate-800"
            >
              Vazgeç
            </a>

            <button
              type="submit"
              className="rounded-xl bg-cyan-500 px-8 py-3 font-black text-slate-950 transition hover:bg-cyan-400"
            >
              Cariyi Kaydet
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}