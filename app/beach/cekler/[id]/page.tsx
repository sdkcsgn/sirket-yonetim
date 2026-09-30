import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

import {
  bankayaVer,
  tahsilEt,
  odendi,
  ciroEt,
  karsiliksizYap,
  iptalEt,
  cekSil,
} from "./actions";

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

function durumAdi(durum: string) {
  switch (durum) {
    case "PORTFOYDE":
      return "Portföyde";

    case "BANKADA":
      return "Bankada";

    case "CIROLANDI":
      return "Cirolandı";

    case "TAHSIL_EDILDI":
      return "Tahsil Edildi";

    case "ODENDI":
      return "Ödendi";

    case "KARSILIKSIZ":
      return "Karşılıksız";

    case "IPTAL":
      return "İptal";

    default:
      return durum;
  }
}

function durumClass(durum: string) {
  switch (durum) {
    case "PORTFOYDE":
      return "text-cyan-400";

    case "BANKADA":
      return "text-blue-400";

    case "CIROLANDI":
      return "text-violet-400";

    case "TAHSIL_EDILDI":
      return "text-emerald-400";

    case "ODENDI":
      return "text-emerald-400";

    case "KARSILIKSIZ":
      return "text-amber-400";

    case "IPTAL":
      return "text-red-400";

    default:
      return "text-white";
  }
}

