import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const SIFRE = "Hal2026!";
  const kullaniciAdi = "HAL";

  const sifreHash = await bcrypt.hash(SIFRE, 12);

  const kullanici = await (prisma as any).kullanici.upsert({
    where: { kullaniciAdi },
    update: {
      sifreHash,
      rol: "HAL",
      aktif: true,
    },
    create: {
      kullaniciAdi,
      sifreHash,
      rol: "HAL",
      aktif: true,
    },
  });

  console.log("-----------------------------------------");
  console.log("✅ HAL Kullanıcısı Başarıyla Güncellendi!");
  console.log(`Kullanıcı Adı : ${kullanici.kullaniciAdi}`);
  console.log(`Şifre         : ${SIFRE}`);
  console.log(`Rol           : ${kullanici.rol}`);
  console.log("-----------------------------------------");
}

main()
  .catch((e) => {
    console.error("Hata oluştu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await (prisma as any).$disconnect();
  });