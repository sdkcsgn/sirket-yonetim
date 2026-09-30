export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 py-12">
        <div className="mb-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">
            Şirket Yönetim Sistemi
          </p>

          <h1 className="text-4xl font-black tracking-tight md:text-6xl">
            Yönetim Paneli
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-slate-400">
            Cari hesaplarınızı, bankalarınızı, çeklerinizi, stoklarınızı ve
            yaklaşan ödemelerinizi tek merkezden yönetin.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <a
            href="/beach"
            className="group rounded-3xl border border-slate-800 bg-slate-900 p-8 text-left transition hover:-translate-y-1 hover:border-cyan-500 hover:bg-slate-800"
          >
            <div className="mb-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-3xl">
              🏖️
            </div>

            <p className="text-sm font-bold uppercase tracking-wider text-cyan-400">
              Şirket 01
            </p>

            <h2 className="mt-2 text-3xl font-black">
              Beach & Mağaza
            </h2>

            <p className="mt-3 text-slate-400">
              Kasa, banka, cari hesap, stok, borç ve ödeme takibi.
            </p>

            <div className="mt-8 font-bold text-cyan-400">
              Şirkete Gir →
            </div>
          </a>

          <button className="group rounded-3xl border border-slate-800 bg-slate-900 p-8 text-left transition hover:-translate-y-1 hover:border-emerald-500 hover:bg-slate-800">
            <div className="mb-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-3xl">
              🍊
            </div>

            <p className="text-sm font-bold uppercase tracking-wider text-emerald-400">
              Şirket 02
            </p>

            <h2 className="mt-2 text-3xl font-black">
              Hal Komisyon & Soğuk Hava
            </h2>

            <p className="mt-3 text-slate-400">
              Üretici hesapları, komisyon, stok, depo, banka, çek ve ödemeler.
            </p>

            <div className="mt-8 font-bold text-emerald-400">
              Şirkete Gir →
            </div>
          </button>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm text-slate-500">
                Tüm şirketlerin toplam durumu
              </p>

              <h3 className="mt-1 text-xl font-bold">
                Grup Genel Görünümü
              </h3>
            </div>

            <button className="rounded-xl bg-white px-6 py-3 font-bold text-slate-950 transition hover:bg-slate-200">
              Tüm Şirketleri Gör
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}