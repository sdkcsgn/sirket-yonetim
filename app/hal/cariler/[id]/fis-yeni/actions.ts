
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function cariFisKaydet(
  cariId: number,
  formData: FormData
) {
  if (!Number.isInteger(cariId) || cariId <= 0) {
    throw new Error("Geçersiz cari.");
  }

  const tarihMetni = String(formData.get("tarih") ?? "").trim();
  const yon = String(formData.get("yon") ?? "").trim();
  const tutarMetni = String(formData.get("tutar") ?? "").trim();
  const aciklama = String(formData.get("aciklama") ?? "").trim();
  const belgeNo = String(formData.get("belgeNo") ?? "").trim();

  if (!tarihMetni || !/^\d{4}-\d{2}-\d{2}$/.test(tarihMetni)) {
    throw new Error("Geçerli bir fiş tarihi girin.");
  }

  if (yon !== "BORC" && yon !== "ALACAK") {
    throw new Error("Borç veya alacak yönünü seçin.");
  }

  // 1.234,56 / 1234,56 / 1234.56 formatlarını kabul et.
  let normalTutar = tutarMetni.replace(/\s/g, "");

  if (normalTutar.includes(",")) {
    normalTutar = normalTutar.replace(/\./g, "").replace(",", ".");
  }

  const tutar = Number(normalTutar);

  if (!Number.isFinite(tutar) || tutar <= 0) {
    throw new Error("Tutar sıfırdan büyük, geçerli bir sayı olmalıdır.");
  }

  if (!aciklama) {
    throw new Error("Fiş açıklaması zorunludur.");
  }

  if (aciklama.length > 500) {
    throw new Error("Açıklama en fazla 500 karakter olabilir.");
  }

  const tarih = new Date(`${tarihMetni}T12:00:00`);

  if (Number.isNaN(tarih.getTime())) {
    throw new Error("Fiş tarihi geçersiz.");
  }

  const cari = await prisma.cari.findUnique({
    where: { id: cariId },
    include: { sirket: true },
  });

  if (!cari || cari.sirket.kod !== "HAL") {
    throw new Error("HAL şirketine ait cari bulunamadı.");
  }

  if (!cari.aktif) {
    throw new Error("Pasif cariye fiş oluşturulamaz.");
  }

  await prisma.cariHareket.create({
    data: {
      cariId: cari.id,
      tarih,
      tip: yon,
      islemTuru: "CARI_FIS",
      aciklama: `[Cari Fiş] ${aciklama}`,
      belgeNo: belgeNo || null,
      borc: yon === "BORC" ? tutar : 0,
      alacak: yon === "ALACAK" ? tutar : 0,
    },
  });

  revalidatePath(`/hal/cariler/${cari.id}`);
  revalidatePath("/hal/cariler");
  revalidatePath("/hal");

  redirect(`/hal/cariler/${cari.id}`);
}
