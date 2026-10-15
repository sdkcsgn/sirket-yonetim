"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function cariPasifeAl(id: number) {
  await prisma.cari.update({
    where: { id },
    data: { aktif: false },
  });

  revalidatePath("/hal/cariler");
  redirect("/hal/cariler");
}

export async function cariKaliciSil(id: number) {
  const cari = await prisma.cari.findUnique({
    where: { id },
    include: {
      hareketler: true,
      faturalar: true,
      giderler: true,
      cekler: true,
      odemeler: true,
    },
  });

  if (!cari) {
    throw new Error("Cari bulunamadı.");
  }

  const bagliKayitVar =
    cari.hareketler.length > 0 ||
    cari.faturalar.length > 0 ||
    cari.giderler.length > 0 ||
    cari.cekler.length > 0 ||
    cari.odemeler.length > 0;

  if (bagliKayitVar) {
    throw new Error(
      "Bu cariye bağlı finansal kayıt bulunduğu için kalıcı silinemez."
    );
  }

  await prisma.cari.delete({
    where: { id },
  });

  revalidatePath("/hal/cariler");
  redirect("/hal/cariler");
}