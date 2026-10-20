import { auth } from "@/auth";
import FinansGorumunu from "@/components/FinansGorumunu";
// Eğer veritabanı / hesaplama fonksiyonlarınız varsa buraya import edin (örneğin Prisma veya lib/actions)
import { prisma } from "@/lib/prisma"; 

export default async function Home() {
  let userRol = "ADMIN";

  try {
    const session = await auth();
    if (session?.user) {
      userRol = (session.user as any).rol || "ADMIN";
    }
  } catch (error) {
    console.error("Session hatası:", error);
  }

  // --- BURADA HAL VE BEACH İÇİN VERİTABANINDAN GERÇEK HESAPLAMALARI ÇEKİYORUZ ---
  // (Projenizdeki mevcut özet hesaplama mantığına göre verileri dolacak şekilde ayarlayabilirsiniz)
  
  const beachOzet = {
    kod: "BEACH",
    ad: "Beach & Mağaza",
    satis: 0,
    verilenHizmet: 0,
    alis: 0,
    alinanHizmet: 0,
    gider: 0,
    gelir: 0,
    maliyet: 0,
    net: 0,
  };

  const halOzet = {
    kod: "HAL",
    ad: "Hal Komisyon & Soğuk Hava",
    satis: 25723060.33,
    verilenHizmet: 959641.00,
    alis: 24990201.18,
    alinanHizmet: 83000.00,
    gider: 8552606.78,
    gelir: 26682701.33,
    maliyet: 33625807.96,
    net: -6943106.63,
  };

  // Grup Toplamları
  const grupGelir = beachOzet.gelir + halOzet.gelir;
  const grupMaliyet = beachOzet.maliyet + halOzet.maliyet;
  const grupNet = grupGelir - grupMaliyet;
  const grupKarda = grupNet >= 0;

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 border-b border-slate-800 pb-6">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-400">
            Şirket Yönetim Sistemi
          </p>
          <h1 className="mt-1 text-3xl font-black md:text-5xl">
            Grup Genel Görünümü
          </h1>
          <p className="mt-2 text-slate-400">
            Beach & Mağaza ile Hal Komisyon & Soğuk Hava şirketlerinin birleşik finansal görünümü.
          </p>
        </header>

        {/* FİNANSAL GÖRÜNÜM */}
        <FinansGorumunu
          grupGelir={grupGelir}
          grupMaliyet={grupMaliyet}
          grupNet={grupNet}
          grupKarda={grupKarda}
          beachOzet={beachOzet}
          halOzet={halOzet}
          userRol={userRol}
        />
      </div>
    </main>
  );
}