import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function FinansHesapDuzenlePage({
  params,
}: Props) {
  const { id } = await params;

  const hesapId = Number(id);

  if (!Number.isInteger(hesapId) || hesapId <= 0) {
    notFound();
  }

  const hesap = await prisma.finansHesap.findUnique({
    where: {
      id: hesapId,
    },

    include: {
      sirket: true,
    },
  });

  if (!hesap || hesap.sirket.kod !== "BEACH") {
    notFound();
  }

  async function finansHesapGuncelle(
    formData: FormData
  ) {
    "use server";

    const ad = String(
      formData.get("ad") ?? ""
    ).trim();

    const tip = String(
      formData.get("tip") ?? ""
    ).trim();

    const paraBirimi = String(
      formData.get("paraBirimi") ?? ""
    ).trim();

    const bankaAdi = String(
      formData.get("bankaAdi") ?? ""
    ).trim();

    const iban = String(
      formData.get("iban") ?? ""
    ).trim();

    const hesapNo = String(
      formData.get("hesapNo") ?? ""
    ).trim();

    const aktif =
      formData.get("aktif") === "on";

    if (!ad) {
      throw new Error(
        "Hesap adı zorunludur."
      );
    }

    if (
      ![
        "KASA",
        "BANKA",
        "KREDI_KARTI",
      ].includes(tip)
    ) {
      throw new Error(
        "Geçersiz hesap türü."
      );
    }

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

    const mevcutHesap =
      await prisma.finansHesap.findUnique({
        where: {
          id: hesapId,
        },

        include: {
          sirket: true,
        },
      });

    if (
      !mevcutHesap ||
      mevcutHesap.sirket.kod !== "BEACH"
    ) {
      throw new Error(
        "Finans hesabı bulunamadı."
      );
    }

    await prisma.finansHesap.update({
      where: {
        id: hesapId,
      },

      data: {
        ad,

        tip:
          tip as
            | "KASA"
            | "BANKA"
            | "KREDI_KARTI",

        paraBirimi:
          paraBirimi as
            | "TRY"
            | "USD"
            | "EUR"
            | "GBP"
            | "RUB",

        bankaAdi:
          tip === "KASA"
            ? null
            : bankaAdi || null,

        iban:
          tip === "BANKA"
            ? iban || null
            : null,

        hesapNo:
          hesapNo || null,

        aktif,
      },
    });

    revalidatePath("/beach");
    revalidatePath("/beach/kasa-banka");
    revalidatePath(
      "/beach/yonetim/finans"
    );

    redirect(
      "/beach/yonetim/finans"
    );
  }

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Yönetim Paneli
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Finans Hesabı Düzenle
            </h1>

            <p className="mt-2 text-slate-400">
              {hesap.ad}
            </p>
          </div>

          <a
            href="/beach/yonetim/finans"
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 hover:bg-slate-900"
          >
            ← Finans Hesapları
          </a>
        </div>

        <form
          action={finansHesapGuncelle}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold">
                Hesap Adı
              </label>

              <input
                name="ad"
                required
                defaultValue={hesap.ad}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Hesap Türü
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
                  Kredi Kartı / POS
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
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
                  TRY
                </option>

                <option value="USD">
                  USD
                </option>

                <option value="EUR">
                  EUR
                </option>

                <option value="GBP">
                  GBP
                </option>

                <option value="RUB">
                  RUB
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Banka Adı
              </label>

              <input
                name="bankaAdi"
                defaultValue={
                  hesap.bankaAdi ?? ""
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Hesap No
              </label>

              <input
                name="hesapNo"
                defaultValue={
                  hesap.hesapNo ?? ""
                }
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold">
                IBAN
              </label>

              <input
                name="iban"
                defaultValue={
                  hesap.iban ?? ""
                }
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

                <div>
                  <p className="font-bold">
                    Hesap Aktif
                  </p>

                  <p className="text-sm text-slate-500">
                    Pasife alınırsa yeni işlemlerde
                    görünmez. Geçmiş hareketleri
                    korunur.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="mt-8 w-full rounded-xl bg-cyan-500 px-5 py-4 text-lg font-black text-slate-950 hover:bg-cyan-400"
          >
            Değişiklikleri Kaydet
          </button>
        </form>
      </div>
    </main>
  );
}