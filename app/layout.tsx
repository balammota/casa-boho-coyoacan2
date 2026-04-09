import type { Metadata } from "next";
import { Playfair_Display, Lato } from "next/font/google";
import "../styles/globals.css";
import { Providers } from "@/app/providers";
import { ConditionalNavbar } from "@/components/ConditionalNavbar";
import { WhatsAppFab } from "@/components/WhatsAppFab";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-lato",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Casa Boho Coyoacán | Boutique stay in Mexico City",
  description:
    "A peaceful and stylish apartment rental in the heart of Coyoacán, Mexico City.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${playfair.variable} ${lato.variable}`}>
      <body className="min-h-screen antialiased">
        <Providers>
          <ConditionalNavbar />
          {children}
          <WhatsAppFab />
        </Providers>
      </body>
    </html>
  );
}
