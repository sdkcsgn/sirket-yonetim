import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function parseNumber(
  formData: FormData,
  name: string
) {
  const raw = String(
    formData.get(name) ?? ""
  ).trim();

  if (!raw) {
    return null;
  }

  let normalized = raw.replace(/\s/g, "");

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
    : null;
}

function parseIntValue(
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
    Number(raw);

  if (
    !Number.isInteger(value) ||
    value < 0
  ) {
    return null;
  }

  return value;
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

function dateInput(
  value: Date | null
) {
  if (!value) {
    return "";
  }

  const year =
    value.getFullYear();

  const month =
    String(
      value.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      value.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function krediTipiAdi(
  tip: string
) {
  switch (tip) {
    case "TAKSITLI":
      return "Taksitli Kredi";

    case "SPOT":
      return "Spot Kredi";

    case "ROTATIF":
      return "Rotatif Kredi";

    default:
      return tip;
  }
}

export default async function KrediDuzenlePage({
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

        paraBirimi:
          kredi.paraBirimi,
      },

      orderBy: {
        ad: "asc",
      },
    });

  /*
    ==================================================
    KREDİ GÜNCELLE
    ==================================================
  */

  async function krediGuncelle(
    formData: FormData
  ) {
    "use server";

    const krediId =
      Number(
        formData.get(
          "krediId"
        )
      );

    if (
      !Number.isInteger(
        krediId
      ) ||
      krediId <= 0
    ) {
      throw new Error(
        "Geçersiz kredi."
      );
    }

    const mevcutKredi =
      await prisma.kredi.findUnique({
        where: {
          id: krediId,
        },

        include: {
          sirket: true,
        },
      });

    if (
      !mevcutKredi ||
      mevcutKredi.sirket.kod !==
        "BEACH"
    ) {
      throw new Error(
        "Kredi bulunamadı."
      );
    }

    /*
      TEMEL ALANLAR
    */

    const ad =
      String(
        formData.get(
          "ad"
        ) ?? ""
      ).trim();

    if (!ad) {
      throw new Error(
        "Kredi adı zorunludur."
      );
    }

    const krediNo =
      String(
        formData.get(
          "krediNo"
        ) ?? ""
      ).trim() || null;

    const aciklama =
      String(
        formData.get(
          "aciklama"
        ) ?? ""
      ).trim() || null;

    const faizOrani =
      parseNumber(
        formData,
        "faizOrani"
      );

    if (
      faizOrani !== null &&
      faizOrani < 0
    ) {
      throw new Error(
        "Faiz oranı negatif olamaz."
      );
    }

    /*
      TARİHLER
    */

    const baslangicTarihi =
      parseDate(
        formData,
        "baslangicTarihi"
      );

    if (!baslangicTarihi) {
      throw new Error(
        "Başlangıç tarihi zorunludur."
      );
    }

    const vadeTarihi =
      parseDate(
        formData,
        "vadeTarihi"
      );

    const sonrakiOdemeTarihi =
      parseDate(
        formData,
        "sonrakiOdemeTarihi"
      );

    /*
      BANKA
    */

    const finansHesapRaw =
      String(
        formData.get(
          "finansHesapId"
        ) ?? ""
      ).trim();

    const finansHesapId =
      finansHesapRaw
        ? Number(
            finansHesapRaw
          )
        : null;

    if (
      finansHesapId !==
      null
    ) {
      const banka =
        await prisma.finansHesap.findFirst({
          where: {
            id:
              finansHesapId,

            sirketId:
              mevcutKredi.sirketId,

            aktif: true,

            tip: "BANKA",

            paraBirimi:
              mevcutKredi.paraBirimi,
          },
        });

      if (!banka) {
        throw new Error(
          "Seçilen banka hesabı uygun değil."
        );
      }
    }

    /*
      ==============================================
      DAHA ÖNCE ÖDENEN TUTAR
      ==============================================

      Örnek:

      Ana Para: 1.000.000
      Kalan:     935.000

      Ödenen:     65.000

      Ana para değiştirilse bile
      65.000 TL ödenmiş tutarı koruyoruz.
    */

    const eskiAnaPara =
      Number(
        mevcutKredi.anaPara
      );

    const eskiKalan =
      Number(
        mevcutKredi.kalanBorc
      );

    const odenmisTutar =
      Math.max(
        0,
        eskiAnaPara -
          eskiKalan
      );

    /*
      ORTAK DEĞERLER
    */

    let yeniAnaPara =
      eskiAnaPara;

    let yeniKalanBorc =
      eskiKalan;

    let taksitSayisi =
      mevcutKredi.taksitSayisi;

    let aylikTaksit:
      number | null =
      mevcutKredi.aylikTaksit
        ? Number(
            mevcutKredi.aylikTaksit
          )
        : null;

    let krediLimiti:
      number | null =
      mevcutKredi.krediLimiti
        ? Number(
            mevcutKredi.krediLimiti
          )
        : null;

    let kullanilanLimit:
      number | null =
      mevcutKredi.kullanilanLimit
        ? Number(
            mevcutKredi.kullanilanLimit
          )
        : null;

    /*
      ==============================================
      TAKSİTLİ
      ==============================================
    */

    if (
      mevcutKredi.tip ===
      "TAKSITLI"
    ) {
      const anaPara =
        parseNumber(
          formData,
          "anaPara"
        );

      if (
        anaPara === null ||
        anaPara <= 0
      ) {
        throw new Error(
          "Ana para sıfırdan büyük olmalıdır."
        );
      }

      if (
        anaPara <
        odenmisTutar
      ) {
        throw new Error(
          "Ana para daha önce ödenmiş tutardan küçük olamaz."
        );
      }

      yeniAnaPara =
        anaPara;

      yeniKalanBorc =
        Math.max(
          0,
          anaPara -
            odenmisTutar
        );

      taksitSayisi =
        parseIntValue(
          formData,
          "taksitSayisi"
        );

      const girilenAylik =
        parseNumber(
          formData,
          "aylikTaksit"
        );

      aylikTaksit =
        girilenAylik !==
          null &&
        girilenAylik > 0
          ? girilenAylik
          : null;

      if (
        taksitSayisi !==
          null &&
        taksitSayisi <
          mevcutKredi.odenenTaksitSayisi
      ) {
        throw new Error(
          `Taksit sayısı, ödenmiş ${mevcutKredi.odenenTaksitSayisi} taksitten küçük olamaz.`
        );
      }
    }

    /*
      ==============================================
      SPOT
      ==============================================
    */

    if (
      mevcutKredi.tip ===
      "SPOT"
    ) {
      const anaPara =
        parseNumber(
          formData,
          "anaPara"
        );

      if (
        anaPara === null ||
        anaPara <= 0
      ) {
        throw new Error(
          "Ana para sıfırdan büyük olmalıdır."
        );
      }

      if (
        anaPara <
        odenmisTutar
      ) {
        throw new Error(
          "Ana para daha önce ödenmiş tutardan küçük olamaz."
        );
      }

      yeniAnaPara =
        anaPara;

      yeniKalanBorc =
        Math.max(
          0,
          anaPara -
            odenmisTutar
        );

      if (!vadeTarihi) {
        throw new Error(
          "Spot kredide vade tarihi zorunludur."
        );
      }
    }

    /*
      ==============================================
      ROTATİF
      ==============================================
    */

    if (
      mevcutKredi.tip ===
      "ROTATIF"
    ) {
      const yeniLimit =
        parseNumber(
          formData,
          "krediLimiti"
        );

      const yeniKullanilan =
        parseNumber(
          formData,
          "kullanilanLimit"
        );

      if (
        yeniLimit === null ||
        yeniLimit <= 0
      ) {
        throw new Error(
          "Kredi limiti sıfırdan büyük olmalıdır."
        );
      }

      if (
        yeniKullanilan ===
          null ||
        yeniKullanilan < 0
      ) {
        throw new Error(
          "Kullanılan limit geçersiz."
        );
      }

      if (
        yeniKullanilan >
        yeniLimit
      ) {
        throw new Error(
          "Kullanılan limit kredi limitinden büyük olamaz."
        );
      }

      krediLimiti =
        yeniLimit;

      kullanilanLimit =
        yeniKullanilan;

      yeniAnaPara =
        yeniLimit;

      yeniKalanBorc =
        yeniKullanilan;
    }

    /*
      DURUM
    */

    const yeniDurum =
      yeniKalanBorc <= 0
        ? "KAPANDI"
        : "AKTIF";

    /*
      ==============================================
      GÜNCELLE
      ==============================================
    */

    await prisma.kredi.update({
      where: {
        id:
          mevcutKredi.id,
      },

      data: {
        finansHesapId,

        ad,

        krediNo,

        faizOrani,

        baslangicTarihi,

        vadeTarihi,

        sonrakiOdemeTarihi:
          yeniDurum ===
          "KAPANDI"
            ? null
            : sonrakiOdemeTarihi,

        aciklama,

        anaPara:
          yeniAnaPara,

        kalanBorc:
          yeniKalanBorc,

        durum:
          yeniDurum,

        ...(mevcutKredi.tip ===
        "TAKSITLI"
          ? {
              taksitSayisi,

              aylikTaksit,
            }
          : {}),

        ...(mevcutKredi.tip ===
        "ROTATIF"
          ? {
              krediLimiti,

              kullanilanLimit,
            }
          : {}),
      },
    });

    /*
      SAYFALARI YENİLE
    */

    revalidatePath(
      "/beach"
    );

    revalidatePath(
      "/beach/krediler"
    );

    revalidatePath(
      `/beach/krediler/${mevcutKredi.id}`
    );

    revalidatePath(
      `/beach/krediler/${mevcutKredi.id}/duzenle`
    );

    redirect(
      `/beach/krediler/${mevcutKredi.id}`
    );
  }

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-amber-500";

  const labelClass =
    "mb-2 block text-sm font-bold text-slate-300";

  const odenmisTutar =
    Math.max(
      0,
      Number(
        kredi.anaPara
      ) -
        Number(
          kredi.kalanBorc
        )
    );

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">

        {/* BAŞLIK */}

        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

          <div>

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-400">
              Beach & Mağaza
            </p>

            <h1 className="mt-2 text-3xl font-black md:text-4xl">
              Kredi Düzelt
            </h1>

            <p className="mt-2 text-slate-400">
              {kredi.ad}
            </p>

          </div>

          <a
            href={`/beach/krediler/${kredi.id}`}
            className="rounded-xl border border-slate-700 px-5 py-3 font-bold text-slate-300 hover:bg-slate-900"
          >
            ← Krediye Dön
          </a>

        </div>

        {/* UYARI */}

        <div className="mb-6 rounded-2xl border border-amber-900/50 bg-amber-950/10 p-5">

          <p className="font-black text-amber-400">
            Mevcut ödeme korunacak
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Bu kredi için daha önce{" "}
            <strong className="text-white">
              {new Intl.NumberFormat(
                "tr-TR",
                {
                  style:
                    "currency",
                  currency:
                    kredi.paraBirimi,
                }
              ).format(
                odenmisTutar
              )}
            </strong>{" "}
            ödeme yapılmış durumda.
            Ana para değiştirilse bile
            ödenmiş bu tutar silinmez.
          </p>

        </div>

        {/* FORM */}

        <form
          action={
            krediGuncelle
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

          {/* KREDİ TİPİ */}

          <div className="mb-7 rounded-xl border border-slate-800 bg-slate-950/50 p-4">

            <p className="text-xs font-bold uppercase text-slate-500">
              Kredi Tipi
            </p>

            <p className="mt-2 font-black text-violet-400">
              {krediTipiAdi(
                kredi.tip
              )}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Kredi tipi düzeltme
              sırasında değiştirilmez.
            </p>

          </div>

          <div className="grid gap-6 md:grid-cols-2">

            {/* KREDİ ADI */}

            <div>

              <label className={labelClass}>
                Kredi Adı *
              </label>

              <input
                name="ad"
                required
                defaultValue={
                  kredi.ad
                }
                className={
                  inputClass
                }
              />

            </div>

            {/* KREDİ NO */}

            <div>

              <label className={labelClass}>
                Kredi No
              </label>

              <input
                name="krediNo"
                defaultValue={
                  kredi.krediNo ||
                  ""
                }
                className={
                  inputClass
                }
              />

            </div>

            {/* BANKA */}

            <div>

              <label className={labelClass}>
                Banka Hesabı
              </label>

              <select
                name="finansHesapId"
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
                  Banka seçilmedi
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

            {/* PARA BİRİMİ */}

            <div>

              <label className={labelClass}>
                Para Birimi
              </label>

              <input
                value={
                  kredi.paraBirimi
                }
                disabled
                className={`${inputClass} cursor-not-allowed opacity-60`}
              />

              <p className="mt-2 text-xs text-slate-500">
                Mevcut ödeme hareketleri nedeniyle
                para birimi buradan değiştirilmez.
              </p>

            </div>

            {/* ANA PARA */}

            {(kredi.tip ===
              "TAKSITLI" ||
              kredi.tip ===
                "SPOT") && (
              <div>

                <label className={labelClass}>
                  Ana Para *
                </label>

                <input
                  name="anaPara"
                  inputMode="decimal"
                  required
                  defaultValue={Number(
                    kredi.anaPara
                  ).toString()}
                  className={
                    inputClass
                  }
                />

              </div>
            )}

            {/* FAİZ */}

            <div>

              <label className={labelClass}>
                Faiz Oranı
              </label>

              <input
                name="faizOrani"
                inputMode="decimal"
                defaultValue={
                  kredi.faizOrani !==
                  null
                    ? Number(
                        kredi.faizOrani
                      ).toString()
                    : ""
                }
                placeholder="Örn: 42,5"
                className={
                  inputClass
                }
              />

            </div>

            {/* TAKSİT SAYISI */}

            {kredi.tip ===
              "TAKSITLI" && (
              <div>

                <label className={labelClass}>
                  Taksit Sayısı
                </label>

                <input
                  type="number"
                  min={
                    kredi.odenenTaksitSayisi
                  }
                  name="taksitSayisi"
                  defaultValue={
                    kredi.taksitSayisi ??
                    ""
                  }
                  className={
                    inputClass
                  }
                />

                <p className="mt-2 text-xs text-slate-500">
                  Ödenmiş taksit:{" "}
                  {
                    kredi.odenenTaksitSayisi
                  }
                </p>

              </div>
            )}

            {/* AYLIK TAKSİT */}

            {kredi.tip ===
              "TAKSITLI" && (
              <div>

                <label className={labelClass}>
                  Aylık Taksit
                </label>

                <input
                  name="aylikTaksit"
                  inputMode="decimal"
                  defaultValue={
                    kredi.aylikTaksit
                      ? Number(
                          kredi.aylikTaksit
                        ).toString()
                      : ""
                  }
                  className={
                    inputClass
                  }
                />

              </div>
            )}

            {/* ROTATİF LİMİT */}

            {kredi.tip ===
              "ROTATIF" && (
              <>
                <div>

                  <label className={labelClass}>
                    Kredi Limiti *
                  </label>

                  <input
                    name="krediLimiti"
                    inputMode="decimal"
                    required
                    defaultValue={
                      kredi.krediLimiti
                        ? Number(
                            kredi.krediLimiti
                          ).toString()
                        : ""
                    }
                    className={
                      inputClass
                    }
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
                    defaultValue={
                      kredi.kullanilanLimit
                        ? Number(
                            kredi.kullanilanLimit
                          ).toString()
                        : "0"
                    }
                    className={
                      inputClass
                    }
                  />

                </div>
              </>
            )}

            {/* BAŞLANGIÇ */}

            <div>

              <label className={labelClass}>
                Başlangıç Tarihi *
              </label>

              <input
                type="date"
                name="baslangicTarihi"
                required
                defaultValue={dateInput(
                  kredi.baslangicTarihi
                )}
                className={
                  inputClass
                }
              />

            </div>

            {/* VADE */}

            <div>

              <label className={labelClass}>
                Vade Tarihi
              </label>

              <input
                type="date"
                name="vadeTarihi"
                defaultValue={dateInput(
                  kredi.vadeTarihi
                )}
                className={
                  inputClass
                }
              />

            </div>

            {/* SONRAKİ ÖDEME */}

            <div>

              <label className={labelClass}>
                Sonraki Ödeme Tarihi
              </label>

              <input
                type="date"
                name="sonrakiOdemeTarihi"
                defaultValue={dateInput(
                  kredi.sonrakiOdemeTarihi
                )}
                className={
                  inputClass
                }
              />

            </div>

            {/* DURUM */}

            <div>

              <label className={labelClass}>
                Mevcut Durum
              </label>

              <input
                value={
                  kredi.durum ===
                  "AKTIF"
                    ? "Aktif"
                    : "Kapandı"
                }
                disabled
                className={`${inputClass} cursor-not-allowed opacity-60`}
              />

            </div>

            {/* AÇIKLAMA */}

            <div className="md:col-span-2">

              <label className={labelClass}>
                Açıklama
              </label>

              <textarea
                name="aciklama"
                rows={4}
                defaultValue={
                  kredi.aciklama ||
                  ""
                }
                className={
                  inputClass
                }
              />

            </div>

          </div>

          {/* BİLGİ */}

          <div className="mt-7 rounded-xl border border-cyan-900/40 bg-cyan-950/10 p-5">

            <p className="font-black text-cyan-400">
              Düzeltme Mantığı
            </p>

            <div className="mt-3 space-y-2 text-sm leading-6 text-slate-400">

              <p>
                • Daha önce yapılmış banka
                ödeme hareketleri silinmez.
              </p>

              <p>
                • Ödenmiş tutar korunur.
              </p>

              <p>
                • Ana para değiştirilirse kalan
                borç otomatik yeniden hesaplanır.
              </p>

              <p>
                • Kalan borç sıfır olursa kredi
                otomatik Kapandı durumuna geçer.
              </p>

            </div>

          </div>

          {/* BUTONLAR */}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">

            <button
              type="submit"
              className="flex-1 rounded-xl bg-amber-500 px-6 py-4 text-lg font-black text-slate-950 hover:bg-amber-400"
            >
              Değişiklikleri Kaydet
            </button>

            <a
              href={`/beach/krediler/${kredi.id}`}
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