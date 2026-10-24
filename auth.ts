import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

type KullaniciRol =
  | "ADMIN"
  | "BEACH"
  | "HAL"
  | "GORUNTULEME";

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/giris",
  },

  providers: [
    Credentials({
      name: "Kullanıcı Adı ve Şifre",

      credentials: {
        kullaniciAdi: {
          label: "Kullanıcı Adı",
          type: "text",
        },

        sifre: {
          label: "Şifre",
          type: "password",
        },
      },

      async authorize(credentials) {
        const kullaniciAdi = String(
          credentials?.kullaniciAdi ?? ""
        ).trim();

        const sifre = String(
          credentials?.sifre ?? ""
        );

        if (!kullaniciAdi || !sifre) {
          return null;
        }

        // Büyük/Küçük harf duyarsız arama yapıyoruz (HAL, hal, Hal hepsi eşleşir)
        const kullanici =
          await prisma.kullanici.findFirst({
            where: {
              kullaniciAdi: {
                equals: kullaniciAdi,
                mode: "insensitive",
              },
            },
          });

        if (
          !kullanici ||
          !kullanici.aktif
        ) {
          return null;
        }

        const sifreDogru =
          await bcrypt.compare(
            sifre,
            kullanici.sifreHash
          );

        if (!sifreDogru) {
          return null;
        }

        await prisma.kullanici.update({
          where: {
            id: kullanici.id,
          },

          data: {
            sonGirisAt: new Date(),
          },
        });

        return {
          id: String(kullanici.id),

          name:
            kullanici.adSoyad ??
            kullanici.kullaniciAdi,

          kullaniciAdi:
            kullanici.kullaniciAdi,

          rol:
            kullanici.rol,
        };
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.kullaniciId =
          user.id;

        token.kullaniciAdi =
          (
            user as {
              kullaniciAdi?: string;
            }
          ).kullaniciAdi;

        token.rol =
          (
            user as {
              rol?: KullaniciRol;
            }
          ).rol;
      }

      return token;
    },

    session({ session, token }) {
      if (session.user) {
        (
          session.user as {
            id?: string;
            kullaniciAdi?: string;
            rol?: KullaniciRol;
          }
        ).id =
          String(
            token.kullaniciId ?? ""
          );

        (
          session.user as {
            kullaniciAdi?: string;
          }
        ).kullaniciAdi =
          String(
            token.kullaniciAdi ?? ""
          );

        (
          session.user as {
            rol?: KullaniciRol;
          }
        ).rol =
          token.rol as
            | KullaniciRol
            | undefined;
      }

      return session;
    },

    authorized({
      auth,
      request,
    }) {
      const pathname =
        request.nextUrl.pathname;

      /*
        AUTH.JS kendi giriş / çıkış
        işlemlerini her zaman yapabilsin.
      */
      if (
        pathname.startsWith(
          "/api/auth"
        )
      ) {
        return true;
      }

      const girisYapmis =
        !!auth?.user;

      /*
        Giriş yapılmamış kullanıcı
        yalnızca giriş ekranına erişebilir.
      */
      if (!girisYapmis) {
        if (
          pathname === "/giris"
        ) {
          return true;
        }

        return false;
      }

      const kullanici =
        auth?.user as
          | {
              rol?: KullaniciRol;
            }
          | undefined;

      const rol =
        kullanici?.rol;

      /*
        Giriş yapan kullanıcı tekrar
        /giris sayfasına giderse
        rolüne uygun yere gönder.
      */
      if (
        pathname === "/giris"
      ) {
        if (rol === "BEACH") {
          return Response.redirect(
            new URL(
              "/beach",
              request.nextUrl
            )
          );
        }

        if (rol === "HAL") {
          return Response.redirect(
            new URL(
              "/hal",
              request.nextUrl
            )
          );
        }

        return Response.redirect(
          new URL(
            "/",
            request.nextUrl
          )
        );
      }

      /*
        GORUNTULEME KULLANICISI
      */
      if (
        rol === "GORUNTULEME"
      ) {
        if (pathname === "/") {
          return true;
        }

        if (
          pathname.startsWith(
            "/beach"
          )
        ) {
          return true;
        }

        if (
          pathname.startsWith(
            "/hal"
          )
        ) {
          return true;
        }

        return Response.redirect(
          new URL(
            "/",
            request.nextUrl
          )
        );
      }

      /*
        ADMIN / YONETICI
        Her yere tam erişim.
      */
      if (rol === "ADMIN") {
        return true;
      }

      /*
        BEACH
        Yalnızca Beach şirketine erişir.
      */
      if (rol === "BEACH") {
        if (
          pathname.startsWith(
            "/beach"
          )
        ) {
          return true;
        }

        if (pathname === "/") {
          return Response.redirect(
            new URL(
              "/beach",
              request.nextUrl
            )
          );
        }

        return Response.redirect(
          new URL(
            "/beach",
            request.nextUrl
          )
        );
      }

      /*
        HAL
        Yalnızca Hal şirketine erişir.
      */
      if (rol === "HAL") {
        if (
          pathname.startsWith(
            "/hal"
          )
        ) {
          return true;
        }

        if (pathname === "/") {
          return Response.redirect(
            new URL(
              "/hal",
              request.nextUrl
            )
          );
        }

        return Response.redirect(
          new URL(
            "/hal",
            request.nextUrl
          )
        );
      }

      return false;
    },
  },
});