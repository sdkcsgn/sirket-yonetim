import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import CariHareketSilButonu from "./CariHareketSilButonu";
import CariEkstreExcelButonu from "./CariEkstreExcelButonu";


type Props = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    uyari?: string;
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

function cariTipi(tip: string) {
  switch (tip) {
    case "MUSTERI":
      return "Müşteri";

    case "URETICI":
      return "Üretici";

    case "SATICI":
      return "Satıcı";

    case "UYE":
      return "Üye";

    case "BANKA":
      return "Banka";

    case "PERSONEL":
      return "Personel";

    case "YARDIMCI_HESAP":
      return "Yardımcı Hesap";

    case "DIGER":
      return "Diğer";

    default:
      return tip;
  }
}

function hareketIsmi(
  aciklama: string,
  tip: string
) {
  if (aciklama.startsWith("[Cari Fiş]")) {
    return "Cari Fiş";
  }
  if (aciklama.startsWith("[Satış]")) {
    return "Satış";
  }

  if (aciklama.startsWith("[Alış]")) {
    return "Alış";
  }

  if (aciklama.startsWith("[Tahsilat]")) {
    return "Tahsilat";
  }

  if (aciklama.startsWith("[Ödeme]")) {
    return "Ödeme";
  }

  if (
    aciklama.startsWith(
      "[Geri Alındı]"
    )
  ) {
    return "Geri Alındı";
  }

  if (
    aciklama.startsWith(
      "[Devir Borç]"
    )
  ) {
    return "Devir Borç";
  }

  if (
    aciklama.startsWith(
      "[Devir Alacak]"
    )
  ) {
    return "Devir Alacak";
  }

  if (
    aciklama.startsWith(
      "[Alınan Çek]"
    )
  ) {
    return "Alınan Çek";
  }

  if (
    aciklama.startsWith(
      "[Verilen Çek]"
    )
  ) {
    return "Verilen Çek";
  }

  if (
    aciklama.startsWith(
      "[Ciro Çek Karşılıksız]"
    )
  ) {
    return "Ciro Çek Karşılıksız";
  }

  if (
    aciklama.startsWith(
      "[Ciro Çek İptal]"
    )
  ) {
    return "Ciro Çek İptal";
  }

  if (
    aciklama.startsWith(
      "[Ciro Çek]"
    )
  ) {
    return "Ciro Çek";
  }

  return tip === "BORC"
    ? "Borç"
    : "Alacak";
}

function temizAciklama(
  aciklama: string
) {
  return aciklama.replace(
    /^\[[^\]]+\]\s*/,
    ""
  );
}


function otomatikCariHareketMi(
  aciklama: string,
  islemTuru: string | null
) {
  if (
    aciklama.startsWith("[Satış]") ||
    aciklama.startsWith("[Alış]") ||
    aciklama.startsWith("[Tahsilat]") ||
    aciklama.startsWith("[Ödeme]") ||
    aciklama.startsWith("[Alınan Çek]") ||
    aciklama.startsWith("[Verilen Çek]") ||
    aciklama.startsWith("[Ciro Çek]") ||
    aciklama.startsWith("[Ciro Çek Karşılıksız]") ||
    aciklama.startsWith("[Ciro Çek İptal]") ||
    aciklama.startsWith("[Geri Alındı]")
  ) {
    return true;
  }

  if (
    islemTuru === "GELEN_EFT" ||
    islemTuru === "GIDEN_EFT" ||
    islemTuru === "NAKIT_TAHSILAT" ||
    islemTuru === "NAKIT_ODEME" ||
    islemTuru === "FINANS_GIRIS" ||
    islemTuru === "FINANS_CIKIS" ||
    islemTuru === "FINANS_GERI_AL" ||
    islemTuru === "CARI_GERI_AL"
  ) {
    return true;
  }

  return false;
}
export default async function CariDetayPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const { uyari } = await searchParams;
const cariId = Number(id);
  if (!Number.isInteger(cariId)) {
    notFound();
  }

  /*
    ==================================================
    CARİ HAREKET GERİ AL
    ==================================================
  */


