import { redirect } from "next/navigation";

import { auth } from "@/auth";

export type KullaniciRol =
  | "ADMIN"
  | "BEACH"
  | "HAL"
  | "GORUNTULEME";

export async function mevcutKullaniciGetir() {
  const session = await auth();

  const kullanici =
    session?.user as
      | {
          id?: string;
          name?: string | null;
          kullaniciAdi?: string;
          rol?: KullaniciRol;
        }
      | undefined;

  if (!kullanici) {
    redirect("/giris");
  }

  return kullanici;
}

export async function sadeceAdmin() {
  const kullanici =
    await mevcutKullaniciGetir();

  if (kullanici.rol !== "ADMIN") {
    throw new Error(
      "Bu işlem için ADMIN yetkisi gerekiyor."
    );
  }

  return kullanici;
}

export async function yazmaYetkisiKontrol() {
  const kullanici =
    await mevcutKullaniciGetir();

  if (
    kullanici.rol === "GORUNTULEME"
  ) {
    throw new Error(
      "Bu kullanıcı yalnızca görüntüleme yetkisine sahiptir."
    );
  }

  return kullanici;
}

export async function beachYazmaYetkisiKontrol() {
  const kullanici =
    await yazmaYetkisiKontrol();

  if (
    kullanici.rol !== "ADMIN" &&
    kullanici.rol !== "BEACH"
  ) {
    throw new Error(
      "Beach için işlem yetkiniz yok."
    );
  }

  return kullanici;
}

export async function halYazmaYetkisiKontrol() {
  const kullanici =
    await yazmaYetkisiKontrol();

  if (
    kullanici.rol !== "ADMIN" &&
    kullanici.rol !== "HAL"
  ) {
    throw new Error(
      "HAL için işlem yetkiniz yok."
    );
  }

  return kullanici;
}

export function sadeceGoruntulemeMi(
  rol?: string
) {
  return rol === "GORUNTULEME";
}