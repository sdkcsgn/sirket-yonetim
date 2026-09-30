import { finansHesapKaydet } from "./actions";

export default function YeniFinansHesapPage() {
  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Beach & Mağaza
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Yeni Finans Hesabı
            </h1>

            <p className="mt-2 text-slate-400">
              Kasa, banka veya kredi kartı hesabı oluşturun.
            </p>
          </div>

          <a
            href="/beach/kasa-banka"
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 hover:bg-slate-900"
          >
            ← Kasa / Banka
          </a>
        </div>

        <form
          action={finansHesapKaydet}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8"
        >
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Hesap Tipi
              </label>

              <select
                name="tip"
                required
                defaultValue=""
                className={inputClass}
              >
                <option value="">
                  Hesap tipi seçiniz
                </option>

                <option value="KASA">
                  Kasa
                </option>

                <option value="BANKA">
                  Banka
                </option>

                <option value="KREDI_KARTI">
                  Kredi Kartı
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Para Birimi
              </label>

              <select
                name="paraBirimi"
                required
                defaultValue="TRY"
                className={inputClass}
              >
                <option value="TRY">
                  TL - Türk Lirası
                </option>

                <option value="USD">
                  USD - Amerikan Doları
                </option>

                <option value="EUR">
                  EUR - Euro
                </option>

                <option value="GBP">
                  GBP - İngiliz Sterlini
                </option>

                <option value="RUB">
                  RUB - Rus Rublesi
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Hesap Adı
              </label>

              <input
                type="text"
                name="ad"
                required
                placeholder="Örn: Euro Kasa / Dolar Kasa / Ziraat EUR"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Banka Adı
              </label>

              <input
                type="text"
                name="bankaAdi"
                placeholder="Örn: Ziraat Bankası"
                className={inputClass}
              />

              <p className="mt-2 text-xs text-slate-500">
                Kasa hesabında boş bırakabilirsiniz.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                IBAN
              </label>

              <input
                type="text"
                name="iban"
                placeholder="TR..."
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Hesap / Kart No
              </label>

              <input
                type="text"
                name="hesapNo"
                placeholder="Hesap no veya kartın son 4 hanesi"
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-cyan-900/50 bg-cyan-950/10 p-5">
            <p className="font-black text-cyan-400">
              Döviz Hesapları
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              Döviz hesapları kendi para biriminde tutulur.
              Ana panelde USD, EUR, GBP ve RUB bakiyeleri güncel kur ile
              TL karşılığına çevrilerek toplam kasa ve banka görünümüne eklenir.
            </p>
          </div>

          <button
            type="submit"
            className="mt-6 w-full rounded-xl bg-cyan-500 px-5 py-4 text-lg font-black text-slate-950 hover:bg-cyan-400"
          >
            Hesabı Kaydet
          </button>
        </form>
      </div>
    </main>
  );
}