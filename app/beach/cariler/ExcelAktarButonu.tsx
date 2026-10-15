"use client";

import * as XLSX from "xlsx";

type ExcelKaydi = {
  kod: string;
  cari: string;
  tip: string;
  telefon: string;
  vergiTc: string;
  borc: number;
  alacak: number;
  bakiye: number;
  durum: string;
};

type Props = {
  kayitlar: ExcelKaydi[];
  filtreli?: boolean;
};

export default function ExcelAktarButonu({
  kayitlar,
  filtreli = false,
}: Props) {
  function excelOlustur() {
    if (kayitlar.length === 0) {
      window.alert("Excel'e aktarılacak cari kaydı bulunamadı.");
      return;
    }

    const satirlar = kayitlar.map((kayit) => ({
      "Cari Kodu": kayit.kod,
      "Cari Ünvanı": kayit.cari,
      "Cari Tipi": kayit.tip,
      "Telefon": kayit.telefon,
      "Vergi / T.C. No": kayit.vergiTc,
      "Borç": kayit.borc,
      "Alacak": kayit.alacak,
      "Bakiye": kayit.bakiye,
      "Durum": kayit.durum,
    }));

    const sayfa = XLSX.utils.json_to_sheet(satirlar);

    sayfa["!cols"] = [
      { wch: 16 },
      { wch: 38 },
      { wch: 18 },
      { wch: 20 },
      { wch: 20 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
    ];

    const kitap = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      kitap,
      sayfa,
      "Cari Listesi"
    );

    const simdi = new Date();
    const gun = String(simdi.getDate()).padStart(2, "0");
    const ay = String(simdi.getMonth() + 1).padStart(2, "0");
    const yil = simdi.getFullYear();

    const dosyaAdi = filtreli
      ? `Cari_Listesi_Filtreli_${gun}-${ay}-${yil}.xlsx`
      : `Cari_Listesi_${gun}-${ay}-${yil}.xlsx`;

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
