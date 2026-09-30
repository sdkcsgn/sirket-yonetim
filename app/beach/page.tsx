import { prisma } from "@/lib/prisma";
import {
  tcmbKurlariGetir,
  tlKarsiligi,
} from "@/lib/tcmb";

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function kur(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value);
}

export default async function BeachPage() {
  const sirket = await prisma.sirket.findUnique({
    where: {
      kod: "BEACH",
    },
  });

  if (!sirket) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Beach & Mağaza şirketi bulunamadı.
      </main>
    );
  }

  const [
    finansHesaplari,
    cariler,
    faturalar,
    giderler,
    kurlar,
  ] = await Promise.all([
    prisma.finansHesap.findMany({
      where: {
        sirketId: sirket.id,
        aktif: true,
      },
      include: {
        hareketler: true,
      },
    }),

    prisma.cari.findMany({
      where: {
        sirketId: sirket.id,
        aktif: true,
      },
      include: {
        hareketler: true,
      },
    }),

    prisma.fatura.findMany({
      where: {
        sirketId: sirket.id,
      },
      select: {
        tip: true,
        genelToplam: true,
      },
    }),

    prisma.gider.findMany({
      where: {
        sirketId: sirket.id,
      },
      select: {
        tutar: true,
      },
    }),

    tcmbKurlariGetir(),
  ]);

  /* =========================================================
     FİNANS HESAP BAKİYELERİ
  ========================================================= */

  const hesapBakiyeleri =
    finansHesaplari.map((hesap) => {
      const bakiye =
        hesap.hareketler.reduce(
          (toplam, hareket) => {
            const tutar =
              Number(hareket.tutar);

            if (
              hareket.tip === "GIRIS" ||
              hareket.tip ===
                "TRANSFER_GIRIS"
            ) {
              return toplam + tutar;
            }

            if (
              hareket.tip === "CIKIS" ||
              hareket.tip ===
                "TRANSFER_CIKIS"
            ) {
              return toplam - tutar;
            }

            return toplam;
          },
          0
        );

      const tlDegeri =
        tlKarsiligi(
          bakiye,
          hesap.paraBirimi,
          kurlar
        );

      return {
        ...hesap,
        bakiye,
        tlDegeri,
      };
    });

  /* =========================================================
     KASA / BANKA / KREDİ KARTI
  ========================================================= */

  const toplamKasaTl =
    hesapBakiyeleri
      .filter(
        (hesap) =>
          hesap.tip === "KASA"
      )
      .reduce(
        (toplam, hesap) =>
          toplam + hesap.tlDegeri,
        0
      );

  const toplamBankaTl =
    hesapBakiyeleri
      .filter(
        (hesap) =>
          hesap.tip === "BANKA"
      )
      .reduce(
        (toplam, hesap) =>
          toplam + hesap.tlDegeri,
        0
      );

  const krediKartiNetTl =
    hesapBakiyeleri
      .filter(
        (hesap) =>
          hesap.tip ===
          "KREDI_KARTI"
      )
      .reduce(
        (toplam, hesap) =>
          toplam + hesap.tlDegeri,
        0
      );

  const krediKartiBorcuTl =
    krediKartiNetTl < 0
      ? Math.abs(krediKartiNetTl)
      : 0;

  /* =========================================================
     DÖVİZ KASA TOPLAMLARI
  ========================================================= */

  const dovizKasaToplamlari = {
    USD: hesapBakiyeleri
      .filter(
        (hesap) =>
          hesap.tip === "KASA" &&
          hesap.paraBirimi === "USD"
      )
      .reduce(
        (toplam, hesap) =>
          toplam + hesap.bakiye,
        0
      ),

    EUR: hesapBakiyeleri
      .filter(
        (hesap) =>
          hesap.tip === "KASA" &&
          hesap.paraBirimi === "EUR"
      )
      .reduce(
        (toplam, hesap) =>
          toplam + hesap.bakiye,
        0
      ),

    GBP: hesapBakiyeleri
      .filter(
        (hesap) =>
          hesap.tip === "KASA" &&
          hesap.paraBirimi === "GBP"
      )
      .reduce(
        (toplam, hesap) =>
          toplam + hesap.bakiye,
        0
      ),

    RUB: hesapBakiyeleri
      .filter(
        (hesap) =>
          hesap.tip === "KASA" &&
          hesap.paraBirimi === "RUB"
      )
      .reduce(
        (toplam, hesap) =>
          toplam + hesap.bakiye,
        0
      ),
  };

  /* =========================================================
     CARİ TOPLAMLAR
  ========================================================= */

  let toplamCariBorc = 0;
  let toplamCariAlacak = 0;

  for (const cari of cariler) {
    let borc =
      Number(cari.acilisBorc);

    let alacak =
      Number(cari.acilisAlacak);

    for (const hareket of cari.hareketler) {
      borc += Number(hareket.borc);
      alacak += Number(hareket.alacak);
    }

    const bakiye =
      borc - alacak;

    if (bakiye > 0) {
      toplamCariAlacak += bakiye;
    }

    if (bakiye < 0) {
      toplamCariBorc +=
        Math.abs(bakiye);
    }
  }

  /* =========================================================
     FATURALAR
  ========================================================= */

  const toplamSatis =
    faturalar
      .filter(
        (fatura) =>
          fatura.tip === "SATIS"
      )
      .reduce(
        (toplam, fatura) =>
          toplam +
          Number(fatura.genelToplam),
        0
      );

  const toplamAlis =
    faturalar
      .filter(
        (fatura) =>
          fatura.tip === "ALIS"
      )
      .reduce(
        (toplam, fatura) =>
          toplam +
          Number(fatura.genelToplam),
        0
      );

  const toplamAlinanHizmet =
    faturalar
      .filter(
        (fatura) =>
          fatura.tip ===
          "ALINAN_HIZMET"
      )
      .reduce(
        (toplam, fatura) =>
          toplam +
          Number(fatura.genelToplam),
        0
      );

  /* =========================================================
     GİDERLER
  ========================================================= */

  const toplamGider =
    giderler.reduce(
      (toplam, gider) =>
        toplam +
        Number(gider.tutar),
      0
    );

  /* =========================================================
     NETLER
  ========================================================= */

  const netSonuc =
    toplamSatis -
    toplamAlis -
    toplamAlinanHizmet -
    toplamGider;

  const kasaBankaToplam =
    toplamKasaTl +
    toplamBankaTl;

  const cariNet =
    toplamCariAlacak -
    toplamCariBorc;

  const finansalNet =
    toplamKasaTl +
    toplamBankaTl -
    krediKartiBorcuTl +
    toplamCariAlacak -
    toplamCariBorc;

  const kartlar = [
    {
      baslik: "Banka",
      deger: toplamBankaTl,
      aciklama:
        "TL karşılığı toplam banka",
      renk:
        toplamBankaTl >= 0
          ? "text-cyan-400"
          : "text-red-400",
    },

    {
      baslik: "Kasa",
      deger: toplamKasaTl,
      aciklama:
        "Döviz dahil TL karşılığı",
      renk:
        toplamKasaTl >= 0
          ? "text-emerald-400"
          : "text-red-400",
    },

    {
      baslik:
        "Kredi Kartı Borcu",
      deger:
        krediKartiBorcuTl,
      aciklama:
        "TL karşılığı kart borcu",
      renk:
        krediKartiBorcuTl > 0
          ? "text-orange-400"
          : "text-slate-300",
    },

    {
      baslik: "Alacak",
      deger:
        toplamCariAlacak,
      aciklama:
        "Carilerden alacak",
      renk:
        "text-emerald-400",
    },

    {
      baslik: "Borç",
      deger:
        toplamCariBorc,
      aciklama:
        "Toplam cari borç",
      renk:
        "text-red-400",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Şirket 01
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Beach & Mağaza
            </h1>

            <p className="mt-2 text-slate-400">
              Finans, stok ve ödeme yönetimi
            </p>
          </div>

          <a
            href="/"
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 hover:bg-slate-900"
          >
            ← Şirket Seçimi
          </a>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {kartlar.map((kart) => (
            <div
              key={kart.baslik}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
            >
              <p className="text-slate-400">
                {kart.baslik}
              </p>

              <p
                className={`mt-3 text-3xl font-black ${kart.renk}`}
              >
                {money(kart.deger)}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                {kart.aciklama}
              </p>
            </div>
          ))}
        </div>

        {/* DÖVİZ KASALARI */}

        <div className="mt-7 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black">
                Döviz Kasaları
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                TCMB döviz alış kuru ile TL karşılığı
              </p>
            </div>

            <p className="text-sm text-slate-500">
              Kur tarihi: {kurlar.tarih || "Alınamadı"}
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-slate-950/60 p-5">
              <p className="text-sm text-slate-500">
                USD Kasa
              </p>

              <p className="mt-2 text-xl font-black">
                ${dovizKasaToplamlari.USD.toLocaleString("tr-TR")}
              </p>

              <p className="mt-2 text-sm text-cyan-400">
                Kur: {kur(kurlar.USD)}
              </p>

              <p className="mt-1 text-sm text-slate-400">
                {money(
                  dovizKasaToplamlari.USD *
                    kurlar.USD
                )}
              </p>
            </div>

            <div className="rounded-xl bg-slate-950/60 p-5">
              <p className="text-sm text-slate-500">
                EUR Kasa
              </p>

              <p className="mt-2 text-xl font-black">
                €{dovizKasaToplamlari.EUR.toLocaleString("tr-TR")}
              </p>

              <p className="mt-2 text-sm text-cyan-400">
                Kur: {kur(kurlar.EUR)}
              </p>

              <p className="mt-1 text-sm text-slate-400">
                {money(
                  dovizKasaToplamlari.EUR *
                    kurlar.EUR
                )}
              </p>
            </div>

            <div className="rounded-xl bg-slate-950/60 p-5">
              <p className="text-sm text-slate-500">
                GBP Kasa
              </p>

              <p className="mt-2 text-xl font-black">
                £{dovizKasaToplamlari.GBP.toLocaleString("tr-TR")}
              </p>

              <p className="mt-2 text-sm text-cyan-400">
                Kur: {kur(kurlar.GBP)}
              </p>

              <p className="mt-1 text-sm text-slate-400">
                {money(
                  dovizKasaToplamlari.GBP *
                    kurlar.GBP
                )}
              </p>
            </div>

            <div className="rounded-xl bg-slate-950/60 p-5">
              <p className="text-sm text-slate-500">
                RUB Kasa
              </p>

              <p className="mt-2 text-xl font-black">
                ₽{dovizKasaToplamlari.RUB.toLocaleString("tr-TR")}
              </p>

              <p className="mt-2 text-sm text-cyan-400">
                Kur: {kur(kurlar.RUB)}
              </p>

              <p className="mt-1 text-sm text-slate-400">
                {money(
                  dovizKasaToplamlari.RUB *
                    kurlar.RUB
                )}
              </p>
            </div>
          </div>
        </div>

        {/* MENÜ */}

        <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <a
            href="/beach/cariler"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-7 transition hover:border-cyan-700"
          >
            <div className="text-3xl">
              👥
            </div>

            <h2 className="mt-5 text-2xl font-black">
              Cari Hesaplar
            </h2>

            <p className="mt-2 text-slate-400">
              Müşteri ve tedarikçi borç/alacak takibi
            </p>
          </a>

          <a
            href="/beach/kasa-banka"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-7 transition hover:border-cyan-700"
          >
            <div className="text-3xl">
              🏦
            </div>

            <h2 className="mt-5 text-2xl font-black">
              Kasa & Banka
            </h2>

            <p className="mt-2 text-slate-400">
              TL ve döviz hesapları
            </p>
          </a>

          <a
            href="/beach/giderler"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-7 transition hover:border-red-700"
          >
            <div className="text-3xl">
              💸
            </div>

            <h2 className="mt-5 text-2xl font-black">
              Giderler
            </h2>

            <p className="mt-2 text-slate-400">
              Toplam gider: {money(toplamGider)}
            </p>
          </a>

          <a
            href="/beach/cekler"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-7 transition hover:border-cyan-700"
          >
            <div className="text-3xl">
              🧾
            </div>

            <h2 className="mt-5 text-2xl font-black">
              Çekler
            </h2>

            <p className="mt-2 text-slate-400">
              Alınan ve verilen çeklerin takibi
            </p>
          </a>

          <a
            href="/beach/stok"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-7 transition hover:border-cyan-700"
          >
            <div className="text-3xl">
              📦
            </div>

            <h2 className="mt-5 text-2xl font-black">
              Stok
            </h2>

            <p className="mt-2 text-slate-400">
              Mağaza ve işletme stok yönetimi
            </p>
          </a>

          <a
            href="/beach/yaklasan-odemeler"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-7 transition hover:border-cyan-700"
          >
            <div className="text-3xl">
              📅
            </div>

            <h2 className="mt-5 text-2xl font-black">
              Yaklaşan Ödemeler
            </h2>

            <p className="mt-2 text-slate-400">
              Vadesi yaklaşan borç ve çekler
            </p>
          </a>
        </div>

        {/* KAR / ZARAR */}

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-black">
            Kâr / Zarar Özeti
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl bg-slate-950/60 p-5">
              <p className="text-sm text-slate-500">
                Satış
              </p>

              <p className="mt-2 text-2xl font-black text-emerald-400">
                {money(toplamSatis)}
              </p>
            </div>

            <div className="rounded-xl bg-slate-950/60 p-5">
              <p className="text-sm text-slate-500">
                Alış
              </p>

              <p className="mt-2 text-2xl font-black text-red-400">
                {money(toplamAlis)}
              </p>
            </div>

            <div className="rounded-xl bg-slate-950/60 p-5">
              <p className="text-sm text-slate-500">
                Alınan Hizmet
              </p>

              <p className="mt-2 text-2xl font-black text-orange-400">
                {money(toplamAlinanHizmet)}
              </p>
            </div>

            <div className="rounded-xl bg-slate-950/60 p-5">
              <p className="text-sm text-slate-500">
                Gider
              </p>

              <p className="mt-2 text-2xl font-black text-red-400">
                {money(toplamGider)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-5">
              <p className="text-sm text-slate-500">
                Net Sonuç
              </p>

              <p
                className={`mt-2 text-2xl font-black ${
                  netSonuc >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {money(netSonuc)}
              </p>
            </div>
          </div>
        </div>

        {/* FİNANS ÖZETİ */}

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-black">
            Finans Özeti
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-slate-950/60 p-5">
              <p className="text-sm text-slate-500">
                Kasa + Banka
              </p>

              <p className="mt-2 text-2xl font-black">
                {money(kasaBankaToplam)}
              </p>
            </div>

            <div className="rounded-xl bg-slate-950/60 p-5">
              <p className="text-sm text-slate-500">
                Kredi Kartı Borcu
              </p>

              <p className="mt-2 text-2xl font-black text-orange-400">
                {money(krediKartiBorcuTl)}
              </p>
            </div>

            <div className="rounded-xl bg-slate-950/60 p-5">
              <p className="text-sm text-slate-500">
                Cari Net
              </p>

              <p className="mt-2 text-2xl font-black">
                {money(cariNet)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-5">
              <p className="text-sm text-slate-500">
                Finansal Net
              </p>

              <p className="mt-2 text-2xl font-black">
                {money(finansalNet)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}