async function hareketGeriAl(formData: FormData) {
  "use server";

  const hareketId = Number(formData.get("hareketId"));

  if (!Number.isInteger(hareketId) || hareketId <= 0) {
    throw new Error("Geçersiz cari hareketi.");
  }

  const hareket = await prisma.cariHareket.findUnique({
    where: {
      id: hareketId,
    },
    include: {
      cari: true,
    },
  });

  if (!hareket || hareket.cariId !== cariId) {
    throw new Error("Cari hareketi bulunamadı.");
  }

  /*
    Otomatik kaynaklı hareketleri tek başına
    geri almıyoruz. Bunlarda Sil kullanılabilir.
  */
  if (
    otomatikCariHareketMi(
      hareket.aciklama,
      hareket.islemTuru
    )
  ) {
    throw new Error(
      "Bu hareket otomatik kaynaklıdır. Geri Al yerine Sil kullanabilirsiniz."
    );
  }

  /*
    Cari fişin daha önce geri alınıp alınmadığını kontrol et.
  */
  if (hareket.islemTuru === "CARI_FIS") {
    const yeniIsaret = `[Geri Alındı #${hareket.id}]`;
    const eskiAciklama = `[Geri Alındı] ${hareket.aciklama}`;

    const oncekiGeriAlma = await prisma.cariHareket.findFirst({
      where: {
        cariId: hareket.cariId,
        islemTuru: "CARI_GERI_AL",
        OR: [
          {
            aciklama: {
              startsWith: yeniIsaret,
            },
          },
          {
            aciklama: eskiAciklama,
          },
        ],
      },
    });

 if (oncekiGeriAlma) {
  redirect(`/hal/cariler/${cariId}?uyari=tekrar`);
}
  }

  const tersTip =
    hareket.tip === "BORC"
      ? "ALACAK"
      : "BORC";

  await prisma.cariHareket.create({
    data: {
      cariId: hareket.cariId,
      tarih: new Date(),
      tip: tersTip,
      islemTuru: "CARI_GERI_AL",

      aciklama:
        hareket.islemTuru === "CARI_FIS"
          ? `[Geri Alındı #${hareket.id}] ${hareket.aciklama}`
          : `[Geri Alındı] ${hareket.aciklama}`,

      belgeNo: hareket.belgeNo,

      borc:
        tersTip === "BORC"
          ? hareket.alacak
          : 0,

      alacak:
        tersTip === "ALACAK"
          ? hareket.borc
          : 0,
    },
  });

  revalidatePath(`/hal/cariler/${cariId}`);
  revalidatePath("/hal/cariler");
  revalidatePath("/hal");
}


  /*
    ==================================================
    CARİ HAREKET SİL
    ==================================================

    Kullanıcı isteği:
    Tüm cari hareketleri silinebilir.
  */

  async function hareketSil(
    formData: FormData
  ) {
    "use server";

    const hareketId = Number(
      formData.get("hareketId")
    );

    if (
      !Number.isInteger(hareketId) ||
      hareketId <= 0
    ) {
      throw new Error(
        "Geçersiz cari hareketi."
      );
    }

    const hareket =
      await prisma.cariHareket.findUnique({
        where: {
          id: hareketId,
        },

        include: {
          cari: true,
        },
      });

       if (!hareket || hareket.cariId !== cariId) {
      throw new Error("Cari hareketi bulunamadı.");
    }

    // Cari fiş yalnızca cari hareketi olarak silinir.
    // Kasa/banka hareketi aranmaz veya silinmez.
    if (hareket.islemTuru === "CARI_FIS") {
      await prisma.cariHareket.delete({
        where: { id: hareket.id },
      });

      revalidatePath(`/hal/cariler/${cariId}`);
      revalidatePath("/hal/cariler");
      revalidatePath("/hal");

      return;
    }

    /*
      --------------------------------------------------
      EŞLEŞEN KASA/BANKA HAREKETİNİ BUL
      --------------------------------------------------

      Tahsilat:
      Cari ALACAK
      Finans GİRİŞ

      Ödeme:
      Cari BORÇ
      Finans ÇIKIŞ
    */

    let finansHareketId:
      | number
      | null = null;

    const tutar =
      hareket.tip === "ALACAK"
        ? Number(hareket.alacak)
        : Number(hareket.borc);

    if (tutar > 0) {
      const finansTip =
        hareket.tip === "ALACAK"
          ? "GIRIS"
          : "CIKIS";

      const finansHareket =
        await prisma.finansHareket.findFirst({
          where: {
            cariId:
              hareket.cariId,

            tip:
              finansTip,

            tutar:
              hareket.tip === "ALACAK"
                ? hareket.alacak
                : hareket.borc,

            tarih:
              hareket.tarih,

            ...(hareket.belgeNo
              ? {
                  belgeNo:
                    hareket.belgeNo,
                }
              : {}),
          },

          orderBy: {
            id: "desc",
          },

          select: {
            id: true,
          },
        });

      if (finansHareket) {
        finansHareketId =
          finansHareket.id;
      }
    }

    await prisma.$transaction(
      async (tx) => {
        /*
          Eşleşen finans hareketi varsa
          onu da sil.
        */

        if (finansHareketId) {
          await tx.finansHareket.delete({
            where: {
              id:
                finansHareketId,
            },
          });
        }

        /*
          Cari hareketini sil.
        */

        await tx.cariHareket.delete({
          where: {
            id:
              hareket.id,
          },
        });
      }
    );

    revalidatePath(
      `/hal/cariler/${cariId}`
    );

    revalidatePath(
      "/hal/cariler"
    );

    revalidatePath(
      "/hal/banka"
    );

    revalidatePath(
      "/hal/kasa"
    );

    revalidatePath(
      "/hal"
    );
  }

  /*
    ==================================================
    CARİ VERİLERİ
    ==================================================
  */

  const cari =
    await prisma.cari.findUnique({
      where: {
        id: cariId,
      },

      include: {
        hareketler: {
          orderBy: [
            {
              tarih: "asc",
            },
            {
              id: "asc",
            },
          ],
        },
      },
    });

  if (!cari) {
    notFound();
  }

  /*
    ==================================================
    TOPLAMLAR
    ==================================================
  */

  const acilisBorc =
    Number(cari.acilisBorc);

  const acilisAlacak =
    Number(cari.acilisAlacak);

  let toplamBorc =
    acilisBorc;

  let toplamAlacak =
    acilisAlacak;

  for (
    const hareket of
      cari.hareketler
  ) {
    toplamBorc +=
      Number(
        hareket.borc
      );

    toplamAlacak +=
      Number(
        hareket.alacak
      );
  }

  const bakiye =
    toplamBorc -
    toplamAlacak;

  /*
    ==================================================
    YÜRÜYEN BAKİYE
    ==================================================
  */

  let yuruyenBakiye =
    acilisBorc -
    acilisAlacak;

  const hareketler =
    cari.hareketler.map(
      (hareket) => {
        yuruyenBakiye +=
          Number(
            hareket.borc
          ) -
          Number(
            hareket.alacak
          );

        return {
          ...hareket,
          yuruyenBakiye,
        };
      }
    );

  const gorunenHareketler = [
    ...hareketler,
  ].reverse();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {uyari === "tekrar" && (
  <div
    role="alert"
    className="mx-auto mt-6 max-w-4xl rounded-xl border border-amber-700 bg-amber-950/40 p-4 font-semibold text-amber-300"
  >
    ⚠️ Bu cari fiş daha önce geri alınmış.
  </div>
)}

      <div className="mx-auto w-full max-w-[1550px] px-4 py-8 md:px-6">

        {/* BAŞLIK */}

        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

          <div>

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Hal Komisyon & Soğuk Hava
            </p>

            <h1 className="mt-2 max-w-4xl text-3xl font-black leading-tight md:text-4xl">
              {cari.unvan}
            </h1>

            <div className="mt-4">

              <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-sm font-bold text-cyan-400">
                {cariTipi(
                  cari.tip
                )}
              </span>

              {!cari.aktif && (
                <span className="ml-2 rounded-full bg-amber-500/10 px-3 py-1 text-sm font-bold text-amber-400">
                  Pasif
                </span>
              )}

            </div>

          </div>

          <div className="flex flex-wrap gap-3">

            <a
              href="/hal/cariler"
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 transition hover:bg-slate-900"
            >
              ← Cari Listesi
            </a>

            <a
              href={`/hal/cariler/${cari.id}/duzenle`}
              className="rounded-xl border border-cyan-700 px-5 py-3 font-bold text-cyan-400 transition hover:bg-cyan-950/30"
            >
              Düzenle
            </a>

