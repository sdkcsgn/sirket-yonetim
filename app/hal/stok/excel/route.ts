import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

  const [stoklar, hareketler, fiyatKalemleri] = await Promise.all([
  prisma.stok.findMany({
    where: {
      sirketId: sirket.id,
    },
    include: {
      hareketler: {
        orderBy: [
          {
            tarih: "desc",
          },
          {
            id: "desc",
          },
        ],
        take: 1,
      },
    },
    orderBy: {
      ad: "asc",
    },
  }),

  prisma.stokHareket.findMany({
    where: {
      stok: {
        sirketId: sirket.id,
      },
    },
    include: {
      stok: true,
    },
    orderBy: [
      {
        tarih: "desc",
      },
      {
        id: "desc",
      },
    ],
  }),

  prisma.faturaKalemi.findMany({
    where: {
      stokId: {
        not: null,
      },
      fatura: {
        sirketId: sirket.id,
        tip: {
          in: ["ALIS", "SATIS"],
        },
      },
    },
    select: {
      id: true,
      stokId: true,
      birimFiyat: true,
      fatura: {
        select: {
          tip: true,
          tarih: true,
        },
      },
    },
  }),
]);

const siraliFiyatKalemleri = [...fiyatKalemleri].sort(
  (a, b) => {
    const tarihFarki =
      b.fatura.tarih.getTime() -
      a.fatura.tarih.getTime();

    if (tarihFarki !== 0) {
      return tarihFarki;
    }

    return b.id - a.id;
  }
);

const sonAlisFiyatlari = new Map<number, number>();
const sonSatisFiyatlari = new Map<number, number>();

