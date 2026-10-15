"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { CariTipi } from "@/generated/prisma/client";

type AtlasCariSatiri = {
  atlasKodu: string;
  unvan: string;
  atlasTipi?: string;
  gsm?: string;
  telefon?: string;
  vergiTcNo?: string;
  grupKodu?: string;
  email?: string;
};

function temizle(value: unknown) {
  const sonuc = String(value ?? "")
    .replace(/\u00A0/g, " ")
    .trim();

  return sonuc || null;
}

function atlasCariTipiniCevir(
  rawTip: string | null | undefined
): CariTipi {
  const tip = String(rawTip ?? "")
    .trim()
    .toLocaleUpperCase("tr-TR");

  switch (tip) {
    case "MÜŞTERİ":
    case "MUSTERI":
      return CariTipi.MUSTERI;

    case "ALICI":
      return CariTipi.ALICI;

    case "SATICI":
      return CariTipi.SATICI;

    case "PERSONEL":
      return CariTipi.PERSONEL;

    case "ÜRETİCİ":
    case "URETICI":
      return CariTipi.URETICI;

    case "ÜYE":
    case "UYE":
      return CariTipi.UYE;

    case "BANKA":
      return CariTipi.BANKA;

    case "YARDIMCI HESAP":
    case "YARDIMCI HESAPLAR":
    case "YARDIMCI_HESAP":
      return CariTipi.YARDIMCI_HESAP;

    case "DİĞER":
    case "DIGER":
      return CariTipi.DIGER;

    default:
      return CariTipi.DIGER;
  }
}

export async function atlasCarileriAktar(
  satirlar: AtlasCariSatiri[]
) {
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

  if (!satirlar.length) {
    throw new Error(
      "Aktarılacak cari bulunamadı."
    );
  }

  let eklenen = 0;
  let guncellenen = 0;
  let atlanan = 0;

  const hatalar: string[] = [];

  for (const satir of satirlar) {
    try {
      const atlasKodu =
        temizle(
          satir.atlasKodu
        );

      const unvan =
        temizle(
          satir.unvan
        );

      if (!atlasKodu || !unvan) {
        atlanan++;
        continue;
      }

      const tip =
        atlasCariTipiniCevir(
          satir.atlasTipi
        );

      const gsm =
        temizle(
          satir.gsm
        );

      const telefon =
        temizle(
          satir.telefon
        );

      const email =
        temizle(
          satir.email
        );

      const grupKodu =
        temizle(
          satir.grupKodu
        );

      const vergiTcNo =
        temizle(
          satir.vergiTcNo
        );

      const tcNo =
        vergiTcNo &&
        /^\d{11}$/.test(
          vergiTcNo
        )
          ? vergiTcNo
          : null;

      const vergiNo =
        vergiTcNo &&
        !/^\d{11}$/.test(
          vergiTcNo
        )
          ? vergiTcNo
          : null;

      const mevcut =
        await prisma.cari.findFirst({
          where: {
            sirketId:
              sirket.id,
            atlasKodu,
          },
        });

      if (mevcut) {
        await prisma.cari.update({
          where: {
            id:
              mevcut.id,
          },

          data: {
            unvan,
            tip,
            gsm,
            telefon,
            email,
            grupKodu,
            tcNo:
              tcNo ??
              mevcut.tcNo,
            vergiNo:
              vergiNo ??
              mevcut.vergiNo,
            aktif:
              true,
          },
        });

        guncellenen++;
      } else {
        await prisma.cari.create({
          data: {
            sirketId:
              sirket.id,

            atlasKodu,

            unvan,

            tip,

            gsm,

            telefon,

            email,

            grupKodu,

            tcNo,

            vergiNo,

            acilisBorc:
              0,

            acilisAlacak:
              0,

            aktif:
              true,

            notlar:
              "[ATLAS_AKTAR] Atlas Muhasebe cari kartlarından aktarıldı.",
          },
        });

        eklenen++;
      }
    } catch (error) {
      atlanan++;

      hatalar.push(
        `${satir.atlasKodu || "-"} - ${
          error instanceof Error
            ? error.message
            : "Bilinmeyen hata"
        }`
      );
    }
  }

  revalidatePath("/beach");
  revalidatePath("/beach/cariler");
  revalidatePath("/beach/atlas-aktar");

  return {
    toplam:
      satirlar.length,
    eklenen,
    guncellenen,
    atlanan,
    hatalar,
  };
}

