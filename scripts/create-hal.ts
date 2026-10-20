const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const SIFRE = "Hal2026!"; 
  const kullaniciAdi = "HAL";

  const sifreHash = await bcrypt.hash(SIFRE, 12);

  const kullanici = await prisma.kullanici.upsert({
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
  .catch((e: any) => {
    console.error("Hata oluştu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });