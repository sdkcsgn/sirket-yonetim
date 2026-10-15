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

  if (!raw) {
    return 0;
  }

  const normalized = raw
    .replace(/\./g, "")
    .replace(",", ".");

  const value = Number(normalized);

  return Number.isFinite(value) ? value : 0;
}

export async function yeniCariKaydet(
  formData: FormData
) {
  const sirket = await prisma.sirket.findUnique({
    where: {
      kod: "HAL",
    },
  });

  if (!sirket) {
    throw new Error(
      "Hal Komisyon & Soğuk Hava şirketi bulunamadı."
    );
  }

  const unvan = formData
    .get("unvan")
    ?.toString()
    .trim();

  const tip = formData
    .get("tip")
    ?.toString() as CariTipi;

  if (!unvan) {
    throw new Error(
      "Cari ünvanı zorunludur."
    );
  }

  if (!tip) {
    throw new Error(
      "Cari tipi zorunludur."
    );
  }

  const atlasKodu = text(
    formData,
    "atlasKodu"
  );

  /*
    Aynı şirkette aynı Atlas kodu varsa
    ikinci kez kayıt açılmasını engelle.
  */
  if (atlasKodu) {
    const mevcutCari =
      await prisma.cari.findFirst({
        where: {
          sirketId: sirket.id,
          atlasKodu,
        },
      });

    if (mevcutCari) {
      throw new Error(
        "Bu Atlas koduyla kayıtlı bir cari zaten var."
      );
    }
  }

  const yeniCari =
    await prisma.cari.create({
      data: {
        sirketId: sirket.id,

        atlasKodu,

        unvan,

        tip,

        yetkili: text(
          formData,
          "yetkili"
        ),

        gsm: text(
          formData,
          "gsm"
        ),

        telefon: text(
          formData,
          "telefon"
        ),

        email: text(
          formData,
          "email"
        ),

        vergiNo: text(
          formData,
          "vergiNo"
        ),

        tcNo: text(
          formData,
          "tcNo"
        ),

        vergiDairesi: text(
          formData,
          "vergiDairesi"
        ),

        adres: text(
          formData,
          "adres"
        ),

        grupKodu: text(
          formData,
          "grupKodu"
        ),

        acilisBorc: money(
          formData,
          "acilisBorc"
        ),

        acilisAlacak: money(
          formData,
          "acilisAlacak"
        ),

        notlar: text(
          formData,
          "notlar"
        ),

        aktif: true,
      },
    });

  revalidatePath("/hal");
  revalidatePath("/hal/cariler");

  redirect(
    `/hal/cariler/${yeniCari.id}`
  );
}