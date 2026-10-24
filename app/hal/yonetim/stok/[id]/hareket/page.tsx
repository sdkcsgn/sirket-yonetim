
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tip?: string }>;
};

function parseMiktar(value: FormDataEntryValue | null): number {
  const raw = String(value ?? "").trim().replace(/\s/g, "");

  // Türkçe sayı biçimi: 1.250,500 -> 1250.500
  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const miktar = Number(normalized);

  if (!Number.isFinite(miktar) || miktar <= 0) {
    throw new Error("Geçerli bir miktar giriniz.");
  }

  return miktar;
}

function parseFiyat(value: FormDataEntryValue | null): number {
  const raw = String(value ?? "").trim().replace(/\s/g, "");

  if (!raw) return 0;

  // Türkçe sayı biçimi: 1.250,50 -> 1250.50
  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const fiyat = Number(normalized);

  if (!Number.isFinite(fiyat) || fiyat <= 0) {
    throw new Error("Geçerli bir birim alış fiyatı giriniz.");
  }

  return fiyat;
}

const paraFormat = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const miktarFormat = new Intl.NumberFormat("tr-TR", {
  maximumFractionDigits: 3,
});

export default async function StokHareketPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const query = await searchParams;
  const stokId = Number(id);

  if (!Number.isInteger(stokId) || stokId <= 0) {
    notFound();
  }

  const hareketTipi = query.tip === "CIKIS" ? "CIKIS" : "GIRIS";

  const stok = await prisma.stok.findUnique({
    where: { id: stokId },
    include: { sirket: true },
  });

  if (!stok || stok.sirket.kod !== "HAL") {
    notFound();
  }

  const cariler = await prisma.cari.findMany({
    where: {
      sirketId: stok.sirketId,
      aktif: true,
    },
    select: {
      id: true,
      unvan: true,
      tip: true,
    },
    orderBy: { unvan: "asc" },
  });

  async function stokHareketKaydet(formData: FormData) {
    "use server";

    const miktar = parseMiktar(formData.get("miktar"));
    const aciklama = String(formData.get("aciklama") ?? "").trim();
    const belgeNo = String(formData.get("belgeNo") ?? "").trim();

    const cariIdRaw = String(formData.get("cariId") ?? "").trim();
    const yeniCariUnvan = String(
      formData.get("yeniCariUnvan") ?? ""
    ).trim();

    const birimFiyat = parseFiyat(formData.get("birimFiyat"));

    if (cariIdRaw && yeniCariUnvan) {
      throw new Error(
        "Mevcut cari seçin veya yeni cari adı girin; ikisini birden kullanmayın."
      );
    }

    if (hareketTipi === "CIKIS" && (cariIdRaw || yeniCariUnvan || birimFiyat > 0)) {
      throw new Error(
        "Cari borçlandıran alış işlemi yalnızca stok girişinde yapılabilir."
      );
    }

    const cariIslemiVar = Boolean(cariIdRaw || yeniCariUnvan);

    if (cariIslemiVar && hareketTipi !== "GIRIS") {
      throw new Error("Cari alış kaydı sadece stok girişinde yapılabilir.");
    }

    if (cariIslemiVar && birimFiyat <= 0) {
      throw new Error("Cari borcu oluşturmak için birim alış fiyatı giriniz.");
    }

    if (birimFiyat > 0 && !cariIslemiVar) {
      throw new Error(
        "Alış fiyatı girdiğinizde mevcut cari seçin veya yeni cari adı girin."
      );
    }

    const mevcutStok = await prisma.stok.findUnique({
      where: { id: stokId },
      include: { sirket: true },
    });

    if (!mevcutStok || mevcutStok.sirket.kod !== "HAL") {
      throw new Error("Ürün bulunamadı.");
    }

    const mevcutMiktar = Number(mevcutStok.mevcutMiktar);

    if (hareketTipi === "CIKIS" && miktar > mevcutMiktar) {
      throw new Error(
        `Mevcut stok ${mevcutMiktar} ${mevcutStok.birim}. Bu miktardan fazla çıkış yapılamaz.`
      );
    }

    const yeniMiktar =
      hareketTipi === "GIRIS"
        ? mevcutMiktar + miktar
        : mevcutMiktar - miktar;

    const toplamTutar = Number((miktar * birimFiyat).toFixed(2));

    await prisma.$transaction(async (tx) => {
      let cariId: number | null = null;

      if (yeniCariUnvan) {
        const yeniCari = await tx.cari.create({
          data: {
            sirketId: mevcutStok.sirketId,
            unvan: yeniCariUnvan,
            tip: "SATICI",
          },
        });

        cariId = yeniCari.id;
      } else if (cariIdRaw) {
        const secilenCariId = Number(cariIdRaw);

        if (!Number.isInteger(secilenCariId) || secilenCariId <= 0) {
          throw new Error("Geçerli bir cari seçiniz.");
        }

        const cari = await tx.cari.findFirst({
          where: {
            id: secilenCariId,
            sirketId: mevcutStok.sirketId,
            aktif: true,
          },
        });

        if (!cari) {
          throw new Error("Seçilen cari bulunamadı.");
        }

        cariId = cari.id;
      }

      await tx.stok.update({
        where: { id: mevcutStok.id },
        data: { mevcutMiktar: yeniMiktar },
      });

      await tx.stokHareket.create({
        data: {
          stokId: mevcutStok.id,
          cariId,
          tarih: new Date(),
          giris: hareketTipi === "GIRIS" ? miktar : 0,
          cikis: hareketTipi === "CIKIS" ? miktar : 0,
          birimFiyat,
          toplamTutar,
          aciklama:
            aciklama ||
            (cariId
              ? `Alış / stok girişi: ${mevcutStok.ad}`
              : hareketTipi === "GIRIS"
                ? "Manuel stok girişi"
                : "Manuel stok çıkışı"),
          belgeNo: belgeNo || null,
        },
      });

      if (cariId && hareketTipi === "GIRIS") {
        await tx.cariHareket.create({
          data: {
            cariId,
            tarih: new Date(),
            tip: "BORC",
            aciklama: `Stok alış girişi: ${mevcutStok.ad}`,
            belgeNo: belgeNo || null,
            borc: toplamTutar,
            alacak: 0,
            islemTuru: "STOK_ALIS",
          },
        });
      }
    });

    revalidatePath("/hal/yonetim/stok");
    revalidatePath(`/hal/yonetim/stok/${stokId}/hareket`);
    revalidatePath("/hal/faturalar/yeni");
    revalidatePath("/hal");

    redirect("/hal/yonetim/stok");
  }

  const mevcutMiktar = Number(stok.mevcutMiktar);

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Ürün &amp; Stok
            </p>

            <h1 className="mt-2 text-4xl font-black">
              {hareketTipi === "GIRIS" ? "Stok Giriş" : "Stok Çıkış"}
            </h1>

            <p className="mt-2 text-slate-400">
              {stok.kod} - {stok.ad}
            </p>
          </div>

          <a
            href="/hal/yonetim/stok"
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 hover:bg-slate-900"
          >
            ← Ürün &amp; Stok
          </a>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Mevcut Stok</p>
            <p className="mt-2 text-3xl font-black">
              {miktarFormat.format(mevcutMiktar)} {stok.birim}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Minimum Stok</p>
            <p className="mt-2 text-3xl font-black text-amber-400">
              {miktarFormat.format(Number(stok.minimumStok))} {stok.birim}
            </p>
          </div>
        </div>

        <form
          action={stokHareketKaydet}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8"
        >
          <div>
            <label className="mb-2 block text-sm font-semibold">
              {hareketTipi === "GIRIS" ? "Giriş Miktarı" : "Çıkış Miktarı"}
            </label>

            <input
              name="miktar"
              type="text"
              inputMode="decimal"
              required
              placeholder={`Örn: 1000 ${stok.birim}`}
              className={inputClass}
            />
          </div>

          {hareketTipi === "GIRIS" && (
            <div className="mt-6 rounded-xl border border-cyan-900 bg-slate-950 p-5">
              <h2 className="mb-4 text-lg font-bold text-cyan-400">
                Alış ve Cari Bilgileri
              </h2>

              <label className="mb-2 block text-sm font-semibold">
                Mevcut Cari / Tedarikçi
              </label>

              <select
                name="cariId"
                defaultValue=""
                className={inputClass}
              >
                <option value="">
                  Cari seçmeden manuel stok girişi
                </option>

                {cariler.map((cari) => (
                  <option key={cari.id} value={cari.id}>
                    {cari.unvan} — {cari.tip}
                  </option>
                ))}
              </select>

              <label className="mb-2 mt-5 block text-sm font-semibold">
                Veya Yeni Cari Oluştur
              </label>

              <input
                name="yeniCariUnvan"
                placeholder="Yeni tedarikçi firma adı"
                className={inputClass}
              />

              <label className="mb-2 mt-5 block text-sm font-semibold">
                Birim Alış Fiyatı (TL)
              </label>

              <input
                name="birimFiyat"
                type="text"
                inputMode="decimal"
                placeholder="Örn: 25,50"
                className={inputClass}
              />

              <p className="mt-3 text-sm text-slate-400">
                Toplam alış tutarı, miktar ile birim fiyat çarpılarak hesaplanır.
                Cari seçip fiyat girdiğinizde bu tutar cari borcuna kaydedilir.
              </p>
            </div>
          )}

          <div className="mt-6">
            <label className="mb-2 block text-sm font-semibold">
              Belge No
            </label>

            <input
              name="belgeNo"
              placeholder="Varsa fatura / belge no"
              className={inputClass}
            />
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-semibold">
              Açıklama
            </label>

            <textarea
              name="aciklama"
              rows={4}
              placeholder={
                hareketTipi === "GIRIS"
                  ? "Örn: Ürün alış girişi, devir stoğu..."
                  : "Örn: Fire, sayım düzeltmesi..."
              }
              className={inputClass}
            />
          </div>

          <div
            className={
              hareketTipi === "GIRIS"
                ? "mt-6 rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-5"
                : "mt-6 rounded-xl border border-red-900/60 bg-red-950/20 p-5"
            }
          >
            <p className="font-bold">
              {hareketTipi === "GIRIS"
                ? "Stok artacaktır."
                : "Stok azalacaktır."}
            </p>

            <p className="mt-2 text-sm text-slate-300">
              {hareketTipi === "GIRIS"
                ? "Cari ve alış fiyatı girerseniz alış tutarı tedarikçi borcuna da işlenir."
                : "Bu işlem stok miktarını azaltır; cari borcu oluşturmaz."}
            </p>
          </div>

          <button
            type="submit"
            className={
              hareketTipi === "GIRIS"
                ? "mt-6 w-full rounded-xl bg-emerald-500 px-5 py-4 text-lg font-black text-slate-950 hover:bg-emerald-400"
                : "mt-6 w-full rounded-xl bg-red-500 px-5 py-4 text-lg font-black text-white hover:bg-red-400"
            }
          >
            {hareketTipi === "GIRIS" ? "Stoğa Ekle" : "Stoktan Düş"}
          </button>
        </form>
      </div>
    </main>
  );
}
