import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

const SIRKET_KODU = "BEACH";
const SIRKET_ADI = "Beach & Mağaza";
const BASE_PATH = "/beach";

export default async function FinansHesapDuzenlePage({
  params,
}: Props) {
  const { id } = await params;
  const hesapId = Number(id);

  if (!Number.isInteger(hesapId) || hesapId <= 0) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Geçersiz hesap.
      </main>
    );
  }

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

  const hesap = await prisma.finansHesap.findFirst({
    where: {
      id: hesapId,
      sirketId: sirket.id,
    },
  });

  if (!hesap) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Finans hesabı bulunamadı.
      </main>
    );
  }

  async function hesapGuncelle(formData: FormData) {
    "use server";

    const sirket = await prisma.sirket.findUnique({
      where: {
        kod: SIRKET_KODU,
      },
    });

    if (!sirket) {
      throw new Error(`${SIRKET_ADI} bulunamadı.`);
    }

    const hesapId = Number(formData.get("hesapId"));

    if (!Number.isInteger(hesapId) || hesapId <= 0) {
      throw new Error("Geçersiz hesap.");
    }

    const mevcut = await prisma.finansHesap.findFirst({
      where: {
        id: hesapId,
        sirketId: sirket.id,
      },
    });

    if (!mevcut) {
      throw new Error("Hesap bulunamadı.");
    }

    const ad = String(formData.get("ad") ?? "").trim();
    const paraBirimi = String(
      formData.get("paraBirimi") ?? "TRY"
    ) as "TRY" | "USD" | "EUR" | "GBP" | "RUB";

    const bankaAdi =
      String(formData.get("bankaAdi") ?? "").trim() || null;

    const iban =
      String(formData.get("iban") ?? "").trim() || null;

    const hesapNo =
      String(formData.get("hesapNo") ?? "").trim() || null;

    const aktif =
      String(formData.get("aktif") ?? "") === "true";

    if (!ad) {
      throw new Error("Hesap adı zorunludur.");
    }

    await prisma.finansHesap.update({
      where: {
        id: mevcut.id,
      },
      data: {
        ad,
        paraBirimi,
        bankaAdi:
          mevcut.tip === "BANKA" ? bankaAdi : null,
        iban:
          mevcut.tip === "BANKA" ? iban : null,
        hesapNo,
        aktif,
      },
    });

    revalidatePath(BASE_PATH);
    revalidatePath(`${BASE_PATH}/kasa`);
    revalidatePath(`${BASE_PATH}/banka`);
    revalidatePath(`${BASE_PATH}/kasa-banka`);

    redirect(
      mevcut.tip === "KASA"
        ? `${BASE_PATH}/kasa`
        : `${BASE_PATH}/banka`
    );
  }

  const geriDon =
    hesap.tip === "KASA"
      ? `${BASE_PATH}/kasa`
      : `${BASE_PATH}/banka`;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
            {SIRKET_ADI}
          </p>

          <h1 className="mt-2 text-4xl font-black">
            {hesap.tip === "KASA"
              ? "Kasa Düzenle"
              : "Banka Hesabı Düzenle"}
          </h1>

          <p className="mt-2 text-slate-400">
            Hesap bilgilerini değiştirebilirsiniz.
            Bakiye burada değiştirilmez; kasa/banka
            hareketlerinden hesaplanmaya devam eder.
          </p>
        </div>

        <form
          action={hesapGuncelle}
          className="rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8"
        >
          <input
            type="hidden"
            name="hesapId"
            value={hesap.id}
          />

          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-bold text-slate-300">
                Hesap Adı *
              </label>

              <input
                name="ad"
                required
                defaultValue={hesap.ad}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">
                Hesap Türü
              </label>

              <input
                value={
                  hesap.tip === "KASA"
                    ? "Kasa"
                    : hesap.tip === "BANKA"
                    ? "Banka"
                    : "Kredi Kartı"
                }
                disabled
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">
                Para Birimi
              </label>

              <select
                name="paraBirimi"
                defaultValue={hesap.paraBirimi}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
              >
                <option value="TRY">TRY</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="RUB">RUB</option>
              </select>
            </div>

            {hesap.tip === "BANKA" && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-300">
                    Banka Adı
                  </label>

                  <input
                    name="bankaAdi"
                    defaultValue={hesap.bankaAdi ?? ""}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-300">
                    IBAN
                  </label>

                  <input
                    name="iban"
                    defaultValue={hesap.iban ?? ""}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">
                Hesap No
              </label>

              <input
                name="hesapNo"
                defaultValue={hesap.hesapNo ?? ""}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">
                Durum
              </label>

              <select
                name="aktif"
                defaultValue={hesap.aktif ? "true" : "false"}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
              >
                <option value="true">Aktif</option>
                <option value="false">Pasif</option>
              </select>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-slate-800 pt-6">
            <a
              href={geriDon}
              className="rounded-xl border border-slate-700 px-6 py-3 font-bold text-slate-300 transition hover:bg-slate-800"
            >
              Vazgeç
            </a>

            <button
              type="submit"
              className="rounded-xl bg-amber-500 px-7 py-3 font-black text-slate-950 transition hover:bg-amber-400"
            >
              Değişiklikleri Kaydet
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
