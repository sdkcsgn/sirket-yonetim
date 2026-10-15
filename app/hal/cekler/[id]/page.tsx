import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

import {
  bankayaVer,
  tahsilEt,
  tahsilatiGeriAl,
  odendi,
  alinanCekiIadeEt,
  verilenCekiGeriAl,
  ciroEt,
  ciroCekiniGeriAl,
  karsiliksizYap,
  iptalEt,
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
      return "Ciro Edildi";

    case "TAHSIL_EDILDI":
      return "Tahsil Edildi";

    case "ODENDI":
      return "Ödendi";

    case "KARSILIKSIZ":
      return "Karşılıksız";

    case "IPTAL":
      return "İptal";

    case "IADE_EDILDI":
      return "Müşteriye İade Edildi";

    case "IADE_ALINDI":
      return "Geri Alındı";

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
    case "ODENDI":
      return "text-emerald-400";

    case "KARSILIKSIZ":
      return "text-amber-400";

    case "IADE_EDILDI":
    case "IADE_ALINDI":
      return "text-orange-400";

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

  if (
    !Number.isInteger(cekId) ||
    cekId <= 0
  ) {
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
    bankayaVer.bind(
      null,
      cek.id
    );

  const tahsilEtAction =
    tahsilEt.bind(
      null,
      cek.id
    );

  const tahsilatiGeriAlAction =
    tahsilatiGeriAl.bind(
      null,
      cek.id
    );

  const odendiAction =
    odendi.bind(
      null,
      cek.id
    );

  const alinanCekiIadeEtAction =
    alinanCekiIadeEt.bind(
      null,
      cek.id
    );

  const verilenCekiGeriAlAction =
    verilenCekiGeriAl.bind(
      null,
      cek.id
    );

  const ciroEtAction =
    ciroEt.bind(
      null,
      cek.id
    );

  const ciroCekiniGeriAlAction =
    ciroCekiniGeriAl.bind(
      null,
      cek.id
    );

  const karsiliksizAction =
    karsiliksizYap.bind(
      null,
      cek.id
    );

  const iptalAction =
    iptalEt.bind(
      null,
      cek.id
    );

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500";

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <div className="mx-auto max-w-6xl px-6 py-10">

        {/* ==================================================
            BAŞLIK
        ================================================== */}

        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">

          <div>

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Hal Komisyon & Soğuk Hava
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
            href="/hal/cekler"
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 hover:bg-slate-900"
          >
            ← Çek Listesi
          </a>

        </div>

        {/* ==================================================
            ÖZET
        ================================================== */}

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
              {money(
                Number(cek.tutar)
              )}
            </p>

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <p className="text-sm text-slate-400">
              Vade Tarihi
            </p>

            <p className="mt-3 text-2xl font-black">
              {date(
                cek.vadeTarihi
              )}
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
              {durumAdi(
                cek.durum
              )}
            </p>

          </div>

        </div>

        {/* ==================================================
            ANA ALAN
        ================================================== */}

        <div className="mt-8 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">

          {/* ==================================================
              SOL TARAF
          ================================================== */}

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
                  {cek.cari?.unvan ||
                    "-"}
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
                  {cek.kesideci ||
                    "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Banka Hesabı
                </p>

                <p className="mt-1 font-semibold">
                  {cek.bankaHesabi
                    ?.ad || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Ciro Edilen Cari
                </p>

                <p className="mt-1 font-semibold text-violet-400">
                  {ciroCari?.unvan ||
                    "-"}
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
                  {cek.aciklama ||
                    "-"}
                </p>
              </div>

            </div>

          </div>

          {/* ==================================================
              SAĞ TARAF
          ================================================== */}

          <div className="space-y-6">

            {/* ==================================================
                CİRO ET
            ================================================== */}

            {cek.tip === "ALINAN" &&
              cek.durum ===
                "PORTFOYDE" &&
              !cek.ciroCariIslendi &&
              !cek.bankaIslendi && (

                <form
                  action={
                    ciroEtAction
                  }
                  className="rounded-2xl border border-violet-900/60 bg-slate-900 p-6"
                >

                  <h2 className="text-xl font-black text-violet-400">
                    Çeki Ciro Et
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Alınan çeki başka bir
                    cariye verdiğinizde seçilen
                    cariye ödeme hareketi
                    otomatik işlenir.
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Ciro edilen cariye olan
                    borcumuz çek tutarı kadar
                    azalır. Banka bakiyesi
                    değişmez.
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

                    {cariler.map(
                      (cari) => (

                        <option
                          key={
                            cari.id
                          }
                          value={
                            cari.id
                          }
                        >
                          {cari.unvan}
                        </option>

                      )
                    )}

                  </select>

                  <button
                    type="submit"
                    className="mt-4 w-full rounded-xl bg-violet-500 px-5 py-3 font-black text-white hover:bg-violet-400"
                  >
                    Çeki Ciro Et
                  </button>

                </form>

              )}

            {/* ==================================================
                BANKAYA VER
            ================================================== */}

            {cek.tip === "ALINAN" &&
              cek.durum ===
                "PORTFOYDE" &&
              !cek.ciroCariIslendi &&
              !cek.bankaIslendi && (

                <form
                  action={
                    bankayaVerAction
                  }
                  className="rounded-2xl border border-blue-900/60 bg-slate-900 p-6"
                >

                  <h2 className="text-xl font-black text-blue-400">
                    Bankaya Ver
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Çek bankaya verildi olarak
                    işaretlenir. Henüz tahsil
                    edilmediği için banka
                    bakiyesi değişmez.
                  </p>

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
                          key={
                            hesap.id
                          }
                          value={
                            hesap.id
                          }
                        >
                          {hesap.ad}
                        </option>

                      )
                    )}

                  </select>

                  <button
                    type="submit"
                    className="mt-4 w-full rounded-xl bg-blue-500 px-5 py-3 font-black text-white hover:bg-blue-400"
                  >
                    Bankaya Ver
                  </button>

                </form>

              )}

            {/* ==================================================
                TAHSİL ET
            ================================================== */}

            {cek.tip === "ALINAN" &&
              !cek.bankaIslendi &&
              !cek.ciroCariIslendi &&
              (
                cek.durum ===
                  "PORTFOYDE" ||
                cek.durum ===
                  "BANKADA"
              ) && (

                <form
                  action={
                    tahsilEtAction
                  }
                  className="rounded-2xl border border-emerald-900/60 bg-slate-900 p-6"
                >

                  <h2 className="text-xl font-black text-emerald-400">
                    Çeki Tahsil Et
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Tahsil edildiğinde seçilen
                    banka hesabına çek tutarı
                    kadar para girişi yapılır.
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    Cari tekrar etkilenmez.
                  </p>

                  <select
                    name="bankaHesabiId"
                    required
                    defaultValue={
                      cek.bankaHesabiId
                        ?.toString() ||
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
                          key={
                            hesap.id
                          }
                          value={
                            hesap.id
                          }
                        >
                          {hesap.ad}
                        </option>

                      )
                    )}

                  </select>

                  <button
                    type="submit"
                    className="mt-4 w-full rounded-xl bg-emerald-500 px-5 py-3 font-black text-slate-950 hover:bg-emerald-400"
                  >
                    Tahsil Edildi
                  </button>

                </form>

              )}

            {/* ==================================================
                TAHSİLATI GERİ AL
            ================================================== */}

            {cek.tip === "ALINAN" &&
              (
                cek.durum ===
                  "TAHSIL_EDILDI" ||
                cek.bankaIslendi
              ) && (

                <form
                  action={
                    tahsilatiGeriAlAction
                  }
                  className="rounded-2xl border border-orange-900/60 bg-orange-950/10 p-6"
                >

                  <h2 className="text-xl font-black text-orange-400">
                    Tahsilatı Geri Al
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Yanlışlıkla tahsil edildi
                    işaretlenen çeki tekrar
                    portföye alır.
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Varsa çek tahsilatına ait
                    banka giriş hareketi de
                    silinir.
                  </p>

                  <p className="mt-2 text-sm font-semibold text-orange-300">
                    Müşterinin cari hesabındaki
                    ilk çek tahsilat kaydı
                    değişmez.
                  </p>

                  <button
                    type="submit"
                    className="mt-4 w-full rounded-xl border border-orange-700 px-5 py-3 font-black text-orange-400 hover:bg-orange-950/30"
                  >
                    Tahsilatı Geri Al
                  </button>

                </form>

              )}

            {/* ==================================================
                ALINAN ÇEKİ MÜŞTERİYE İADE ET
            ================================================== */}

            {cek.tip === "ALINAN" &&
              !cek.bankaIslendi &&
              !cek.ciroCariIslendi &&
              (
                cek.durum ===
                  "PORTFOYDE" ||
                cek.durum ===
                  "BANKADA"
              ) && (

                <form
                  action={
                    alinanCekiIadeEtAction
                  }
                  className="rounded-2xl border border-orange-900/60 bg-slate-900 p-6"
                >

                  <h2 className="text-xl font-black text-orange-400">
                    Müşteriye İade Et
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Müşteriden alınan çek
                    müşteriye geri verilir.
                  </p>

                  <p className="mt-2 text-sm font-semibold text-orange-300">
                    Çek alınırken müşterinin
                    borcundan düşülen tutar,
                    müşterinin borcuna tekrar
                    eklenecektir.
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    Banka bakiyesi değişmez.
                  </p>

                  <button
                    type="submit"
                    className="mt-4 w-full rounded-xl bg-orange-500 px-5 py-3 font-black text-slate-950 hover:bg-orange-400"
                  >
                    Müşteriye İade Et
                  </button>

                </form>

              )}

            {/* ==================================================
                VERİLEN ÇEK ÖDENDİ
            ================================================== */}

            {cek.tip === "VERILEN" &&
              !cek.bankaIslendi &&
              cek.durum !==
                "ODENDI" &&
              cek.durum !==
                "IPTAL" &&
              cek.durum !==
                "IADE_ALINDI" && (

                <form
                  action={
                    odendiAction
                  }
                  className="rounded-2xl border border-red-900/60 bg-slate-900 p-6"
                >

                  <h2 className="text-xl font-black text-red-400">
                    Çek Ödendi
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Çek ödendiğinde seçilen
                    banka hesabından çek tutarı
                    düşer.
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    Cari tekrar etkilenmez.
                  </p>

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
                          key={
                            hesap.id
                          }
                          value={
                            hesap.id
                          }
                        >
                          {hesap.ad}
                        </option>

                      )
                    )}

                  </select>

                  <button
                    type="submit"
                    className="mt-4 w-full rounded-xl bg-red-500 px-5 py-3 font-black text-white hover:bg-red-400"
                  >
                    Ödendi
                  </button>

                </form>

              )}

            {/* ==================================================
                VERİLEN ÇEKİ GERİ AL
            ================================================== */}

            {cek.tip === "VERILEN" &&
              !cek.bankaIslendi &&
              cek.durum !==
                "ODENDI" &&
              cek.durum !==
                "IPTAL" &&
              cek.durum !==
                "IADE_ALINDI" && (

                <form
                  action={
                    verilenCekiGeriAlAction
                  }
                  className="rounded-2xl border border-orange-900/60 bg-orange-950/10 p-6"
                >

                  <h2 className="text-xl font-black text-orange-400">
                    Verilen Çeki Geri Al
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Daha önce cariye verdiğimiz
                    çek bize geri döndüyse bu
                    işlemi kullanın.
                  </p>

                  <p className="mt-2 text-sm font-semibold text-orange-300">
                    Çek verildiğinde carinin
                    borcundan düşülen tutar
                    tekrar borca eklenecektir.
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    Banka bakiyesi değişmez.
                  </p>

                  <button
                    type="submit"
                    className="mt-4 w-full rounded-xl border border-orange-700 px-5 py-3 font-black text-orange-400 hover:bg-orange-950/30"
                  >
                    Verilen Çeki Geri Al
                  </button>

                </form>

              )}

            {/* ==================================================
                CİRO EDİLMİŞ ÇEK
            ================================================== */}

            {cek.durum ===
              "CIROLANDI" && (

                <div className="rounded-2xl border border-violet-900/60 bg-violet-950/20 p-6">

                  <h2 className="text-xl font-black text-violet-400">
                    Çek Ciro Edildi
                  </h2>

                  <p className="mt-3 text-sm text-slate-400">
                    Ciro edilen cari:
                  </p>

                  <p className="mt-1 text-lg font-black text-white">
                    {ciroCari?.unvan ||
                      "-"}
                  </p>

                  <p className="mt-4 text-sm leading-6 text-slate-400">
                    Bu çek başka cariye ödeme
                    amacıyla verilmiştir.
                  </p>

                </div>

              )}

            {/* ==================================================
                CİRO ÇEKİNİ GERİ AL
            ================================================== */}

            {cek.tip === "ALINAN" &&
              cek.durum ===
                "CIROLANDI" &&
              cek.ciroCariIslendi &&
              cek.ciroCariId && (

                <form
                  action={
                    ciroCekiniGeriAlAction
                  }
                  className="rounded-2xl border border-fuchsia-900/60 bg-fuchsia-950/10 p-6"
                >

                  <h2 className="text-xl font-black text-fuchsia-400">
                    Ciro Çekini Geri Al
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Ciro ettiğimiz cari çeki
                    bize geri verdiyse bu işlemi
                    kullanın.
                  </p>

                  <p className="mt-2 text-sm font-semibold text-fuchsia-300">
                    Ciro edilen cariden daha
                    önce düşülen borç tekrar
                    eklenecektir.
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Çek tekrar Portföyde
                    durumuna döner ve yeniden
                    ciro edilebilir veya bankaya
                    verilebilir.
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    Banka bakiyesi değişmez.
                  </p>

                  <button
                    type="submit"
                    className="mt-4 w-full rounded-xl bg-fuchsia-500 px-5 py-3 font-black text-white hover:bg-fuchsia-400"
                  >
                    Ciro Çekini Geri Al
                  </button>

                </form>

              )}

            {/* ==================================================
                İADE EDİLDİ BİLGİSİ
            ================================================== */}

            {cek.durum ===
              "IADE_EDILDI" && (

                <div className="rounded-2xl border border-orange-900/60 bg-orange-950/10 p-6">

                  <h2 className="text-xl font-black text-orange-400">
                    Müşteriye İade Edildi
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Bu alınan çek müşteriye
                    iade edilmiştir.
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    Çekin müşteri carisindeki
                    tahsilat etkisi geri
                    alınmıştır.
                  </p>

                </div>

              )}

            {/* ==================================================
                GERİ ALINDI BİLGİSİ
            ================================================== */}

            {cek.durum ===
              "IADE_ALINDI" && (

                <div className="rounded-2xl border border-orange-900/60 bg-orange-950/10 p-6">

                  <h2 className="text-xl font-black text-orange-400">
                    Verilen Çek Geri Alındı
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Daha önce karşı tarafa
                    verilen çek geri alınmıştır.
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    Cari üzerindeki ödeme etkisi
                    geri çevrilmiştir.
                  </p>

                </div>

              )}

            {/* ==================================================
                KARŞILIKSIZ
            ================================================== */}

            {cek.tip === "ALINAN" &&
              !cek.bankaIslendi &&
              cek.durum !==
                "TAHSIL_EDILDI" &&
              cek.durum !==
                "IPTAL" &&
              cek.durum !==
                "KARSILIKSIZ" &&
              cek.durum !==
                "IADE_EDILDI" && (

                <form
                  action={
                    karsiliksizAction
                  }
                  className="rounded-2xl border border-amber-900/60 bg-slate-900 p-6"
                >

                  <h2 className="text-xl font-black text-amber-400">
                    Karşılıksız
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Çek karşılıksız olarak
                    işaretlenir.
                  </p>

                  {cek.durum ===
                    "CIROLANDI" && (

                    <p className="mt-2 text-sm font-semibold text-amber-300">
                      Ciro edilen cariden daha
                      önce düşülen borç tekrar
                      eklenecektir.
                    </p>

                  )}

                  <p className="mt-2 text-sm font-semibold text-amber-300">
                    Müşteriden alınan çek
                    karşılıksız kaldığı için
                    müşteri tekrar çek tutarı
                    kadar borçlandırılır.
                  </p>

                  <button
                    type="submit"
                    className="mt-4 w-full rounded-xl border border-amber-700 px-5 py-3 font-bold text-amber-400 hover:bg-amber-950/30"
                  >
                    Karşılıksız İşaretle
                  </button>

                </form>

              )}

            {/* ==================================================
                İPTAL
            ================================================== */}

            {!cek.bankaIslendi &&
              cek.durum !==
                "IPTAL" &&
              cek.durum !==
                "TAHSIL_EDILDI" &&
              cek.durum !==
                "ODENDI" &&
              cek.durum !==
                "IADE_EDILDI" &&
              cek.durum !==
                "IADE_ALINDI" && (

                <form
                  action={
                    iptalAction
                  }
                  className="rounded-2xl border border-slate-700 bg-slate-900 p-6"
                >

                  <h2 className="text-xl font-black">
                    Çeki İptal Et
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Çek iptal durumuna alınır.
                  </p>

                  {cek.durum ===
                    "CIROLANDI" && (

                    <p className="mt-2 text-sm font-semibold text-red-400">
                      Ciro edilen cariden
                      düşülen borç otomatik
                      olarak geri eklenecektir.
                    </p>

                  )}

                  <button
                    type="submit"
                    className="mt-4 w-full rounded-xl border border-red-800 px-5 py-3 font-bold text-red-400 hover:bg-red-950/30"
                  >
                    Çeki İptal Et
                  </button>

                </form>

              )}

          </div>

        </div>

      </div>

    </main>
  );
}