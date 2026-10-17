
"use client";

type Props = {
  cariFisMi: boolean;
};

export default function CariHareketSilButonu({
  cariFisMi,
}: Props) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        const mesaj = cariFisMi
          ? "Bu cari fişi silmek istediğinize emin misiniz?"
          : "Bu cari hareketini silmek istediğinize emin misiniz?";

        if (!window.confirm(mesaj)) {
          e.preventDefault();
        }
      }}
      className="w-[70px] rounded-md bg-red-600 px-2 py-1.5 text-[10px] font-black text-white hover:bg-red-500"
    >
      Sil
    </button>
  );
}
