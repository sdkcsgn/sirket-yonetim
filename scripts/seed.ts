import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL bulunamadı.");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  await prisma.sirket.upsert({
    where: { kod: "BEACH" },
    update: {
      ad: "Beach & Mağaza",
      aktif: true,
    },
    create: {
      kod: "BEACH",
      ad: "Beach & Mağaza",
      aktif: true,
    },
  });

  await prisma.sirket.upsert({
    where: { kod: "HAL" },
    update: {
      ad: "Hal Komisyon & Soğuk Hava",
      aktif: true,
    },
    create: {
      kod: "HAL",
      ad: "Hal Komisyon & Soğuk Hava",
      aktif: true,
    },
  });

  console.log("Şirketler başarıyla oluşturuldu.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });