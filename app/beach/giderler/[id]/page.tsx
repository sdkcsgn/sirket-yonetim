import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { giderSil } from "./actions";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function date(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function giderTipiAdi(tip: string) {
  switch (tip) {
    case "ELEKTRIK":
      return "Elektrik";
    case "SU":
      return "Su";
    case "PERSONEL":
      return "Personel";
    case "NAKLIYE":
      return "Nakliye";
    case "KIRA":
      return "Kira";
    case "YAKIT":
      return "Yakıt";
    case "BAKIM_ONARIM":
      return "Bakım / Onarım";
    case "MUHASEBE":
      return "Muhasebe";
    case "KOMISYON":
      return "Komisyon";
    case "VERGI_HARC":
      return "Vergi / Harç";
    case "TELEFON_INTERNET":
      return "Telefon / İnternet";
    case "NOTER":
      return "Noter";
    case "ODA_AIDAT":
      return "Oda Aidatı";
    case "DIGER_ARAC_GIDERLERI":
      return "Diğer Araç Giderleri";
    case "MARKET":
      return "Market";
    case "ORTULU_ODENEK":
      return "Örtülü Ödenek";
    case "DIGER":
      return "Diğer";
    default:
      return tip;
  }
}

export default async function GiderDetayPage({
  params,
}: Props) {
  const { id } = await params;

  const giderId = Number(id);

  if (!Number.isInteger(giderId)) {
    notFound();
  }

  const gider =
    await prisma.gider.findUnique({
      where: {
        id: giderId,
      },

      include: {
        cari: true,
        finansHesap: true,
      },
    });

  if (!gider) {
    notFound();
  }

  const giderSilAction =
    giderSil.bind(null, gider.id);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Beach & Mağaza
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Gider Detayı
            </h1>

            <p className="mt-2 text-slate-400">
              {giderTipiAdi(gider.tip)}
            </p>
          </div>

          <a
            href="/beach/giderler"
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 hover:bg-slate-900"
          >
            ← Gider Listesi
          </a>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Tutar
            </p>

            <p className="mt-3 text-3xl font-black text-red-400">
              {money(Number(gider.tutar))}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Tarih
            </p>

            <p className="mt-3 text-2xl font-black">
              {date(gider.tarih)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Gider Tipi
            </p>

            <p className="mt-3 text-2xl font-black text-cyan-400">
              {giderTipiAdi(gider.tip)}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">
              Gider Bilgileri
            </h2>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">
                  Açıklama
                </p>

                <p className="mt-1 font-semibold">
                  {gider.aciklama}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Cari
                </p>

                <p className="mt-1 font-semibold">
                  {gider.cari?.unvan || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Kasa / Banka
                </p>

                <p className="mt-1 font-semibold">
                  {gider.finansHesap
                    ? `${
                        gider.finansHesap.tip === "KASA"
                          ? "Kasa"
                          : "Banka"
                      } - ${gider.finansHesap.ad}`
                    : "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Belge No
                </p>

                <p className="mt-1 font-semibold">
                  {gider.belgeNo || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Fatura No
                </p>

                <p className="mt-1 font-semibold">
                  {gider.faturaNo || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Kayıt Tarihi
                </p>

                <p className="mt-1 font-semibold">
                  {date(gider.createdAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {gider.finansHesap && (
              <div className="rounded-2xl border border-red-900/50 bg-slate-900 p-6">
                <p className="text-sm text-slate-400">
                  Finans Etkisi
                </p>

                <p className="mt-2 text-xl font-black text-red-400">
                  -{money(Number(gider.tutar))}
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  {gider.finansHesap.ad} hesabından çıkış işlendi.
                </p>
              </div>
            )}

            {gider.cari && (
              <div className="rounded-2xl border border-emerald-900/50 bg-slate-900 p-6">
                <p className="text-sm text-slate-400">
                  Cari Etkisi
                </p>

                <p className="mt-2 text-xl font-black text-emerald-400">
                  +{money(Number(gider.tutar))} Alacak
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  {gider.cari.unvan} cari hesabına alacak olarak işlendi.
                </p>

                <a
                  href={`/beach/cariler/${gider.cari.id}`}
                  className="mt-4 inline-block text-sm font-bold text-cyan-400 hover:text-cyan-300"
                >
                  Cari Hareketleri Gör →
                </a>
              </div>
            )}

            <form
              action={giderSilAction}
              className="rounded-2xl border border-red-900/60 bg-red-950/10 p-6"
            >
              <h2 className="text-xl font-black text-red-400">
                Gider Kaydını Sil
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Gider silindiğinde varsa kasa / banka ve cari etkisi
                ters kayıt ile otomatik olarak düzeltilir.
              </p>

              <button
                type="submit"
                className="mt-5 w-full rounded-xl bg-red-600 px-5 py-3 font-black text-white hover:bg-red-500"
              >
                Gider Kaydını Sil
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}