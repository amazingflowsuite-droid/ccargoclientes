import type { Metadata } from "next";
import { Inter, Libre_Baskerville } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { AuthGuard } from "@/components/AuthGuard";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const libreBaskerville = Libre_Baskerville({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-baskerville",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CCargo | Prospecção Comercial",
  description: "Sistema de prospecção comercial para transporte rodoviário de cargas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${libreBaskerville.variable}`}>
      <body className="min-h-screen bg-[#FAFAF9] text-[#1C1917] antialiased flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 max-w-[1680px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <AuthGuard>{children}</AuthGuard>
        </main>
        <footer className="border-t border-[#E7E5E4] bg-[#F5F5F4] py-4 text-center text-xs text-[#57534E]">
          <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>CCargo Transportes Rodoviários &copy; {new Date().getFullYear()} — Plataforma de Prospecção</span>
            <span className="text-[#78716C]">Design System: Postum / ThoughtStream Adapted</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