for (const kalem of siraliFiyatKalemleri) {
  if (!kalem.stokId) {
    continue;
  }

  const fiyat = Number(kalem.birimFiyat);

  if (
    kalem.fatura.tip === "ALIS" &&
    !sonAlisFiyatlari.has(kalem.stokId)
  ) {
    sonAlisFiyatlari.set(
      kalem.stokId,
      fiyat
    );
  }

  if (
    kalem.fatura.tip === "SATIS" &&
    !sonSatisFiyatlari.has(kalem.stokId)
  ) {
    sonSatisFiyatlari.set(
      kalem.stokId,
      fiyat
    );
  }
}

  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Hal Yönetim Sistemi";
  workbook.created = new Date();

  /*
  |--------------------------------------------------------------------------
  | 1. STOK DURUMU
  |--------------------------------------------------------------------------
  */

  const stokSheet = workbook.addWorksheet("Stok Durumu", {
    views: [
      {
        state: "frozen",
        ySplit: 1,
      },
    ],
  });

  stokSheet.columns = [
    {
      header: "Kod",
      key: "kod",
      width: 18,
    },
    {
      header: "Ürün Adı",
      key: "ad",
      width: 32,
    },
    {
      header: "Kategori",
      key: "kategori",
      width: 22,
    },
    {
      header: "Depo Bölümü",
      key: "depoBolumu",
      width: 22,
    },
    {
      header: "Birim",
      key: "birim",
      width: 14,
    },
    {
      header: "Mevcut Stok",
      key: "mevcutMiktar",
      width: 18,
    },
    {
      header: "Minimum Stok",
      key: "minimumStok",
      width: 18,
    },
    {
      header: "Alış Fiyatı",
      key: "alisFiyati",
      width: 18,
    },
    {
      header: "Satış Fiyatı",
      key: "satisFiyati",
      width: 18,
    },
    {
      header: "Stok Maliyeti",
      key: "stokMaliyeti",
      width: 20,
    },
    {
      header: "Potansiyel Satış Tutarı",
      key: "potansiyelSatis",
      width: 24,
    },
    {
      header: "Birim Kâr",
      key: "birimKar",
      width: 18,
    },
    {
      header: "Toplam Potansiyel Kâr",
      key: "toplamKar",
      width: 24,
    },
    {
      header: "Stok Durumu",
      key: "stokDurumu",
      width: 18,
    },
    {
      header: "Aktif",
      key: "aktif",
      width: 12,
    },
    {
      header: "Son Hareket Tarihi",
      key: "sonHareketTarihi",
      width: 22,
    },
    {
      header: "Son Hareket",
      key: "sonHareket",
      width: 20,
    },
    {
      header: "Son Hareket Açıklaması",
      key: "sonHareketAciklama",
      width: 36,
    },
  ];

  for (const stok of stoklar) {
    const mevcutMiktar = Number(stok.mevcutMiktar);
    const minimumStok = Number(stok.minimumStok);
    const alisFiyati = Number(stok.alisFiyati);
    const satisFiyati = Number(stok.satisFiyati);

    const stokMaliyeti = mevcutMiktar * alisFiyati;
    const potansiyelSatis = mevcutMiktar * satisFiyati;
    const birimKar = satisFiyati - alisFiyati;
    const toplamKar = mevcutMiktar * birimKar;

    const sonHareket = stok.hareketler[0];

    let stokDurumu = "NORMAL";

    if (mevcutMiktar <= 0) {
      stokDurumu = "STOKTA YOK";
    } else if (mevcutMiktar <= minimumStok) {
      stokDurumu = "KRİTİK";
    }

    let sonHareketMetni = "";

    if (sonHareket) {
      const giris = Number(sonHareket.giris);
      const cikis = Number(sonHareket.cikis);

      if (giris > 0) {
        sonHareketMetni = `GİRİŞ +${giris} ${stok.birim}`;
      } else if (cikis > 0) {
        sonHareketMetni = `ÇIKIŞ -${cikis} ${stok.birim}`;
      }
    }

    stokSheet.addRow({
      kod: stok.kod,
      ad: stok.ad,
      kategori: stok.kategori || "",
      depoBolumu: stok.depoBolumu || "",
      birim: stok.birim,

      mevcutMiktar,
      minimumStok,

      alisFiyati,
      satisFiyati,

      stokMaliyeti,
      potansiyelSatis,
      birimKar,
      toplamKar,

      stokDurumu,

      aktif: stok.aktif ? "EVET" : "HAYIR",

      sonHareketTarihi: sonHareket
        ? sonHareket.tarih
        : null,

      sonHareket: sonHareketMetni,

      sonHareketAciklama:
        sonHareket?.aciklama || "",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | STOK SAYFASI BİÇİMLENDİRME
  |--------------------------------------------------------------------------
  */

  const stokHeader = stokSheet.getRow(1);

  stokHeader.font = {
    bold: true,
    color: {
      argb: "FFFFFFFF",
    },
  };

  stokHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "FF0F172A",
    },
  };

  stokHeader.alignment = {
    vertical: "middle",
    horizontal: "center",
  };

  stokHeader.height = 28;

  stokSheet.autoFilter = {
    from: "A1",
    to: "R1",
  };

  /*
  |--------------------------------------------------------------------------
  | SAYISAL ALANLAR
  |--------------------------------------------------------------------------
  */

  stokSheet.getColumn("F").numFmt = '#,##0.###';
  stokSheet.getColumn("G").numFmt = '#,##0.###';

  stokSheet.getColumn("H").numFmt = '#,##0.00 "₺"';
  stokSheet.getColumn("I").numFmt = '#,##0.00 "₺"';
  stokSheet.getColumn("J").numFmt = '#,##0.00 "₺"';
  stokSheet.getColumn("K").numFmt = '#,##0.00 "₺"';
  stokSheet.getColumn("L").numFmt = '#,##0.00 "₺"';
  stokSheet.getColumn("M").numFmt = '#,##0.00 "₺"';

  stokSheet.getColumn("P").numFmt = "dd.mm.yyyy hh:mm";

  /*
  |--------------------------------------------------------------------------
  | RENKLİ STOK DURUMU
  |--------------------------------------------------------------------------
  */

  stokSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const durumCell = row.getCell(14);

    if (durumCell.value === "STOKTA YOK") {
      durumCell.font = {
        bold: true,
        color: {
          argb: "FFDC2626",
        },
      };
    } else if (durumCell.value === "KRİTİK") {
      durumCell.font = {
        bold: true,
        color: {
          argb: "FFF59E0B",
        },
      };
    } else {
      durumCell.font = {
        bold: true,
        color: {
          argb: "FF16A34A",
        },
      };
    }
  });

  /*
  |--------------------------------------------------------------------------
  | 2. STOK HAREKETLERİ
  |--------------------------------------------------------------------------
  */

  const hareketSheet = workbook.addWorksheet(
    "Stok Hareketleri",
    {
      views: [
        {
          state: "frozen",
          ySplit: 1,
        },
      ],
    }
  );

  hareketSheet.columns = [
    {
      header: "Tarih",
      key: "tarih",
      width: 22,
    },
    {
      header: "Kod",
      key: "kod",
      width: 18,
    },
    {
      header: "Ürün",
      key: "urun",
      width: 32,
    },
    {
      header: "Kategori",
      key: "kategori",
      width: 22,
    },
    {
      header: "Hareket",
      key: "hareket",
      width: 16,
    },
    {
      header: "Giriş",
      key: "giris",
      width: 16,
    },
    {
      header: "Çıkış",
      key: "cikis",
      width: 16,
    },
    {
      header: "Birim",
      key: "birim",
      width: 14,
    },
    {
      header: "Alış Fiyatı",
      key: "alisFiyati",
      width: 18,
    },
    {
      header: "Satış Fiyatı",
      key: "satisFiyati",
      width: 18,
    },
    {
      header: "Belge No",
      key: "belgeNo",
      width: 22,
    },
    {
      header: "Açıklama",
      key: "aciklama",
      width: 45,
    },
  ];

  for (const hareket of hareketler) {
    const giris = Number(hareket.giris);
    const cikis = Number(hareket.cikis);

    hareketSheet.addRow({
      tarih: hareket.tarih,
      kod: hareket.stok.kod,
      urun: hareket.stok.ad,
      kategori: hareket.stok.kategori || "",

      hareket:
        giris > 0
          ? "GİRİŞ"
          : "ÇIKIŞ",

      giris,
      cikis,

      birim: hareket.stok.birim,

      alisFiyati:
        Number(hareket.stok.alisFiyati),

      satisFiyati:
        Number(hareket.stok.satisFiyati),

      belgeNo:
        hareket.belgeNo || "",

      aciklama:
        hareket.aciklama || "",
    });
  }

  const hareketHeader =
    hareketSheet.getRow(1);

  hareketHeader.font = {
    bold: true,
    color: {
      argb: "FFFFFFFF",
    },
  };

  hareketHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "FF0F172A",
    },
  };

  hareketHeader.alignment = {
    vertical: "middle",
    horizontal: "center",
  };

  hareketHeader.height = 28;

  hareketSheet.autoFilter = {
    from: "A1",
    to: "L1",
  };

  hareketSheet.getColumn("A").numFmt =
    "dd.mm.yyyy hh:mm";

  hareketSheet.getColumn("F").numFmt =
    '#,##0.###';

  hareketSheet.getColumn("G").numFmt =
    '#,##0.###';

  hareketSheet.getColumn("I").numFmt =
    '#,##0.00 "₺"';

  hareketSheet.getColumn("J").numFmt =
    '#,##0.00 "₺"';

  /*
  |--------------------------------------------------------------------------
  | ÖZET SAYFASI
  |--------------------------------------------------------------------------
  */

  const ozetSheet =
    workbook.addWorksheet("Özet");

  const aktifStoklar =
    stoklar.filter((stok) => stok.aktif);

  const toplamStokMaliyeti =
    aktifStoklar.reduce(
      (toplam, stok) =>
        toplam +
        Number(stok.mevcutMiktar) *
          Number(stok.alisFiyati),
      0
    );

  const toplamPotansiyelSatis =
    aktifStoklar.reduce(
      (toplam, stok) =>
        toplam +
        Number(stok.mevcutMiktar) *
          Number(stok.satisFiyati),
      0
    );

  const kritikUrun =
    aktifStoklar.filter(
      (stok) =>
        Number(stok.mevcutMiktar) > 0 &&
        Number(stok.mevcutMiktar) <=
          Number(stok.minimumStok)
    ).length;

  const sifirStok =
    aktifStoklar.filter(
      (stok) =>
        Number(stok.mevcutMiktar) <= 0
    ).length;

  ozetSheet.columns = [
    {
      width: 34,
    },
    {
      width: 24,
    },
  ];

  ozetSheet.addRow([
    "HAL KOMİSYON & SOĞUK HAVA",
    "",
  ]);

  ozetSheet.addRow([]);

  ozetSheet.addRow([
    "Toplam Ürün",
    stoklar.length,
  ]);

  ozetSheet.addRow([
    "Aktif Ürün",
    aktifStoklar.length,
  ]);

  ozetSheet.addRow([
    "Kritik Stok",
    kritikUrun,
  ]);

  ozetSheet.addRow([
    "Stokta Olmayan",
    sifirStok,
  ]);

  ozetSheet.addRow([
    "Toplam Stok Maliyeti",
    toplamStokMaliyeti,
  ]);

  ozetSheet.addRow([
    "Potansiyel Satış Tutarı",
    toplamPotansiyelSatis,
  ]);

  ozetSheet.addRow([
    "Potansiyel Brüt Kâr",
    toplamPotansiyelSatis -
      toplamStokMaliyeti,
  ]);

  ozetSheet.getRow(1).font = {
    bold: true,
    size: 16,
  };

  ozetSheet.getCell("B7").numFmt =
    '#,##0.00 "₺"';

  ozetSheet.getCell("B8").numFmt =
    '#,##0.00 "₺"';

  ozetSheet.getCell("B9").numFmt =
    '#,##0.00 "₺"';

  /*
  |--------------------------------------------------------------------------
  | DOSYA
  |--------------------------------------------------------------------------
  */

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
        `attachment; filename="HAL-Stok-${tarih}.xlsx"`,

      "Cache-Control":
        "no-store",
    },
  });
}