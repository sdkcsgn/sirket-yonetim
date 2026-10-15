"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import * as XLSX from "xlsx";

import {
  atlasCarileriAktar,
  atlasCarileriListele,
  atlasCariSil,
  atlasAktarilanlariGeriAl,
} from "./actions";

type AtlasCariSatiri = {
  atlasKodu: string;
  unvan: string;
  atlasTipi: string;
  gsm: string;
  telefon: string;
  vergiTcNo: string;
  grupKodu: string;
  email: string;
};

type AktarimSonucu = {
  toplam: number;
  eklenen: number;
  guncellenen: number;
  atlanan: number;
  hatalar: string[];
};

type KayitliAtlasCari = {
  id: number;
  atlasKodu: string;
  unvan: string;
  tip: string;
  aktif: boolean;
  atlasAktarildi: boolean;
  bagliKayitSayisi: number;
};

function temizle(value: unknown) {
  return String(value ?? "")
    .replace(/\u00A0/g, " ")
    .trim();
}

function normalize(value: unknown) {
  return temizle(value)
    .toLocaleUpperCase("tr-TR")
    .replace(/\s+/g, " ");
}

function cariTipiAdi(tip: string) {
  switch (
    String(tip)
      .trim()
      .toLocaleUpperCase("tr-TR")
  ) {
    case "MÜŞTERİ":
    case "MUSTERI":
      return "Müşteri";

    case "ALICI":
      return "Alıcı";

    case "SATICI":
      return "Satıcı";

    case "PERSONEL":
      return "Personel";

    case "ÜRETİCİ":
    case "URETICI":
      return "Üretici";

    case "ÜYE":
    case "UYE":
      return "Üye";

    case "BANKA":
      return "Banka";

    case "YARDIMCI HESAP":
    case "YARDIMCI HESAPLAR":
    case "YARDIMCI_HESAP":
      return "Yardımcı Hesap";

    case "DİĞER":
    case "DIGER":
      return "Diğer";

    default:
      return tip || "Diğer";
  }
}

