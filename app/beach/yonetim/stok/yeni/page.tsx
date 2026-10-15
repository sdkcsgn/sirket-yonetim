import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function text(
  formData: FormData,
  name: string
) {
  const value = String(
    formData.get(name) ?? ""
  ).trim();

  return value || null;
}

function numberValue(
  formData: FormData,
  name: string
) {
  const raw = String(
    formData.get(name) ?? ""
  ).trim();

  if (!raw) {
    return 0;
  }

  const normalized = raw
    .replace(/\./g, "")
    .replace(",", ".");

  const value = Number(normalized);

  if (!Number.isFinite(value)) {
    return 0;
  }

  return value;
}

export default function YeniStokPage() {
  async function yeniStokKaydet(
    formData: FormData
  ) {
    "use server";

    const sirket =
      await prisma.sirket.findUnique({
        where: {
          kod: "BEACH",
        },
      });

    if (!sirket) {
      throw new Error(
        "Beach & Mağaza şirketi bulunamadı."
      );
    }

    const kod = String(
      formData.get("kod") ?? ""
    ).trim();

    const ad = String(
      formData.get("ad") ?? ""
    ).trim();

    const birim = String(
      formData.get("birim") ?? ""
    ).trim();

    if (!kod) {
      throw new Error(
        "Ürün kodu zorunludur."
      );
    }

    if (!ad) {
      throw new Error(
        "Ürün adı zorunludur."
      );
    }

    if (!birim) {
      throw new Error(
        "Birim zorunludur."
      );
    }

    const mevcut =
      await prisma.stok.findFirst({
        where: {
          sirketId: sirket.id,
          kod,
        },
      });

    if (mevcut) {
      throw new Error(
        "Bu ürün koduyla kayıtlı bir ürün zaten var."
      );
    }

    const baslangicStogu =
      numberValue(
        formData,
        "mevcutMiktar"
      );

    const yeniUrun =
      await prisma.stok.create({
        data: {
          sirketId: sirket.id,

          kod,
          ad,

          kategori: text(
            formData,
            "kategori"
          ),

          birim,

          mevcutMiktar:
            baslangicStogu,

          alisFiyati:
            numberValue(
              formData,
              "alisFiyati"
            ),

          satisFiyati:
            numberValue(
              formData,
              "satisFiyati"
            ),

          minimumStok:
            numberValue(
              formData,
              "minimumStok"
            ),

          depoBolumu:
            text(
              formData,
              "depoBolumu"
            ),

          aktif: true,
        },
      });

    if (baslangicStogu > 0) {
      await prisma.stokHareket.create({
        data: {
          stokId: yeniUrun.id,
          tarih: new Date(),
          giris: baslangicStogu,
          cikis: 0,
          aciklama:
            "Ürün kartı başlangıç stoğu",
        },
      });
    }

    revalidatePath(
      "/beach/yonetim/stok"
    );

    revalidatePath(
      "/beach/faturalar/yeni"
    );

    revalidatePath("/beach");

    redirect(
      "/beach/yonetim/stok"
    );
  }

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Yönetim Paneli
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Yeni Ürün
            </h1>

            <p className="mt-2 text-slate-400">
              Yeni ürün veya stok kartı oluşturun.
            </p>
          </div>

          <a
            href="/beach/yonetim/stok"
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 hover:bg-slate-900"
          >
            ← Ürün & Stok
          </a>
        </div>

        <form
          action={yeniStokKaydet}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Ürün Kodu
              </label>

              <input
                name="kod"
                required
                placeholder="Örn: COLA001"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Ürün Adı
              </label>

              <input
                name="ad"
                required
                placeholder="Örn: Coca Cola 330 ml"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Kategori
              </label>

              <input
                name="kategori"
                placeholder="Örn: İçecek"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Birim
              </label>

              <select
                name="birim"
                defaultValue="Adet"
                className={inputClass}
              >
                <option value="Adet">
                  Adet
                </option>

                <option value="Kg">
                  Kg
                </option>

                <option value="Koli">
                  Koli
                </option>

                <option value="Paket">
                  Paket
                </option>

                <option value="Litre">
                  Litre
                </option>

                <option value="Metre">
                  Metre
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Başlangıç Stoğu
              </label>

              <input
                name="mevcutMiktar"
                defaultValue="0"
                placeholder="0"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Minimum Stok
              </label>

              <input
                name="minimumStok"
                defaultValue="0"
                placeholder="0"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Alış Fiyatı
              </label>

              <input
                name="alisFiyati"
                placeholder="0,00"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Satış Fiyatı
              </label>

              <input
                name="satisFiyati"
                placeholder="0,00"
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold">
                Depo / Bölüm
              </label>

              <input
                name="depoBolumu"
                placeholder="Örn: Mağaza Deposu"
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-cyan-900/50 bg-cyan-950/10 p-5">
            <p className="font-black text-cyan-400">
              Stok Takibi
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              Başlangıç stoğu girerseniz ayrıca stok hareketi
              oluşturulur. Satış faturasında ürün stoğu otomatik
              azalacak, alış faturasında otomatik artacaktır.
            </p>
          </div>

          <button
            type="submit"
            className="mt-6 w-full rounded-xl bg-cyan-500 px-5 py-4 text-lg font-black text-slate-950 hover:bg-cyan-400"
          >
            Ürünü Kaydet
          </button>
        </form>
      </div>
    </main>
  );
}