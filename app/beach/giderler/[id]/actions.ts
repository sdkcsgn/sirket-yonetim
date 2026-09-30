"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

export async function giderSil(
  giderId: number
) {
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
    throw new Error(
      "Gider kaydı bulunamadı."
    );
  }

  const tipAdi =
    giderTipiAdi(
      gider.tip
    );

  await prisma.$transaction(
    async (tx) => {
      /*
        FİNANS HAREKETİNİ TERS KAYITLA DÜZELT
      */
      if (
        gider.finansHesapId
      ) {
        await tx.finansHareket.create({
          data: {
            finansHesapId:
              gider.finansHesapId,

            cariId:
              gider.cariId,

            tarih:
              new Date(),

            tip:
              "GIRIS",

            tutar:
              gider.tutar,

            aciklama:
              `[Gider Silme Düzeltmesi - ${tipAdi}] ${gider.aciklama}`,

            belgeNo:
              gider.belgeNo ||
              gider.faturaNo ||
              null,

            transferRef:
              `GIDER-SIL-${gider.id}`,
          },
        });
      }

      /*
        CARİ ALACAĞINI TERS KAYITLA KAPAT
      */
      if (
        gider.cariId
      ) {
        await tx.cariHareket.create({
          data: {
            cariId:
              gider.cariId,

            tarih:
              new Date(),

            tip:
              "BORC",

            islemTuru:
              "GIDER_SILME",

            aciklama:
              `[Gider Silme Düzeltmesi - ${tipAdi}] ${gider.aciklama}`,

            belgeNo:
              gider.belgeNo ||
              gider.faturaNo ||
              null,

            borc:
              gider.tutar,

            alacak:
              0,
          },
        });
      }

      /*
        GİDER KAYDINI SİL
      */
      await tx.gider.delete({
        where: {
          id:
            gider.id,
        },
      });
    }
  );

  revalidatePath("/beach");
  revalidatePath("/beach/giderler");
  revalidatePath("/beach/kasa-banka");
  revalidatePath("/beach/cariler");

  if (gider.cariId) {
    revalidatePath(
      `/beach/cariler/${gider.cariId}`
    );
  }

  redirect("/beach/giderler");
}