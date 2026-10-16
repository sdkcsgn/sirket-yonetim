import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function tipAdi(tip: string) {
  switch (tip) {
    case "SATIS":
      return "Satış";
    case "ALIS":
      return "Alış";
    case "VERILEN_HIZMET":
      return "Verilen Hizmet";
    case "ALINAN_HIZMET":
      return "Alınan Hizmet";
    default:
      return tip;
  }
}

function odemeAdi(odemeSekli: string) {
  switch (odemeSekli) {
    case "ACIK_HESAP":
      return "Açık Hesap";
    case "NAKIT":
      return "Nakit";
    case "EFT_HAVALE":
      return "EFT / Havale";
    case "KREDI_KARTI":
      return "Kredi Kartı";
    default:
      return odemeSekli;
  }
}

export async function GET() {
  const sirket = await prisma.sirket.findUnique({
    where: {
      kod: "HAL",
    },
  });

  if (!sirket) {
    return NextResponse.json(
      {
        error: "Hal Komisyon & Soğuk Hava şirketi bulunamadı.",
      },
      {
        status: 404,
      }
    );
  }

  const faturalar = await prisma.fatura.findMany({
    where: {
      sirketId: sirket.id,
    },
    include: {
      cari: true,
      kalemler: {
        include: {
          stok: true,
        },
        orderBy: {
          id: "asc",
        },
      },
    },
    orderBy: [
      {
        tarih: "desc",
      },
      {
        id: "desc",
      },
    ],
  });

  const workbook = new ExcelJS.Workbook();

  workbook.creator =
    "Hal Komisyon & Soğuk Hava";

  workbook.created = new Date();

  /*
  |--------------------------------------------------------------------------
  | FATURALAR
  |--------------------------------------------------------------------------
  */

  const faturaSheet =
    workbook.addWorksheet("Faturalar", {
      views: [
        {
          state: "frozen",
          ySplit: 1,
        },
      ],
    });

  faturaSheet.columns = [
    { header: "Tarih", key: "tarih", width: 16 },
    { header: "Tür", key: "tip", width: 20 },
    { header: "Fatura No", key: "faturaNo", width: 20 },
    { header: "Cari", key: "cari", width: 34 },
    { header: "Ürün / Hizmet", key: "urun", width: 34 },
    { header: "Miktar", key: "miktar", width: 14 },
    { header: "Birim", key: "birim", width: 12 },
    { header: "Birim Fiyat", key: "birimFiyat", width: 18 },

    { header: "Kasa Adedi", key: "kasaAdedi", width: 14 },
    { header: "Kasa Birim Fiyatı", key: "kasaFiyati", width: 20 },
    { header: "Kasa Tutarı", key: "kasaTutari", width: 18 },

    { header: "Palet Adedi", key: "paletAdedi", width: 14 },
    { header: "Palet Birim Fiyatı", key: "paletFiyati", width: 20 },
    { header: "Palet Tutarı", key: "paletTutari", width: 18 },

    { header: "KDV %", key: "kdvOrani", width: 12 },
    { header: "Ara Toplam", key: "araToplam", width: 18 },
    { header: "KDV Toplam", key: "kdvToplam", width: 18 },
    { header: "Genel Toplam", key: "genelToplam", width: 20 },

    { header: "Para Birimi", key: "paraBirimi", width: 14 },
    { header: "Ödeme Şekli", key: "odemeSekli", width: 18 },
    { header: "Ödendi", key: "odendi", width: 12 },
    { header: "Açıklama", key: "aciklama", width: 40 },
  ];

  for (const fatura of faturalar) {
    const kasaKalemi =
      fatura.kalemler.find(
        (kalem) =>
          kalem.aciklama === "[KASA]"
      );

    const paletKalemi =
      fatura.kalemler.find(
        (kalem) =>
          kalem.aciklama === "[PALET]"
      );

    const anaKalem =
      fatura.kalemler.find(
        (kalem) =>
          kalem.aciklama !== "[KASA]" &&
          kalem.aciklama !== "[PALET]"
      );

    const kasaAdedi =
      kasaKalemi
        ? Number(kasaKalemi.miktar)
        : 0;

    const kasaFiyati =
      kasaKalemi
        ? Number(kasaKalemi.birimFiyat)
        : 0;

    const paletAdedi =
      paletKalemi
        ? Number(paletKalemi.miktar)
        : 0;

    const paletFiyati =
      paletKalemi
        ? Number(paletKalemi.birimFiyat)
        : 0;

    faturaSheet.addRow({
      tarih: fatura.tarih,
      tip: tipAdi(fatura.tip),
      faturaNo:
        fatura.faturaNo ||
        `#${fatura.id}`,
      cari:
        fatura.cari?.unvan || "",
      urun:
        anaKalem?.stok
          ? `${anaKalem.stok.kod} - ${anaKalem.stok.ad}`
          : anaKalem?.aciklama || "",
      miktar:
        anaKalem
          ? Number(anaKalem.miktar)
          : 0,
      birim:
        anaKalem?.birim || "",
      birimFiyat:
        anaKalem
          ? Number(anaKalem.birimFiyat)
          : 0,

      kasaAdedi,
      kasaFiyati,
      kasaTutari:
        kasaAdedi * kasaFiyati,

      paletAdedi,
      paletFiyati,
      paletTutari:
        paletAdedi * paletFiyati,

      kdvOrani:
        anaKalem
          ? Number(anaKalem.kdvOrani)
          : 0,

      araToplam:
        Number(fatura.araToplam),

      kdvToplam:
        Number(fatura.kdvToplam),

      genelToplam:
        Number(fatura.genelToplam),

      paraBirimi:
        fatura.paraBirimi,

      odemeSekli:
        odemeAdi(
          fatura.odemeSekli
        ),

      odendi:
        fatura.odendi
          ? "EVET"
          : "HAYIR",

      aciklama:
        fatura.aciklama || "",
    });
  }

  const header =
    faturaSheet.getRow(1);

  header.font = {
    bold: true,
    color: {
      argb: "FFFFFFFF",
    },
  };

  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "FF0F172A",
    },
  };

  header.alignment = {
    vertical: "middle",
    horizontal: "center",
  };

  header.height = 28;

  faturaSheet.autoFilter = {
    from: "A1",
    to: "V1",
  };

  faturaSheet.getColumn("A").numFmt =
    "dd.mm.yyyy";

  for (const column of [
    "H",
    "J",
    "K",
    "M",
    "N",
    "P",
    "Q",
    "R",
  ]) {
    faturaSheet.getColumn(column).numFmt =
      '#,##0.00 "₺"';
  }

  for (const column of [
    "F",
    "I",
    "L",
    "O",
  ]) {
    faturaSheet.getColumn(column).numFmt =
      "#,##0.###";
  }

  /*
  |--------------------------------------------------------------------------
  | FATURA KALEMLERİ
  |--------------------------------------------------------------------------
  */

  const kalemSheet =
    workbook.addWorksheet(
      "Fatura Kalemleri",
      {
        views: [
          {
            state: "frozen",
            ySplit: 1,
          },
        ],
      }
    );

  kalemSheet.columns = [
    { header: "Tarih", key: "tarih", width: 16 },
    { header: "Fatura No", key: "faturaNo", width: 20 },
    { header: "Cari", key: "cari", width: 34 },
    { header: "Tür", key: "tip", width: 20 },
    { header: "Kalem", key: "kalem", width: 34 },
    { header: "Miktar", key: "miktar", width: 14 },
    { header: "Birim", key: "birim", width: 12 },
    { header: "Birim Fiyat", key: "birimFiyat", width: 18 },
    { header: "KDV %", key: "kdvOrani", width: 12 },
    { header: "Toplam", key: "toplam", width: 20 },
  ];

  for (const fatura of faturalar) {
    for (const kalem of fatura.kalemler) {
      kalemSheet.addRow({
        tarih: fatura.tarih,
        faturaNo:
          fatura.faturaNo ||
          `#${fatura.id}`,
        cari:
          fatura.cari?.unvan || "",
        tip: tipAdi(fatura.tip),
        kalem:
          kalem.aciklama === "[KASA]"
            ? "Kasa"
            : kalem.aciklama === "[PALET]"
            ? "Palet"
            : kalem.stok
            ? `${kalem.stok.kod} - ${kalem.stok.ad}`
            : kalem.aciklama,
        miktar:
          Number(kalem.miktar),
        birim:
          kalem.birim || "",
        birimFiyat:
          Number(kalem.birimFiyat),
        kdvOrani:
          Number(kalem.kdvOrani),
        toplam:
          Number(kalem.toplam),
      });
    }
  }

  const kalemHeader =
    kalemSheet.getRow(1);

  kalemHeader.font = {
    bold: true,
    color: {
      argb: "FFFFFFFF",
    },
  };

  kalemHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "FF0F172A",
    },
  };

  kalemHeader.alignment = {
    vertical: "middle",
    horizontal: "center",
  };

  kalemSheet.autoFilter = {
    from: "A1",
    to: "J1",
  };

  kalemSheet.getColumn("A").numFmt =
    "dd.mm.yyyy";

  kalemSheet.getColumn("F").numFmt =
    "#,##0.###";

  kalemSheet.getColumn("H").numFmt =
    '#,##0.00 "₺"';

  kalemSheet.getColumn("I").numFmt =
    "#,##0.00";

  kalemSheet.getColumn("J").numFmt =
    '#,##0.00 "₺"';

  const buffer =
    await workbook.xlsx.writeBuffer();

  const tarih = new Intl.DateTimeFormat(
    "tr-TR",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  )
    .format(new Date())
    .replaceAll(".", "-");

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        `attachment; filename="HAL-Faturalar-${tarih}.xlsx"`,
      "Cache-Control":
        "no-store",
    },
  });
}
