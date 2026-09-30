"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function getCekOrThrow(id: number) {
  const cek = await prisma.cek.findUnique({
    where: {
      id,
    },

    include: {
      cari: true,
      sirket: true,
      bankaHesabi: true,
    },
  });

  if (!cek) {
    throw new Error("Çek bulunamadı.");
  }

  return cek;
}

function yenile(
  cekId: number,
  cariId?: number | null,
  ciroCariId?: number | null
) {
  revalidatePath("/beach");
  revalidatePath("/beach/cekler");
  revalidatePath(`/beach/cekler/${cekId}`);
  revalidatePath("/beach/cariler");
  revalidatePath("/beach/kasa-banka");

  if (cariId) {
    revalidatePath(`/beach/cariler/${cariId}`);
  }

  if (ciroCariId) {
    revalidatePath(`/beach/cariler/${ciroCariId}`);
  }
}

/* =========================================================
   BANKAYA VER
========================================================= */

export async function bankayaVer(
  cekId: number,
  formData: FormData
) {
  const bankaHesabiId = Number(
    formData.get("bankaHesabiId")
  );

  if (
    !Number.isInteger(bankaHesabiId) ||
    bankaHesabiId <= 0
  ) {
    throw new Error(
      "Banka hesabı seçmelisiniz."
    );
  }

  const cek = await getCekOrThrow(cekId);

  if (cek.tip !== "ALINAN") {
    throw new Error(
      "Sadece alınan çek bankaya verilebilir."
    );
  }

  if (cek.durum !== "PORTFOYDE") {
    throw new Error(
      "Sadece portföydeki çek bankaya verilebilir."
    );
  }

  if (cek.ciroCariIslendi) {
    throw new Error(
      "Ciro edilmiş çek bankaya verilemez."
    );
  }

  const bankaHesabi =
    await prisma.finansHesap.findUnique({
      where: {
        id: bankaHesabiId,
      },
    });

  if (!bankaHesabi) {
    throw new Error(
      "Banka hesabı bulunamadı."
    );
  }

  if (bankaHesabi.tip !== "BANKA") {
    throw new Error(
      "Seçilen hesap banka hesabı değil."
    );
  }

  if (
    bankaHesabi.sirketId !==
    cek.sirketId
  ) {
    throw new Error(
      "Çek ile banka hesabı aynı şirkete ait değil."
    );
  }

  await prisma.cek.update({
    where: {
      id: cek.id,
    },

    data: {
      durum: "BANKADA",
      bankaHesabiId,
    },
  });

  yenile(
    cek.id,
    cek.cariId,
    cek.ciroCariId
  );

  redirect(`/beach/cekler/${cek.id}`);
}

/* =========================================================
   TAHSİL ET
========================================================= */

export async function tahsilEt(
  cekId: number,
  formData: FormData
) {
  const bankaHesabiId = Number(
    formData.get("bankaHesabiId")
  );

  if (
    !Number.isInteger(bankaHesabiId) ||
    bankaHesabiId <= 0
  ) {
    throw new Error(
      "Tahsilat yapılacak banka hesabını seçmelisiniz."
    );
  }

  const cek = await getCekOrThrow(cekId);

  if (cek.tip !== "ALINAN") {
    throw new Error(
      "Sadece alınan çek tahsil edilebilir."
    );
  }

  if (cek.ciroCariIslendi) {
    throw new Error(
      "Ciro edilmiş çek tarafımızdan tahsil edilemez."
    );
  }

  if (cek.bankaIslendi) {
    throw new Error(
      "Bu çek daha önce bankaya işlendi."
    );
  }

  if (
    cek.durum !== "PORTFOYDE" &&
    cek.durum !== "BANKADA"
  ) {
    throw new Error(
      "Bu çek tahsil edilemez."
    );
  }

  const bankaHesabi =
    await prisma.finansHesap.findUnique({
      where: {
        id: bankaHesabiId,
      },
    });

  if (!bankaHesabi) {
    throw new Error(
      "Banka hesabı bulunamadı."
    );
  }

  if (bankaHesabi.tip !== "BANKA") {
    throw new Error(
      "Seçilen hesap banka hesabı değil."
    );
  }

  if (
    bankaHesabi.sirketId !==
    cek.sirketId
  ) {
    throw new Error(
      "Çek ile banka hesabı aynı şirkete ait değil."
    );
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.finansHareket.create({
        data: {
          finansHesapId: bankaHesabi.id,
          cariId: cek.cariId,
          tarih: new Date(),
          tip: "GIRIS",
          tutar: cek.tutar,

          aciklama:
            `Çek tahsilatı${
              cek.cekNo
                ? ` - Çek No: ${cek.cekNo}`
                : ""
            }`,

          belgeNo: cek.cekNo,
        },
      });

      await tx.cek.update({
        where: {
          id: cek.id,
        },

        data: {
          durum: "TAHSIL_EDILDI",
          bankaHesabiId: bankaHesabi.id,
          bankaIslendi: true,
        },
      });
    }
  );

  yenile(
    cek.id,
    cek.cariId,
    cek.ciroCariId
  );

  redirect(`/beach/cekler/${cek.id}`);
}

