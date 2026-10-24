
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tip?: string;
    error?: string;
  }>;
};

function number(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);
}

function parseNumber(formData: FormData, name: string): number {
  const raw = String(formData.get(name) ?? "")
    .trim()
    .replace(/\s/g, "");

  if (!raw) return 0;

  let normalized = raw;

  if (raw.includes(".") && raw.includes(",")) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if (raw.includes(",")) {
    normalized = raw.replace(",", ".");
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}

function parseDate(formData: FormData, name: string): Date | null {
  const raw = String(formData.get(name) ?? "").trim();
  if (!raw) return null;

  const value = new Date(`${raw}T12:00:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}

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

  const tip = query.tip === "CIKIS" ? "CIKIS" : "GIRIS";

  const sirket = await prisma.sirket.findUnique({
    where: { kod: "HAL" },
  });

  if (!sirket) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Hal Komisyon &amp; Soğuk Hava şirketi bulunamadı.
      </main>
    );
  }

  const stok = await prisma.stok.findFirst({
    where: {
      id: stokId,
      sirketId: sirket.id,
    },
  });

  if (!stok) {
    notFound();
  }

  const cariler = await prisma.cari.findMany({
    where: {
      sirketId: sirket.id,
      aktif: true,
    },
    select: {
      id: true,
      unvan: true,
      tip: true,
    },
    orderBy: { unvan: "asc" },
  });

  async function hareketKaydet(formData: FormData) {
    "use server";

    const sirket = await prisma.sirket.findUnique({
      where: { kod: "HAL" },
    });

    if (!sirket) {
      throw new Error("Hal Komisyon & Soğuk Hava bulunamadı.");
    }

    const stok = await prisma.stok.findFirst({
      where: {
        id: stokId,
        sirketId: sirket.id,
      },
    });

    if (!stok) {
      throw new Error("Stok bulunamadı.");
    }

    const hareketTipi = String(formData.get("tip") ?? "");

    if (hareketTipi !== "GIRIS" && hareketTipi !== "CIKIS") {
      throw new Error("Geçersiz hareket türü.");
    }

    const miktar = parseNumber(formData, "miktar");

    if (miktar <= 0) {
      redirect(
        `/hal/stok/${stokId}/hareket?tip=${hareketTipi}&error=${encodeURIComponent(
          "Miktar sıfırdan büyük olmalıdır."
        )}`
      );
    }

    const tarih = parseDate(formData, "tarih");

    if (!tarih) {
      redirect(
        `/hal/stok/${stokId}/hareket?tip=${hareketTipi}&error=${encodeURIComponent(
          "Tarih zorunludur."
        )}`
      );
    }

    const belgeNo =
      String(formData.get("belgeNo") ?? "").trim() || null;

    const aciklama =
      String(formData.get("aciklama") ?? "").trim() ||
      (hareketTipi === "GIRIS"
        ? "Manuel stok girişi"
        : "Manuel stok çıkışı");

    const cariIdRaw = String(formData.get("cariId") ?? "").trim();
    const yeniCariUnvan = String(
      formData.get("yeniCariUnvan") ?? ""
    ).trim();

    const birimFiyat = parseNumber(formData, "birimFiyat");

    if (cariIdRaw && yeniCariUnvan) {
      throw new Error(
        "Mevcut cari seçin veya yeni cari adı girin; ikisini birlikte kullanmayın."
      );
    }

    if (birimFiyat < 0) {
      throw new Error("Birim fiyat negatif olamaz.");
    }

    if (
      (cariIdRaw || yeniCariUnvan) &&
      hareketTipi !== "GIRIS"
    ) {
      throw new Error(
        "Tedarikçi borçlandıran alış kaydı yalnızca stok girişinde yapılabilir."
      );
    }

    if (
      (cariIdRaw || yeniCariUnvan) &&
      birimFiyat <= 0
    ) {
      throw new Error("Cari borcu için birim alış fiyatı giriniz.");
    }

    if (birimFiyat > 0 && !cariIdRaw && !yeniCariUnvan) {
      throw new Error(
        "Fiyat girdiğinizde mevcut cari seçin veya yeni tedarikçi adı yazın."
      );
    }

    const toplamTutar = Number((miktar * birimFiyat).toFixed(2));

    if (
      hareketTipi === "CIKIS" &&
      Number(stok.mevcutMiktar) < miktar
    ) {
      redirect(
        `/hal/stok/${stokId}/hareket?tip=CIKIS&error=${encodeURIComponent(
          `Yetersiz stok. Mevcut: ${number(
            Number(stok.mevcutMiktar)
          )} ${stok.birim}`
        )}`
      );
    }

    await prisma.$transaction(async (tx) => {
      let cariId: number | null = null;

      if (yeniCariUnvan) {
        const yeniCari = await tx.cari.create({
          data: {
            sirketId: sirket.id,
            unvan: yeniCariUnvan,
            tip: "SATICI",
          },
        });

        cariId = yeniCari.id;
      } else if (cariIdRaw) {
        const secilenId = Number(cariIdRaw);

        if (!Number.isInteger(secilenId) || secilenId <= 0) {
          throw new Error("Geçersiz cari seçimi.");
        }

        const cari = await tx.cari.findFirst({
          where: {
            id: secilenId,
            sirketId: sirket.id,
            aktif: true,
          },
        });

        if (!cari) {
          throw new Error("Seçilen cari bulunamadı.");
        }

        cariId = cari.id;
      }

      await tx.stok.update({
        where: { id: stok.id },
        data: {
          mevcutMiktar:
            hareketTipi === "GIRIS"
              ? { increment: miktar }
              : { decrement: miktar },
        },
      });

      await tx.stokHareket.create({
        data: {
          stokId: stok.id,
          tarih,
          giris: hareketTipi === "GIRIS" ? miktar : 0,
          cikis: hareketTipi === "CIKIS" ? miktar : 0,
          aciklama,
          belgeNo,
          cariId,
          birimFiyat,
          toplamTutar,
        },
      });

      if (
        cariId &&
        hareketTipi === "GIRIS" &&
        toplamTutar > 0
      ) {
        await tx.cariHareket.create({
          data: {
            cariId,
            tarih,
            tip: "BORC",
            aciklama: `Stok alış girişi: ${stok.ad} - ${aciklama}`,
            belgeNo,
            borc: toplamTutar,
            alacak: 0,
            islemTuru: "STOK_ALIS",
          },
        });
      }
    });

    revalidatePath("/hal");
    revalidatePath("/hal/stok");
    revalidatePath(`/hal/stok/${stok.id}`);
    revalidatePath(`/hal/stok/${stok.id}/hareket`);
    revalidatePath("/hal/yonetim/stok");

    redirect(`/hal/stok/${stok.id}`);
  }

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500";

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-3xl">
        <a
          href={`/hal/stok/${stok.id}`}
          className="text-sm text-cyan-400 hover:underline"
        >
          ← Stok detayına dön
        </a>

        <h1 className="mt-4 text-3xl font-bold">
          {stok.ad} — Stok hareketi
        </h1>

        <p className="mt-2 text-slate-400">
          Mevcut miktar: {number(Number(stok.mevcutMiktar))} {stok.birim}
        </p>

        {query.error && (
          <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-red-300">
            {query.error}
          </p>
        )}

        <form
          action={hareketKaydet}
          className="mt-6 space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-6"
        >
          <div>
            <label className="mb-2 block text-sm font-semibold">
              Hareket türü
            </label>
            <select name="tip" defaultValue={tip} className={inputClass}>
              <option value="GIRIS">Stok girişi / alış</option>
              <option value="CIKIS">Stok çıkışı</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Tarih
            </label>
            <input
              type="date"
              name="tarih"
              required
              defaultValue={new Date().toLocaleDateString("en-CA")}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Miktar ({stok.birim})
            </label>
            <input
              name="miktar"
              required
              inputMode="decimal"
              placeholder="Örn. 1250 veya 1250,500"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Birim alış fiyatı (TL)
            </label>
            <input
              name="birimFiyat"
              inputMode="decimal"
              placeholder="Örn. 12,50"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-slate-400">
              Fiyat girildiğinde toplam tutar miktar × birim fiyat olarak hesaplanır.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Mevcut cari / tedarikçi
            </label>
            <select name="cariId" defaultValue="" className={inputClass}>
              <option value="">Cari seçilmedi</option>
              {cariler.map((cari) => (
                <option key={cari.id} value={cari.id}>
                  {cari.unvan} ({cari.tip})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Yeni tedarikçi adı (isteğe bağlı)
            </label>
            <input
              name="yeniCariUnvan"
              placeholder="Yeni tedarikçi varsa adını yazın"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Belge numarası
            </label>
            <input
              name="belgeNo"
              placeholder="Fatura veya irsaliye no"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Açıklama
            </label>
            <textarea
              name="aciklama"
              rows={3}
              placeholder="İşlem açıklaması"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-cyan-500 px-5 py-3 font-bold text-slate-950 hover:bg-cyan-400"
          >
            Stok hareketini kaydet
          </button>
        </form>
      </div>
    </main>
  );
}
