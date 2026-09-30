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

  return Number.isFinite(number) ? number : 0;
}

export async function cekKaydet(formData: FormData) {
  const tipRaw = formData.get("tip")?.toString();

  const cariId = Number(
    formData.get("cariId")
  );

  const cekNo =
    formData.get("cekNo")?.toString().trim() || null;

  const banka =
    formData.get("banka")?.toString().trim() || null;

  const sube =
    formData.get("sube")?.toString().trim() || null;

  const hesapNo =
    formData.get("hesapNo")?.toString().trim() || null;

  const kesideci =
    formData.get("kesideci")?.toString().trim() || null;

  const aciklama =
    formData.get("aciklama")?.toString().trim() || null;

  const vadeTarihiRaw =
    formData.get("vadeTarihi")?.toString();

  const tutar = parseMoney(
    formData.get("tutar")
  );

  if (
    tipRaw !== "ALINAN" &&
    tipRaw !== "VERILEN"
  ) {
    throw new Error("Geçersiz çek tipi.");
  }

  if (
    !Number.isInteger(cariId) ||
    cariId <= 0
  ) {
    throw new Error("Cari seçmelisiniz.");
  }

  if (tutar <= 0) {
    throw new Error(
      "Çek tutarı 0'dan büyük olmalıdır."
    );
  }

  if (!vadeTarihiRaw) {
    throw new Error(
      "Vade tarihi zorunludur."
    );
  }

  const sirket =
    await prisma.sirket.findUnique({
      where: {
        kod: "BEACH",
      },
    });

  if (!sirket) {
    throw new Error(
      "Beach & Mağaza şirketi bulunamadı."
    );
  }

  const cari =
    await prisma.cari.findUnique({
      where: {
        id: cariId,
      },
    });

  if (!cari) {
    throw new Error(
      "Cari bulunamadı."
    );
  }

  if (cari.sirketId !== sirket.id) {
    throw new Error(
      "Cari Beach & Mağaza şirketine ait değil."
    );
  }

  const vadeTarihi =
    new Date(
      `${vadeTarihiRaw}T12:00:00`
    );

  const bugun = new Date();

  const tip =
    tipRaw === "ALINAN"
      ? "ALINAN"
      : "VERILEN";

  const cariTip =
    tip === "ALINAN"
      ? "ALACAK"
      : "BORC";

  const islemAdi =
    tip === "ALINAN"
      ? "Alınan Çek"
      : "Verilen Çek";

  await prisma.$transaction(
    async (tx) => {
      await tx.cek.create({
        data: {
          sirketId: sirket.id,
          cariId: cari.id,

          tip,

          durum: "PORTFOYDE",

          cekNo,
          banka,
          sube,
          hesapNo,
          kesideci,

          tutar,
          vadeTarihi,
          aciklama,

          cariIslendi: true,
          bankaIslendi: false,
        },
      });

      await tx.cariHareket.create({
        data: {
          cariId: cari.id,

          tarih: bugun,

          tip: cariTip,

          aciklama: `[${islemAdi}] ${
            cekNo
              ? `Çek No: ${cekNo}`
              : "Çek kaydı"
          }${
            aciklama
              ? ` - ${aciklama}`
              : ""
          }`,

          belgeNo: cekNo,

          borc:
            tip === "VERILEN"
              ? tutar
              : 0,

          alacak:
            tip === "ALINAN"
              ? tutar
              : 0,
        },
      });
    }
  );

  revalidatePath("/beach/cekler");
  revalidatePath("/beach/cariler");
  revalidatePath(
    `/beach/cariler/${cari.id}`
  );
  revalidatePath("/beach");

  redirect("/beach/cekler");
}