import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type Props = {
  params: Promise<{
    id: string;
  }>;

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

function parseNumber(
  formData: FormData,
  name: string
) {
  const raw = String(
    formData.get(name) ?? ""
  )
    .trim()
    .replace(/\s/g, "");

  if (!raw) {
    return 0;
  }

  let normalized = raw;

  if (
    raw.includes(".") &&
    raw.includes(",")
  ) {
    normalized = raw
      .replace(/\./g, "")
      .replace(",", ".");
  } else if (raw.includes(",")) {
    normalized =
      raw.replace(",", ".");
  }

  const value =
    Number(normalized);

  return Number.isFinite(value)
    ? value
    : 0;
}

function parseDate(
  formData: FormData,
  name: string
) {
  const raw = String(
    formData.get(name) ?? ""
  ).trim();

  if (!raw) {
    return null;
  }

  const value =
    new Date(
      `${raw}T12:00:00`
    );

  return Number.isNaN(
    value.getTime()
  )
    ? null
    : value;
}

export default async function StokHareketPage({
  params,
  searchParams,
}: Props) {
  const { id } =
    await params;

  const query =
    await searchParams;

  const stokId =
    Number(id);

  if (
    !Number.isInteger(
      stokId
    ) ||
    stokId <= 0
  ) {
    notFound();
  }

  const tip =
    query.tip === "CIKIS"
      ? "CIKIS"
      : "GIRIS";

  const sirket =
    await prisma.sirket.findUnique({
      where: {
        kod: "HAL",
      },
    });

  if (!sirket) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Hal Komisyon & Soğuk Hava şirketi bulunamadı.
      </main>
    );
  }

  const stok =
    await prisma.stok.findFirst({
      where: {
        id: stokId,
        sirketId:
          sirket.id,
      },
    });

  if (!stok) {
    notFound();
  }

  /*
    ==================================================
    STOK HAREKETİ KAYDET
    ==================================================
  */

  async function hareketKaydet(
    formData: FormData
  ) {
    "use server";

    const sirket =
      await prisma.sirket.findUnique({
        where: {
          kod: "HAL",
        },
      });

    if (!sirket) {
      throw new Error(
        "Hal Komisyon & Soğuk Hava bulunamadı."
      );
    }

    const stok =
      await prisma.stok.findFirst({
        where: {
          id: stokId,
          sirketId:
            sirket.id,
        },
      });

    if (!stok) {
      throw new Error(
        "Stok bulunamadı."
      );
    }

    const hareketTipi =
      String(
        formData.get(
          "tip"
        ) ?? ""
      );

    if (
      hareketTipi !==
        "GIRIS" &&
      hareketTipi !==
        "CIKIS"
    ) {
      throw new Error(
        "Geçersiz hareket türü."
      );
    }

    const miktar =
      parseNumber(
        formData,
        "miktar"
      );

    if (miktar <= 0) {
      redirect(
        `/hal/stok/${stokId}/hareket?tip=${hareketTipi}&error=${encodeURIComponent(
          "Miktar sıfırdan büyük olmalıdır."
        )}`
      );
    }

    const tarih =
      parseDate(
        formData,
        "tarih"
      );

    if (!tarih) {
      redirect(
        `/hal/stok/${stokId}/hareket?tip=${hareketTipi}&error=${encodeURIComponent(
          "Tarih zorunludur."
        )}`
      );
    }

    const belgeNo =
      String(
        formData.get(
          "belgeNo"
        ) ?? ""
      ).trim() || null;

    const aciklama =
      String(
        formData.get(
          "aciklama"
        ) ?? ""
      ).trim() ||
      (
        hareketTipi ===
        "GIRIS"
          ? "Manuel stok girişi"
          : "Manuel stok çıkışı"
      );

    /*
      ÇIKIŞTA YETERSİZ STOK
      KONTROLÜ
    */

    if (
      hareketTipi ===
        "CIKIS" &&
      Number(
        stok.mevcutMiktar
      ) < miktar
    ) {
      redirect(
        `/hal/stok/${stokId}/hareket?tip=CIKIS&error=${encodeURIComponent(
          `Yetersiz stok. Mevcut: ${number(
            Number(
              stok.mevcutMiktar
            )
          )} ${stok.birim}`
        )}`
      );
    }

    await prisma.$transaction(
      async (tx) => {
        /*
          STOK MİKTARINI
          GÜNCELLE
        */

        if (
          hareketTipi ===
          "GIRIS"
        ) {
          await tx.stok.update({
            where: {
              id:
                stok.id,
            },

            data: {
              mevcutMiktar: {
                increment:
                  miktar,
              },
            },
          });
        } else {
          await tx.stok.update({
            where: {
              id:
                stok.id,
            },

            data: {
              mevcutMiktar: {
                decrement:
                  miktar,
              },
            },
          });
        }

        /*
          STOK HAREKETİ
          OLUŞTUR
        */

        await tx.stokHareket.create({
          data: {
            stokId:
              stok.id,

            tarih,

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

            belgeNo,

            aciklama,
          },
        });
      }
    );

    /*
      SAYFALARI YENİLE
    */

    revalidatePath(
      "/hal"
    );

    revalidatePath(
      "/hal/stok"
    );

    revalidatePath(
      `/hal/stok/${stok.id}`
    );

    revalidatePath(
      "/hal/yonetim/stok"
    );

    redirect(
      `/hal/stok/${stok.id}`
    );
  }

  const bugun =
    new Date()
      .toISOString()
      .slice(0, 10);

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500";

  const labelClass =
    "mb-2 block text-sm font-bold text-slate-300";

  const giris =
    tip === "GIRIS";

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">

        {/* BAŞLIK */}

        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

          <div>

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Hal Komisyon & Soğuk Hava
            </p>

            <h1 className="mt-2 text-3xl font-black md:text-4xl">

              {giris
                ? "Stok Girişi"
                : "Stok Çıkışı"}

            </h1>

            <p className="mt-2 text-slate-400">
              {stok.kod} - {stok.ad}
            </p>

          </div>

          <a
  href={`/hal/stok/${stok.id}`}
  className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-slate-900"
