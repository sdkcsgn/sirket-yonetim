"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function finansHesapKaydet(
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

  const paraBirimi = String(
    formData.get("paraBirimi") ?? "TRY"
  ).trim();

  const ad = String(
    formData.get("ad") ?? ""
  ).trim();

  const bankaAdi = String(
    formData.get("bankaAdi") ?? ""
  ).trim();

  const iban = String(
    formData.get("iban") ?? ""
  ).trim();

  const hesapNo = String(
    formData.get("hesapNo") ?? ""
  ).trim();

  const izinliTipler = [
    "KASA",
    "BANKA",
    "KREDI_KARTI",
  ];

  const izinliParaBirimleri = [
    "TRY",
    "USD",
    "EUR",
    "GBP",
    "RUB",
  ];

  if (!izinliTipler.includes(tip)) {
    throw new Error(
      "Geçerli bir hesap tipi seçiniz."
    );
  }

  if (
    !izinliParaBirimleri.includes(
      paraBirimi
    )
  ) {
    throw new Error(
      "Geçerli bir para birimi seçiniz."
    );
  }

  if (!ad) {
    throw new Error(
      "Hesap adı zorunludur."
    );
  }

  if (
    (tip === "BANKA" ||
      tip === "KREDI_KARTI") &&
    !bankaAdi
  ) {
    throw new Error(
      "Banka veya kredi kartı hesabında banka adı giriniz."
    );
  }

  await prisma.finansHesap.create({
    data: {
      sirketId:
        sirket.id,

      ad,

      tip:
        tip as
          | "KASA"
          | "BANKA"
          | "KREDI_KARTI",

      paraBirimi:
        paraBirimi as
          | "TRY"
          | "USD"
          | "EUR"
          | "GBP"
          | "RUB",

      bankaAdi:
        tip === "KASA"
          ? null
          : bankaAdi || null,

      iban:
        tip === "BANKA"
          ? iban || null
          : null,

      hesapNo:
        hesapNo || null,

      aktif:
        true,
    },
  });

  revalidatePath("/hal");
  revalidatePath("/hal/kasa-banka");

  redirect("/hal/kasa-banka");
}