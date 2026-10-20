"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function GirisSayfasi() {
  const router = useRouter();
  const [kullaniciAdi, setKullaniciAdi] = useState("");
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHata("");
    setYukleniyor(true);

    try {
      const res = await signIn("credentials", {
        kullaniciAdi,
        sifre,
        redirect: false,
      });

      if (res?.error) {
        setHata("Kullanıcı adı veya şifre hatalı!");
        setYukleniyor(false);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setHata("Giriş yapılırken bir hata oluştu.");
      setYukleniyor(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            Şirket Yönetim Sistemi
          </p>
          <h1 className="mt-2 text-3xl font-black">Sisteme Giriş</h1>
        </div>

        {hata && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm font-bold text-red-400">
            {hata}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">
              Kullanıcı Adı
            </label>
            <input
              type="text"
              required
              value={kullaniciAdi}
              onChange={(e) => setKullaniciAdi(e.target.value)}
              placeholder="Örn: HAL"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-medium text-white outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">
              Şifre
            </label>
            <input
              type="password"
              required
              value={sifre}
              onChange={(e) => setSifre(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-medium text-white outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={yukleniyor}
            className="w-full rounded-xl bg-emerald-500 py-3.5 font-black text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {yukleniyor ? "Giriş Yapılıyor..." : "Giriş Yap →"}
          </button>
        </form>
      </div>
    </main>
  );
}