<a
  href={`/hal/cariler/${cari.id}/hareket-yeni`}
  className="rounded-xl bg-cyan-500 px-6 py-3 font-black text-slate-950 transition hover:bg-cyan-400"
>
  + Yeni Hareket
</a>

<a
  href={`/hal/cariler/${cari.id}/fis-yeni`}
  className="rounded-xl border border-emerald-700 px-5 py-3 font-bold text-emerald-400 transition hover:bg-emerald-950/30"
>
  + Cari Fişi
</a>
    

          
<CariEkstreExcelButonu
  cariUnvan={cari.unvan}
  acilisBorc={acilisBorc}
  acilisAlacak={acilisAlacak}
  hareketler={hareketler.map((hareket) => ({
    tarih: date(hareket.tarih),
    islem: hareketIsmi(hareket.aciklama, hareket.tip),
    aciklama: temizAciklama(hareket.aciklama),
    belgeNo: hareket.belgeNo ?? "",
    borc: Number(hareket.borc),
    alacak: Number(hareket.alacak),
    bakiye: Number(hareket.yuruyenBakiye),
  }))}
  />
           </div>
      </div>


<div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <p className="text-sm text-slate-400">
              Toplam Borç
            </p>

            <p className="mt-3 text-3xl font-black text-red-400">
              {money(
                toplamBorc
              )}
            </p>

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <p className="text-sm text-slate-400">
              Toplam Alacak
            </p>

            <p className="mt-3 text-3xl font-black text-emerald-400">
              {money(
                toplamAlacak
              )}
            </p>

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <p className="text-sm text-slate-400">
              Güncel Bakiye
            </p>

            <p
              className={`mt-3 text-3xl font-black ${
                bakiye > 0
                  ? "text-red-400"
                  : bakiye < 0
                  ? "text-emerald-400"
                  : "text-white"
              }`}
            >
              {money(
                Math.abs(
                  bakiye
                )
              )}
            </p>

            <p className="mt-2 text-sm text-slate-500">

              {bakiye > 0
                ? "Alacağımız"
                : bakiye < 0
                ? "Borcumuz"
                : "Hesap kapalı"}

            </p>

          </div>

        </div>

        {/* DETAY + HAREKET */}

        <div className="mt-8 grid gap-6 xl:grid-cols-[310px_minmax(0,1fr)]">

          {/* CARİ BİLGİLERİ */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

            <h2 className="text-lg font-bold">
              Cari Bilgileri
            </h2>

            <div className="mt-6 space-y-5 text-sm">

              <div>
                <p className="text-xs text-slate-500">
                  Atlas Kodu
                </p>

                <p className="mt-1 font-semibold">
                  {cari.atlasKodu ||
                    "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Yetkili
                </p>

                <p className="mt-1 font-semibold">
                  {cari.yetkili ||
                    "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  GSM
                </p>

                <p className="mt-1 font-semibold">
                  {cari.gsm ||
                    "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Telefon
                </p>

                <p className="mt-1 font-semibold">
                  {cari.telefon ||
                    "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  E-posta
                </p>

                <p className="mt-1 break-all font-semibold">
                  {cari.email ||
                    "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Vergi No / T.C.
                </p>

                <p className="mt-1 font-semibold">
                  {cari.vergiNo ||
                    cari.tcNo ||
                    "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Vergi Dairesi
                </p>

                <p className="mt-1 font-semibold">
                  {cari.vergiDairesi ||
                    "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Grup Kodu
                </p>

                <p className="mt-1 font-semibold">
                  {cari.grupKodu ||
                    "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Adres
                </p>

                <p className="mt-1 whitespace-pre-line font-semibold">
                  {cari.adres ||
                    "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Notlar
                </p>

                <p className="mt-1 whitespace-pre-line font-semibold">
                  {cari.notlar ||
                    "-"}
                </p>
              </div>

            </div>

          </div>

          {/* HAREKETLER */}

          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

            <div className="flex flex-col gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <h2 className="text-lg font-bold">
                  Cari Hareketleri
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Borç, alacak, satış,
                  tahsilat, ödeme ve çek
                  hareketleri
                </p>

              </div>

              <a
                href={`/hal/cariler/${cari.id}/hareket-yeni`}
                className="rounded-xl bg-cyan-500 px-4 py-2.5 text-center text-sm font-black text-slate-950"
              >
                + Yeni Hareket
              </a>

            </div>

            {/* AÇILIŞ */}

            <div className="grid gap-4 border-b border-slate-800 bg-slate-950/30 px-5 py-4 sm:grid-cols-3">

              <div>

                <p className="text-xs text-slate-500">
                  Açılış Borcu
                </p>

                <p className="mt-1 font-bold text-red-400">
                  {money(
                    acilisBorc
                  )}
                </p>

              </div>

              <div>

                <p className="text-xs text-slate-500">
                  Açılış Alacağı
                </p>

                <p className="mt-1 font-bold text-emerald-400">
                  {money(
                    acilisAlacak
                  )}
                </p>

              </div>

              <div>

                <p className="text-xs text-slate-500">
                  Açılış Bakiyesi
                </p>

                <p className="mt-1 font-bold">
                  {money(
                    Math.abs(
                      acilisBorc -
                        acilisAlacak
                    )
                  )}
                </p>

              </div>

            </div>

            {gorunenHareketler.length ===
            0 ? (
              <div className="p-14 text-center">

                <div className="text-4xl">
                  🧾
                </div>

                <h3 className="mt-4 text-xl font-bold">
                  Henüz cari hareketi yok
                </h3>

              </div>
            ) : (
              <table className="w-full table-fixed text-xs">

                <colgroup>
                  <col className="w-[9%]" />
                  <col className="w-[12%]" />
                  <col className="w-[23%]" />
                  <col className="w-[10%]" />
                  <col className="w-[11%]" />
                  <col className="w-[11%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                </colgroup>

                <thead>

                  <tr className="border-b border-slate-800 text-left text-slate-400">

                    <th className="px-3 py-3">
                      Tarih
                    </th>

                    <th className="px-3 py-3">
                      İşlem
                    </th>

                    <th className="px-3 py-3">
                      Açıklama
                    </th>

                    <th className="px-3 py-3">
                      Belge
                    </th>

                    <th className="px-3 py-3 text-right">
                      Borç
                    </th>

                    <th className="px-3 py-3 text-right">
                      Alacak
                    </th>

                    <th className="px-3 py-3 text-right">
                      Bakiye
                    </th>

                    <th className="px-3 py-3 text-right">
                      İşlem
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {gorunenHareketler.map(
                    (hareket) => {
                      const hareketAdi =
                        hareketIsmi(
                          hareket.aciklama,
                          hareket.tip
                        );

                      const borc =
                        Number(
                          hareket.borc
                        );

                      const alacak =
                        Number(
                          hareket.alacak
                        );

                      const otomatik =
                        otomatikCariHareketMi(
                          hareket.aciklama,
                          hareket.islemTuru
                        );

                      return (
                        <tr
                          key={
                            hareket.id
                          }
                          className="border-b border-slate-800/70 align-top transition hover:bg-slate-800/30"
                        >

                          {/* TARİH */}

                          <td className="px-3 py-4 text-slate-300">
                            {date(
                              hareket.tarih
                            )}
                          </td>

                          {/* İŞLEM */}

                          <td className="px-3 py-4">

                            <span
                              className={`inline-block rounded-full px-2 py-1 text-[10px] font-bold ${
                                hareketAdi ===
                                "Ciro Çek"
                                  ? "bg-violet-500/10 text-violet-400"
                                  : hareketAdi ===
                                      "Ciro Çek Karşılıksız" ||
                                    hareketAdi ===
                                      "Ciro Çek İptal"
                                  ? "bg-amber-500/10 text-amber-400"
                                  : hareket.tip ===
                                    "BORC"
                                  ? "bg-red-500/10 text-red-400"
                                  : "bg-emerald-500/10 text-emerald-400"
                              }`}
                            >
                              {
                                hareketAdi
                              }
                            </span>

                          </td>

                          {/* AÇIKLAMA */}

                          <td className="break-words px-3 py-4 font-semibold leading-5">
                            {temizAciklama(
                              hareket.aciklama
                            )}
                          </td>

                          {/* BELGE */}

                          <td className="break-words px-3 py-4 text-slate-400">
                            {hareket.belgeNo ||
                              "-"}
                          </td>

                          {/* BORÇ */}

                          <td className="break-words px-3 py-4 text-right font-bold text-red-400">

                            {borc > 0
                              ? money(
                                  borc
                                )
                              : "-"}

                          </td>

                          {/* ALACAK */}

                          <td className="break-words px-3 py-4 text-right font-bold text-emerald-400">

                            {alacak > 0
                              ? money(
                                  alacak
                                )
                              : "-"}

                          </td>

                          {/* BAKİYE */}

                          <td
                            className={`break-words px-3 py-4 text-right font-black ${
                              hareket.yuruyenBakiye >
                              0
                                ? "text-red-400"
                                : hareket.yuruyenBakiye <
                                  0
                                ? "text-emerald-400"
                                : "text-white"
                            }`}
                          >
                            {money(
                              Math.abs(
                                hareket.yuruyenBakiye
                              )
                            )}
                          </td>

                          {/* İŞLEMLER */}

                          <td className="px-2 py-4">

                            <div className="flex flex-col items-end gap-1.5">

                              {!otomatik ? (
                                <form
                                  action={
                                    hareketGeriAl
                                  }
                                >

                                  <input
                                    type="hidden"
                                    name="hareketId"
                                    value={
                                      hareket.id
                                    }
                                  />

                                  <button
                                    type="submit"
                                    className="w-[70px] rounded-md border border-amber-700 px-2 py-1.5 text-[10px] font-bold text-amber-400 hover:bg-amber-950/30"
                                  >
                                    Geri Al
                                  </button>

                                </form>
                              ) : (
                                <span className="rounded-md bg-slate-800 px-2 py-1.5 text-[10px] text-slate-500">
                                  Otomatik
                                </span>
                              )}

                              <form
                                action={
                                  hareketSil
                                }
                              >

                                <input
                                  type="hidden"
                                  name="hareketId"
                                  value={
                                    hareket.id
                                  }
                                />

                               <CariHareketSilButonu
  cariFisMi={hareket.islemTuru === "CARI_FIS"}
/>

                              </form>

                            </div>

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>
            )}

          </div>

        </div>

        {/* UYARI */}

        <div className="mt-6 rounded-xl border border-red-900/50 bg-red-950/10 p-4">

          <p className="text-sm font-black text-red-400">
            Cari Hareket Silme
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            Sil butonu seçilen cari hareketini
            kalıcı olarak kaldırır. Hareket bir
            kasa veya banka tahsilat/ödemesiyle
            eşleşiyorsa ilgili finans hareketi de
            kaldırılır.
          </p>

          <p className="mt-1 text-xs font-semibold leading-5 text-amber-400">
            Fatura veya çek kaynaklı hareket
            silindiğinde kaynak fatura veya çek
            belgesi sistemde kalabilir. Bu nedenle
            Sil özellikle yanlış veya test
            kayıtlarını temizlemek için
            kullanılmalıdır.
          </p>

        </div>

        {/* ALT BUTONLAR */}

        <div className="mt-8 flex flex-wrap justify-end gap-3">

          <a
            href={`/hal/cariler/${cari.id}/duzenle`}
            className="rounded-xl border border-cyan-700 px-5 py-3 font-bold text-cyan-400"
          >
            Cariyi Düzenle
          </a>

          <a
            href={`/hal/cariler/${cari.id}/sil`}
            className="rounded-xl border border-red-800 px-5 py-3 font-bold text-red-400"
          >
            Sil / Pasife Al
          </a>

        </div>

      </div>

    </main>
  );
}