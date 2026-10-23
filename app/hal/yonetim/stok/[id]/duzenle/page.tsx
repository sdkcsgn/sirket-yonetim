
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hata?: string }>;
};

function metin(formData: FormData, alan: string) {
  const deger = String(formData.get(alan) ?? "").trim();
  return deger || null;
}

function sayi(formData: FormData, alan: string) {
  let deger = String(formData.get(alan) ?? "").trim();

  if (!deger) return 0;

  if (deger.includes(",")) {
    deger = deger.replace(/\./g, "").replace(",", ".");
  }

  const sonuc = Number(deger);

  if (!Number.isFinite(sonuc) || sonuc < 0) {
    throw new Error(`${alan} alanına geçerli bir değer girin.`);
  }

  return sonuc;
}

export default async function StokDuzenlePage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const query = await searchParams;
  const stokId = Number(id);

  if (!Number.isInteger(stokId) || stokId <= 0) notFound();

  const sirket = await prisma.sirket.findUnique({
    where: { kod: "HAL" },
  });

  if (!sirket) notFound();

  const stok = await prisma.stok.findFirst({
    where: { id: stokId, sirketId: sirket.id },
  });

  if (!stok) notFound();

  async function stokKartiniGuncelle(formData: FormData) {
    "use server";

    const id = Number(formData.get("stokId"));
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("Geçersiz stok kaydı.");
    }

    const sirket = await prisma.sirket.findUnique({
      where: { kod: "HAL" },
    });

    if (!sirket) throw new Error("HAL şirketi bulunamadı.");

    const mevcut = await prisma.stok.findFirst({
      where: { id, sirketId: sirket.id },
    });

    if (!mevcut) notFound();

    const kod = String(formData.get("kod") ?? "").trim();
    const ad = String(formData.get("ad") ?? "").trim();
    const birim = String(formData.get("birim") ?? "").trim();

    if (!kod || !ad || !birim) {
      throw new Error("Ürün kodu, adı ve birimi zorunludur.");
    }

    const ayniKod = await prisma.stok.findFirst({
      where: {
        sirketId: sirket.id,
        kod,
        NOT: { id },
      },
    });

    if (ayniKod) {
      throw new Error("Bu ürün kodu başka bir üründe kullanılıyor.");
    }

    await prisma.stok.update({
      where: { id: mevcut.id },
      data: {
        kod,
        ad,
        birim,
        kategori: metin(formData, "kategori"),
        depoBolumu: metin(formData, "depoBolumu"),
        minimumStok: sayi(formData, "minimumStok"),
        alisFiyati: sayi(formData, "alisFiyati"),
        satisFiyati: sayi(formData, "satisFiyati"),
      },
    });

    revalidatePath("/hal/stok");
    revalidatePath(`/hal/stok/${id}`);
    revalidatePath("/hal/yonetim/stok");
    revalidatePath(`/hal/yonetim/stok/${id}`);
    revalidatePath(`/hal/yonetim/stok/${id}/duzenle`);
    revalidatePath("/hal/faturalar/yeni");
    revalidatePath("/hal");

    redirect("/hal/yonetim/stok");
  }

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-widest text-cyan-400">
            HAL · Ürün ve Stok
          </p>
          <h1 className="mt-2 text-3xl font-black">Stok Kartını Düzenle</h1>
          <p className="mt-2 text-slate-400">
            {stok.kod} — {stok.ad}
          </p>
        </div>

        {query.hata && (
          <p className="mb-5 rounded-xl border border-red-800 bg-red-950 p-4 text-red-300">
            {query.hata}
          </p>
        )}

        <form
          action={stokKartiniGuncelle}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8"
        >
          <input type="hidden" name="stokId" value={stok.id} />

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-semibold">
              Ürün Kodu
              <input
                name="kod"
                required
                defaultValue={stok.kod}
                className={`${inputClass} mt-2`}
              />
            </label>

            <label className="block text-sm font-semibold">
              Ürün Adı
              <input
                name="ad"
                required
                defaultValue={stok.ad}
                className={`${inputClass} mt-2`}
              />
            </label>

            <label className="block text-sm font-semibold">
              Kategori
              <input
                name="kategori"
                defaultValue={stok.kategori ?? ""}
                className={`${inputClass} mt-2`}
              />
            </label>

            <label className="block text-sm font-semibold">
              Birim
              <select
                name="birim"
                defaultValue={stok.birim}
                required
                className={`${inputClass} mt-2`}
              >
                {[stok.birim, "Adet", "Kg", "Koli", "Paket", "Litre", "Metre"]
                  .filter((deger, index, liste) => liste.indexOf(deger) === index)
                  .map((deger) => (
                    <option key={deger} value={deger}>
                      {deger}
                    </option>
                  ))}
              </select>
            </label>

            <label className="block text-sm font-semibold">
              Minimum Stok
              <input
                name="minimumStok"
                type="number"
                min="0"
                step="any"
                defaultValue={Number(stok.minimumStok)}
                className={`${inputClass} mt-2`}
              />
            </label>

            <label className="block text-sm font-semibold">
              Depo / Bölüm
              <input
                name="depoBolumu"
                defaultValue={stok.depoBolumu ?? ""}
                className={`${inputClass} mt-2`}
              />
            </label>

            <label className="block text-sm font-semibold">
              Alış Fiyatı
              <input
                name="alisFiyati"
                type="number"
                min="0"
                step="any"
                defaultValue={Number(stok.alisFiyati)}
                className={`${inputClass} mt-2`}
              />
            </label>

            <label className="block text-sm font-semibold">
              Satış Fiyatı
              <input
                name="satisFiyati"
                type="number"
                min="0"
                step="any"
                defaultValue={Number(stok.satisFiyati)}
                className={`${inputClass} mt-2`}
              />
            </label>
          </div>

          <div className="mt-6 rounded-xl border border-amber-900 bg-amber-950/20 p-4">
            <p className="font-bold text-amber-300">Mevcut stok: {Number(stok.mevcutMiktar)} {stok.birim}</p>
            <p className="mt-1 text-sm text-slate-300">
              Bu ekranda mevcut stok miktarı değiştirilmez. Miktar düzeltmesi stok hareketlerinden yapılmalıdır.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-emerald-500 px-5 py-4 font-black text-slate-950 hover:bg-emerald-400"
            >
              Değişiklikleri Kaydet
            </button>
            <a
              href="/hal/yonetim/stok"
              className="rounded-xl border border-slate-700 px-5 py-4 font-bold text-slate-300"
            >
              Vazgeç
            </a>
          </div>
        </form>
      </div>
    </main>
  );
}