>
  ← Stok Detayı
</a>

        </div>

        {/* STOK BİLGİSİ */}

        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">

          <div className="grid gap-4 sm:grid-cols-3">

            <div>

              <p className="text-xs text-slate-500">
                Ürün
              </p>

              <p className="mt-1 font-black">
                {stok.ad}
              </p>

            </div>

            <div>

              <p className="text-xs text-slate-500">
                Mevcut Stok
              </p>

              <p
                className={`mt-1 text-xl font-black ${
                  Number(
                    stok.mevcutMiktar
                  ) > 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {number(
                  Number(
                    stok.mevcutMiktar
                  )
                )}{" "}
                {stok.birim}
              </p>

            </div>

            <div>

              <p className="text-xs text-slate-500">
                İşlem
              </p>

              <p
                className={`mt-1 font-black ${
                  giris
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {giris
                  ? "GİRİŞ"
                  : "ÇIKIŞ"}
              </p>

            </div>

          </div>

        </div>

        {/* GİRİŞ / ÇIKIŞ SEÇİMİ */}

        <div className="mb-5 grid grid-cols-2 gap-3">

          <a
            href={`/hal/stok/${stok.id}/hareket?tip=GIRIS`}
            className={`rounded-xl border px-5 py-4 text-center font-black transition ${
              giris
                ? "border-emerald-500 bg-emerald-950/20 text-emerald-400"
                : "border-slate-800 bg-slate-900 text-slate-400"
            }`}
          >
            + Stok Girişi
          </a>

          <a
            href={`/hal/stok/${stok.id}/hareket?tip=CIKIS`}
            className={`rounded-xl border px-5 py-4 text-center font-black transition ${
              !giris
                ? "border-red-500 bg-red-950/20 text-red-400"
                : "border-slate-800 bg-slate-900 text-slate-400"
            }`}
          >
            − Stok Çıkışı
          </a>

        </div>

        {/* HATA */}

        {query.error && (
          <div className="mb-5 rounded-xl border border-red-800 bg-red-950/30 p-4 font-semibold text-red-300">
            {query.error}
          </div>
        )}

        {/* FORM */}

        <form
          action={hareketKaydet}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8"
        >

          <input
            type="hidden"
            name="tip"
            value={tip}
          />

          <div className="grid gap-5 md:grid-cols-2">

            {/* TARİH */}

            <div>

              <label
                className={
                  labelClass
                }
              >
                Tarih *
              </label>

              <input
                type="date"
                name="tarih"
                defaultValue={
                  bugun
                }
                required
                className={
                  inputClass
                }
              />

            </div>

            {/* MİKTAR */}

            <div>

              <label
                className={
                  labelClass
                }
              >
                Miktar *
              </label>

              <input
                name="miktar"
                required
                inputMode="decimal"
                placeholder={`Örn: 10 ${stok.birim}`}
                className={
                  inputClass
                }
              />

              <p className="mt-2 text-xs text-slate-500">
                Birim: {stok.birim}
              </p>

            </div>

            {/* BELGE NO */}

            <div className="md:col-span-2">

              <label
                className={
                  labelClass
                }
              >
                Belge No
              </label>

              <input
                name="belgeNo"
                placeholder="Varsa fiş, irsaliye veya belge numarası"
                className={
                  inputClass
                }
              />

            </div>

            {/* AÇIKLAMA */}

            <div className="md:col-span-2">

              <label
                className={
                  labelClass
                }
              >
                Açıklama
              </label>

              <textarea
                name="aciklama"
                rows={3}
                placeholder={
                  giris
                    ? "Örn: Depoya manuel ürün girişi"
                    : "Örn: Sayım farkı / fire / manuel çıkış"
                }
                className={
                  inputClass
                }
              />

            </div>

          </div>

          {/* BİLGİ */}

          <div
            className={`mt-6 rounded-xl border p-4 ${
              giris
                ? "border-emerald-900/50 bg-emerald-950/10"
                : "border-red-900/50 bg-red-950/10"
            }`}
          >

            <p
              className={`font-black ${
                giris
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {giris
                ? "Stok artacak"
                : "Stok azalacak"}
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-400">

              {giris
                ? "Kaydettiğiniz miktar mevcut stoğa eklenecek ve manuel stok giriş hareketi oluşturulacak."
                : "Kaydettiğiniz miktar mevcut stoktan düşülecek ve manuel stok çıkış hareketi oluşturulacak."}

            </p>

          </div>

          {/* BUTONLAR */}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">

            <button
              type="submit"
              className={`flex-1 rounded-xl px-6 py-4 text-lg font-black transition ${
                giris
                  ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                  : "bg-red-600 text-white hover:bg-red-500"
              }`}
            >
              {giris
                ? "Stok Girişini Kaydet"
                : "Stok Çıkışını Kaydet"}
            </button>

            <a
              href={`/hal/stok/${stok.id}`}
              className="rounded-xl border border-slate-700 px-6 py-4 text-center font-bold text-slate-300 hover:bg-slate-800"
            >
              Vazgeç
            </a>

          </div>

        </form>

      </div>

    </main>
  );
}