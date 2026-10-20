import { auth } from "@/auth";
import FinansGorumunu from "@/components/FinansGorumunu";

export default async function Home() {
  const session = await auth();
  
  // Güvenli rol okuma (session null/undefined gelse dahi hata vermez)
  const userRol = session?.user && "rol" in session.user ? (session.user as any).rol : undefined;

  const grupGelir = 0;
  const grupMaliyet = 0;
  const grupNet = 0;
  const grupKarda = grupNet >= 0;

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
    satis: 0,
    verilenHizmet: 0,
    alis: 0,
    alinanHizmet: 0,
    gider: 0,
    gelir: 0,
    maliyet: 0,
    net: 0,
  };

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