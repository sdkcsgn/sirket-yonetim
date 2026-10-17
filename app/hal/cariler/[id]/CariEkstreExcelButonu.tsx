"use client";

type EkstreSatiri = {
  tarih: string;
  islem: string;
  aciklama: string;
  belgeNo: string;
  borc: number;
  alacak: number;
  bakiye: number;
};

type Props = {
  cariUnvan: string;
  acilisBorc: number;
  acilisAlacak: number;
  hareketler: EkstreSatiri[];
};

export default function CariEkstreExcelButonu({
  cariUnvan,
  acilisBorc,
  acilisAlacak,
  hareketler,
}: Props) {
  function excelAktar() {
    const satirlar = [
      ["Cari Ekstresi", cariUnvan],
      [],
      ["Tarih", "İşlem", "Açıklama", "Belge No", "Borç", "Alacak", "Bakiye"],
      [
        "Açılış",
        "Devir",
        "Açılış Bakiyesi",
        "",
        acilisBorc,
        acilisAlacak,
        acilisBorc - acilisAlacak,
      ],
      ...hareketler.map((h) => [
        h.tarih,
        h.islem,
        h.aciklama,
        h.belgeNo,
        h.borc,
        h.alacak,
        h.bakiye,
      ]),
    ];

    const csv = satirlar
      .map((satir) =>
        satir
          .map((deger) => {
            const metin = String(deger ?? "").replace(/"/g, '""');
            return `"${metin}"`;
          })
          .join(";")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cari-ekstre-${cariUnvan
      .replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ-]/gi, "-")
      .slice(0, 60)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={excelAktar}
      className="rounded-xl border border-emerald-700 px-4 py-2.5 text-sm font-bold text-emerald-400 transition hover:bg-emerald-950/30"
    >
      ↓ Ekstreyi Excel'e Aktar
    </button>
  );
}