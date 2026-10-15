import { signIn } from "@/auth";

type GirisPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function GirisPage({
  searchParams,
}: GirisPageProps) {
  const params =
    await searchParams;

  const hataVar =
    !!params.error;

  async function girisYap(
    formData: FormData
  ) {
    "use server";

    await signIn("credentials", {
      kullaniciAdi:
        formData.get(
          "kullaniciAdi"
        ),

      sifre:
        formData.get("sifre"),

      redirectTo: "/",
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-400">
            Şirket Yönetim Sistemi
          </p>

          <h1 className="mt-3 text-4xl font-black">
            Giriş Yap
          </h1>

          <p className="mt-3 text-slate-400">
            Sisteme erişmek için
            kullanıcı adınızı ve
            şifrenizi girin.
          </p>
        </div>

        <form
          action={girisYap}
          className="rounded-3xl border border-slate-800 bg-slate-900 p-7 shadow-2xl"
        >
          {hataVar && (
            <div className="mb-5 rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm font-semibold text-red-300">
              Kullanıcı adı veya
              şifre hatalı.
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">
              Kullanıcı Adı
            </label>

            <input
              type="text"
              name="kullaniciAdi"
              required
              autoComplete="username"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
            />
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-sm font-bold text-slate-300">
              Şifre
            </label>

            <input
              type="password"
              name="sifre"
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
            />
          </div>

          <button
            type="submit"
            className="mt-6 w-full rounded-xl bg-emerald-500 px-5 py-4 text-lg font-black text-slate-950 transition hover:bg-emerald-400"
          >
            Giriş Yap
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-600">
          Yetkisiz erişim
          yasaktır.
        </p>
      </div>
    </main>
  );
}