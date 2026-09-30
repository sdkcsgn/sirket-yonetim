import { prisma } from "@/lib/prisma";
import { giderKaydet } from "./actions";

const giderTipleri = [
  ["ELEKTRIK", "Elektrik"],
  ["SU", "Su"],
  ["PERSONEL", "Personel"],
  ["NAKLIYE", "Nakliye"],
  ["KIRA", "Kira"],
  ["YAKIT", "Yakıt"],
  ["BAKIM_ONARIM", "Bakım / Onarım"],
  ["MUHASEBE", "Muhasebe"],
  ["KOMISYON", "Komisyon"],
  ["VERGI_HARC", "Vergi / Harç"],
  ["TELEFON_INTERNET", "Telefon / İnternet"],
  ["NOTER", "Noter"],
  ["ODA_AIDAT", "Oda Aidatı"],
  ["DIGER_ARAC_GIDERLERI", "Diğer Araç Giderleri"],
  ["MARKET", "Market"],
  ["ORTULU_ODENEK", "Örtülü Ödenek"],
  ["DIGER", "Diğer"],
] as const;

export default async function YeniGiderPage() {
  const sirket = await prisma.sirket.findUnique({
    where: {
      kod: "BEACH",
    },
  });

  if (!sirket) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        BEACH şirketi bulunamadı.
      </main>
    );
  }

  const [cariler, finansHesaplari] = await Promise.all([
    prisma.cari.findMany({
      where: {
        sirketId: sirket.id,
        aktif: true,
      },
      orderBy: {
        unvan: "asc",
      },
    }),

    prisma.finansHesap.findMany({
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
    }),
  ]);

  const bugun = new Date()
    .toISOString()
    .slice(0, 10);

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Beach & Mağaza
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Yeni Gider
            </h1>

            <p className="mt-2 text-slate-400">
              Kasa, banka, kredi kartı ve cari bağlantılı gider kaydı
            </p>
          </div>

          <a
            href="/beach/giderler"
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 hover:bg-slate-900"
          >
            ← Gider Listesi
          </a>
        </div>

        <form
          action={giderKaydet}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8"
        >
          <div className="grid gap-6 md:grid-cols-2">
            {/* GİDER TİPİ */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Gider Tipi
              </label>

              <select
                name="tip"
                required
                defaultValue=""
                className={inputClass}
              >
                <option value="">
                  Gider tipi seçiniz
                </option>

                {giderTipleri.map(([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* TARİH */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Tarih
              </label>

              <input
                type="date"
                name="tarih"
                required
                defaultValue={bugun}
                className={inputClass}
              />
            </div>

            {/* TUTAR */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Tutar
              </label>

              <input
                type="text"
                name="tutar"
                required
                placeholder="Örn: 12.500,00"
                className={inputClass}
              />
            </div>

            {/* CARİ */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Cari
              </label>

              <select
                id="cariId"
                name="cariId"
                defaultValue=""
                className={inputClass}
              >
                <option value="">
                  Cari seçilmedi
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

              <p className="mt-2 text-xs text-slate-500">
                Açık hesap seçilirse cari zorunludur.
              </p>
            </div>

            {/* ÖDEME ŞEKLİ */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Ödeme Şekli
              </label>

              <select
                id="odemeSekli"
                name="odemeSekli"
                required
                defaultValue=""
                className={inputClass}
              >
                <option value="">
                  Ödeme şekli seçiniz
                </option>

                <option value="NAKIT">
                  Nakit
                </option>

                <option value="EFT_HAVALE">
                  EFT / Havale
                </option>

                <option value="KREDI_KARTI">
                  Kredi Kartı
                </option>

                <option value="ACIK_HESAP">
                  Açık Hesap
                </option>
              </select>
            </div>

            {/* ÖDEME HESABI */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Ödeme Hesabı
              </label>

              <select
                id="finansHesapId"
                name="finansHesapId"
                defaultValue=""
                className={inputClass}
              >
                <option
                  value=""
                  data-tip=""
                >
                  Hesap seçiniz
                </option>

                {finansHesaplari.map((hesap) => (
                  <option
                    key={hesap.id}
                    value={hesap.id}
                    data-tip={hesap.tip}
                  >
                    {hesap.tip === "KASA"
                      ? "Kasa"
                      : hesap.tip === "BANKA"
                        ? "Banka"
                        : "Kredi Kartı"}{" "}
                    - {hesap.ad}
                  </option>
                ))}
              </select>

              <p
                id="hesapBilgi"
                className="mt-2 text-xs text-slate-500"
              >
                Önce ödeme şeklini seçiniz.
              </p>
            </div>

            {/* BELGE */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Belge No
              </label>

              <input
                type="text"
                name="belgeNo"
                placeholder="Fiş / belge no"
                className={inputClass}
              />
            </div>

            {/* FATURA */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Fatura No
              </label>

              <input
                type="text"
                name="faturaNo"
                placeholder="Varsa fatura no"
                className={inputClass}
              />
            </div>

            {/* AÇIKLAMA */}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Açıklama
              </label>

              <textarea
                name="aciklama"
                required
                rows={4}
                placeholder="Gider açıklaması..."
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-cyan-900/50 bg-cyan-950/10 p-5">
            <p className="font-black text-cyan-400">
              Ödeme Mantığı
            </p>

            <div className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
              <p>
                <strong>Nakit:</strong> Seçilen kasa hesabından düşer.
              </p>

              <p>
                <strong>EFT / Havale:</strong> Seçilen banka hesabından düşer.
              </p>

              <p>
                <strong>Kredi Kartı:</strong> Seçilen kredi kartı hesabından düşer.
              </p>

              <p>
                <strong>Açık Hesap:</strong> Kasa, banka veya kart hareketi
                oluşmaz. Tutar carinin alacağına yazılır.
              </p>

              <p>
                Cari seçilmiş ve ödeme Nakit, EFT veya Kredi Kartı ise
                gider önce <strong>Alacak</strong>, ödeme de
                <strong> Borç</strong> olarak görünür ve cari bakiye kapanır.
              </p>
            </div>
          </div>

          <button
            type="submit"
            className="mt-6 w-full rounded-xl bg-cyan-500 px-5 py-4 text-lg font-black text-slate-950 hover:bg-cyan-400"
          >
            Gideri Kaydet
          </button>
        </form>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
(function () {
  const odeme = document.getElementById("odemeSekli");
  const hesap = document.getElementById("finansHesapId");
  const cari = document.getElementById("cariId");
  const bilgi = document.getElementById("hesapBilgi");

  if (!odeme || !hesap || !cari || !bilgi) {
    return;
  }

  function guncelle() {
    const odemeSekli = odeme.value;

    let gerekliTip = "";

    if (odemeSekli === "NAKIT") {
      gerekliTip = "KASA";
      bilgi.textContent =
        "Nakit ödeme için kasa hesabı seçiniz.";
    }

    if (odemeSekli === "EFT_HAVALE") {
      gerekliTip = "BANKA";
      bilgi.textContent =
        "EFT / Havale için banka hesabı seçiniz.";
    }

    if (odemeSekli === "KREDI_KARTI") {
      gerekliTip = "KREDI_KARTI";
      bilgi.textContent =
        "Kredi kartı hesabı seçiniz.";
    }

    if (odemeSekli === "ACIK_HESAP") {
      gerekliTip = "";
      bilgi.textContent =
        "Açık hesapta finans hesabı seçilmez. Cari seçimi zorunludur.";
    }

    Array.from(hesap.options).forEach(function (option) {
      const tip =
        option.getAttribute("data-tip") || "";

      if (!odemeSekli) {
        option.hidden = false;
        return;
      }

      if (odemeSekli === "ACIK_HESAP") {
        option.hidden = tip !== "";
        return;
      }

      option.hidden =
        tip !== "" &&
        tip !== gerekliTip;
    });

    if (odemeSekli === "ACIK_HESAP") {
      hesap.value = "";
      hesap.disabled = true;
      hesap.required = false;

      cari.required = true;
    } else {
      hesap.disabled = false;

      if (odemeSekli) {
        hesap.required = true;
      } else {
        hesap.required = false;
      }

      cari.required = false;

      const secili =
        hesap.options[hesap.selectedIndex];

      if (secili) {
        const seciliTip =
          secili.getAttribute("data-tip") || "";

        if (
          seciliTip &&
          seciliTip !== gerekliTip
        ) {
          hesap.value = "";
        }
      }
    }
  }

  odeme.addEventListener(
    "change",
    guncelle
  );

  guncelle();
})();
          `,
        }}
      />
    </main>
  );
}