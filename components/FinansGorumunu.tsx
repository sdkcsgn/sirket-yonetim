"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type SirketOzet = {
  kod: string;
  ad: string;
  satis: number;
  verilenHizmet: number;
  alis: number;
  alinanHizmet: number;
  gider: number;
  gelir: number;
  maliyet: number;
  net: number;
};

type FinansGorumunuProps = {
  grupGelir: number;
  grupMaliyet: number;
  grupNet: number;
  grupKarda: boolean;
  beachOzet?: SirketOzet;
  halOzet?: SirketOzet;
};

function money(value: number | undefined | null) {
  const safeValue = typeof value === "number" && !isNaN(value) ? value : 0;
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeValue);
}

export default function FinansGorumunu({
  grupGelir = 0,
  grupMaliyet = 0,
  grupNet = 0,
  grupKarda = true,
  beachOzet,
  halOzet,
}: FinansGorumunuProps) {
  const { data: session } = useSession();
  const [goster, setGoster] = useState(false);

  // Kullanıcının rolü
  const userRol = (session?.user as any)?.rol;

  // HAL ve GORUNTULEME rollerindeki kullanıcılar Kâr/Zarar ve Genel Toplamları GÖREMEZ
  const karZararGorebilir =
    userRol === "Yonetici" || userRol === "ADMIN" || userRol === "BEACH";

  const MASK = "•••••••• ₺";

  const beachNet = beachOzet?.net ?? 0;
  const halNet = halOzet?.net ?? 0;

  return (
    <>
      {/* RAKAM GİZLE / GÖSTER BUTONU (Sadece yetkili kullanıcılar görebilir) */}
      {karZararGorebilir && (
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setGoster(!goster)}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 font-bold text-slate-200 transition hover:bg-slate-800"
          >
            {goster ? "🙈 Rakamları Gizle" : "👁️ Rakamları Göster"}
          </button>
        </div>
      )}

      {/* GRUP TOPLAMLARI */}
      {karZararGorebilir ? (
        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-3xl border border-emerald-900/50 bg-emerald-950/20 p-7">
            <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Toplam Gelir
            </p>
            <p className="mt-3 text-3xl font-black text-emerald-400 md:text-4xl">
              {goster ? money(grupGelir) : MASK}
            </p>
            <p className="mt-3 text-sm text-slate-500">Satış + Verilen Hizmet</p>
          </div>

          <div className="rounded-3xl border border-orange-900/50 bg-orange-950/20 p-7">
            <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Toplam Maliyet / Gider
            </p>
            <p className="mt-3 text-3xl font-black text-orange-400 md:text-4xl">
              {goster ? money(grupMaliyet) : MASK}
            </p>
            <p className="mt-3 text-sm text-slate-500">
              Alış + Alınan Hizmet + Gider
            </p>
          </div>

          <div
            className={`rounded-3xl border p-7 ${
              grupKarda
                ? "border-emerald-700 bg-emerald-950/30"
                : "border-red-700 bg-red-950/30"
            }`}
          >
            <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Grup Net Kâr / Zarar
            </p>
            <p
              className={`mt-3 text-3xl font-black md:text-4xl ${
                grupKarda ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {goster ? money(grupNet) : MASK}
            </p>
            <div
              className={`mt-4 inline-flex rounded-full px-4 py-2 text-sm font-black ${
                grupKarda
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-red-500/15 text-red-400"
              }`}
            >
              {grupKarda ? "KÂR" : "ZARAR"}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center text-slate-400">
          🔒 Finansal kâr/zarar ve genel özetleri görüntüleme yetkiniz bulunmamaktadır.
        </div>
      )}

      {/* ŞİRKET ÖZETLERİ */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* BEACH */}
        {karZararGorebilir && (
          <div className="overflow-hidden rounded-3xl border border-cyan-900/50 bg-slate-900">
            <div className="border-b border-slate-800 p-6">
              <p className="text-sm font-bold uppercase tracking-wider text-cyan-400">
                Şirket 01
              </p>
              <h2 className="mt-2 text-2xl font-black">Beach & Mağaza</h2>
            </div>

            <div className="grid grid-cols-2 gap-px bg-slate-800">
              <div className="bg-slate-900 p-5">
                <p className="text-sm text-slate-400">Gelir</p>
                <p className="mt-2 text-xl font-black text-emerald-400">
                  {goster ? money(beachOzet?.gelir) : MASK}
                </p>
              </div>

              <div className="bg-slate-900 p-5">
                <p className="text-sm text-slate-400">Maliyet / Gider</p>
                <p className="mt-2 text-xl font-black text-orange-400">
                  {goster ? money(beachOzet?.maliyet) : MASK}
                </p>
              </div>
            </div>

            <div className="p-6">
              <p className="text-sm text-slate-400">Net Kâr / Zarar</p>
              <p
                className={`mt-2 text-3xl font-black ${
                  beachNet >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {goster ? money(beachNet) : MASK}
              </p>

              <Link
                href="/beach"
                className="mt-6 block rounded-xl bg-cyan-500 px-5 py-3 text-center font-black text-slate-950 transition hover:bg-cyan-400"
              >
                Beach'e Gir →
              </Link>
            </div>
          </div>
        )}

        {/* HAL PANELİ GİRİŞ KARTI */}
        <div className="overflow-hidden rounded-3xl border border-emerald-900/50 bg-slate-900">
          <div className="border-b border-slate-800 p-6">
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-400">
              Şirket 02
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Hal Komisyon & Soğuk Hava
            </h2>
          </div>

          <div className="p-6">
            <p className="text-sm text-slate-400">
              Hal işlemlerinizi yönetmek, fatura ve cari verileri girmek veya silmek için panele geçiş yapabilirsiniz.
            </p>

            <Link
              href="/hal"
              className="mt-6 block rounded-xl bg-emerald-500 px-5 py-3 text-center font-black text-slate-950 transition hover:bg-emerald-400"
            >
              HAL Paneline Gir →
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}