export default function AtlasAktarPage() {
  const [dosyaAdi, setDosyaAdi] =
    useState("");

  const [satirlar, setSatirlar] =
    useState<AtlasCariSatiri[]>([]);

  const [atlasCariler, setAtlasCariler] =
    useState<KayitliAtlasCari[]>([]);

  const [okuyor, setOkuyor] =
    useState(false);

  const [aktariliyor, setAktariliyor] =
    useState(false);

  const [listeYukleniyor, setListeYukleniyor] =
    useState(true);

  const [siliniyorId, setSiliniyorId] =
    useState<number | null>(null);

  const [geriAliniyor, setGeriAliniyor] =
    useState(false);

  const [hata, setHata] =
    useState("");

  const [bilgi, setBilgi] =
    useState("");

  const [sonuc, setSonuc] =
    useState<AktarimSonucu | null>(null);

  /* =========================================================
     VERİTABANINDAKİ ATLAS CARİLERİNİ GETİR
  ========================================================= */

  async function atlasListeYenile() {
    setListeYukleniyor(true);

    try {
      const liste =
        await atlasCarileriListele();

      setAtlasCariler(
        liste as KayitliAtlasCari[]
      );
    } catch (error) {
      setHata(
        error instanceof Error
          ? error.message
          : "Atlas cari kayıtları alınamadı."
      );
    } finally {
      setListeYukleniyor(false);
    }
  }

  useEffect(() => {
    void atlasListeYenile();
  }, []);

  /* =========================================================
     EXCEL OKU
  ========================================================= */

  async function dosyaOku(file: File) {
    setOkuyor(true);

    setDosyaAdi(file.name);

    setSatirlar([]);

    setHata("");

    setBilgi("");

    setSonuc(null);

    try {
      const buffer =
        await file.arrayBuffer();

      const workbook =
        XLSX.read(buffer, {
          type: "array",
          cellDates: true,
        });

      const sayfaAdi =
        workbook.SheetNames[0];

      if (!sayfaAdi) {
        throw new Error(
          "Excel sayfası bulunamadı."
        );
      }

      const worksheet =
        workbook.Sheets[sayfaAdi];

      const tablo =
        XLSX.utils.sheet_to_json<unknown[]>(
          worksheet,
          {
            header: 1,
            defval: "",
            raw: false,
          }
        );

      if (!tablo.length) {
        throw new Error(
          "Excel dosyasında veri bulunamadı."
        );
      }

      /* GERÇEK BAŞLIK SATIRINI BUL */

      const baslikSatiri =
        tablo.findIndex((row) => {
          const hucreler =
            row.map(normalize);

          const kodVar =
            hucreler.includes("KODU") ||
            hucreler.includes("CARİ KODU") ||
            hucreler.includes("CARI KODU");

          const unvanVar =
            hucreler.includes("ÜNVANI") ||
            hucreler.includes("UNVANI") ||
            hucreler.includes("ÜNVAN") ||
            hucreler.includes("UNVAN");

          return kodVar && unvanVar;
        });

      if (baslikSatiri === -1) {
        throw new Error(
          "Kodu ve Ünvanı başlıkları bulunamadı."
        );
      }

      const basliklar =
        tablo[baslikSatiri].map(
          normalize
        );

      function kolonBul(
        isimler: string[]
      ) {
        const arananlar =
          isimler.map(normalize);

        return basliklar.findIndex(
          (baslik) =>
            arananlar.includes(
              baslik
            )
        );
      }

      const kodIndex =
        kolonBul([
          "Kodu",
          "Cari Kodu",
          "Kod",
        ]);

      const unvanIndex =
        kolonBul([
          "Ünvanı",
          "Unvanı",
          "Ünvan",
          "Unvan",
        ]);

      const tipIndex =
        kolonBul([
          "Cari Tipi",
          "Tipi",
        ]);

      const gsmIndex =
        kolonBul([
          "Gsm",
          "GSM",
        ]);

      const telefonIndex =
        kolonBul([
          "Tel-1",
          "Telefon",
          "Tel",
        ]);

      const vtckIndex =
        kolonBul([
          "VTCK No",
          "Vergi No",
          "TCK No",
        ]);

      const grupIndex =
        kolonBul([
          "Grubu",
          "Grup",
          "Grup Kodu",
        ]);

      const emailIndex =
        kolonBul([
          "e-Posta",
          "E-Posta",
          "Email",
          "E-mail",
        ]);

      function deger(
        row: unknown[],
        index: number
      ) {
        if (index < 0) {
          return "";
        }

        return temizle(
          row[index]
        );
      }

      const bulunanlar =
        tablo
          .slice(
            baslikSatiri + 1
          )
          .map(
            (
              row
            ): AtlasCariSatiri => ({
              atlasKodu:
                deger(
                  row,
                  kodIndex
                ),

              unvan:
                deger(
                  row,
                  unvanIndex
                ),

              atlasTipi:
                deger(
                  row,
                  tipIndex
                ),

              gsm:
                deger(
                  row,
                  gsmIndex
                ),

              telefon:
                deger(
                  row,
                  telefonIndex
                ),

              vergiTcNo:
                deger(
                  row,
                  vtckIndex
                ),

              grupKodu:
                deger(
                  row,
                  grupIndex
                ),

              email:
                deger(
                  row,
                  emailIndex
                ),
            })
          )
          .filter(
            (cari) =>
              cari.atlasKodu &&
              cari.unvan
          );

      if (!bulunanlar.length) {
        throw new Error(
          "Geçerli cari kaydı bulunamadı."
        );
      }

      setSatirlar(
        bulunanlar
      );
    } catch (error) {
      setHata(
        error instanceof Error
          ? error.message
          : "Excel okunamadı."
      );
    } finally {
      setOkuyor(false);
    }
  }

  /* =========================================================
     AKTAR
  ========================================================= */

  async function aktar() {
    if (!satirlar.length) {
      return;
    }

    const onay =
      window.confirm(
        `${satirlar.length} cari kaydı Atlas'tan sisteme aktarılsın mı?`
      );

    if (!onay) {
      return;
    }

    setAktariliyor(true);

    setHata("");

    setBilgi("");

    setSonuc(null);

    try {
      const cevap =
        await atlasCarileriAktar(
          satirlar
        );

      setSonuc(
        cevap
      );

      setBilgi(
        "Cari aktarımı başarıyla tamamlandı."
      );

      await atlasListeYenile();
    } catch (error) {
      setHata(
        error instanceof Error
          ? error.message
          : "Cari aktarımı yapılamadı."
      );
    } finally {
      setAktariliyor(false);
    }
  }

  /* =========================================================
     TEK CARİ SİL
  ========================================================= */

  async function cariSil(
    cari: KayitliAtlasCari
  ) {
    const onay =
      window.confirm(
        `${cari.unvan} cari kaydı kalıcı olarak silinsin mi?`
      );

    if (!onay) {
      return;
    }

    setSiliniyorId(
      cari.id
    );

    setHata("");

    setBilgi("");

    try {
      await atlasCariSil(
        cari.id
      );

      setBilgi(
        `${cari.unvan} silindi.`
      );

      await atlasListeYenile();
    } catch (error) {
      setHata(
        error instanceof Error
          ? error.message
          : "Cari silinemedi."
      );
    } finally {
      setSiliniyorId(
        null
      );
    }
  }

  /* =========================================================
     ATLAS AKTARIMINI GERİ AL
  ========================================================= */

  async function atlasGeriAl() {
    const onay =
      window.confirm(
        "Atlas aktarımı ile eklenmiş ve hiçbir işleme bağlanmamış cariler silinecek. Devam edilsin mi?"
      );

    if (!onay) {
      return;
    }

    setGeriAliniyor(
      true
    );

    setHata("");

    setBilgi("");

    try {
      const cevap =
        await atlasAktarilanlariGeriAl();

      setBilgi(
        `${cevap.silinen} cari silindi, ${cevap.atlanan} cari atlandı.`
      );

      if (
        cevap.hatalar.length
      ) {
        setHata(
          cevap.hatalar.join(
            "\n"
          )
        );
      }

      await atlasListeYenile();
    } catch (error) {
      setHata(
        error instanceof Error
          ? error.message
          : "Aktarım geri alınamadı."
      );
    } finally {
      setGeriAliniyor(
        false
      );
    }
  }

  /* =========================================================
     CARİ TİP DAĞILIMI
  ========================================================= */

  const tipDagilimi =
    useMemo(() => {
      const sonuc:
        Record<string, number> =
        {};

      for (
        const cari of
        satirlar
      ) {
        const tip =
          cariTipiAdi(
            cari.atlasTipi
          );

        sonuc[tip] =
          (sonuc[tip] || 0) +
          1;
      }

      return Object.entries(
        sonuc
      );
    }, [satirlar]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* BAŞLIK */}

        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

          <div>

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
              Hal Komisyon & Soğuk Hava
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Atlas Veri Aktarımı
            </h1>

            <p className="mt-2 text-slate-400">
              Cari kayıtlarını Excel'den aktarın, düzenleyin ve silin.
            </p>

          </div>

          <div className="flex gap-3">

            <a
              href="/hal/cariler"
              className="rounded-xl border border-cyan-700 px-5 py-3 font-bold text-cyan-400 hover:bg-cyan-950/30"
            >
              Cari Listesi
            </a>

            <a
              href="/hal"
              className="rounded-xl border border-slate-700 px-5 py-3 font-bold text-slate-300 hover:bg-slate-900"
            >
              ← Panele Dön
            </a>

          </div>

        </div>

        {/* MESAJ */}

        {bilgi && (
          <div className="mb-6 rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 font-bold text-emerald-300">
            {bilgi}
          </div>
        )}

        {hata && (
          <div className="mb-6 whitespace-pre-line rounded-xl border border-red-800 bg-red-950/30 p-4 font-bold text-red-300">
            {hata}
          </div>
        )}

        {/* DOSYA */}

        <div className="rounded-2xl border border-emerald-900/50 bg-slate-900 p-6 md:p-8">

          <h2 className="text-2xl font-black">
            Cari Excel Dosyası
          </h2>

          <p className="mt-2 text-slate-400">
            Atlas Cari Kayıt Kartları dosyasını seçin.
          </p>

          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            disabled={
              okuyor ||
              aktariliyor
            }
            onChange={(event) => {
              const file =
                event.target
                  .files?.[0];

              if (file) {
                void dosyaOku(
                  file
                );
              }
            }}
            className="mt-6 block w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
          />

          {dosyaAdi && (
            <p className="mt-3 text-cyan-400">
              Dosya: {dosyaAdi}
            </p>
          )}

          {okuyor && (
            <p className="mt-3 text-amber-400">
              Excel okunuyor...
            </p>
          )}

          {/* ÖZET */}

          {satirlar.length >
            0 && (
            <>

              <div className="mt-7 grid gap-4 md:grid-cols-3">

                <div className="rounded-xl bg-slate-950 p-5">
                  <p className="text-sm text-slate-500">
                    Bulunan Cari
                  </p>

                  <p className="mt-2 text-3xl font-black">
                    {satirlar.length}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-950 p-5">
                  <p className="text-sm text-slate-500">
                    Cari Tipi
                  </p>

                  <p className="mt-2 text-3xl font-black text-cyan-400">
                    {tipDagilimi.length}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-950 p-5">
                  <p className="text-sm text-slate-500">
                    Aktarıma Hazır
                  </p>

                  <p className="mt-2 text-3xl font-black text-emerald-400">
                    {satirlar.length}
                  </p>
                </div>

              </div>

              {/* EXCEL ÖNİZLEME */}

              <div className="mt-6 max-h-[500px] overflow-auto rounded-xl border border-slate-800">

                <table className="w-full min-w-[700px]">

                  <thead className="sticky top-0 bg-slate-950 text-left text-sm text-slate-400">

                    <tr>
                      <th className="px-4 py-3">
                        Atlas Kodu
                      </th>

                      <th className="px-4 py-3">
                        Ünvan
                      </th>

                      <th className="px-4 py-3">
                        Cari Tipi
                      </th>
                    </tr>

                  </thead>

                  <tbody>

                    {satirlar.map(
                      (
                        cari,
                        index
                      ) => (

                        <tr
                          key={`${cari.atlasKodu}-${index}`}
                          className="border-t border-slate-800"
                        >

                          <td className="px-4 py-3 font-bold text-cyan-400">
                            {cari.atlasKodu}
                          </td>

                          <td className="px-4 py-3 font-semibold">
                            {cari.unvan}
                          </td>

                          <td className="px-4 py-3">
                            {cariTipiAdi(
                              cari.atlasTipi
                            )}
                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

              {/* AKTAR BUTONU */}

              <button
                type="button"
                onClick={() =>
                  void aktar()
                }
                disabled={
                  aktariliyor
                }
                className="mt-6 w-full rounded-xl bg-emerald-500 px-6 py-4 text-lg font-black text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {aktariliyor
                  ? "Aktarılıyor..."
                  : `${satirlar.length} Cari Kaydını Aktar`}
              </button>

            </>
          )}

          {/* AKTARIM SONUCU */}

          {sonuc && (
            <div className="mt-6 grid gap-4 sm:grid-cols-4">

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-sm text-slate-500">
                  Toplam
                </p>

                <p className="mt-2 text-2xl font-black">
                  {sonuc.toplam}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-sm text-slate-500">
                  Yeni
                </p>

                <p className="mt-2 text-2xl font-black text-emerald-400">
                  {sonuc.eklenen}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-sm text-slate-500">
                  Güncellendi
                </p>

                <p className="mt-2 text-2xl font-black text-cyan-400">
                  {sonuc.guncellenen}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-sm text-slate-500">
                  Atlandı
                </p>

                <p className="mt-2 text-2xl font-black text-amber-400">
                  {sonuc.atlanan}
                </p>
              </div>

            </div>
          )}

        </div>

        {/* =====================================================
            VERİTABANINDAKİ ATLAS CARİLER
        ===================================================== */}

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8">

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>

              <h2 className="text-2xl font-black">
                Aktarılmış Atlas Carileri
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Buradan cariyi düzeltebilir veya silebilirsiniz.
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                void atlasGeriAl()
              }
              disabled={
                geriAliniyor
              }
              className="rounded-xl bg-red-600 px-5 py-3 font-black text-white hover:bg-red-500 disabled:opacity-50"
            >
              {geriAliniyor
                ? "Geri Alınıyor..."
                : "Atlas Aktarımını Geri Al"}
            </button>

          </div>

          {listeYukleniyor ? (
            <p className="mt-6 text-slate-400">
              Kayıtlar yükleniyor...
            </p>
          ) : atlasCariler.length ===
            0 ? (
            <div className="mt-6 rounded-xl bg-slate-950 p-6 text-center text-slate-500">
              Atlas cari kaydı bulunmuyor.
            </div>
          ) : (

            <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800">

              <table className="w-full min-w-[900px]">

                <thead className="bg-slate-950 text-left text-sm text-slate-400">

                  <tr>

                    <th className="px-4 py-3">
                      Atlas Kodu
                    </th>

                    <th className="px-4 py-3">
                      Ünvan
                    </th>

                    <th className="px-4 py-3">
                      Tip
                    </th>

                    <th className="px-4 py-3">
                      Bağlı İşlem
                    </th>

                    <th className="px-4 py-3 text-right">
                      İşlemler
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {atlasCariler.map(
                    (cari) => (

                      <tr
                        key={cari.id}
                        className="border-t border-slate-800"
                      >

                        <td className="px-4 py-3 font-bold text-cyan-400">
                          {cari.atlasKodu}
                        </td>

                        <td className="px-4 py-3 font-semibold">
                          {cari.unvan}
                        </td>

                        <td className="px-4 py-3">
                          {cariTipiAdi(
                            cari.tip
                          )}
                        </td>

                        <td className="px-4 py-3">

                          <span
                            className={
                              cari.bagliKayitSayisi >
                              0
                                ? "font-bold text-amber-400"
                                : "font-bold text-emerald-400"
                            }
                          >
                            {
                              cari.bagliKayitSayisi
                            }
                          </span>

                        </td>

                        <td className="px-4 py-3">

                          <div className="flex justify-end gap-2">

                            <a
                              href={`/hal/cariler/${cari.id}`}
                              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800"
                            >
                              Ekstre
                            </a>

                            <a
                              href={`/hal/cariler/${cari.id}/duzenle`}
                              className="rounded-lg border border-cyan-700 px-4 py-2 text-sm font-bold text-cyan-400 hover:bg-cyan-950/30"
                            >
                              Düzelt
                            </a>

                            <button
                              type="button"
                              disabled={
                                siliniyorId ===
                                cari.id
                              }
                              onClick={() =>
                                void cariSil(
                                  cari
                                )
                              }
                              className="rounded-lg border border-red-700 px-4 py-2 text-sm font-bold text-red-400 hover:bg-red-950/30 disabled:opacity-50"
                            >
                              {siliniyorId ===
                              cari.id
                                ? "Siliniyor..."
                                : "Sil"}
                            </button>

                          </div>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </div>
    </main>
  );
}