/* =========================================================
   VERİLEN ÇEK ÖDENDİ
========================================================= */

export async function odendi(
  cekId: number,
  formData: FormData
) {
  const bankaHesabiId = Number(
    formData.get("bankaHesabiId")
  );

  if (
    !Number.isInteger(bankaHesabiId) ||
    bankaHesabiId <= 0
  ) {
    throw new Error(
      "Ödeme yapılacak banka hesabını seçmelisiniz."
    );
  }

  const cek = await getCekOrThrow(cekId);

  if (cek.tip !== "VERILEN") {
    throw new Error(
      "Sadece verilen çek ödendi olarak işaretlenebilir."
    );
  }

  if (cek.bankaIslendi) {
    throw new Error(
      "Bu çek daha önce bankaya işlendi."
    );
  }

  if (
    cek.durum === "ODENDI" ||
    cek.durum === "IPTAL"
  ) {
    throw new Error(
      "Bu çek için ödeme işlemi yapılamaz."
    );
  }

  const bankaHesabi =
    await prisma.finansHesap.findUnique({
      where: {
        id: bankaHesabiId,
      },
    });

  if (!bankaHesabi) {
    throw new Error(
      "Banka hesabı bulunamadı."
    );
  }

  if (bankaHesabi.tip !== "BANKA") {
    throw new Error(
      "Seçilen hesap banka hesabı değil."
    );
  }

  if (
    bankaHesabi.sirketId !==
    cek.sirketId
  ) {
    throw new Error(
      "Çek ile banka hesabı aynı şirkete ait değil."
    );
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.finansHareket.create({
        data: {
          finansHesapId: bankaHesabi.id,
          cariId: cek.cariId,
          tarih: new Date(),
          tip: "CIKIS",
          tutar: cek.tutar,

          aciklama:
            `Verilen çek ödemesi${
              cek.cekNo
                ? ` - Çek No: ${cek.cekNo}`
                : ""
            }`,

          belgeNo: cek.cekNo,
        },
      });

      await tx.cek.update({
        where: {
          id: cek.id,
        },

        data: {
          durum: "ODENDI",
          bankaHesabiId: bankaHesabi.id,
          bankaIslendi: true,
        },
      });
    }
  );

  yenile(
    cek.id,
    cek.cariId,
    cek.ciroCariId
  );

  redirect(`/beach/cekler/${cek.id}`);
}

/* =========================================================
   CİRO ET
========================================================= */

