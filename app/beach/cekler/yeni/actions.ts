"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CekTipi,
  CekDurumu,
  HareketTipi,
  FinansHesapTipi,
  ParaBirimi,
} from "@/generated/prisma/client";

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

function temizle(
  value: FormDataEntryValue | null
) {
  const sonuc = value
    ?.toString()
    .replace(/\u00A0/g, " ")
    .trim();

  return sonuc || null;
}

export async function cekKaydet(
  formData: FormData
) {
  const tipRaw =
    formData
      .get("tip")
      ?.toString();

  const cariId = Number(
    formData.get("cariId")
  );

  const cekNo =
    temizle(
      formData.get("cekNo")
    );

  const banka =
    temizle(
      formData.get("banka")
    );

  const sube =
    temizle(
      formData.get("sube")
    );

  const hesapNo =
    temizle(
      formData.get("hesapNo")
    );

  const kesideci =
    temizle(
      formData.get("kesideci")
    );

  const aciklama =
    temizle(
      formData.get("aciklama")
    );

  const vadeTarihiRaw =
    temizle(
      formData.get("vadeTarihi")
    );

  const tutar =
    parseMoney(
      formData.get("tutar")
    );

  if (
    tipRaw !== "ALINAN" &&
    tipRaw !== "VERILEN"
  ) {
    throw new Error(
      "Geçersiz çek tipi."
    );
  }

  if (
    !Number.isInteger(cariId) ||
    cariId <= 0
  ) {
    throw new Error(
      "Cari seçmelisiniz."
    );
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

  const vadeTarihi =
    new Date(
      `${vadeTarihiRaw}T12:00:00`
    );

  if (
    Number.isNaN(
      vadeTarihi.getTime()
    )
  ) {
    throw new Error(
      "Vade tarihi geçersiz."
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
    await prisma.cari.findFirst({
      where: {
        id: cariId,
        sirketId: sirket.id,
        aktif: true,
      },
    });

  if (!cari) {
    throw new Error(
      "Cari bulunamadı veya aktif değil."
    );
  }

  const tip =
    tipRaw === "ALINAN"
      ? CekTipi.ALINAN
      : CekTipi.VERILEN;

  const cariTip =
    tip === CekTipi.ALINAN
      ? HareketTipi.ALACAK
      : HareketTipi.BORC;

  const islemAdi =
    tip === CekTipi.ALINAN
      ? "Alınan Çek"
      : "Verilen Çek";

  /*
    Aynı çek numarasının yanlışlıkla
    ikinci kez kaydedilmesini engeller.
  */
  if (cekNo) {
    const mevcutCek =
      await prisma.cek.findFirst({
        where: {
          sirketId: sirket.id,
          tip,
          cekNo,
        },
      });

    if (mevcutCek) {
      throw new Error(
        `Bu çek numarası daha önce kaydedilmiş: ${cekNo}`
      );
    }
  }

  const bugun =
    new Date();

  await prisma.$transaction(
    async (tx) => {
      let bankaHesabiId:
        number | null = null;

      /*
        Çekin bankası yazılmışsa:

        1. BEACH şirketinde aynı banka aranır.
        2. Yoksa otomatik oluşturulur.
        3. Çek banka hesabına bağlanır.
      */
      if (banka) {
        let bankaHesabi =
          await tx.finansHesap.findFirst({
            where: {
              sirketId: sirket.id,
              tip:
                FinansHesapTipi.BANKA,

              OR: [
                {
                  bankaAdi: {
                    equals: banka,
                    mode:
                      "insensitive",
                  },
                },
                {
                  ad: {
                    equals: banka,
                    mode:
                      "insensitive",
                  },
                },
              ],
            },
          });

        if (!bankaHesabi) {
          bankaHesabi =
            await tx.finansHesap.create({
              data: {
                sirketId:
                  sirket.id,

                ad:
                  banka,

                tip:
                  FinansHesapTipi.BANKA,

                paraBirimi:
                  ParaBirimi.TRY,

                bankaAdi:
                  banka,

                hesapNo:
                  hesapNo,

                aktif:
                  true,
              },
            });
        } else if (
          !bankaHesabi.aktif
        ) {
          bankaHesabi =
            await tx.finansHesap.update({
              where: {
                id:
                  bankaHesabi.id,
              },

              data: {
                aktif:
                  true,
              },
            });
        }

        bankaHesabiId =
          bankaHesabi.id;
      }

      const cek =
        await tx.cek.create({
          data: {
            sirketId:
              sirket.id,

            cariId:
              cari.id,

            bankaHesabiId,

            tip,

            durum:
              CekDurumu.PORTFOYDE,

            cekNo,

            banka,

            sube,

            hesapNo,

            kesideci,

            paraBirimi:
              ParaBirimi.TRY,

            tutar,

            vadeTarihi,

            aciklama,

            cariIslendi:
              true,

            bankaIslendi:
              false,

            ciroCariIslendi:
              false,
          },
        });

      /*
        CARİ HAREKET

        ALINAN:
        Cari ALACAK

        VERİLEN:
        Cari BORÇ
      */
      await tx.cariHareket.create({
        data: {
          cariId:
            cari.id,

          tarih:
            bugun,

          tip:
            cariTip,

          islemTuru:
            tip ===
            CekTipi.ALINAN
              ? "ALINAN_CEK"
              : "VERILEN_CEK",

          aciklama:
            `[${islemAdi}] ${
              cekNo
                ? `Çek No: ${cekNo}`
                : `Çek ID: ${cek.id}`
            }${
              banka
                ? ` - Banka: ${banka}`
                : ""
            }${
              aciklama
                ? ` - ${aciklama}`
                : ""
            }`,

          belgeNo:
            cekNo ??
            String(cek.id),

          borc:
            tip ===
            CekTipi.VERILEN
              ? tutar
              : 0,

          alacak:
            tip ===
            CekTipi.ALINAN
              ? tutar
              : 0,
        },
      });
    }
  );

  revalidatePath(
    "/beach/cekler"
  );

  revalidatePath(
    "/beach/cariler"
  );

  revalidatePath(
    `/beach/cariler/${cari.id}`
  );

  revalidatePath(
    "/beach/banka"
  );

  revalidatePath(
    "/beach"
  );

  redirect(
    "/beach/cekler"
  );
}