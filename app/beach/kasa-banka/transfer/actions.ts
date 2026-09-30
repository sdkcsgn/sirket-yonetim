"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseMoney(value: FormDataEntryValue | null) {
  const raw = value?.toString().trim();

  if (!raw) return 0;

  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const number = Number(normalized);

  return Number.isFinite(number) ? number : 0;
}

export async function transferKaydet(formData: FormData) {
  const kaynakId = Number(formData.get("kaynakId"));
  const hedefId = Number(formData.get("hedefId"));
  const tutar = parseMoney(formData.get("tutar"));
  const tarihRaw = formData.get("tarih")?.toString();
  const aciklama =
    formData.get("aciklama")?.toString().trim() || "Hesaplar arası transfer";

  if (!Number.isInteger(kaynakId) || !Number.isInteger(hedefId)) {
    throw new Error("Kaynak ve hedef hesap seçilmelidir.");
  }

  if (kaynakId === hedefId) {
    throw new Error("Kaynak ve hedef hesap aynı olamaz.");
  }

  if (tutar <= 0) {
    throw new Error("Transfer tutarı 0'dan büyük olmalıdır.");
  }

  const [kaynak, hedef] = await Promise.all([
    prisma.finansHesap.findUnique({
      where: { id: kaynakId },
    }),
    prisma.finansHesap.findUnique({
      where: { id: hedefId },
    }),
  ]);

  if (!kaynak || !hedef) {
    throw new Error("Finans hesabı bulunamadı.");
  }

  if (kaynak.sirketId !== hedef.sirketId) {
    throw new Error("Farklı şirket hesapları arasında transfer yapılamaz.");
  }

  const tarih = tarihRaw
    ? new Date(`${tarihRaw}T12:00:00`)
    : new Date();

  const transferRef = crypto.randomUUID();

  await prisma.$transaction([
    prisma.finansHareket.create({
      data: {
        finansHesapId: kaynak.id,
        tarih,
        tip: "TRANSFER_CIKIS",
        tutar,
        aciklama: `${aciklama} → ${hedef.ad}`,
        transferRef,
      },
    }),

    prisma.finansHareket.create({
      data: {
        finansHesapId: hedef.id,
        tarih,
        tip: "TRANSFER_GIRIS",
        tutar,
        aciklama: `${aciklama} ← ${kaynak.ad}`,
        transferRef,
      },
    }),
  ]);

  revalidatePath("/beach/kasa-banka");

  redirect("/beach/kasa-banka");
}