export async function ciroEt(
  cekId: number,
  formData: FormData
) {
  const ciroCariId = Number(
    formData.get("ciroCariId")
  );

  if (
    !Number.isInteger(ciroCariId) ||
    ciroCariId <= 0
  ) {
    throw new Error(
      "Çekin ciro edileceği cariyi seçmelisiniz."
    );
  }

  const cek = await getCekOrThrow(cekId);

  if (cek.tip !== "ALINAN") {
    throw new Error(
      "Sadece alınan çek ciro edilebilir."
    );
  }

  if (cek.durum !== "PORTFOYDE") {
    throw new Error(
      "Sadece portföydeki çek ciro edilebilir."
    );
  }

  if (cek.bankaIslendi) {
    throw new Error(
      "Bankaya işlenmiş çek ciro edilemez."
    );
  }

  if (cek.ciroCariIslendi) {
    throw new Error(
      "Bu çek daha önce ciro edilmiş."
    );
  }

  const ciroCari =
    await prisma.cari.findUnique({
      where: {
        id: ciroCariId,
      },
    });

  if (!ciroCari) {
    throw new Error(
      "Ciro edilecek cari bulunamadı."
    );
  }

  if (
    ciroCari.sirketId !==
    cek.sirketId
  ) {
    throw new Error(
      "Çek ile ciro edilecek cari aynı şirkete ait değil."
    );
  }

  if (!ciroCari.aktif) {
    throw new Error(
      "Pasif cariye çek ciro edilemez."
    );
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.cariHareket.create({
        data: {
          cariId: ciroCari.id,
          tarih: new Date(),
          tip: "BORC",

          aciklama:
            `[Ciro Çek] ${
              cek.cekNo
                ? `Çek No: ${cek.cekNo}`
                : "Çek"
            } - ${
              cek.cari?.unvan
                ? `${cek.cari.unvan} firmasından alınan çek`
                : "Alınan çek"
            }`,

          belgeNo: cek.cekNo,

          borc: cek.tutar,
          alacak: 0,
        },
      });

      await tx.cek.update({
        where: {
          id: cek.id,
        },

        data: {
          durum: "CIROLANDI",
          ciroCariId: ciroCari.id,
          ciroCariIslendi: true,
        },
      });
    }
  );

  yenile(
    cek.id,
    cek.cariId,
    ciroCari.id
  );

  redirect(`/beach/cekler/${cek.id}`);
}

/* =========================================================
   KARŞILIKSIZ
========================================================= */

export async function karsiliksizYap(
  cekId: number
) {
  const cek = await getCekOrThrow(cekId);

  if (cek.tip !== "ALINAN") {
    throw new Error(
      "Karşılıksız işlemi sadece alınan çekler için kullanılabilir."
    );
  }

  if (cek.bankaIslendi) {
    throw new Error(
      "Tahsil edilmiş çek karşılıksız yapılamaz."
    );
  }

  if (
    cek.durum === "TAHSIL_EDILDI" ||
    cek.durum === "IPTAL" ||
    cek.durum === "KARSILIKSIZ"
  ) {
    throw new Error(
      "Bu çek karşılıksız olarak işaretlenemez."
    );
  }

  const ciroGeriAlinacak =
    cek.durum === "CIROLANDI" &&
    cek.ciroCariIslendi &&
    cek.ciroCariId;

  await prisma.$transaction(
    async (tx) => {
      if (ciroGeriAlinacak) {
        await tx.cariHareket.create({
          data: {
            cariId: cek.ciroCariId!,
            tarih: new Date(),
            tip: "ALACAK",

            aciklama:
              `[Ciro Çek Karşılıksız] ${
                cek.cekNo
                  ? `Çek No: ${cek.cekNo}`
                  : "Çek"
              } - Ciro işlemi geri alındı`,

            belgeNo: cek.cekNo,

            borc: 0,
            alacak: cek.tutar,
          },
        });
      }

      await tx.cek.update({
        where: {
          id: cek.id,
        },

        data: {
          durum: "KARSILIKSIZ",

          ciroCariIslendi:
            ciroGeriAlinacak
              ? false
              : cek.ciroCariIslendi,
        },
      });
    }
  );

  yenile(
    cek.id,
    cek.cariId,
    cek.ciroCariId
  );

  redirect(`/beach/cekler/${cek.id}`);
}

/* =========================================================
   İPTAL
========================================================= */