export async function atlasCarileriListele() {
  const sirket =
    await prisma.sirket.findUnique({
      where: {
        kod: "BEACH",
      },
    });

  if (!sirket) {
    return [];
  }

  const cariler =
    await prisma.cari.findMany({
      where: {
        sirketId:
          sirket.id,

        atlasKodu: {
          not: null,
        },
      },

      orderBy: {
        atlasKodu:
          "asc",
      },

      select: {
        id: true,
        atlasKodu: true,
        unvan: true,
        tip: true,
        aktif: true,
        notlar: true,

        _count: {
          select: {
            hareketler:
              true,
            faturalar:
              true,
            giderler:
              true,
            cekler:
              true,
            odemeler:
              true,
            finansHareketleri:
              true,
          },
        },
      },
    });

  return cariler.map(
    (cari) => ({
      id:
        cari.id,

      atlasKodu:
        cari.atlasKodu ??
        "",

      unvan:
        cari.unvan,

      tip:
        cari.tip,

      aktif:
        cari.aktif,

      atlasAktarildi:
        cari.notlar?.includes(
          "[ATLAS_AKTAR]"
        ) ?? false,

      bagliKayitSayisi:
        cari._count.hareketler +
        cari._count.faturalar +
        cari._count.giderler +
        cari._count.cekler +
        cari._count.odemeler +
        cari._count.finansHareketleri,
    })
  );
}

export async function atlasCariSil(
  cariId: number
) {
  const cari =
    await prisma.cari.findUnique({
      where: {
        id:
          cariId,
      },

      include: {
        _count: {
          select: {
            hareketler:
              true,
            faturalar:
              true,
            giderler:
              true,
            cekler:
              true,
            odemeler:
              true,
            finansHareketleri:
              true,
          },
        },
      },
    });

  if (!cari) {
    throw new Error(
      "Cari bulunamadı."
    );
  }

  const bagliKayitSayisi =
    cari._count.hareketler +
    cari._count.faturalar +
    cari._count.giderler +
    cari._count.cekler +
    cari._count.odemeler +
    cari._count.finansHareketleri;

  if (bagliKayitSayisi > 0) {
    throw new Error(
      "Bu cariye bağlı hareket, fatura, çek veya finans kaydı var. Önce bağlı kayıtları kaldırmalısınız."
    );
  }

  await prisma.cari.delete({
    where: {
      id:
        cari.id,
    },
  });

  revalidatePath("/beach");
  revalidatePath("/beach/cariler");
  revalidatePath("/beach/atlas-aktar");

  return {
    basarili:
      true,
  };
}

export async function atlasAktarilanlariGeriAl() {
  const sirket =
    await prisma.sirket.findUnique({
      where: {
        kod:
          "BEACH",
      },
    });

  if (!sirket) {
    throw new Error(
      "Beach & Mağaza bulunamadı."
    );
  }

  const cariler =
    await prisma.cari.findMany({
      where: {
        sirketId:
          sirket.id,

        notlar: {
          contains:
            "[ATLAS_AKTAR]",
        },
      },

      include: {
        _count: {
          select: {
            hareketler:
              true,
            faturalar:
              true,
            giderler:
              true,
            cekler:
              true,
            odemeler:
              true,
            finansHareketleri:
              true,
          },
        },
      },
    });

  let silinen = 0;
  let atlanan = 0;

  const hatalar: string[] =
    [];

  for (const cari of cariler) {
    const bagliKayitSayisi =
      cari._count.hareketler +
      cari._count.faturalar +
      cari._count.giderler +
      cari._count.cekler +
      cari._count.odemeler +
      cari._count.finansHareketleri;

    if (bagliKayitSayisi > 0) {
      atlanan++;

      hatalar.push(
        `${cari.unvan} - bağlı kayıt bulunduğu için silinmedi.`
      );

      continue;
    }

    await prisma.cari.delete({
      where: {
        id:
          cari.id,
      },
    });

    silinen++;
  }

  revalidatePath("/beach");
  revalidatePath("/beach/cariler");
  revalidatePath("/beach/atlas-aktar");

  return {
    silinen,
    atlanan,
    hatalar,
  };
}