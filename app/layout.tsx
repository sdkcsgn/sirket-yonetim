import type { Metadata } from "next";
import type { ReactNode } from "react";

import {
  Geist,
  Geist_Mono,
} from "next/font/google";

import {
  auth,
  signOut,
} from "@/auth";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Şirket Yönetim Sistemi",
  description:
    "Beach & Mağaza ve Hal Komisyon & Soğuk Hava şirket yönetim sistemi",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  const kullanici =
    session?.user as
      | {
          name?: string | null;
          kullaniciAdi?: string;
          rol?: string;
        }
      | undefined;

  async function cikisYap() {
    "use server";

    await signOut({
      redirectTo: "/giris",
    });
  }

  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-950 text-white">
        {session?.user && (
          <header className="border-b border-slate-800 bg-slate-950">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <a
                href="/"
                className="font-black tracking-tight text-white"
              >
                Şirket Yönetim Sistemi
              </a>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Giriş yapan
                  </p>

                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-bold text-slate-200">
                      {kullanici?.name ||
                        kullanici?.kullaniciAdi ||
                        "Kullanıcı"}
                    </span>

                    {kullanici?.rol && (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-black text-emerald-400">
                        {kullanici.rol}
                      </span>
                    )}
                  </div>
                </div>

                <form action={cikisYap}>
                  <button
                    type="submit"
                    className="rounded-xl border border-red-800 px-4 py-3 font-bold text-red-400 transition hover:bg-red-950/40"
                  >
                    Çıkış Yap
                  </button>
                </form>
              </div>
            </div>
          </header>
        )}

        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}