export default async function CekDetayPage({
  params,
}: Props) {
  const { id } = await params;

  const cekId = Number(id);

  if (!Number.isInteger(cekId)) {
    notFound();
  }

  const cek =
    await prisma.cek.findUnique({
      where: {
        id: cekId,
      },

      include: {
        cari: true,
        bankaHesabi: true,
      },
    });

  if (!cek) {
    notFound();
  }

  const [bankaHesaplari, cariler] =
    await Promise.all([
      prisma.finansHesap.findMany({
        where: {
          sirketId: cek.sirketId,
          tip: "BANKA",
          aktif: true,
        },

        orderBy: {
          ad: "asc",
        },
      }),

      prisma.cari.findMany({
        where: {
          sirketId: cek.sirketId,
          aktif: true,
        },

        orderBy: {
          unvan: "asc",
        },
      }),
    ]);

  let ciroCari = null;

  if (cek.ciroCariId) {
    ciroCari =
      await prisma.cari.findUnique({
        where: {
          id: cek.ciroCariId,
        },
      });
  }

  const bankayaVerAction =
    bankayaVer.bind(null, cek.id);

  const tahsilEtAction =
    tahsilEt.bind(null, cek.id);

  const odendiAction =
    odendi.bind(null, cek.id);

  const ciroEtAction =
    ciroEt.bind(null, cek.id);

  const karsiliksizAction =
    karsiliksizYap.bind(null, cek.id);

  const iptalAction =
    iptalEt.bind(null, cek.id);

  const cekSilAction =
    cekSil.bind(null, cek.id);

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500";

  const silinebilir =
    !cek.bankaIslendi &&
    cek.durum !== "TAHSIL_EDILDI" &&
    cek.durum !== "ODENDI";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Beach & Mağaza
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Çek Detayı
            </h1>

            <p className="mt-2 text-slate-400">
              {cek.tip === "ALINAN"
                ? "Alınan Çek"
                : "Verilen Çek"}
            </p>
          </div>

          <a
            href="/beach/cekler"
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 hover:bg-slate-900"
          >
            ← Çek Listesi
          </a>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Tutar
            </p>

            <p
              className={`mt-3 text-3xl font-black ${
                cek.tip === "ALINAN"
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {money(Number(cek.tutar))}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Vade Tarihi
            </p>

            <p className="mt-3 text-2xl font-black">
              {date(cek.vadeTarihi)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Durum
            </p>

            <p
              className={`mt-3 text-2xl font-black ${durumClass(
                cek.durum
              )}`}
            >
              {durumAdi(cek.durum)}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold">
              Çek Bilgileri
            </h2>

            <div className="mt-6 space-y-5">
              <div>
                <p className="text-sm text-slate-500">
                  Cari
                </p>

                <p className="mt-1 font-semibold">
                  {cek.cari?.unvan || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Çek No
                </p>

                <p className="mt-1 font-semibold">
                  {cek.cekNo || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Çekin Bankası
                </p>

                <p className="mt-1 font-semibold">
                  {cek.banka || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Şube
                </p>

                <p className="mt-1 font-semibold">
                  {cek.sube || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Hesap No
                </p>

                <p className="mt-1 font-semibold">
                  {cek.hesapNo || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Keşideci
                </p>

                <p className="mt-1 font-semibold">
                  {cek.kesideci || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Banka Hesabı
                </p>

                <p className="mt-1 font-semibold">
                  {cek.bankaHesabi?.ad || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Ciro Edilen Cari
                </p>

                <p className="mt-1 font-semibold text-violet-400">
                  {ciroCari?.unvan || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Cari İşlendi
                </p>

                <p className="mt-1 font-semibold">
                  {cek.cariIslendi
                    ? "Evet"
                    : "Hayır"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Banka İşlendi
                </p>

                <p className="mt-1 font-semibold">
                  {cek.bankaIslendi
                    ? "Evet"
                    : "Hayır"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Ciro Cari İşlendi
                </p>

                <p className="mt-1 font-semibold">
                  {cek.ciroCariIslendi
                    ? "Evet"
                    : "Hayır"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Açıklama
                </p>

                <p className="mt-1 whitespace-pre-line font-semibold">
                  {cek.aciklama || "-"}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {cek.tip === "ALINAN" &&
              cek.durum === "PORTFOYDE" &&
              !cek.ciroCariIslendi &&
              !cek.bankaIslendi && (
                <form
                  action={ciroEtAction}
                  className="rounded-2xl border border-violet-900/60 bg-slate-900 p-6"
                >
                  <h2 className="text-xl font-black text-violet-400">
                    Çeki Ciro Et
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Çeki başka bir cariye verdiğinizde
                    seçilen cariye ödeme hareketi
                    otomatik işlenir.
                  </p>

                  <select
                    name="ciroCariId"
                    required
                    defaultValue=""
                    className={`${inputClass} mt-5`}
                  >
                    <option value="">
                      Ciro edilecek cariyi seçiniz
                    </option>

                    {cariler.map((cari) => (
                      <option
                        key={cari.id}
                        value={cari.id}
                      >
                        {cari.unvan}
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    className="mt-4 w-full rounded-xl bg-violet-500 px-5 py-3 font-black text-white"
                  >
                    Çeki Ciro Et
                  </button>
                </form>
              )}

            {cek.tip === "ALINAN" &&
              cek.durum === "PORTFOYDE" &&
              !cek.ciroCariIslendi && (
                <form
                  action={bankayaVerAction}
                  className="rounded-2xl border border-blue-900/60 bg-slate-900 p-6"
                >
                  <h2 className="text-xl font-black text-blue-400">
                    Bankaya Ver
                  </h2>

                  <select
                    name="bankaHesabiId"
                    required
                    defaultValue=""
                    className={`${inputClass} mt-5`}
                  >
                    <option value="">
                      Banka hesabı seçiniz
                    </option>

                    {bankaHesaplari.map(
                      (hesap) => (
                        <option
                          key={hesap.id}
                          value={hesap.id}
                        >
                          {hesap.ad}
                        </option>
                      )
                    )}
                  </select>

                  <button
                    type="submit"
                    className="mt-4 w-full rounded-xl bg-blue-500 px-5 py-3 font-black text-white"
                  >
                    Bankaya Ver
                  </button>
                </form>
              )}

            {cek.tip === "ALINAN" &&
              !cek.bankaIslendi &&
              !cek.ciroCariIslendi &&
              (cek.durum === "PORTFOYDE" ||
                cek.durum === "BANKADA") && (
                <form
                  action={tahsilEtAction}
                  className="rounded-2xl border border-emerald-900/60 bg-slate-900 p-6"
                >
                  <h2 className="text-xl font-black text-emerald-400">
                    Çeki Tahsil Et
                  </h2>

                  <select
                    name="bankaHesabiId"
                    required
                    defaultValue={
                      cek.bankaHesabiId?.toString() ||
                      ""
                    }
                    className={`${inputClass} mt-5`}
                  >
                    <option value="">
                      Tahsilat bankasını seçiniz
                    </option>

                    {bankaHesaplari.map(
                      (hesap) => (
                        <option
                          key={hesap.id}
                          value={hesap.id}
                        >
                          {hesap.ad}
                        </option>
                      )
                    )}
                  </select>

                  <button
                    type="submit"
                    className="mt-4 w-full rounded-xl bg-emerald-500 px-5 py-3 font-black text-slate-950"
                  >
                    Tahsil Edildi
                  </button>
                </form>
              )}

            {cek.tip === "VERILEN" &&
              !cek.bankaIslendi &&
              cek.durum !== "ODENDI" &&
              cek.durum !== "IPTAL" && (
                <form
                  action={odendiAction}
                  className="rounded-2xl border border-red-900/60 bg-slate-900 p-6"
                >
                  <h2 className="text-xl font-black text-red-400">
                    Çek Ödendi
                  </h2>

                  <select
                    name="bankaHesabiId"
                    required
                    defaultValue=""
                    className={`${inputClass} mt-5`}
                  >
                    <option value="">
                      Ödeme bankasını seçiniz
                    </option>

                    {bankaHesaplari.map(
                      (hesap) => (
                        <option
                          key={hesap.id}
                          value={hesap.id}
                        >
                          {hesap.ad}
                        </option>
                      )
                    )}
                  </select>

                  <button
                    type="submit"
                    className="mt-4 w-full rounded-xl bg-red-500 px-5 py-3 font-black text-white"
                  >
                    Ödendi
                  </button>
                </form>
              )}

            {cek.durum === "CIROLANDI" && (
              <div className="rounded-2xl border border-violet-900/60 bg-violet-950/20 p-6">
                <h2 className="text-xl font-black text-violet-400">
                  Çek Ciro Edildi
                </h2>

                <p className="mt-3 text-sm text-slate-400">
                  Ciro edilen cari:
                </p>

                <p className="mt-1 text-lg font-black">
                  {ciroCari?.unvan || "-"}
                </p>
              </div>
            )}

            {cek.tip === "ALINAN" &&
              !cek.bankaIslendi &&
              cek.durum !== "TAHSIL_EDILDI" &&
              cek.durum !== "IPTAL" &&
              cek.durum !== "KARSILIKSIZ" && (
                <form
                  action={karsiliksizAction}
                  className="rounded-2xl border border-amber-900/60 bg-slate-900 p-6"
                >
                  <h2 className="text-xl font-black text-amber-400">
                    Karşılıksız
                  </h2>

                  <button
                    type="submit"
                    className="mt-4 w-full rounded-xl border border-amber-700 px-5 py-3 font-bold text-amber-400"
                  >
                    Karşılıksız İşaretle
                  </button>
                </form>
              )}

            {!cek.bankaIslendi &&
              cek.durum !== "IPTAL" &&
              cek.durum !== "TAHSIL_EDILDI" &&
              cek.durum !== "ODENDI" && (
                <form
                  action={iptalAction}
                  className="rounded-2xl border border-slate-700 bg-slate-900 p-6"
                >
                  <h2 className="text-xl font-black">
                    Çeki İptal Et
                  </h2>

                  <button
                    type="submit"
                    className="mt-4 w-full rounded-xl border border-red-800 px-5 py-3 font-bold text-red-400"
                  >
                    Çeki İptal Et
                  </button>
                </form>
              )}

            {silinebilir && (
              <form
                action={cekSilAction}
                className="rounded-2xl border border-red-900/60 bg-red-950/10 p-6"
              >
                <h2 className="text-xl font-black text-red-400">
                  Yanlış Çek Kaydını Sil
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Yanlış girilmiş çek kaydını tamamen
                  kaldırır. Cari hesaba daha önce
                  işlenen çek hareketinin etkisi
                  otomatik olarak ters kayıtla
                  düzeltilir.
                </p>

                <p className="mt-3 text-xs font-semibold text-red-300">
                  Tahsil edilmiş veya ödenmiş çekler
                  bu yöntemle silinemez.
                </p>

                <button
                  type="submit"
                  className="mt-5 w-full rounded-xl bg-red-600 px-5 py-3 font-black text-white hover:bg-red-500"
                >
                  Yanlış Çek Kaydını Sil
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}