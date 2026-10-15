"use client";

import * as XLSX from "xlsx";

type CekExcelKaydi = {
  cekNo: string;
  cari: string;
  tip: string;
  durum: string;
  banka: string;
  sube: string;
  vadeTarihi: string;
  tutar: number;
  kesideci: string;
  aciklama: string;
};

type Props = {
  kayitlar: CekExcelKaydi[];
  gorunum: string;
};

function tarihYaz(value: string) {
  const tarih = new Date(value);

  if (Number.isNaN(tarih.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(tarih);
}

function gorunumAdi(gorunum: string) {
  switch (gorunum) {
    case "ALINAN":
      return "Alinan";
    case "VERILEN":
      return "Verilen";
    case "CIRO":
      return "Ciro";
    default:
      return "Tumu";
  }
}

export default function CekExcelAktarButonu({
  kayitlar,
  gorunum,
}: Props) {
  function excelOlustur() {
    if (kayitlar.length === 0) {
      window.alert("Excel'e aktarılacak çek kaydı bulunamadı.");
      return;
    }

    const satirlar = kayitlar.map((kayit) => ({
      "Çek No": kayit.cekNo,
      "Cari": kayit.cari,
      "Tip": kayit.tip,
      "Durum": kayit.durum,
      "Banka": kayit.banka,
      "Şube": kayit.sube,
      "Vade Tarihi": tarihYaz(kayit.vadeTarihi),
      "Tutar": kayit.tutar,
      "Keşideci": kayit.kesideci,
      "Açıklama": kayit.aciklama,
    }));

    const sayfa = XLSX.utils.json_to_sheet(satirlar);

    sayfa["!cols"] = [
      { wch: 18 },
      { wch: 36 },
      { wch: 14 },
      { wch: 18 },
      { wch: 24 },
      { wch: 18 },
      { wch: 14 },
      { wch: 16 },
      { wch: 28 },
      { wch: 42 },
    ];

    const kitap = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      kitap,
      sayfa,
      "Çek Listesi"
    );

    const simdi = new Date();
    const gun = String(simdi.getDate()).padStart(2, "0");
    const ay = String(simdi.getMonth() + 1).padStart(2, "0");
    const yil = simdi.getFullYear();

    const dosyaAdi =
      `Cek_Listesi_${gorunumAdi(gorunum)}_${gun}-${ay}-${yil}.xlsx`;

    XLSX.writeFile(
      kitap,
      dosyaAdi
    );
  }

  return (
    <button
      type="button"
      onClick={excelOlustur}
      className="rounded-xl border border-emerald-700 px-5 py-3 font-bold text-emerald-400 transition hover:bg-emerald-950/30"
    >
      📥 Excel'e Aktar
    </button>
  );
}
