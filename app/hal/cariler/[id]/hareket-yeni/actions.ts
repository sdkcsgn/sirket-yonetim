"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseMoney(value: FormDataEntryValue | null) {
  const raw = value?.toString().trim();

  if (!raw) {
    return 0;
  }

  const normalized = raw
    .replace(/\./g, "")
    .replace(",", ".");

  const number = Number(normalized);

  return Number.isFinite(number)
    ? number
    : 0;
}

export async function cariHareketKaydet(
  cariId: number,
  formData: FormData
) {
  const islemTuru =
    formData.get("islemTuru")?.toString();

  const aciklama =
    formData.get("aciklama")?.toString().trim();

  const belgeNo =
    formData.get("belgeNo")?.toString().trim() || null;

  const tarihRaw =
    formData.get("tarih")?.toString();

  const finansHesapIdRaw =
    formData.get("finansHesapId")?.toString();

  const finansHesapId =
    finansHesapIdRaw &&
    finansHesapIdRaw !== ""
      ? Number(finansHesapIdRaw)
      : null;

  const tutar =
    parseMoney(formData.get("tutar"));

  if (!islemTuru) {
    throw new Error(
      "İşlem türü seçiniz."
    );
  }

  if (!aciklama) {
    throw new Error(
      "Açıklama zorunludur."
    );
  }

  if (tutar <= 0) {
    throw new Error(
      "Tutar 0'dan büyük olmalıdır."
    );
  }

  const cari = await prisma.cari.findUnique({
    where: {
      id: cariId,
    },
  });

  if (!cari) {
    throw new Error(
      "Cari bulunamadı."
    );
  }

  let tip: "BORC" | "ALACAK";
  let islemAdi: string;

  switch (islemTuru) {
    case "SATIS":
      tip = "BORC";
      islemAdi = "Satış";
      break;

    case "ALIS":
      tip = "ALACAK";
      islemAdi = "Alış";
      break;

    case "TAHSILAT":
      tip = "ALACAK";
      islemAdi = "Tahsilat";
      break;

    case "ODEME":
      tip = "BORC";
      islemAdi = "Ödeme";
      break;

    case "DEVIR_BORC":
      tip = "BORC";
      islemAdi = "Devir Borç";
      break;

    case "DEVIR_ALACAK":
      tip = "ALACAK";
      islemAdi = "Devir Alacak";
      break;

    default:
      throw new Error(
        "Geçersiz işlem türü."
      );
  }

  const finansHesabiGerekli =
    islemTuru === "TAHSILAT" ||
    islemTuru === "ODEME";

  if (
    finansHesabiGerekli &&
    (
      finansHesapId === null ||
      !Number.isInteger(finansHesapId)
    )
  ) {
    throw new Error(
      "Tahsilat veya ödeme işlemlerinde kasa/banka hesabı seçmelisiniz."
    );
  }

  let finansHesabi = null;

  if (finansHesapId !== null) {
    finansHesabi =
      await prisma.finansHesap.findUnique({
        where: {
          id: finansHesapId,
        },
      });

    if (!finansHesabi) {
      throw new Error(
        "Seçilen kasa/banka hesabı bulunamadı."
      );
    }

    if (
      finansHesabi.sirketId !==
      cari.sirketId
    ) {
      throw new Error(
        "Cari ile finans hesabı aynı şirkete ait değil."
      );
    }

    if (!finansHesabi.aktif) {
      throw new Error(
        "Seçilen kasa/banka hesabı aktif değil."
      );
    }
  }

  const tarih = tarihRaw
    ? new Date(
        `${tarihRaw}T12:00:00`
      )
    : new Date();

    console.log("islemTuru:", islemTuru);
console.log("finansHesapId:", finansHesapId);
console.log("tutar:", tutar);
console.log("cariId:", cariId); 
    await prisma.$transaction(
    async (tx) => {
      await tx.cariHareket.create({
        data: {
          cariId,
          tarih,
          tip,

          aciklama:
            `[${islemAdi}] ${aciklama}`,

          belgeNo,

          borc:
            tip === "BORC"
              ? tutar
              : 0,

          alacak:
            tip === "ALACAK"
              ? tutar
              : 0,
        },
      });

      if (
        islemTuru === "TAHSILAT" &&
        finansHesapId !== null
      ) {
        await tx.finansHareket.create({
          data: {
            finansHesapId,
            cariId,
            tarih,
            tip: "GIRIS",
            tutar,

            aciklama:
              `Cari Tahsilatı - ${cari.unvan} - ${aciklama}`,

            belgeNo,
          },
        });
      }

      if (
        islemTuru === "ODEME" &&
        finansHesapId !== null
      ) {
        await tx.finansHareket.create({
          data: {
            finansHesapId,
            cariId,
            tarih,
            tip: "CIKIS",
            tutar,

            aciklama:
              `Cari Ödemesi - ${cari.unvan} - ${aciklama}`,

            belgeNo,
          },
        });
      }
    }
  );

  revalidatePath(
    `/hal/cariler/${cariId}`
  );

  revalidatePath(
    "/hal/cariler"
  );

  revalidatePath(
    "/hal/kasa-banka"
  );

  redirect(
    `/hal/cariler/${cariId}`
  );
}