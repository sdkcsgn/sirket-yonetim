import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type Props = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    tip?: string;
  }>;
};

function parseMiktar(
  value: FormDataEntryValue | null
) {
  const raw = String(value ?? "")
    .trim()
    .replace(/\./g, "")
    .replace(",", ".");

  const miktar = Number(raw);

  if (
    !Number.isFinite(miktar) ||
    miktar <= 0
  ) {
    throw new Error(
      "Geçerli bir miktar giriniz."
    );
  }

  return miktar;
}

export default async function StokHareketPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const query = await searchParams;

  const stokId = Number(id);

  if (
    !Number.isInteger(stokId) ||
    stokId <= 0
  ) {
    notFound();
  }

  const hareketTipi =
    query.tip === "CIKIS"
      ? "CIKIS"
      : "GIRIS";

  const stok =
    await prisma.stok.findUnique({
      where: {
        id: stokId,
      },

      include: {
        sirket: true,
      },
    });

  if (
    !stok ||
    stok.sirket.kod !== "BEACH"
  ) {
    notFound();
  }

  async function stokHareketKaydet(
    formData: FormData
  ) {
    "use server";

    const miktar = parseMiktar(
      formData.get("miktar")
    );

    const aciklama = String(
      formData.get("aciklama") ?? ""
    ).trim();

    const belgeNo = String(
      formData.get("belgeNo") ?? ""
    ).trim();

    const mevcutStok =
      await prisma.stok.findUnique({
        where: {
          id: stokId,
        },

        include: {
          sirket: true,
        },
      });

    if (
      !mevcutStok ||
      mevcutStok.sirket.kod !== "BEACH"
    ) {
      throw new Error(
        "Ürün bulunamadı."
      );
    }

    const mevcutMiktar = Number(
      mevcutStok.mevcutMiktar
    );

    if (
      hareketTipi === "CIKIS" &&
      miktar > mevcutMiktar
    ) {
      throw new Error(
        `Mevcut stok ${mevcutMiktar} ${mevcutStok.birim}. Bu miktardan daha fazla çıkış yapılamaz.`
      );
    }

    const yeniMiktar =
      hareketTipi === "GIRIS"
        ? mevcutMiktar + miktar
        : mevcutMiktar - miktar;

    await prisma.$transaction([
      prisma.stok.update({
        where: {
          id: mevcutStok.id,
        },

        data: {
          mevcutMiktar:
            yeniMiktar,
        },
      }),

      prisma.stokHareket.create({
        data: {
          stokId:
            mevcutStok.id,

          tarih:
            new Date(),

          giris:
            hareketTipi ===
            "GIRIS"
              ? miktar
              : 0,

          cikis:
            hareketTipi ===
            "CIKIS"
              ? miktar
              : 0,

          aciklama:
            aciklama ||
            (hareketTipi ===
            "GIRIS"
              ? "Manuel stok girişi"
              : "Manuel stok çıkışı"),

          belgeNo:
            belgeNo || null,
        },
      }),
    ]);

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

  const mevcutMiktar = Number(
    stok.mevcutMiktar
  );

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Ürün & Stok
            </p>

            <h1 className="mt-2 text-4xl font-black">
              {hareketTipi ===
              "GIRIS"
                ? "Stok Giriş"
                : "Stok Çıkış"}
            </h1>

            <p className="mt-2 text-slate-400">
              {stok.kod} -{" "}
              {stok.ad}
            </p>
          </div>

          <a
            href="/beach/yonetim/stok"
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 hover:bg-slate-900"
          >
            ← Ürün & Stok
          </a>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Mevcut Stok
            </p>

            <p className="mt-2 text-3xl font-black">
              {new Intl.NumberFormat(
                "tr-TR",
                {
                  maximumFractionDigits: 3,
                }
              ).format(
                mevcutMiktar
              )}{" "}
              {stok.birim}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Minimum Stok
            </p>

            <p className="mt-2 text-3xl font-black text-amber-400">
              {new Intl.NumberFormat(
                "tr-TR",
                {
                  maximumFractionDigits: 3,
                }
              ).format(
                Number(
                  stok.minimumStok
                )
              )}{" "}
              {stok.birim}
            </p>
          </div>
        </div>

        <form
          action={stokHareketKaydet}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8"
        >
          <div>
            <label className="mb-2 block text-sm font-semibold">
              {hareketTipi ===
              "GIRIS"
                ? "Giriş Miktarı"
                : "Çıkış Miktarı"}
            </label>

            <input
              name="miktar"
              required
              placeholder={`Örn: 10 ${stok.birim}`}
              className={
                inputClass
              }
            />
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-semibold">
              Belge No
            </label>

            <input
              name="belgeNo"
              placeholder="Varsa belge / sayım no"
              className={
                inputClass
              }
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
                hareketTipi ===
                "GIRIS"
                  ? "Örn: Sayım fazlası, devir stoğu..."
                  : "Örn: Fire, sayım düzeltmesi..."
              }
              className={
                inputClass
              }
            />
          </div>

          <div
            className={
              hareketTipi ===
              "GIRIS"
                ? "mt-6 rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-5"
                : "mt-6 rounded-xl border border-red-900/60 bg-red-950/20 p-5"
            }
          >
            <p className="font-bold">
              {hareketTipi ===
              "GIRIS"
                ? "Stok artacaktır."
                : "Stok azalacaktır."}
            </p>

            <p className="mt-2 text-sm text-slate-300">
              Bu işlem ayrıca stok
              hareket geçmişine
              kaydedilecektir.
            </p>
          </div>

          <button
            type="submit"
            className={
              hareketTipi ===
              "GIRIS"
                ? "mt-6 w-full rounded-xl bg-emerald-500 px-5 py-4 text-lg font-black text-slate-950 hover:bg-emerald-400"
                : "mt-6 w-full rounded-xl bg-red-500 px-5 py-4 text-lg font-black text-white hover:bg-red-400"
            }
          >
            {hareketTipi ===
              "GIRIS"
                ? "Stoğa Ekle"
                : "Stoktan Düş"}
          </button>
        </form>
      </div>
    </main>
  );
}