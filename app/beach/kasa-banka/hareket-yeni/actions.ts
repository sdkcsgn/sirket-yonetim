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

export async function finansHareketKaydet(
  formData: FormData
) {
  const hesapId = Number(
    formData.get("finansHesapId")
  );

  const tip = String(
    formData.get("tip") ?? ""
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

  const tutar = parseMoney(
    formData.get("tutar")
  );

  if (
    !Number.isInteger(hesapId) ||
    hesapId <= 0
  ) {
    throw new Error(
      "Finans hesabı seçiniz."
    );
  }

  if (
    tip !== "GIRIS" &&
    tip !== "CIKIS"
  ) {
    throw new Error(
      "Giriş veya çıkış seçiniz."
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

  const hesap =
    await prisma.finansHesap.findUnique({
      where: {
        id: hesapId,
      },

      include: {
        sirket: true,
      },
    });

  if (!hesap) {
    throw new Error(
      "Finans hesabı bulunamadı."
    );
  }

  if (
    hesap.sirket.kod !== "BEACH"
  ) {
    throw new Error(
      "Bu hesap Beach & Mağaza şirketine ait değil."
    );
  }

  if (!hesap.aktif) {
    throw new Error(
      "Pasif hesaba hareket girilemez."
    );
  }

  await prisma.finansHareket.create({
    data: {
      finansHesapId:
        hesap.id,

      tarih,

      tip:
        tip as
          | "GIRIS"
          | "CIKIS",

      tutar,

      aciklama,

      belgeNo:
        belgeNo || null,
    },
  });

  revalidatePath("/beach");
  revalidatePath(
    "/beach/kasa-banka"
  );
  revalidatePath(
    "/beach/kasa-banka/hareket-yeni"
  );

  redirect("/beach/kasa-banka");
}