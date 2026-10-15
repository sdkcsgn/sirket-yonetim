import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type FinansTipi = "KASA" | "BANKA" | "KREDI_KARTI";

type ParaBirimi =
  | "TRY"
  | "USD"
  | "EUR"
  | "GBP"
  | "RUB";

export default async function FinansHesapDuzenlePage({
  params,
}: Props) {
  const { id } = await params;

  const hesapId = Number(id);

  if (
    !Number.isInteger(hesapId) ||
    hesapId <= 0
  ) {
    notFound();
  }

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

  const hesap =
    await prisma.finansHesap.findFirst({
      where: {
        id: hesapId,
        sirketId: sirket.id,
      },
    });

  if (!hesap) {
    notFound();
  }

  const hesapTipi = hesap.tip;

  const geriDonus =
    hesapTipi === "KASA"
      ? "/hal/kasa"
      : hesapTipi === "BANKA"
      ? "/hal/banka"
      : "/hal/kasa-banka";

  async function hesapGuncelle(
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

    const mevcutHesap =
      await prisma.finansHesap.findFirst({
        where: {
          id: hesapId,
          sirketId: sirket.id,
        },
      });

    if (!mevcutHesap) {
      throw new Error(
        "Finans hesabı bulunamadı."
      );
    }

    const ad = String(
      formData.get("ad") ?? ""
    ).trim();

    if (!ad) {
      throw new Error(
        "Hesap adı zorunludur."
      );
    }

    const tip = String(
      formData.get("tip") ??
        mevcutHesap.tip
    ) as FinansTipi;

    if (
      ![
        "KASA",
        "BANKA",
        "KREDI_KARTI",
      ].includes(tip)
    ) {
      throw new Error(
        "Geçersiz hesap tipi."
      );
    }

    const paraBirimi = String(
      formData.get("paraBirimi") ??
        mevcutHesap.paraBirimi
    ) as ParaBirimi;

    if (
      ![
        "TRY",
        "USD",
        "EUR",
        "GBP",
        "RUB",
      ].includes(paraBirimi)
    ) {
      throw new Error(
        "Geçersiz para birimi."
      );
    }

    const bankaAdi =
      tip === "BANKA" ||
      tip === "KREDI_KARTI"
        ? String(
            formData.get("bankaAdi") ??
              ""
          ).trim() || null
        : null;

    const iban =
      tip === "BANKA"
        ? String(
            formData.get("iban") ?? ""
          ).trim() || null
        : null;

    const hesapNo =
      tip === "BANKA" ||
      tip === "KREDI_KARTI"
        ? String(
            formData.get("hesapNo") ??
              ""
          ).trim() || null
        : null;

    const aktif =
      formData.get("aktif") === "on";

    await prisma.finansHesap.update({
      where: {
        id: mevcutHesap.id,
      },

      data: {
        ad,
        tip,
        paraBirimi,
        bankaAdi,
        iban,
        hesapNo,
        aktif,
      },
    });

    revalidatePath("/hal");
    revalidatePath("/hal/kasa");
    revalidatePath("/hal/banka");
    revalidatePath("/hal/kasa-banka");

    if (tip === "KASA") {
      redirect("/hal/kasa");
    }

    if (tip === "BANKA") {
      redirect("/hal/banka");
    }

    redirect("/hal/kasa-banka");
  }

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500";

  const labelClass =
    "mb-2 block text-sm font-bold text-slate-300";

  const baslik =
    hesap.tip === "KASA"
      ? "Kasa Düzenle"
      : hesap.tip === "BANKA"
      ? "Banka Düzenle"
      : "Kredi Kartı Hesabı Düzenle";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Hal Komisyon & Soğuk Hava
            </p>

            <h1 className="mt-2 text-4xl font-black">
              {baslik}
            </h1>

            <p className="mt-2 text-slate-400">
              Finans hesabı bilgilerini
              güncelleyin.
            </p>
          </div>

          <a
            href={geriDonus}
            className="rounded-xl border border-slate-700 px-5 py-3 text-center font-semibold text-slate-300 transition hover:bg-slate-900"
          >
            ← Geri Dön
          </a>
        </div>

        <form
          action={hesapGuncelle}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={labelClass}>
                Hesap Adı *
              </label>

              <input
                name="ad"
                required
                defaultValue={hesap.ad}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Hesap Tipi
              </label>

              <select
                name="tip"
                defaultValue={hesap.tip}
                className={inputClass}
              >
                <option value="KASA">
                  Kasa
                </option>

                <option value="BANKA">
                  Banka
                </option>

                <option value="KREDI_KARTI">
                  Kredi Kartı
                </option>
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Para Birimi
              </label>

              <select
                name="paraBirimi"
                defaultValue={
                  hesap.paraBirimi
                }
                className={inputClass}
              >
                <option value="TRY">
                  TRY - Türk Lirası
                </option>

                <option value="USD">
                  USD - Dolar
                </option>

                <option value="EUR">
                  EUR - Euro
                </option>

                <option value="GBP">
                  GBP - Sterlin
                </option>

                <option value="RUB">
                  RUB - Ruble
                </option>
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Banka Adı
              </label>

              <input
                name="bankaAdi"
                defaultValue={
                  hesap.bankaAdi ?? ""
                }
                placeholder={
                  hesap.tip === "KASA"
                    ? "Kasa için boş bırakabilirsiniz"
                    : "Örn: Ziraat Bankası"
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Hesap No
              </label>

              <input
                name="hesapNo"
                defaultValue={
                  hesap.hesapNo ?? ""
                }
                placeholder="Varsa"
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>
                IBAN
              </label>

              <input
                name="iban"
                defaultValue={
                  hesap.iban ?? ""
                }
                placeholder="TR..."
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4">
                <input
                  type="checkbox"
                  name="aktif"
                  defaultChecked={
                    hesap.aktif
                  }
                  className="h-5 w-5"
                />

                <span>
                  <span className="block font-bold">
                    Hesap aktif
                  </span>

                  <span className="mt-1 block text-xs text-slate-500">
                    Pasif hesaplar yeni
                    işlemlerde gösterilmez.
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-cyan-500 px-6 py-4 text-lg font-black text-slate-950 transition hover:bg-cyan-400"
            >
              Değişiklikleri Kaydet
            </button>

            <a
              href={geriDonus}
              className="rounded-xl border border-slate-700 px-6 py-4 text-center font-bold text-slate-300 transition hover:bg-slate-800"
            >
              Vazgeç
            </a>
          </div>
        </form>

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="font-bold text-slate-300">
            Mevcut hesap türü:
          </p>

          <p className="mt-2 text-lg font-black text-cyan-400">
            {hesap.tip === "KASA"
              ? "Kasa"
              : hesap.tip === "BANKA"
              ? "Banka"
              : "Kredi Kartı"}
          </p>
        </div>
      </div>
    </main>
  );
}