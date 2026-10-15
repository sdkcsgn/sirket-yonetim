"use client";

import { useRouter } from "next/navigation";

type Props = {
  cariId: number;
  unvan: string;
};

export default function SilButonu({
  cariId,
  unvan,
}: Props) {
  const router = useRouter();

  function sil() {
    const onay = window.confirm(
      `${unvan} carisini silmek istediğinize emin misiniz?`
    );

    if (!onay) {
      return;
    }

    router.push(`/beach/cariler/${cariId}/sil`);
  }

  return (
    <button
      type="button"
      onClick={sil}
      className="rounded-lg border border-red-700 px-3 py-2 text-sm font-bold text-red-400 transition hover:bg-red-950/30"
    >
      Sil
    </button>
  );
}
