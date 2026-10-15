export default function YonetimPage() {
  const kartlar = [
    {
      baslik: "Finans Hesapları",
      aciklama:
        "Banka, kasa, kredi kartı ve POS hesaplarını ekle, düzenle ve pasife al.",
      href: "/hal/yonetim/finans",
      ikon: "🏦",
    },
    {
      baslik: "Ürün & Stok",
      aciklama:
        "Ürün ekle, stok giriş/çıkış yap, fiyat ve minimum stok bilgilerini düzenle.",
      href: "/hal/yonetim/stok",
      ikon: "📦",
    },
    {
      baslik: "Fatura Türleri",
      aciklama:
        "Satış, alış, alınan hizmet ve ileride eklenecek diğer fatura türlerini yönet.",
      href: "/hal/yonetim/fatura-turleri",
      ikon: "🧾",
    },
    {
      baslik: "Ödeme Şekilleri",
      aciklama:
        "Nakit, EFT, kredi kartı, açık hesap ve çek seçeneklerini yönet.",
      href: "/hal/yonetim/odeme-sekilleri",
      ikon: "💳",
    },
    {
      baslik: "Cari Tipleri",
      aciklama:
        "Müşteri, satıcı, üretici, personel ve diğer cari türlerini yönet.",
      href: "/hal/yonetim/cari-tipleri",
      ikon: "👥",
    },
    {
      baslik: "Gider Türleri",
      aciklama:
        "Elektrik, su, nakliye, personel ve diğer gider kategorilerini yönet.",
      href: "/hal/yonetim/gider-turleri",
      ikon: "💸",
    },
    {
      baslik: "Sistem Ayarları",
      aciklama:
        "Varsayılan KDV, para birimleri, stok birimleri ve genel ayarları düzenle.",
      href: "/hal/yonetim/ayarlar",
      ikon: "⚙️",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Hal Komisyon & Soğuk Hava
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Yönetim Paneli
            </h1>

            <p className="mt-3 max-w-3xl text-slate-400">
              Sistemde kullanılan tanımları, ürünleri, finans hesaplarını
              ve genel ayarları tek yerden yönetin.
            </p>
          </div>

          <a
            href="/hal"
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 hover:bg-slate-900"
          >
            ← Ana Panel
          </a>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {kartlar.map((kart) => (
            <a
              key={kart.baslik}
              href={kart.href}
              className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:-translate-y-1 hover:border-cyan-500/60 hover:bg-slate-900/80"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="text-4xl">
                  {kart.ikon}
                </div>

                <div className="text-2xl text-slate-600 transition group-hover:text-cyan-400">
                  →
                </div>
              </div>

              <h2 className="text-xl font-black">
                {kart.baslik}
              </h2>

              <p className="mt-3 leading-6 text-slate-400">
                {kart.aciklama}
              </p>
            </a>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-cyan-900/50 bg-cyan-950/10 p-6">
          <h2 className="text-lg font-black text-cyan-400">
            Yönetim Mantığı
          </h2>

          <p className="mt-3 leading-7 text-slate-300">
            Bu bölüm günlük satış veya ödeme ekranı değildir.
            Buradan sistemde kullanılan tanımları oluşturacağız ve
            düzenleyeceğiz. Örneğin yeni banka hesabı, yeni ürün,
            yeni gider türü veya yeni fatura türü buradan eklenecek.
          </p>
        </div>
      </div>
    </main>
  );
}