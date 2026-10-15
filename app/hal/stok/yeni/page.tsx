import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const SIRKET_KODU = "HAL";
const SIRKET_ADI = "Hal Komisyon & Soğuk Hava";
const BASE_PATH = "/hal";

function parseNumber(value: FormDataEntryValue | null) {
  const raw = String(value ?? "")
    .trim()
    .replace(/\./g, "")
    .replace(",", ".");

  if (!raw) {
    return 0;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed)) {
    throw new Error("Geçersiz sayısal değer.");
  }

  return parsed;
}

export default async function YeniStokPage() {
  const sirket = await prisma.sirket.findUnique({
    where: {
      kod: SIRKET_KODU,
    },
  });

  if (!sirket) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        {SIRKET_ADI} bulunamadı.
      </main>
    );
  }

  async function stokKaydet(formData: FormData) {
    "use server";

    const sirket = await prisma.sirket.findUnique({
      where: {
        kod: SIRKET_KODU,
      },
    });

    if (!sirket) {
      throw new Error(`${SIRKET_ADI} bulunamadı.`);
    }

    const kod = String(formData.get("kod") ?? "")
      .trim()
      .toUpperCase();

    const ad = String(formData.get("ad") ?? "").trim();
    const kategori =
      String(formData.get("kategori") ?? "").trim() || null;
    const birim = String(formData.get("birim") ?? "").trim();
    const depoBolumu =
      String(formData.get("depoBolumu") ?? "").trim() || null;

    const acilisMiktari = parseNumber(
      formData.get("acilisMiktari")
    );

    const alisFiyati = parseNumber(
      formData.get("alisFiyati")
    );

    const satisFiyati = parseNumber(
      formData.get("satisFiyati")
    );

    if (!kod) {
      throw new Error("Stok kodu zorunludur.");
    }

    if (!ad) {
      throw new Error("Ürün adı zorunludur.");
    }

    if (!birim) {
      throw new Error("Birim seçmelisiniz.");
    }

    if (acilisMiktari < 0) {
      throw new Error(
        "Açılış miktarı eksi olamaz."
      );
    }

    if (alisFiyati < 0 || satisFiyati < 0) {
      throw new Error(
        "Alış ve satış fiyatı eksi olamaz."
      );
    }

    const ayniKod = await prisma.stok.findFirst({
      where: {
        sirketId: sirket.id,
        kod,
      },
      select: {
        id: true,
      },
    });

    if (ayniKod) {
      throw new Error(
        `Bu stok kodu zaten kullanılıyor: ${kod}`
      );
    }

    const stok = await prisma.$transaction(
      async (tx) => {
        const yeniStok = await tx.stok.create({
          data: {
            sirketId: sirket.id,
            kod,
            ad,
            kategori,
            birim,
            mevcutMiktar: acilisMiktari,
            alisFiyati,
            satisFiyati,
            minimumStok: 0,
            depoBolumu,
            aktif: true,
          },
        });

        if (acilisMiktari > 0) {
          await tx.stokHareket.create({
            data: {
              stokId: yeniStok.id,
              tarih: new Date(),
              giris: acilisMiktari,
              cikis: 0,
              aciklama: "Açılış stok miktarı",
              belgeNo: "ACILIS",
            },
          });
        }

        return yeniStok;
      }
    );

    revalidatePath(`${BASE_PATH}/stok`);
    revalidatePath(`${BASE_PATH}/stok/${stok.id}`);

    redirect(`${BASE_PATH}/stok`);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              {SIRKET_ADI}
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Yeni Stok Kartı
            </h1>

            <p className="mt-2 text-slate-400">
              Yeni ürün veya stok kartı oluşturun.
            </p>
          </div>

          <a
            href={`${BASE_PATH}/stok`}
            className="rounded-xl border border-slate-700 px-5 py-3 font-bold text-slate-300 transition hover:bg-slate-900"
          >
            ← Stok Listesi
          </a>
        </div>

        <form
          action={stokKaydet}
          className="rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">
                Stok Kodu *
              </label>

              <input
                name="kod"
                required
                placeholder="Örn: PRT-001"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">
                Ürün Adı *
              </label>

              <input
                name="ad"
                required
                placeholder="Örn: Portakal"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">
                Kategori
              </label>

              <input
                name="kategori"
                placeholder="Örn: Meyve"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">
                Birim *
              </label>

              <select
                name="birim"
                required
                defaultValue="KG"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
              >
                <option value="KG">KG</option>
                <option value="ADET">ADET</option>
                <option value="KASA">KASA</option>
                <option value="PALET">PALET</option>
                <option value="TON">TON</option>
                <option value="LT">LT</option>
                <option value="METRE">METRE</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">
                Açılış Miktarı
              </label>

              <input
                name="acilisMiktari"
                inputMode="decimal"
                defaultValue="0"
                placeholder="0"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">
                Depo Bölümü
              </label>

              <input
                name="depoBolumu"
                placeholder="Örn: Soğuk Oda 1"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">
                Alış Fiyatı
              </label>

              <input
                name="alisFiyati"
                inputMode="decimal"
                defaultValue="0"
                placeholder="0,00"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">
                Satış Fiyatı
              </label>

              <input
                name="satisFiyati"
                inputMode="decimal"
                defaultValue="0"
                placeholder="0,00"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-slate-800 pt-6">
            <a
              href={`${BASE_PATH}/stok`}
              className="rounded-xl border border-slate-700 px-6 py-3 font-bold text-slate-300 transition hover:bg-slate-800"
            >
              Vazgeç
            </a>

            <button
              type="submit"
              className="rounded-xl bg-cyan-500 px-7 py-3 font-black text-slate-950 transition hover:bg-cyan-400"
            >
              Stok Kartını Kaydet
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
