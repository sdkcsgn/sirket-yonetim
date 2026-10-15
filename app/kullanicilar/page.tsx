import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import {
  kullaniciDurumDegistir,
  kullaniciEkle,
  kullaniciRolGuncelle,
  kullaniciSifreDegistir,
} from "./actions";

function tarih(
  value: Date | null
) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(value);
}

function rolAdi(
  rol: string
) {
  switch (rol) {
    case "ADMIN":
      return "Yönetici";

    case "BEACH":
      return "Beach";

    case "HAL":
      return "Hal";

    case "GORUNTULEME":
      return "Görüntüleme";

    default:
      return rol;
  }
}

export default async function KullanicilarPage() {
  const session =
    await auth();

  const mevcutKullanici =
    session?.user as
      | {
          id?: string;
          rol?: string;
        }
      | undefined;

  if (
    !mevcutKullanici ||
    mevcutKullanici.rol !==
      "ADMIN"
  ) {
    redirect("/");
  }

  const kullanicilar =
    await prisma.kullanici.findMany({
      orderBy: [
        {
          aktif: "desc",
        },
        {
          kullaniciAdi:
            "asc",
        },
      ],
    });

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
              Sistem Yönetimi
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Kullanıcı Yönetimi
            </h1>

            <p className="mt-2 text-slate-400">
              Sisteme giriş yapabilecek
              kullanıcıları ve
              yetkilerini yönetin.
            </p>
          </div>

          <a
            href="/"
            className="rounded-xl border border-slate-700 px-5 py-3 font-bold text-slate-300 transition hover:bg-slate-900"
          >
            ← Ana Panele Dön
          </a>
        </div>

        {/* YENİ KULLANICI */}

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8">
          <h2 className="text-2xl font-black">
            Yeni Kullanıcı
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Yeni kullanıcı oluşturup
            erişim yetkisini belirleyin.
          </p>

          <form
            action={kullaniciEkle}
            className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4"
          >
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">
                Kullanıcı Adı
              </label>

              <input
                name="kullaniciAdi"
                required
                minLength={3}
                autoComplete="off"
                placeholder="Örn: hal1"
                className={
                  inputClass
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">
                Ad Soyad
              </label>

              <input
                name="adSoyad"
                placeholder="İsteğe bağlı"
                className={
                  inputClass
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">
                Şifre
              </label>

              <input
                type="password"
                name="sifre"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="En az 8 karakter"
                className={
                  inputClass
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">
                Yetki
              </label>

              <select
                name="rol"
                defaultValue="GORUNTULEME"
                className={
                  inputClass
                }
              >
                <option value="ADMIN">
                  ADMIN - Tam Yetki
                </option>

                <option value="BEACH">
                  BEACH - Sadece Beach
                </option>

                <option value="HAL">
                  HAL - Sadece Hal
                </option>

                <option value="GORUNTULEME">
                  GÖRÜNTÜLEME
                </option>
              </select>
            </div>

            <button
              type="submit"
              className="rounded-xl bg-emerald-500 px-5 py-4 font-black text-slate-950 transition hover:bg-emerald-400 md:col-span-2 xl:col-span-4"
            >
              + Kullanıcı Oluştur
            </button>
          </form>
        </div>

        {/* YETKİ AÇIKLAMASI */}

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-red-900/50 bg-red-950/10 p-5">
            <p className="font-black text-red-400">
              ADMIN
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Beach, Hal, grup ekranı
              ve kullanıcı yönetimine
              tam erişim.
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-900/50 bg-cyan-950/10 p-5">
            <p className="font-black text-cyan-400">
              BEACH
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Yalnızca Beach & Mağaza
              bölümüne erişebilir.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-900/50 bg-emerald-950/10 p-5">
            <p className="font-black text-emerald-400">
              HAL
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Yalnızca Hal Komisyon &
              Soğuk Hava bölümüne
              erişebilir.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-900/50 bg-amber-950/10 p-5">
            <p className="font-black text-amber-400">
              GÖRÜNTÜLEME
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Verileri görüntüler.
              Değişiklik yetkisini
              ayrıca kilitleyeceğiz.
            </p>
          </div>
        </div>

        {/* KULLANICI LİSTESİ */}

        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-6">
            <h2 className="text-2xl font-black">
              Kullanıcılar
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Toplam{" "}
              {kullanicilar.length}{" "}
              kullanıcı
            </p>
          </div>

          {kullanicilar.length ===
          0 ? (
            <div className="p-12 text-center text-slate-400">
              Kullanıcı bulunamadı.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px]">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-sm text-slate-400">
                    <th className="px-5 py-4">
                      Kullanıcı
                    </th>

                    <th className="px-5 py-4">
                      Yetki
                    </th>

                    <th className="px-5 py-4">
                      Durum
                    </th>

                    <th className="px-5 py-4">
                      Son Giriş
                    </th>

                    <th className="px-5 py-4">
                      Rol Değiştir
                    </th>

                    <th className="px-5 py-4">
                      Şifre Değiştir
                    </th>

                    <th className="px-5 py-4 text-right">
                      Aktif / Pasif
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {kullanicilar.map(
                    (kullanici) => {
                      const kendiHesabi =
                        String(
                          kullanici.id
                        ) ===
                        String(
                          mevcutKullanici.id
                        );

                      return (
                        <tr
                          key={
                            kullanici.id
                          }
                          className="border-b border-slate-800/70 align-top"
                        >
                          <td className="px-5 py-5">
                            <p className="font-black">
                              {
                                kullanici.kullaniciAdi
                              }
                            </p>

                            <p className="mt-1 text-sm text-slate-400">
                              {kullanici.adSoyad ||
                                "-"}
                            </p>

                            {kendiHesabi && (
                              <span className="mt-2 inline-block rounded-full bg-cyan-500/10 px-2 py-1 text-xs font-bold text-cyan-400">
                                Sizin hesabınız
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-5">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                kullanici.rol ===
                                "ADMIN"
                                  ? "bg-red-500/10 text-red-400"
                                  : kullanici.rol ===
                                    "BEACH"
                                  ? "bg-cyan-500/10 text-cyan-400"
                                  : kullanici.rol ===
                                    "HAL"
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-amber-500/10 text-amber-400"
                              }`}
                            >
                              {rolAdi(
                                kullanici.rol
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-5">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                kullanici.aktif
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-red-500/10 text-red-400"
                              }`}
                            >
                              {kullanici.aktif
                                ? "AKTİF"
                                : "PASİF"}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-5 text-sm text-slate-400">
                            {tarih(
                              kullanici.sonGirisAt
                            )}
                          </td>

                          <td className="px-5 py-5">
                            <form
                              action={
                                kullaniciRolGuncelle
                              }
                              className="flex gap-2"
                            >
                              <input
                                type="hidden"
                                name="kullaniciId"
                                value={
                                  kullanici.id
                                }
                              />

                              <select
                                name="rol"
                                defaultValue={
                                  kullanici.rol
                                }
                                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                              >
                                <option value="ADMIN">
                                  ADMIN
                                </option>

                                <option value="BEACH">
                                  BEACH
                                </option>

                                <option value="HAL">
                                  HAL
                                </option>

                                <option value="GORUNTULEME">
                                  GÖRÜNTÜLEME
                                </option>
                              </select>

                              <button
                                type="submit"
                                className="rounded-lg border border-cyan-700 px-3 py-2 text-sm font-bold text-cyan-400 hover:bg-cyan-950/30"
                              >
                                Kaydet
                              </button>
                            </form>
                          </td>

                          <td className="px-5 py-5">
                            <form
                              action={
                                kullaniciSifreDegistir
                              }
                              className="flex gap-2"
                            >
                              <input
                                type="hidden"
                                name="kullaniciId"
                                value={
                                  kullanici.id
                                }
                              />

                              <input
                                type="password"
                                name="yeniSifre"
                                required
                                minLength={8}
                                placeholder="Yeni şifre"
                                autoComplete="new-password"
                                className="w-36 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                              />

                              <button
                                type="submit"
                                className="rounded-lg border border-amber-700 px-3 py-2 text-sm font-bold text-amber-400 hover:bg-amber-950/30"
                              >
                                Değiştir
                              </button>
                            </form>
                          </td>

                          <td className="px-5 py-5 text-right">
                            {kendiHesabi ? (
                              <span className="text-xs text-slate-500">
                                Kendi hesabınız
                                pasif yapılamaz
                              </span>
                            ) : (
                              <form
                                action={
                                  kullaniciDurumDegistir
                                }
                              >
                                <input
                                  type="hidden"
                                  name="kullaniciId"
                                  value={
                                    kullanici.id
                                  }
                                />

                                <button
                                  type="submit"
                                  className={`rounded-lg border px-3 py-2 text-sm font-bold ${
                                    kullanici.aktif
                                      ? "border-red-700 text-red-400 hover:bg-red-950/30"
                                      : "border-emerald-700 text-emerald-400 hover:bg-emerald-950/30"
                                  }`}
                                >
                                  {kullanici.aktif
                                    ? "Pasif Yap"
                                    : "Aktif Yap"}
                                </button>
                              </form>
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
    </main>
  );
}