export async function iptalEt(
  cekId: number
) {
  const cek = await getCekOrThrow(cekId);

  if (cek.bankaIslendi) {
    throw new Error(
      "Bankaya işlenmiş çek iptal edilemez."
    );
  }

  if (cek.durum === "IPTAL") {
    throw new Error(
      "Bu çek zaten iptal edilmiş."
    );
  }

  if (
    cek.durum === "TAHSIL_EDILDI" ||
    cek.durum === "ODENDI"
  ) {
    throw new Error(
      "Tahsil edilmiş veya ödenmiş çek iptal edilemez."
    );
  }

  const ciroGeriAlinacak =
    cek.durum === "CIROLANDI" &&
    cek.ciroCariIslendi &&
    cek.ciroCariId;

  await prisma.$transaction(
    async (tx) => {
      if (ciroGeriAlinacak) {
        await tx.cariHareket.create({
          data: {
            cariId: cek.ciroCariId!,
            tarih: new Date(),
            tip: "ALACAK",

            aciklama:
              `[Ciro Çek İptal] ${
                cek.cekNo
                  ? `Çek No: ${cek.cekNo}`
                  : "Çek"
              } - Ciro işlemi geri alındı`,

            belgeNo: cek.cekNo,

            borc: 0,
            alacak: cek.tutar,
          },
        });
      }

      await tx.cek.update({
        where: {
          id: cek.id,
        },

        data: {
          durum: "IPTAL",

          ciroCariIslendi:
            ciroGeriAlinacak
              ? false
              : cek.ciroCariIslendi,
        },
      });
    }
  );

  yenile(
    cek.id,
    cek.cariId,
    cek.ciroCariId
  );

  redirect(`/beach/cekler/${cek.id}`);
}

/* =========================================================
   YANLIŞ GİRİLEN ÇEKİ SİL
========================================================= */

export async function cekSil(
  cekId: number
) {
  const cek = await getCekOrThrow(cekId);

  /*
    Bankaya gerçekten para girişi veya çıkışı
    yapılmış çekleri silmiyoruz.
  */
  if (cek.bankaIslendi) {
    throw new Error(
      "Bankaya işlenmiş çek kaydı silinemez."
    );
  }

  if (
    cek.durum === "TAHSIL_EDILDI" ||
    cek.durum === "ODENDI"
  ) {
    throw new Error(
      "Tahsil edilmiş veya ödenmiş çek kaydı silinemez."
    );
  }

  await prisma.$transaction(
    async (tx) => {
      /*
        Çek ilk kaydedildiğinde cari hesabına
        otomatik işlendi.

        Yanlış çek tamamen siliniyorsa
        bu kaydın etkisini de ters kayıtla
        sıfırlıyoruz.
      */
      if (
        cek.cariIslendi &&
        cek.cariId
      ) {
        await tx.cariHareket.create({
          data: {
            cariId: cek.cariId,
            tarih: new Date(),

            tip:
              cek.tip === "ALINAN"
                ? "BORC"
                : "ALACAK",

            aciklama:
              `[Çek Silme Düzeltmesi] ${
                cek.cekNo
                  ? `Çek No: ${cek.cekNo}`
                  : "Çek"
              } - Yanlış girilen çek kaydı silindi`,

            belgeNo: cek.cekNo,

            borc:
              cek.tip === "ALINAN"
                ? cek.tutar
                : 0,

            alacak:
              cek.tip === "VERILEN"
                ? cek.tutar
                : 0,
          },
        });
      }

      /*
        Eğer çek halen ciro carisine işlenmişse,
        ciro hareketini de geri alıyoruz.

        Karşılıksız veya iptal işleminde daha önce
        geri alınmışsa ciroCariIslendi false olduğu
        için ikinci kez işlem yapılmaz.
      */
      if (
        cek.ciroCariIslendi &&
        cek.ciroCariId
      ) {
        await tx.cariHareket.create({
          data: {
            cariId: cek.ciroCariId,
            tarih: new Date(),
            tip: "ALACAK",

            aciklama:
              `[Ciro Çek Silme Düzeltmesi] ${
                cek.cekNo
                  ? `Çek No: ${cek.cekNo}`
                  : "Çek"
              } - Yanlış çek kaydı nedeniyle ciro geri alındı`,

            belgeNo: cek.cekNo,

            borc: 0,
            alacak: cek.tutar,
          },
        });
      }

      await tx.cek.delete({
        where: {
          id: cek.id,
        },
      });
    }
  );

  revalidatePath("/beach");
  revalidatePath("/beach/cekler");
  revalidatePath("/beach/cariler");
  revalidatePath("/beach/kasa-banka");

  if (cek.cariId) {
    revalidatePath(
      `/beach/cariler/${cek.cariId}`
    );
  }

  if (cek.ciroCariId) {
    revalidatePath(
      `/beach/cariler/${cek.ciroCariId}`
    );
  }

  redirect("/beach/cekler");
}