import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function date(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function cariTipi(tip: string) {
  switch (tip) {
    case "MUSTERI":
      return "Müşteri";

    case "URETICI":
      return "Üretici";

    case "SATICI":
      return "Satıcı";

    case "UYE":
      return "Üye";

    case "BANKA":
      return "Banka";

    case "PERSONEL":
      return "Personel";

    case "YARDIMCI_HESAP":
      return "Yardımcı Hesap";

    case "DIGER":
      return "Diğer";

    default:
      return tip;
  }
}

function hareketIsmi(
  aciklama: string,
  tip: string
) {
  if (aciklama.startsWith("[Satış]")) {
    return "Satış";
  }

  if (aciklama.startsWith("[Alış]")) {
    return "Alış";
  }

  if (aciklama.startsWith("[Tahsilat]")) {
    return "Tahsilat";
  }

  if (aciklama.startsWith("[Ödeme]")) {
    return "Ödeme";
  }

  if (aciklama.startsWith("[Devir Borç]")) {
    return "Devir Borç";
  }

  if (aciklama.startsWith("[Devir Alacak]")) {
    return "Devir Alacak";
  }

  if (aciklama.startsWith("[Alınan Çek]")) {
    return "Alınan Çek";
  }

  if (aciklama.startsWith("[Verilen Çek]")) {
    return "Verilen Çek";
  }

  if (
    aciklama.startsWith(
      "[Ciro Çek Karşılıksız]"
    )
  ) {
    return "Ciro Çek Karşılıksız";
  }

  if (
    aciklama.startsWith(
      "[Ciro Çek İptal]"
    )
  ) {
    return "Ciro Çek İptal";
  }

  if (aciklama.startsWith("[Ciro Çek]")) {
    return "Ciro Çek";
  }

  return tip === "BORC"
    ? "Borç"
    : "Alacak";
}

function temizAciklama(aciklama: string) {
  return aciklama.replace(
    /^\[[^\]]+\]\s*/,
    ""
  );
}

