import { prisma } from "@/lib/prisma";
import { finansHareketKaydet } from "./actions";

function paraBirimiAdi(
  paraBirimi: string
) {
  switch (paraBirimi) {
    case "TRY":
      return "TL";

    case "USD":
      return "USD";

    case "EUR":
      return "EUR";

    case "GBP":
      return "GBP";

    case "RUB":
      return "RUB";

    default:
      return paraBirimi;
  }
}

export default async function YeniFinansHareketPage() {
  const sirket =
    await prisma.sirket.findUnique({
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

  const hesaplar =
    await prisma.finansHesap.findMany({
      where: {
        sirketId: sirket.id,
        aktif: true,
      },

      orderBy: [
        {
          tip: "asc",
        },
        {
          paraBirimi: "asc",
        },
        {
          ad: "asc",
        },
      ],
    });

  const bugun = new Date()
    .toISOString()
    .slice(0, 10);

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Beach & Mağaza
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Para Giriş / Çıkış
            </h1>

            <p className="mt-2 text-slate-400">
              TL ve döviz kasa/banka hareketi
            </p>
          </div>

          <a
            href="/beach/kasa-banka"
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 hover:bg-slate-900"
          >
            ← Kasa & Banka
          </a>
        </div>

        <form
          action={finansHareketKaydet}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Hesap
              </label>

              <select
                name="finansHesapId"
                required
                defaultValue=""
                className={inputClass}
              >
                <option value="">
                  Hesap seçiniz
                </option>

                {hesaplar.map(
                  (hesap) => (
                    <option
                      key={hesap.id}
                      value={hesap.id}
                    >
                      {hesap.tip ===
                      "KASA"
                        ? "Kasa"
                        : hesap.tip ===
                            "BANKA"
                          ? "Banka"
                          : "Kredi Kartı"}{" "}
                      - {hesap.ad} -{" "}
                      {paraBirimiAdi(
                        hesap.paraBirimi
                      )}
                    </option>
                  )
                )}
              </select>

              <p className="mt-2 text-xs text-slate-500">
                Girilen tutar seçilen hesabın kendi para biriminde kaydedilir.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                İşlem
              </label>

              <select
                name="tip"
                required
                defaultValue=""
                className={inputClass}
              >
                <option value="">
                  İşlem seçiniz
                </option>

                <option value="GIRIS">
                  Para Girişi
                </option>

                <option value="CIKIS">
                  Para Çıkışı
                </option>
              </select>
            </div>

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

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Tutar
              </label>

              <input
                type="text"
                name="tutar"
                required
                placeholder="Örn: 1.000,00"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Belge No
              </label>

              <input
                type="text"
                name="belgeNo"
                placeholder="Varsa belge no"
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Açıklama
              </label>

              <textarea
                name="aciklama"
                required
                rows={4}
                placeholder="Örn: Günlük Euro kasa girişi"
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-cyan-900/50 bg-cyan-950/10 p-5">
            <p className="font-black text-cyan-400">
              Döviz Mantığı
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              Örneğin Euro Kasa seçip 1.000 girerseniz
              sistem bunu 1.000 EUR olarak kaydeder.
              Ana panel TCMB güncel kuru ile TL karşılığını
              otomatik hesaplar.
            </p>
          </div>

          <button
            type="submit"
            className="mt-6 w-full rounded-xl bg-cyan-500 px-5 py-4 text-lg font-black text-slate-950 hover:bg-cyan-400"
          >
            Hareketi Kaydet
          </button>
        </form>
      </div>
    </main>
  );
}