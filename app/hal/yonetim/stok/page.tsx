import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

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

export default async function StokDuzenlePage({
  params,
}: Props) {
  const { id } = await params;

  const stokId = Number(id);

  if (
    !Number.isInteger(stokId) ||
    stokId <= 0
  ) {
    notFound();
  }

  const stok = await prisma.stok.findUnique({
    where: {
      id: stokId,
    },

    include: {
      sirket: true,
    },
  });

  if (
    !stok ||
    stok.sirket.kod !== "HAL"
  ) {
    notFound();
  }
const sirketId = stok.sirketId;

  async function stokGuncelle(
    formData: FormData
  ) {
    "use server";

    const kod = String(
      formData.get("kod") ?? ""
    ).trim();

    const ad = String(
      formData.get("ad") ?? ""
    ).trim();

    const birim = String(
      formData.get("birim") ?? ""
    ).trim();

    const aktif =
      formData.get("aktif") === "on";

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

    const ayniKod = await prisma.stok.findFirst({
      where: {
        sirketId: sirketId,
        kod,
        NOT: {
          id: stokId,
        },
      },
    });

    if (ayniKod) {
      throw new Error(
        "Bu ürün koduyla başka bir ürün zaten kayıtlı."
      );
    }

    await prisma.stok.update({
      where: {
        id: stokId,
      },

      data: {
        kod,
        ad,

        kategori: text(
          formData,
          "kategori"
        ),

        birim,

        minimumStok:
          numberValue(
            formData,
            "minimumStok"
          ),

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

        depoBolumu:
          text(
            formData,
            "depoBolumu"
          ),

        aktif,
      },
    });

    revalidatePath(
      "/hal/yonetim/stok"
    );

    revalidatePath(
      "/hal/faturalar/yeni"
    );

    revalidatePath("/hal");

    redirect(
      "/hal/yonetim/stok"
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
              Ürün Düzenle
            </h1>

            <p className="mt-2 text-slate-400">
              {stok.kod} - {stok.ad}
            </p>
          </div>

          <a
            href="/hal/yonetim/stok"
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 hover:bg-slate-900"
          >
            ← Ürün & Stok
          </a>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
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
              Number(
                stok.mevcutMiktar
              )
            )}{" "}
            {stok.birim}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Mevcut stok miktarı bu ekrandan değiştirilmez.
            Stok Giriş / Stok Çıkış kullanılır.
          </p>
        </div>

        <form
          action={stokGuncelle}
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
                defaultValue={stok.kod}
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
                defaultValue={stok.ad}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Kategori
              </label>

              <input
                name="kategori"
                defaultValue={
                  stok.kategori ?? ""
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Birim
              </label>

              <select
                name="birim"
                defaultValue={stok.birim}
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
                Minimum Stok
              </label>

              <input
                name="minimumStok"
                defaultValue={String(
                  stok.minimumStok
                )}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Depo / Bölüm
              </label>

              <input
                name="depoBolumu"
                defaultValue={
                  stok.depoBolumu ?? ""
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Alış Fiyatı
              </label>

              <input
                name="alisFiyati"
                defaultValue={String(
                  stok.alisFiyati
                )}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Satış Fiyatı
              </label>

              <input
                name="satisFiyati"
                defaultValue={String(
                  stok.satisFiyati
                )}
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4">
                <input
                  type="checkbox"
                  name="aktif"
                  defaultChecked={stok.aktif}
                  className="h-5 w-5"
                />

                <div>
                  <p className="font-bold">
                    Ürün Aktif
                  </p>

                  <p className="text-sm text-slate-500">
                    Pasife alınırsa yeni faturaların ürün seçiminde
                    görünmez. Geçmiş hareketleri korunur.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2">
            <a
              href={`/hal/yonetim/stok/${stok.id}/hareket?tip=GIRIS`}
              className="rounded-xl border border-emerald-700 px-5 py-4 text-center font-black text-emerald-400 hover:bg-emerald-500/10"
            >
              + Stok Giriş
            </a>

            <a
              href={`/hal/yonetim/stok/${stok.id}/hareket?tip=CIKIS`}
              className="rounded-xl border border-red-700 px-5 py-4 text-center font-black text-red-400 hover:bg-red-500/10"
            >
              − Stok Çıkış
            </a>
          </div>

          <button
            type="submit"
            className="mt-4 w-full rounded-xl bg-cyan-500 px-5 py-4 text-lg font-black text-slate-950 hover:bg-cyan-400"
          >
            Değişiklikleri Kaydet
          </button>
        </form>
      </div>
    </main>
  );
}