export default async function CariDetayPage({
  params,
}: Props) {
  const { id } = await params;

  const cariId = Number(id);

  if (!Number.isInteger(cariId)) {
    notFound();
  }

  const cari =
    await prisma.cari.findUnique({
      where: {
        id: cariId,
      },

      include: {
        hareketler: {
          orderBy: [
            {
              tarih: "asc",
            },
            {
              id: "asc",
            },
          ],
        },
      },
    });

  if (!cari) {
    notFound();
  }

  const acilisBorc =
    Number(cari.acilisBorc);

  const acilisAlacak =
    Number(cari.acilisAlacak);

  let toplamBorc = acilisBorc;
  let toplamAlacak = acilisAlacak;

  for (const hareket of cari.hareketler) {
    toplamBorc += Number(
      hareket.borc
    );

    toplamAlacak += Number(
      hareket.alacak
    );
  }

  const bakiye =
    toplamBorc - toplamAlacak;

  let yuruyenBakiye =
    acilisBorc - acilisAlacak;

  const hareketler =
    cari.hareketler.map(
      (hareket) => {
        yuruyenBakiye +=
          Number(hareket.borc) -
          Number(hareket.alacak);

        return {
          ...hareket,
          yuruyenBakiye,
        };
      }
    );

  const gorunenHareketler = [
    ...hareketler,
  ].reverse();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Beach & Mağaza
            </p>

            <h1 className="mt-2 max-w-4xl text-3xl font-black leading-tight md:text-4xl">
              {cari.unvan}
            </h1>

            <div className="mt-4">
              <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-sm font-bold text-cyan-400">
                {cariTipi(cari.tip)}
              </span>

              {!cari.aktif && (
                <span className="ml-2 rounded-full bg-amber-500/10 px-3 py-1 text-sm font-bold text-amber-400">
                  Pasif
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/beach/cariler"
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 transition hover:bg-slate-900"
            >
              ← Cari Listesi
            </a>

            <a
              href={`/beach/cariler/${cari.id}/duzenle`}
              className="rounded-xl border border-cyan-700 px-5 py-3 font-bold text-cyan-400 transition hover:bg-cyan-950/30"
            >
              Düzenle
            </a>

            <a
              href={`/beach/cariler/${cari.id}/hareket-yeni`}
              className="rounded-xl bg-cyan-500 px-6 py-3 font-black text-slate-950 transition hover:bg-cyan-400"
            >
              + Yeni Hareket
            </a>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Toplam Borç
            </p>

            <p className="mt-3 text-3xl font-black text-red-400">
              {money(toplamBorc)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Toplam Alacak
            </p>

            <p className="mt-3 text-3xl font-black text-emerald-400">
              {money(toplamAlacak)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Güncel Bakiye
            </p>

            <p
              className={`mt-3 text-3xl font-black ${
                bakiye > 0
                  ? "text-red-400"
                  : bakiye < 0
                  ? "text-emerald-400"
                  : "text-white"
              }`}
            >
              {money(Math.abs(bakiye))}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              {bakiye > 0
                ? "Borç bakiyesi"
                : bakiye < 0
                ? "Alacak bakiyesi"
                : "Hesap kapalı"}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold">
              Cari Bilgileri
            </h2>

            <div className="mt-7 space-y-6">
              <div>
                <p className="text-sm text-slate-500">
                  Atlas Kodu
                </p>

                <p className="mt-1 font-semibold">
                  {cari.atlasKodu || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Yetkili
                </p>

                <p className="mt-1 font-semibold">
                  {cari.yetkili || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  GSM
                </p>

                <p className="mt-1 font-semibold">
                  {cari.gsm || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Telefon
                </p>

                <p className="mt-1 font-semibold">
                  {cari.telefon || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  E-posta
                </p>

                <p className="mt-1 break-all font-semibold">
                  {cari.email || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Vergi No / T.C.
                </p>

                <p className="mt-1 font-semibold">
                  {cari.vergiNo ||
                    cari.tcNo ||
                    "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Vergi Dairesi
                </p>

                <p className="mt-1 font-semibold">
                  {cari.vergiDairesi ||
                    "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Grup Kodu
                </p>

                <p className="mt-1 font-semibold">
                  {cari.grupKodu || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Adres
                </p>

                <p className="mt-1 whitespace-pre-line font-semibold">
                  {cari.adres || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Notlar
                </p>

                <p className="mt-1 whitespace-pre-line font-semibold">
                  {cari.notlar || "-"}
                </p>
              </div>
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="flex flex-col gap-4 border-b border-slate-800 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  Cari Hareketleri
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Tüm borç, alacak, satış,
                  tahsilat, ödeme ve çek işlemleri
                </p>
              </div>

              <a
                href={`/beach/cariler/${cari.id}/hareket-yeni`}
                className="rounded-xl bg-cyan-500 px-5 py-3 text-center font-black text-slate-950"
              >
                + Yeni Hareket
              </a>
            </div>

            <div className="grid gap-4 border-b border-slate-800 bg-slate-950/30 px-6 py-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">
                  Açılış Borcu
                </p>

                <p className="mt-1 font-bold text-red-400">
                  {money(acilisBorc)}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Açılış Alacağı
                </p>

                <p className="mt-1 font-bold text-emerald-400">
                  {money(acilisAlacak)}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Açılış Bakiyesi
                </p>

                <p className="mt-1 font-bold">
                  {money(
                    Math.abs(
                      acilisBorc -
                        acilisAlacak
                    )
                  )}
                </p>
              </div>
            </div>

            {gorunenHareketler.length === 0 ? (
              <div className="p-14 text-center">
                <div className="text-4xl">
                  🧾
                </div>

                <h3 className="mt-4 text-xl font-bold">
                  Henüz cari hareketi yok
                </h3>

                <p className="mt-2 text-slate-400">
                  İlk borç, alacak, satış,
                  tahsilat veya ödeme
                  hareketini ekleyebilirsiniz.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-left text-sm text-slate-400">
                      <th className="px-5 py-4">
                        Tarih
                      </th>

                      <th className="px-5 py-4">
                        İşlem
                      </th>

                      <th className="px-5 py-4">
                        Açıklama
                      </th>

                      <th className="px-5 py-4">
                        Belge No
                      </th>

                      <th className="px-5 py-4">
                        Borç
                      </th>

                      <th className="px-5 py-4">
                        Alacak
                      </th>

                      <th className="px-5 py-4">
                        Bakiye
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {gorunenHareketler.map(
                      (hareket) => {
                        const hareketAdi =
                          hareketIsmi(
                            hareket.aciklama,
                            hareket.tip
                          );

                        const borc =
                          Number(
                            hareket.borc
                          );

                        const alacak =
                          Number(
                            hareket.alacak
                          );

                        return (
                          <tr
                            key={hareket.id}
                            className="border-b border-slate-800/70 transition hover:bg-slate-800/30"
                          >
                            <td className="whitespace-nowrap px-5 py-4 text-slate-300">
                              {date(
                                hareket.tarih
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${
                                  hareketAdi ===
                                  "Ciro Çek"
                                    ? "bg-violet-500/10 text-violet-400"
                                    : hareketAdi ===
                                        "Ciro Çek Karşılıksız" ||
                                      hareketAdi ===
                                        "Ciro Çek İptal"
                                    ? "bg-amber-500/10 text-amber-400"
                                    : hareket.tip ===
                                      "BORC"
                                    ? "bg-red-500/10 text-red-400"
                                    : "bg-emerald-500/10 text-emerald-400"
                                }`}
                              >
                                {hareketAdi}
                              </span>
                            </td>

                            <td className="px-5 py-4 font-semibold">
                              {temizAciklama(
                                hareket.aciklama
                              )}
                            </td>

                            <td className="px-5 py-4 text-slate-400">
                              {hareket.belgeNo ||
                                "-"}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 font-bold text-red-400">
                              {borc > 0
                                ? money(
                                    borc
                                  )
                                : "-"}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 font-bold text-emerald-400">
                              {alacak > 0
                                ? money(
                                    alacak
                                  )
                                : "-"}
                            </td>

                            <td
                              className={`whitespace-nowrap px-5 py-4 font-black ${
                                hareket.yuruyenBakiye >
                                0
                                  ? "text-red-400"
                                  : hareket.yuruyenBakiye <
                                    0
                                  ? "text-emerald-400"
                                  : "text-white"
                              }`}
                            >
                              {money(
                                Math.abs(
                                  hareket.yuruyenBakiye
                                )
                              )}
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <a
            href={`/beach/cariler/${cari.id}/duzenle`}
            className="rounded-xl border border-cyan-700 px-5 py-3 font-bold text-cyan-400"
          >
            Cariyi Düzenle
          </a>

          <a
            href={`/beach/cariler/${cari.id}/sil`}
            className="rounded-xl border border-red-800 px-5 py-3 font-bold text-red-400"
          >
            Sil / Pasife Al
          </a>
        </div>
      </div>
    </main>
  );
}