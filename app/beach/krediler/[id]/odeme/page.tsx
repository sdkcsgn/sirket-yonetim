import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function money(
  value: number,
  currency = "TRY"
) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function parseMoney(
  formData: FormData,
  name: string
) {
  const raw = String(
    formData.get(name) ?? ""
  ).trim();

  if (!raw) {
    return 0;
  }

  let normalized =
    raw.replace(/\s/g, "");

  if (
    normalized.includes(".") &&
    normalized.includes(",")
  ) {
    normalized = normalized
      .replace(/\./g, "")
      .replace(",", ".");
  } else if (
    normalized.includes(",")
  ) {
    normalized =
      normalized.replace(",", ".");
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

function birAyIleri(
  tarih: Date | null
) {
  if (!tarih) {
    return null;
  }

  const yeniTarih =
    new Date(tarih);

  const gun =
    yeniTarih.getDate();

  yeniTarih.setDate(1);

  yeniTarih.setMonth(
    yeniTarih.getMonth() + 1
  );

  const sonrakiAyinSonGunu =
    new Date(
      yeniTarih.getFullYear(),
      yeniTarih.getMonth() + 1,
      0
    ).getDate();

  yeniTarih.setDate(
    Math.min(
      gun,
      sonrakiAyinSonGunu
    )
  );

  return yeniTarih;
}

export default async function KrediOdemePage({
  params,
}: Props) {
  const { id } =
    await params;

  const krediId =
    Number(id);

  if (
    !Number.isInteger(
      krediId
    ) ||
    krediId <= 0
  ) {
    notFound();
  }

  /*
    ==================================================
    KREDİ
    ==================================================
  */

  const kredi =
    await prisma.kredi.findUnique({
      where: {
        id: krediId,
      },

      include: {
        sirket: true,
        finansHesap: true,
      },
    });

  if (
    !kredi ||
    kredi.sirket.kod !==
      "BEACH"
  ) {
    notFound();
  }

  /*
    KAPANMIŞ KREDİYE
    YENİ ÖDEME YAPILMASIN
  */

  if (
    kredi.durum !==
    "AKTIF"
  ) {
    redirect(
      `/beach/krediler/${kredi.id}`
    );
  }

  /*
    ==================================================
    BANKA HESAPLARI
    ==================================================
  */

  const bankaHesaplari =
    await prisma.finansHesap.findMany({
      where: {
        sirketId:
          kredi.sirketId,

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

  /*
    ==================================================
    KREDİ ÖDEME KAYDET
    ==================================================
  */

  async function krediOdemeKaydet(
    formData: FormData
  ) {
    "use server";

    const krediId =
      Number(
        formData.get(
          "krediId"
        )
      );

    const kredi =
      await prisma.kredi.findUnique({
        where: {
          id:
            krediId,
        },

        include: {
          sirket: true,
        },
      });

    if (
      !kredi ||
      kredi.sirket.kod !==
        "BEACH"
    ) {
      throw new Error(
        "Kredi bulunamadı."
      );
    }

    if (
      kredi.durum !==
      "AKTIF"
    ) {
      throw new Error(
        "Bu kredi aktif değil."
      );
    }

    /*
      ÖDEME TUTARI
    */

    const odemeTutari =
      parseMoney(
        formData,
        "odemeTutari"
      );

    if (
      odemeTutari <= 0
    ) {
      throw new Error(
        "Ödeme tutarı sıfırdan büyük olmalıdır."
      );
    }

    const mevcutKalan =
      Number(
        kredi.kalanBorc
      );

    if (
      odemeTutari >
      mevcutKalan
    ) {
      throw new Error(
        `Ödeme tutarı kalan borçtan büyük olamaz. Kalan borç: ${money(
          mevcutKalan,
          kredi.paraBirimi
        )}`
      );
    }

    /*
      ÖDEME TARİHİ
    */

    const odemeTarihi =
      parseDate(
        formData,
        "odemeTarihi"
      );

    if (!odemeTarihi) {
      throw new Error(
        "Ödeme tarihi zorunludur."
      );
    }

    /*
      BANKA
    */

    const finansHesapId =
      Number(
        formData.get(
          "finansHesapId"
        )
      );

    if (
      !Number.isInteger(
        finansHesapId
      ) ||
      finansHesapId <= 0
    ) {
      throw new Error(
        "Banka hesabı seçiniz."
      );
    }

    const banka =
      await prisma.finansHesap.findFirst({
        where: {
          id:
            finansHesapId,

          sirketId:
            kredi.sirketId,

          aktif: true,

          tip: "BANKA",
        },
      });

    if (!banka) {
      throw new Error(
        "Banka hesabı bulunamadı."
      );
    }

    /*
      PARA BİRİMİ KONTROLÜ
    */

    if (
      banka.paraBirimi !==
      kredi.paraBirimi
    ) {
      throw new Error(
        `Kredi ${kredi.paraBirimi}, seçilen banka ${banka.paraBirimi}. Aynı para birimindeki banka hesabını seçiniz.`
      );
    }

    /*
      AÇIKLAMA
    */

    const aciklama =
      String(
        formData.get(
          "aciklama"
        ) ?? ""
      ).trim();

    /*
      TAKSİT ÖDENDİ Mİ?
    */

    const taksitOdendi =
      String(
        formData.get(
          "taksitOdendi"
        ) ?? ""
      ) === "on";

    /*
      YENİ KALAN BORÇ
    */

    const yeniKalan =
      Math.max(
        0,
        mevcutKalan -
          odemeTutari
      );

    /*
      ÖDENEN TAKSİT
    */

    let yeniOdenenTaksit =
      kredi.odenenTaksitSayisi;

    let yeniSonrakiOdemeTarihi =
      kredi.sonrakiOdemeTarihi;

    if (
      kredi.tip ===
        "TAKSITLI" &&
      taksitOdendi
    ) {
      yeniOdenenTaksit =
        kredi.odenenTaksitSayisi +
        1;

      if (
        kredi.taksitSayisi &&
        yeniOdenenTaksit >
          kredi.taksitSayisi
      ) {
        yeniOdenenTaksit =
          kredi.taksitSayisi;
      }

      /*
        SONRAKİ ÖDEME TARİHİNİ
        1 AY İLERİ AL
      */

      yeniSonrakiOdemeTarihi =
        birAyIleri(
          kredi.sonrakiOdemeTarihi
        );
    }

    /*
      KREDİ KAPANDI MI?
    */

    const yeniDurum =
      yeniKalan <= 0
        ? "KAPANDI"
        : "AKTIF";

    if (
      yeniDurum ===
      "KAPANDI"
    ) {
      yeniSonrakiOdemeTarihi =
        null;
    }

    /*
      ==================================================
      BANKA HAREKETİ + KREDİ GÜNCELLE
      ==================================================
    */

    await prisma.$transaction([
      /*
        BANKADAN ÇIKIŞ
      */

      prisma.finansHareket.create({
        data: {
          finansHesapId:
            banka.id,

          tarih:
            odemeTarihi,

          tip:
            "CIKIS",

          tutar:
            odemeTutari,

          aciklama:
            aciklama ||
            `[Kredi Ödemesi] ${kredi.ad}`,

          belgeNo:
            kredi.krediNo ||
            null,

          /*
            ==================================================
            KRİTİK BAĞLANTI
            ==================================================

            Bundan sonra bu banka hareketinin
            hangi krediye ait olduğu kesin olarak
            belli olacak.
          */

          transferRef:
            `KREDI-ODEME-${kredi.id}`,
        },
      }),

      /*
        KREDİYİ GÜNCELLE
      */

      prisma.kredi.update({
        where: {
          id:
            kredi.id,
        },

        data: {
          kalanBorc:
            yeniKalan,

          odenenTaksitSayisi:
            yeniOdenenTaksit,

          sonrakiOdemeTarihi:
            yeniSonrakiOdemeTarihi,

          durum:
            yeniDurum,

          /*
            ROTATİF KREDİDE
            KULLANILAN LİMİT DE
            KALAN BORÇLA BİRLİKTE
            AZALSIN
          */

          ...(kredi.tip ===
          "ROTATIF"
            ? {
                kullanilanLimit:
                  yeniKalan,
              }
            : {}),
        },
      }),
    ]);

    /*
      ==================================================
      SAYFALARI YENİLE
      ==================================================
    */

    revalidatePath(
      `/beach/krediler/${kredi.id}`
    );

    revalidatePath(
      `/beach/krediler/${kredi.id}/odeme`
    );

    revalidatePath(
      "/beach/krediler"
    );

    revalidatePath(
      "/beach/banka"
    );

    revalidatePath(
      "/beach/kasa-banka"
    );

    revalidatePath(
      "/beach"
    );

    redirect(
      `/beach/krediler/${kredi.id}`
    );
  }

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-500";

  const labelClass =
    "mb-2 block text-sm font-bold text-slate-300";

  const kalanBorc =
    Number(
      kredi.kalanBorc
    );

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">

        {/* BAŞLIK */}

        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

          <div>

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
              Beach & Mağaza
            </p>

            <h1 className="mt-2 text-3xl font-black md:text-4xl">
              Kredi Ödemesi
            </h1>

            <p className="mt-2 text-slate-400">
              {kredi.ad}
            </p>

          </div>

          <a
            href={`/beach/krediler/${kredi.id}`}
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 transition hover:bg-slate-900"
          >
            ← Krediye Dön
          </a>

        </div>

        {/* KALAN BORÇ */}

        <div className="mb-7 rounded-2xl border border-red-900/50 bg-red-950/10 p-6">

          <p className="text-sm text-slate-400">
            Mevcut Kalan Borç
          </p>

          <p className="mt-2 text-4xl font-black text-red-400">
            {money(
              kalanBorc,
              kredi.paraBirimi
            )}
          </p>

          {kredi.aylikTaksit && (
            <p className="mt-3 text-sm text-slate-400">
              Aylık taksit:{" "}
              <span className="font-bold text-white">
                {money(
                  Number(
                    kredi.aylikTaksit
                  ),
                  kredi.paraBirimi
                )}
              </span>
            </p>
          )}

          {kredi.tip ===
            "TAKSITLI" && (
            <p className="mt-2 text-sm text-slate-400">
              Ödenen taksit:{" "}
              <span className="font-bold text-emerald-400">
                {
                  kredi.odenenTaksitSayisi
                }
              </span>

              {kredi.taksitSayisi
                ? ` / ${kredi.taksitSayisi}`
                : ""}
            </p>
          )}

        </div>

        {/* FORM */}

        <form
          action={
            krediOdemeKaydet
          }
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8"
        >

          <input
            type="hidden"
            name="krediId"
            value={
              kredi.id
            }
          />

          <div className="grid gap-5 md:grid-cols-2">

            {/* ÖDEME TUTARI */}

            <div>

              <label
                className={
                  labelClass
                }
              >
                Ödeme Tutarı *
              </label>

              <input
                name="odemeTutari"
                inputMode="decimal"
                required
                defaultValue={
                  kredi.aylikTaksit
                    ? Number(
                        kredi.aylikTaksit
                      ).toString()
                    : ""
                }
                placeholder="Örn: 65.000"
                className={
                  inputClass
                }
              />

              <p className="mt-2 text-xs text-slate-500">
                En fazla{" "}
                {money(
                  kalanBorc,
                  kredi.paraBirimi
                )}
              </p>

            </div>

            {/* TARİH */}

            <div>

              <label
                className={
                  labelClass
                }
              >
                Ödeme Tarihi *
              </label>

              <input
                type="date"
                name="odemeTarihi"
                defaultValue={
                  bugun
                }
                required
                className={
                  inputClass
                }
              />

            </div>

            {/* BANKA */}

            <div className="md:col-span-2">

              <label
                className={
                  labelClass
                }
              >
                Ödeme Yapılacak Banka *
              </label>

              <select
                name="finansHesapId"
                required
                defaultValue={
                  kredi.finansHesapId
                    ? String(
                        kredi.finansHesapId
                      )
                    : ""
                }
                className={
                  inputClass
                }
              >

                <option value="">
                  Banka hesabı seçiniz
                </option>

                {bankaHesaplari
                  .filter(
                    (banka) =>
                      banka.paraBirimi ===
                      kredi.paraBirimi
                  )
                  .map(
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
                        (
                        {
                          banka.paraBirimi
                        }
                        )
                      </option>
                    )
                  )}

              </select>

              <p className="mt-2 text-xs text-slate-500">
                Sadece krediyle aynı para
                birimindeki banka hesapları
                gösterilir.
              </p>

            </div>

          </div>

          {/* TAKSİT */}

          {kredi.tip ===
            "TAKSITLI" && (
            <div className="mt-6 rounded-xl border border-cyan-900/40 bg-cyan-950/10 p-5">

              <label className="flex cursor-pointer items-start gap-3">

                <input
                  type="checkbox"
                  name="taksitOdendi"
                  defaultChecked
                  className="mt-1 h-5 w-5"
                />

                <div>

                  <p className="font-bold text-cyan-300">
                    Bir taksit ödendi olarak işaretle
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    İşaretli olduğunda ödenen
                    taksit sayısı 1 artar ve
                    sonraki ödeme tarihi
                    otomatik olarak 1 ay ileri
                    alınır.
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Kısmi ödeme yapıyorsanız
                    bu işareti kaldırabilirsiniz.
                  </p>

                </div>

              </label>

            </div>
          )}

          {/* AÇIKLAMA */}

          <div className="mt-6">

            <label
              className={
                labelClass
              }
            >
              Açıklama
            </label>

            <textarea
              name="aciklama"
              rows={4}
              placeholder={`Örn: ${kredi.ad} kredi taksiti`}
              className={
                inputClass
              }
            />

            <p className="mt-2 text-xs text-slate-500">
              Boş bırakırsanız sistem otomatik
              olarak kredi ödeme açıklaması
              oluşturur.
            </p>

          </div>

          {/* SONUÇ BİLGİ */}

          <div className="mt-6 rounded-xl border border-emerald-900/50 bg-emerald-950/10 p-5">

            <p className="font-bold text-emerald-300">
              Bu işlem ne yapacak?
            </p>

            <div className="mt-3 space-y-2 text-sm leading-6 text-slate-400">

              <p>
                • Kredi kalan borcu ödeme
                tutarı kadar azalacak.
              </p>

              <p>
                • Seçilen banka hesabından
                aynı tutarda çıkış yapılacak.
              </p>

              <p>
                • Banka hareketi bu krediye
                doğrudan bağlanacak.
              </p>

              {kredi.tip ===
                "TAKSITLI" && (
                <p>
                  • Taksit seçeneği işaretliyse
                  ödenen taksit sayısı artacak
                  ve sonraki ödeme tarihi 1 ay
                  ileri alınacak.
                </p>
              )}

              {kredi.tip ===
                "ROTATIF" && (
                <p>
                  • Rotatif kredide kullanılan
                  limit de ödeme tutarı kadar
                  azalacak.
                </p>
              )}

              <p>
                • Kalan borç sıfıra düşerse
                kredi otomatik olarak Kapandı
                durumuna geçecek.
              </p>

            </div>

          </div>

          {/* KRİTİK BAĞLANTI BİLGİSİ */}

          <div className="mt-5 rounded-xl border border-violet-900/50 bg-violet-950/10 p-5">

            <p className="font-bold text-violet-300">
              Kredi ↔ Banka Bağlantısı
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Bu ödemeden itibaren banka
              hareketleri kredi kaydıyla ID
              üzerinden bağlanır. Böylece kredi
              silme veya bağlı kayıt kontrolünde
              başka banka hareketlerinin
              karışması önlenir.
            </p>

          </div>

          {/* BUTONLAR */}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">

            <button
              type="submit"
              className="flex-1 rounded-xl bg-emerald-500 px-6 py-4 text-lg font-black text-slate-950 transition hover:bg-emerald-400"
            >
              Ödemeyi Kaydet
            </button>

            <a
              href={`/beach/krediler/${kredi.id}`}
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