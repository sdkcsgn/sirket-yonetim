"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseMoney(
  value: FormDataEntryValue | null
) {
  const raw = String(value ?? "")
    .trim()
    .replace(/\./g, "")
    .replace(",", ".");

  const number = Number(raw);

  if (
    !Number.isFinite(number) ||
    number <= 0
  ) {
    throw new Error(
      "Geçerli bir tutar giriniz."
    );
  }

  return number;
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

function odemeSekliAdi(
  odemeSekli: string
) {
  switch (odemeSekli) {
    case "NAKIT":
      return "Nakit";
    case "EFT_HAVALE":
      return "EFT / Havale";
    case "KREDI_KARTI":
      return "Kredi Kartı";
    case "ACIK_HESAP":
      return "Açık Hesap";
    default:
      return odemeSekli;
  }
}

export async function giderKaydet(
  formData: FormData
) {
  const sirket =
    await prisma.sirket.findUnique({
      where: {
        kod: "HAL",
      },
    });

  if (!sirket) {
    throw new Error(
      "HAL şirketi bulunamadı."
    );
  }

  const tip = String(
    formData.get("tip") ?? ""
  ).trim();

  const odemeSekli = String(
    formData.get("odemeSekli") ?? ""
  ).trim();

  const tarihRaw = String(
    formData.get("tarih") ?? ""
  ).trim();

  const aciklama = String(
    formData.get("aciklama") ?? ""
  ).trim();

  const belgeNo = String(
    formData.get("belgeNo") ?? ""
  ).trim();

  const faturaNo = String(
    formData.get("faturaNo") ?? ""
  ).trim();

  const cariIdRaw = String(
    formData.get("cariId") ?? ""
  ).trim();

  const finansHesapIdRaw = String(
    formData.get("finansHesapId") ?? ""
  ).trim();

  const tutar = parseMoney(
    formData.get("tutar")
  );

  const izinliOdemeSekilleri = [
    "NAKIT",
    "EFT_HAVALE",
    "KREDI_KARTI",
    "ACIK_HESAP",
  ];

  if (!tip) {
    throw new Error(
      "Gider tipi seçiniz."
    );
  }

  if (
    !izinliOdemeSekilleri.includes(
      odemeSekli
    )
  ) {
    throw new Error(
      "Ödeme şekli seçiniz."
    );
  }

  if (!tarihRaw) {
    throw new Error(
      "Tarih seçiniz."
    );
  }

  if (!aciklama) {
    throw new Error(
      "Açıklama giriniz."
    );
  }

  const tarih = new Date(
    `${tarihRaw}T12:00:00`
  );

  if (
    Number.isNaN(
      tarih.getTime()
    )
  ) {
    throw new Error(
      "Geçersiz tarih."
    );
  }

  const cariId =
    cariIdRaw
      ? Number(cariIdRaw)
      : null;

  const finansHesapId =
    finansHesapIdRaw
      ? Number(finansHesapIdRaw)
      : null;

  if (
    odemeSekli === "ACIK_HESAP" &&
    !cariId
  ) {
    throw new Error(
      "Açık hesap giderinde cari seçmelisiniz."
    );
  }

  if (
    odemeSekli === "ACIK_HESAP" &&
    finansHesapId
  ) {
    throw new Error(
      "Açık hesapta finans hesabı seçilmez."
    );
  }

  if (
    odemeSekli !== "ACIK_HESAP" &&
    !finansHesapId
  ) {
    throw new Error(
      "Ödeme yapılacak finans hesabını seçmelisiniz."
    );
  }

  let cari = null;
  let finansHesap = null;

  if (cariId) {
    cari =
      await prisma.cari.findUnique({
        where: {
          id: cariId,
        },
      });

    if (!cari) {
      throw new Error(
        "Seçilen cari bulunamadı."
      );
    }

    if (
      cari.sirketId !==
      sirket.id
    ) {
      throw new Error(
        "Seçilen cari bu şirkete ait değil."
      );
    }

    if (!cari.aktif) {
      throw new Error(
        "Pasif cariye gider kaydı yapılamaz."
      );
    }
  }

  if (finansHesapId) {
    finansHesap =
      await prisma.finansHesap.findUnique({
        where: {
          id: finansHesapId,
        },
      });

    if (!finansHesap) {
      throw new Error(
        "Seçilen finans hesabı bulunamadı."
      );
    }

    if (
      finansHesap.sirketId !==
      sirket.id
    ) {
      throw new Error(
        "Finans hesabı bu şirkete ait değil."
      );
    }

    if (!finansHesap.aktif) {
      throw new Error(
        "Pasif finans hesabı kullanılamaz."
      );
    }

    if (
      odemeSekli === "NAKIT" &&
      finansHesap.tip !== "KASA"
    ) {
      throw new Error(
        "Nakit ödeme için kasa hesabı seçmelisiniz."
      );
    }

    if (
      odemeSekli === "EFT_HAVALE" &&
      finansHesap.tip !== "BANKA"
    ) {
      throw new Error(
        "EFT / Havale için banka hesabı seçmelisiniz."
      );
    }

    if (
      odemeSekli === "KREDI_KARTI" &&
      finansHesap.tip !== "KREDI_KARTI"
    ) {
      throw new Error(
        "Kredi kartı ödemesi için kredi kartı hesabı seçmelisiniz."
      );
    }
  }

  const tipAdi =
    giderTipiAdi(tip);

  const odemeAdi =
    odemeSekliAdi(
      odemeSekli
    );

  const gider =
    await prisma.$transaction(
      async (tx) => {
        const yeniGider =
          await tx.gider.create({
            data: {
              sirketId:
                sirket.id,

              cariId:
                cari?.id ?? null,

              finansHesapId:
                finansHesap?.id ??
                null,

              tip:
                tip as any,

              odemeSekli:
                odemeSekli as any,

              tarih,

              aciklama,

              belgeNo:
                belgeNo || null,

              faturaNo:
                faturaNo || null,

              tutar,
            },
          });

        /*
          CARİ SEÇİLDİYSE:
          GİDER ÖNCE ALACAK YAZILIR
        */
        if (cari) {
          await tx.cariHareket.create({
            data: {
              cariId:
                cari.id,

              tarih,

              tip:
                "ALACAK",

              islemTuru:
                "GIDER",

              aciklama:
                `[Gider - ${tipAdi} - ${odemeAdi}] ${aciklama}`,

              belgeNo:
                belgeNo ||
                faturaNo ||
                null,

              borc:
                0,

              alacak:
                tutar,
            },
          });
        }

        /*
          AÇIK HESAP DEĞİLSE:
          PARA FİNANS HESABINDAN ÇIKAR
        */
        if (
          odemeSekli !==
            "ACIK_HESAP" &&
          finansHesap
        ) {
          await tx.finansHareket.create({
            data: {
              finansHesapId:
                finansHesap.id,

              cariId:
                cari?.id ??
                null,

              tarih,

              tip:
                "CIKIS",

              tutar,

              aciklama:
                `[Gider Ödemesi - ${tipAdi} - ${odemeAdi}] ${aciklama}`,

              belgeNo:
                belgeNo ||
                faturaNo ||
                null,

              transferRef:
                `GIDER-${yeniGider.id}`,
            },
          });

          /*
            CARİ VARSA:
            ÖDEMEYLE CARİ BAKİYE KAPANIR
          */
          if (cari) {
            await tx.cariHareket.create({
              data: {
                cariId:
                  cari.id,

                tarih,

                tip:
                  "BORC",

                islemTuru:
                  "GIDER_ODEME",

                aciklama:
                  `[Gider Ödemesi - ${odemeAdi}] ${tipAdi} - ${aciklama}`,

                belgeNo:
                  belgeNo ||
                  faturaNo ||
                  null,

                borc:
                  tutar,

                alacak:
                  0,
              },
            });
          }
        }

        return yeniGider;
      }
    );

  revalidatePath("/hal");
  revalidatePath("/hal/giderler");
  revalidatePath("/hal/giderler/yeni");
  revalidatePath("/hal/kasa-banka");
  revalidatePath("/hal/cariler");

  if (cariId) {
    revalidatePath(
      `/hal/cariler/${cariId}`
    );
  }

  redirect(
    `/hal/giderler/${gider.id}`
  );
}