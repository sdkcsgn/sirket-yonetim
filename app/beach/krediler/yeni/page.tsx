import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{
    tip?: string;
  }>;
};

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

  return Number.isFinite(value)
    ? value
    : 0;
}

function optionalNumber(
  formData: FormData,
  name: string
) {
  const raw = String(
    formData.get(name) ?? ""
  ).trim();

  if (!raw) {
    return null;
  }

  const normalized = raw
    .replace(/\./g, "")
    .replace(",", ".");

  const value = Number(normalized);

  return Number.isFinite(value)
    ? value
    : null;
}

function optionalInt(
  formData: FormData,
  name: string
) {
  const raw = String(
    formData.get(name) ?? ""
  ).trim();

  if (!raw) {
    return null;
  }

  const value = Number(raw);

  if (
    !Number.isInteger(value) ||
    value < 0
  ) {
    return null;
  }

  return value;
}

function optionalDate(
  formData: FormData,
  name: string
) {
  const raw = String(
    formData.get(name) ?? ""
  ).trim();

  if (!raw) {
    return null;
  }

  const value = new Date(
    `${raw}T12:00:00`
  );

  if (
    Number.isNaN(value.getTime())
  ) {
    return null;
  }

  return value;
}

export default async function YeniKrediPage({
  searchParams,
}: Props) {
  const query =
    await searchParams;

  const tip =
    query.tip === "SPOT"
      ? "SPOT"
      : query.tip === "ROTATIF"
      ? "ROTATIF"
      : "TAKSITLI";

  const sirket =
    await prisma.sirket.findUnique({
      where: {
        kod: "BEACH",
      },
    });

  if (!sirket) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Beach & Mağaza şirketi bulunamadı.
      </main>
    );
  }

  const bankaHesaplari =
    await prisma.finansHesap.findMany({
      where: {
        sirketId: sirket.id,
        aktif: true,
        tip: "BANKA",
      },

      orderBy: {
        ad: "asc",
      },
    });

  const bugun =
    new Date()
      .toISOString()
      .slice(0, 10);

  async function krediKaydet(
    formData: FormData
  ) {
    "use server";

    const sirket =
      await prisma.sirket.findUnique({
        where: {
          kod: "BEACH",
        },
      });

    if (!sirket) {
      throw new Error(
        "Beach & Mağaza bulunamadı."
      );
    }

    /*
      ==================================================
      KREDİ TİPİ
      ==================================================
    */

    const tip =
      String(
        formData.get("tip") ?? ""
      );

    if (
      tip !== "TAKSITLI" &&
      tip !== "SPOT" &&
      tip !== "ROTATIF"
    ) {
      throw new Error(
        "Geçersiz kredi tipi."
      );
    }

    /*
      ==================================================
      KREDİ ADI
      ==================================================
    */

    const ad =
      String(
        formData.get("ad") ?? ""
      ).trim();

    if (!ad) {
      throw new Error(
        "Kredi adı zorunludur."
      );
    }

    /*
      ==================================================
      PARA BİRİMİ
      ==================================================
    */

    const paraBirimi =
      String(
        formData.get(
          "paraBirimi"
        ) ?? "TRY"
      );

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

    /*
      ==================================================
      BANKA
      ==================================================
    */

    const finansHesapRaw =
      String(
        formData.get(
          "finansHesapId"
        ) ?? ""
      ).trim();

    const finansHesapId =
      finansHesapRaw
        ? Number(finansHesapRaw)
        : null;

    /*
      Kredi parası bankaya geçti mi?

      İşaretliyse:
      - banka seçmek zorunlu
      - banka bakiyesi artacak

      İşaret kaldırılırsa:
      - sadece geçmiş kredi kaydı yapılabilir
      - banka bakiyesi değişmez
    */

    const bankayaAktar =
      String(
        formData.get(
          "bankayaAktar"
        ) ?? ""
      ) === "on";

    let banka:
      | Awaited<
          ReturnType<
            typeof prisma.finansHesap.findFirst
          >
        >
      | null = null;

    if (bankayaAktar) {
      if (
        finansHesapId === null ||
        !Number.isInteger(
          finansHesapId
        ) ||
        finansHesapId <= 0
      ) {
        throw new Error(
          "Kredi tutarı bankaya geçecekse banka hesabı seçmelisiniz."
        );
      }

      banka =
        await prisma.finansHesap.findFirst({
          where: {
            id: finansHesapId,

            sirketId:
              sirket.id,

            aktif: true,

            tip: "BANKA",
          },
        });

      if (!banka) {
        throw new Error(
          "Seçilen banka hesabı bulunamadı."
        );
      }

      if (
        banka.paraBirimi !==
        paraBirimi
      ) {
        throw new Error(
          `Kredi para birimi ${paraBirimi}, banka hesabı ise ${banka.paraBirimi}. Aynı para birimindeki banka hesabını seçiniz.`
        );
      }
    } else if (
      finansHesapId !== null
    ) {
      banka =
        await prisma.finansHesap.findFirst({
          where: {
            id: finansHesapId,

            sirketId:
              sirket.id,

            aktif: true,

            tip: "BANKA",
          },
        });

      if (!banka) {
        throw new Error(
          "Seçilen banka hesabı bulunamadı."
        );
      }

      if (
        banka.paraBirimi !==
        paraBirimi
      ) {
        throw new Error(
          `Kredi para birimi ${paraBirimi}, banka hesabı ise ${banka.paraBirimi}. Aynı para birimindeki banka hesabını seçiniz.`
        );
      }
    }

    /*
      ==================================================
      TARİHLER
      ==================================================
    */

    const baslangicTarihi =
      optionalDate(
        formData,
        "baslangicTarihi"
      );

    if (!baslangicTarihi) {
      throw new Error(
        "Başlangıç tarihi zorunludur."
      );
    }

    const vadeTarihi =
      optionalDate(
        formData,
        "vadeTarihi"
      );

    const sonrakiOdemeTarihi =
      optionalDate(
        formData,
        "sonrakiOdemeTarihi"
      );

    /*
      ==================================================
      DİĞER BİLGİLER
      ==================================================
    */

    const krediNo =
      String(
        formData.get(
          "krediNo"
        ) ?? ""
      ).trim() || null;

    const faizOrani =
      optionalNumber(
        formData,
        "faizOrani"
      );

    const aciklama =
      String(
        formData.get(
          "aciklama"
        ) ?? ""
      ).trim() || null;

    /*
      ==================================================
      KREDİ TUTARLARI
      ==================================================
    */

    let anaPara = 0;
    let kalanBorc = 0;

    let taksitSayisi:
      number | null = null;

    let odenenTaksitSayisi = 0;

    let aylikTaksit:
      number | null = null;

    let krediLimiti:
      number | null = null;

    let kullanilanLimit:
      number | null = null;

    /*
      ==================================================
      TAKSİTLİ
      ==================================================
    */

    if (
      tip === "TAKSITLI"
    ) {
      anaPara =
        numberValue(
          formData,
          "anaPara"
        );

      if (anaPara <= 0) {
        throw new Error(
          "Ana para sıfırdan büyük olmalıdır."
        );
      }

      const girilenKalan =
        optionalNumber(
          formData,
          "kalanBorc"
        );

      kalanBorc =
        girilenKalan !== null
          ? girilenKalan
          : anaPara;

      if (
        kalanBorc < 0 ||
        kalanBorc >
          anaPara
      ) {
        throw new Error(
          "Kalan borç ana paradan büyük veya negatif olamaz."
        );
      }

      taksitSayisi =
        optionalInt(
          formData,
          "taksitSayisi"
        );

      odenenTaksitSayisi =
        optionalInt(
          formData,
          "odenenTaksitSayisi"
        ) ?? 0;

      aylikTaksit =
        optionalNumber(
          formData,
          "aylikTaksit"
        );
    }

    /*
      ==================================================
      SPOT
      ==================================================
    */

    if (tip === "SPOT") {
      anaPara =
        numberValue(
          formData,
          "anaPara"
        );

      if (anaPara <= 0) {
        throw new Error(
          "Ana para sıfırdan büyük olmalıdır."
        );
      }

      const girilenKalan =
        optionalNumber(
          formData,
          "kalanBorc"
        );

      kalanBorc =
        girilenKalan !== null
          ? girilenKalan
          : anaPara;

      if (
        kalanBorc < 0 ||
        kalanBorc >
          anaPara
      ) {
        throw new Error(
          "Kalan borç ana paradan büyük veya negatif olamaz."
        );
      }

      if (!vadeTarihi) {
        throw new Error(
          "Spot kredide vade tarihi zorunludur."
        );
      }
    }

    /*
      ==================================================
      ROTATİF
      ==================================================
    */

    if (
      tip === "ROTATIF"
    ) {
      krediLimiti =
        numberValue(
          formData,
          "krediLimiti"
        );

      kullanilanLimit =
        numberValue(
          formData,
          "kullanilanLimit"
        );

      if (
        krediLimiti <= 0
      ) {
        throw new Error(
          "Kredi limiti sıfırdan büyük olmalıdır."
        );
      }

      if (
        kullanilanLimit < 0
      ) {
        throw new Error(
          "Kullanılan limit geçersiz."
        );
      }

      if (
        kullanilanLimit >
        krediLimiti
      ) {
        throw new Error(
          "Kullanılan limit kredi limitinden büyük olamaz."
        );
      }

      /*
        Rotatif kredide:

        anaPara =
        toplam kredi limiti

        kalanBorc =
        kullanılan kredi
      */

      anaPara =
        krediLimiti;

      kalanBorc =
        kullanilanLimit;
    }

    /*
      ==================================================
      BANKAYA GİRECEK TUTAR
      ==================================================

      Taksitli  -> ana para
      Spot      -> ana para
      Rotatif   -> kullanılan limit
    */

    const bankayaGirecekTutar =
      tip === "ROTATIF"
        ? kullanilanLimit ?? 0
        : anaPara;

    if (
      bankayaAktar &&
      bankayaGirecekTutar <= 0
    ) {
      throw new Error(
        "Bankaya aktarılacak kredi tutarı sıfırdan büyük olmalıdır."
      );
    }

    /*
      ==================================================
      KREDİ + BANKA HAREKETİ
      ==================================================

      Aynı transaction içinde yapıyoruz.

      Böylece:
      - kredi oluşup banka oluşmaması
      - banka oluşup kredi oluşmaması

      gibi yarım kayıt problemi olmaz.
    */

    const yeniKredi =
      await prisma.$transaction(
        async (tx) => {
          /*
            KREDİYİ OLUŞTUR
          */

          const kredi =
            await tx.kredi.create({
              data: {
                sirketId:
                  sirket.id,

                finansHesapId:
                  finansHesapId,

                tip,

                durum:
                  kalanBorc <= 0
                    ? "KAPANDI"
                    : "AKTIF",

                paraBirimi:
                  paraBirimi as
                    | "TRY"
                    | "USD"
                    | "EUR"
                    | "GBP"
                    | "RUB",

                ad,

                krediNo,

                anaPara,

                kalanBorc,

                faizOrani,

                baslangicTarihi,

                vadeTarihi,

                taksitSayisi,

                odenenTaksitSayisi,

                aylikTaksit,

                sonrakiOdemeTarihi:
                  kalanBorc <= 0
                    ? null
                    : sonrakiOdemeTarihi,

                krediLimiti,

                kullanilanLimit,

                aciklama,
              },
            });

          /*
            KREDİ TUTARI BANKAYA
            GERÇEKTEN GEÇTİYSE
            BANKA GİRİŞİ YAP
          */

          if (
            bankayaAktar &&
            banka &&
            bankayaGirecekTutar > 0
          ) {
            await tx.finansHareket.create({
              data: {
                finansHesapId:
                  banka.id,

                tarih:
                  baslangicTarihi,

                tip:
                  "GIRIS",

                tutar:
                  bankayaGirecekTutar,

                aciklama:
                  `[Kredi Kullanımı] ${ad}`,

                belgeNo:
                  krediNo,

                /*
                  Bu bağlantı sayesinde
                  hangi banka girişinin
                  hangi krediye ait olduğu
                  kesin belli.
                */

                transferRef:
                  `KREDI-KULLANIM-${kredi.id}`,
              },
            });
          }

          return kredi;
        }
      );

    /*
      ==================================================
      SAYFALARI YENİLE
      ==================================================
    */

    revalidatePath(
      "/beach"
    );

    revalidatePath(
      "/beach/krediler"
    );

    revalidatePath(
      `/beach/krediler/${yeniKredi.id}`
    );

    revalidatePath(
      "/beach/banka"
    );

    revalidatePath(
      "/beach/kasa-banka"
    );

    redirect(
      `/beach/krediler/${yeniKredi.id}`
    );
  }

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-violet-500";

  const labelClass =
    "mb-2 block text-sm font-bold text-slate-300";

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <div className="mx-auto max-w-4xl px-6 py-10">

        {/* BAŞLIK */}

        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

          <div>

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-400">
              Beach & Mağaza
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Yeni Kredi
            </h1>

            <p className="mt-2 text-slate-400">
              Kredi türünü seçin ve temel
              bilgileri girin.
            </p>

          </div>

          <a
            href="/beach/krediler"
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 transition hover:bg-slate-900"
          >
            ← Kredilere Dön
          </a>

        </div>

        {/* KREDİ TİPİ */}

        <div className="mb-7 grid gap-3 sm:grid-cols-3">

          <a
            href="/beach/krediler/yeni?tip=TAKSITLI"
            className={`rounded-2xl border p-5 transition ${
              tip === "TAKSITLI"
                ? "border-cyan-500 bg-cyan-950/20"
                : "border-slate-800 bg-slate-900 hover:border-slate-600"
            }`}
          >

            <div className="text-3xl">
              📆
            </div>

            <h2 className="mt-3 font-black">
              Taksitli
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Aylık taksitli ticari kredi
            </p>

          </a>

          <a
            href="/beach/krediler/yeni?tip=SPOT"
            className={`rounded-2xl border p-5 transition ${
              tip === "SPOT"
                ? "border-amber-500 bg-amber-950/20"
                : "border-slate-800 bg-slate-900 hover:border-slate-600"
            }`}
          >

            <div className="text-3xl">
              ⏱️
            </div>

            <h2 className="mt-3 font-black">
              Spot
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Belirli vadeli spot kredi
            </p>

          </a>

          <a
            href="/beach/krediler/yeni?tip=ROTATIF"
            className={`rounded-2xl border p-5 transition ${
              tip === "ROTATIF"
                ? "border-violet-500 bg-violet-950/20"
                : "border-slate-800 bg-slate-900 hover:border-slate-600"
            }`}
          >

            <div className="text-3xl">
              🔄
            </div>

            <h2 className="mt-3 font-black">
              Rotatif
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Limitli ve değişken kullanımlı
              kredi
            </p>

          </a>

        </div>

        {/* FORM */}

        <form
          action={krediKaydet}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8"
        >

          <input
            type="hidden"
            name="tip"
            value={tip}
          />

          {/* GENEL */}

          <div className="grid gap-5 md:grid-cols-2">

            <div className="md:col-span-2">

              <label
                className={
                  labelClass
                }
              >
                Kredi Adı *
              </label>

              <input
                name="ad"
                required
                placeholder={
                  tip === "TAKSITLI"
                    ? "Örn: Ziraat 24 Ay Ticari Kredi"
                    : tip === "SPOT"
                    ? "Örn: Garanti 90 Gün Spot"
                    : "Örn: Ziraat Rotatif Kredi"
                }
                className={
                  inputClass
                }
              />

            </div>

            {/* BANKA */}

            <div>

              <label
                className={
                  labelClass
                }
              >
                Banka Hesabı
              </label>

              <select
                name="finansHesapId"
                className={
                  inputClass
                }
                defaultValue=""
              >

                <option value="">
                  Banka seçiniz
                </option>

                {bankaHesaplari.map(
                  (banka) => (
                    <option
                      key={
                        banka.id
                      }
                      value={
                        banka.id
                      }
                    >
                      {banka.bankaAdi
                        ? `${banka.bankaAdi} - ${banka.ad}`
                        : banka.ad}{" "}
                      ({banka.paraBirimi})
                    </option>
                  )
                )}

              </select>

            </div>

            {/* KREDİ NO */}

            <div>

              <label
                className={
                  labelClass
                }
              >
                Kredi / Sözleşme No
              </label>

              <input
                name="krediNo"
                placeholder="Varsa"
                className={
                  inputClass
                }
              />

            </div>

            {/* PARA BİRİMİ */}

            <div>

              <label
                className={
                  labelClass
                }
              >
                Para Birimi
              </label>

              <select
                name="paraBirimi"
                defaultValue="TRY"
                className={
                  inputClass
                }
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

            {/* BAŞLANGIÇ */}

            <div>

              <label
                className={
                  labelClass
                }
              >
                Başlangıç Tarihi *
              </label>

              <input
                type="date"
                name="baslangicTarihi"
                defaultValue={
                  bugun
                }
                required
                className={
                  inputClass
                }
              />

            </div>

          </div>

          {/* BANKAYA AKTAR */}

          <div className="mt-6 rounded-xl border border-emerald-900/50 bg-emerald-950/10 p-5">

            <label className="flex cursor-pointer items-start gap-3">

              <input
                type="checkbox"
                name="bankayaAktar"
                defaultChecked
                className="mt-1 h-5 w-5"
              />

              <div>

                <p className="font-black text-emerald-300">
                  Kredi tutarı seçilen banka
                  hesabına geçti
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Yeni kullanılan kredilerde bu
                  kutu işaretli kalsın. Kredi
                  tutarı banka hesabına GİRİŞ
                  olarak otomatik işlenir.
                </p>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Eski bir krediyi yalnızca
                  kayıt amacıyla sisteme
                  giriyorsanız ve para geçmişte
                  bankaya zaten işlenmişse bu
                  kutuyu kaldırabilirsiniz.
                </p>

              </div>

            </label>

          </div>

          {/* TAKSİTLİ */}

          {tip === "TAKSITLI" && (
            <div className="mt-8">

              <div className="mb-5 border-b border-slate-800 pb-3">

                <h2 className="text-xl font-black text-cyan-400">
                  Taksitli Kredi
                </h2>

              </div>

              <div className="grid gap-5 md:grid-cols-2">

                <div>

                  <label className={labelClass}>
                    Ana Para *
                  </label>

                  <input
                    name="anaPara"
                    inputMode="decimal"
                    required
                    placeholder="Örn: 1.000.000"
                    className={inputClass}
                  />

                </div>

                <div>

                  <label className={labelClass}>
                    Kalan Borç
                  </label>

                  <input
                    name="kalanBorc"
                    inputMode="decimal"
                    placeholder="Boşsa ana para alınır"
                    className={inputClass}
                  />

                </div>

                <div>

                  <label className={labelClass}>
                    Faiz Oranı %
                  </label>

                  <input
                    name="faizOrani"
                    inputMode="decimal"
                    placeholder="Örn: 42,50"
                    className={inputClass}
                  />

                </div>

                <div>

                  <label className={labelClass}>
                    Taksit Sayısı
                  </label>

                  <input
                    type="number"
                    min="1"
                    name="taksitSayisi"
                    placeholder="Örn: 24"
                    className={inputClass}
                  />

                </div>

                <div>

                  <label className={labelClass}>
                    Ödenen Taksit Sayısı
                  </label>

                  <input
                    type="number"
                    min="0"
                    name="odenenTaksitSayisi"
                    defaultValue="0"
                    className={inputClass}
                  />

                </div>

                <div>

                  <label className={labelClass}>
                    Aylık Taksit
                  </label>

                  <input
                    name="aylikTaksit"
                    inputMode="decimal"
                    placeholder="Örn: 65.000"
                    className={inputClass}
                  />

                </div>

                <div>

                  <label className={labelClass}>
                    Sonraki Ödeme Tarihi
                  </label>

                  <input
                    type="date"
                    name="sonrakiOdemeTarihi"
                    className={inputClass}
                  />

                </div>

                <div>

                  <label className={labelClass}>
                    Kredi Bitiş Tarihi
                  </label>

                  <input
                    type="date"
                    name="vadeTarihi"
                    className={inputClass}
                  />

                </div>

              </div>

            </div>
          )}

          {/* SPOT */}

          {tip === "SPOT" && (
            <div className="mt-8">

              <div className="mb-5 border-b border-slate-800 pb-3">

                <h2 className="text-xl font-black text-amber-400">
                  Spot Kredi
                </h2>

              </div>

              <div className="grid gap-5 md:grid-cols-2">

                <div>

                  <label className={labelClass}>
                    Ana Para *
                  </label>

                  <input
                    name="anaPara"
                    inputMode="decimal"
                    required
                    placeholder="Örn: 2.000.000"
                    className={inputClass}
                  />

                </div>

                <div>

                  <label className={labelClass}>
                    Kalan Borç
                  </label>

                  <input
                    name="kalanBorc"
                    inputMode="decimal"
                    placeholder="Boşsa ana para alınır"
                    className={inputClass}
                  />

                </div>

                <div>

                  <label className={labelClass}>
                    Faiz Oranı %
                  </label>

                  <input
                    name="faizOrani"
                    inputMode="decimal"
                    placeholder="Örn: 45,00"
                    className={inputClass}
                  />

                </div>

                <div>

                  <label className={labelClass}>
                    Vade Tarihi *
                  </label>

                  <input
                    type="date"
                    name="vadeTarihi"
                    required
                    className={inputClass}
                  />

                </div>

              </div>

            </div>
          )}

          {/* ROTATİF */}

          {tip === "ROTATIF" && (
            <div className="mt-8">

              <div className="mb-5 border-b border-slate-800 pb-3">

                <h2 className="text-xl font-black text-violet-400">
                  Rotatif Kredi
                </h2>

              </div>

              <div className="grid gap-5 md:grid-cols-2">

                <div>

                  <label className={labelClass}>
                    Kredi Limiti *
                  </label>

                  <input
                    name="krediLimiti"
                    inputMode="decimal"
                    required
                    placeholder="Örn: 5.000.000"
                    className={inputClass}
                  />

                </div>

                <div>

                  <label className={labelClass}>
                    Kullanılan Limit *
                  </label>

                  <input
                    name="kullanilanLimit"
                    inputMode="decimal"
                    required
                    placeholder="Örn: 1.250.000"
                    className={inputClass}
                  />

                </div>

                <div>

                  <label className={labelClass}>
                    Faiz Oranı %
                  </label>

                  <input
                    name="faizOrani"
                    inputMode="decimal"
                    placeholder="Örn: 48,50"
                    className={inputClass}
                  />

                </div>

                <div>

                  <label className={labelClass}>
                    Limit / Yenileme Tarihi
                  </label>

                  <input
                    type="date"
                    name="vadeTarihi"
                    className={inputClass}
                  />

                </div>

                <div>

                  <label className={labelClass}>
                    Sonraki Faiz / Ödeme Tarihi
                  </label>

                  <input
                    type="date"
                    name="sonrakiOdemeTarihi"
                    className={inputClass}
                  />

                </div>

              </div>

            </div>
          )}

          {/* AÇIKLAMA */}

          <div className="mt-8">

            <label className={labelClass}>
              Açıklama
            </label>

            <textarea
              name="aciklama"
              rows={4}
              placeholder="Kredi ile ilgili not..."
              className={inputClass}
            />

          </div>

          {/* MUHASEBE BİLGİSİ */}

          <div className="mt-7 rounded-xl border border-cyan-900/50 bg-cyan-950/10 p-5">

            <p className="font-black text-cyan-300">
              Muhasebe İşlemi
            </p>

            <div className="mt-3 space-y-2 text-sm leading-6 text-slate-400">

              <p>
                • Kredi borcu Krediler bölümüne
                kaydedilir.
              </p>

              <p>
                • “Kredi tutarı bankaya geçti”
                işaretliyse seçilen banka hesabına
                otomatik GİRİŞ oluşur.
              </p>

              {tip !== "ROTATIF" && (
                <p>
                  • Bankaya giren tutar kredi ana
                  para tutarıdır.
                </p>
              )}

              {tip === "ROTATIF" && (
                <p>
                  • Rotatif kredide bankaya yalnızca
                  Kullanılan Limit kadar para girer;
                  toplam kredi limiti banka bakiyesine
                  eklenmez.
                </p>
              )}

              <p>
                • Oluşan banka hareketi kredi ID'siyle
                bağlantılı kaydedilir.
              </p>

            </div>

          </div>

          {/* BUTONLAR */}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">

            <button
              type="submit"
              className="flex-1 rounded-xl bg-violet-500 px-6 py-4 text-lg font-black text-white transition hover:bg-violet-400"
            >
              Krediyi Kaydet
            </button>

            <a
              href="/beach/krediler"
              className="rounded-xl border border-slate-700 px-6 py-4 text-center font-bold text-slate-300 transition hover:bg-slate-800"
            >
              Vazgeç
            </a>

          </div>

        </form>

      </div>

    </main>
  );
}