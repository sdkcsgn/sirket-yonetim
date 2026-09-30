"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CariTipi } from "@/generated/prisma/client";

function text(formData: FormData, name: string) {
  const value = formData.get(name)?.toString().trim();
  return value || null;
}

function money(formData: FormData, name: string) {
  const raw = formData.get(name)?.toString().trim();

  if (!raw) return 0;

  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);

  return Number.isFinite(value) ? value : 0;
}

export async function cariGuncelle(id: number, formData: FormData) {
  const unvan = formData.get("unvan")?.toString().trim();
  const tip = formData.get("tip")?.toString() as CariTipi;

  if (!unvan) {
    throw new Error("Cari ünvanı zorunludur.");
  }

  await prisma.cari.update({
    where: { id },
    data: {
      unvan,
      tip,
      atlasKodu: text(formData, "atlasKodu"),
      yetkili: text(formData, "yetkili"),
      gsm: text(formData, "gsm"),
      telefon: text(formData, "telefon"),
      email: text(formData, "email"),
      vergiNo: text(formData, "vergiNo"),
      tcNo: text(formData, "tcNo"),
      vergiDairesi: text(formData, "vergiDairesi"),
      grupKodu: text(formData, "grupKodu"),
      adres: text(formData, "adres"),
      notlar: text(formData, "notlar"),
      acilisBorc: money(formData, "acilisBorc"),
      acilisAlacak: money(formData, "acilisAlacak"),
    },
  });

  revalidatePath("/beach/cariler");
  revalidatePath(`/beach/cariler/${id}`);

  redirect(`/beach/cariler/${id}`);
}