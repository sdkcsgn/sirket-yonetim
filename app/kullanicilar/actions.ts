"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type KullaniciRol =
  | "ADMIN"
  | "BEACH"
  | "HAL"
  | "GORUNTULEME";

async function adminKontrol() {
  const session = await auth();

  const kullanici =
    session?.user as
      | {
          id?: string;
          rol?: string;
        }
      | undefined;

  if (
    !kullanici ||
    kullanici.rol !== "ADMIN"
  ) {
    throw new Error(
      "Bu işlem için ADMIN yetkisi gerekiyor."
    );
  }

  return kullanici;
}

function rolKontrol(
  rol: string
): KullaniciRol {
  const roller: KullaniciRol[] = [
    "ADMIN",
    "BEACH",
    "HAL",
    "GORUNTULEME",
  ];

  if (
    !roller.includes(
      rol as KullaniciRol
    )
  ) {
    throw new Error(
      "Geçersiz kullanıcı rolü."
    );
  }

  return rol as KullaniciRol;
}

export async function kullaniciEkle(
  formData: FormData
) {
  await adminKontrol();

  const kullaniciAdi = String(
    formData.get("kullaniciAdi") ?? ""
  )
    .trim()
    .toLowerCase();

  const adSoyad = String(
    formData.get("adSoyad") ?? ""
  ).trim();

  const sifre = String(
    formData.get("sifre") ?? ""
  );

  const rol = rolKontrol(
    String(
      formData.get("rol") ??
        "GORUNTULEME"
    )
  );

  if (!kullaniciAdi) {
    throw new Error(
      "Kullanıcı adı zorunludur."
    );
  }

  if (kullaniciAdi.length < 3) {
    throw new Error(
      "Kullanıcı adı en az 3 karakter olmalıdır."
    );
  }

  if (sifre.length < 8) {
    throw new Error(
      "Şifre en az 8 karakter olmalıdır."
    );
  }

  const mevcut =
    await prisma.kullanici.findUnique({
      where: {
        kullaniciAdi,
      },
    });

  if (mevcut) {
    throw new Error(
      "Bu kullanıcı adı zaten kullanılıyor."
    );
  }

  const sifreHash =
    await bcrypt.hash(sifre, 12);

  await prisma.kullanici.create({
    data: {
      kullaniciAdi,
      sifreHash,
      adSoyad:
        adSoyad || null,
      rol,
      aktif: true,
    },
  });

  revalidatePath(
    "/kullanicilar"
  );
}

export async function kullaniciRolGuncelle(
  formData: FormData
) {
  const admin =
    await adminKontrol();

  const kullaniciId = Number(
    formData.get("kullaniciId")
  );

  const rol = rolKontrol(
    String(formData.get("rol") ?? "")
  );

  if (
    !Number.isInteger(
      kullaniciId
    ) ||
    kullaniciId <= 0
  ) {
    throw new Error(
      "Geçersiz kullanıcı."
    );
  }

  if (
    Number(admin.id) ===
      kullaniciId &&
    rol !== "ADMIN"
  ) {
    throw new Error(
      "Kendi ADMIN yetkinizi kaldıramazsınız."
    );
  }

  await prisma.kullanici.update({
    where: {
      id: kullaniciId,
    },

    data: {
      rol,
    },
  });

  revalidatePath(
    "/kullanicilar"
  );
}

export async function kullaniciDurumDegistir(
  formData: FormData
) {
  const admin =
    await adminKontrol();

  const kullaniciId = Number(
    formData.get("kullaniciId")
  );

  if (
    !Number.isInteger(
      kullaniciId
    ) ||
    kullaniciId <= 0
  ) {
    throw new Error(
      "Geçersiz kullanıcı."
    );
  }

  if (
    Number(admin.id) ===
    kullaniciId
  ) {
    throw new Error(
      "Kendi kullanıcınızı pasif yapamazsınız."
    );
  }

  const kullanici =
    await prisma.kullanici.findUnique({
      where: {
        id: kullaniciId,
      },
    });

  if (!kullanici) {
    throw new Error(
      "Kullanıcı bulunamadı."
    );
  }

  await prisma.kullanici.update({
    where: {
      id: kullaniciId,
    },

    data: {
      aktif:
        !kullanici.aktif,
    },
  });

  revalidatePath(
    "/kullanicilar"
  );
}

export async function kullaniciSifreDegistir(
  formData: FormData
) {
  await adminKontrol();

  const kullaniciId = Number(
    formData.get("kullaniciId")
  );

  const yeniSifre = String(
    formData.get("yeniSifre") ?? ""
  );

  if (
    !Number.isInteger(
      kullaniciId
    ) ||
    kullaniciId <= 0
  ) {
    throw new Error(
      "Geçersiz kullanıcı."
    );
  }

  if (
    yeniSifre.length < 8
  ) {
    throw new Error(
      "Yeni şifre en az 8 karakter olmalıdır."
    );
  }

  const sifreHash =
    await bcrypt.hash(
      yeniSifre,
      12
    );

  await prisma.kullanici.update({
    where: {
      id: kullaniciId,
    },

    data: {
      sifreHash,
    },
  });

  revalidatePath(
    "/kullanicilar"
  );
}