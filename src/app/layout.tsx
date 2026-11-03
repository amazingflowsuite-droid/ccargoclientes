import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "CCargo | Gestão de Prospecção & Blindagem Comercial",
  description: "Sistema inteligente de prospecção e blindagem de carteira para transporte rodoviário de cargas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#FAFAF9] text-[#1C1917] antialiased flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-[#E7E5E4] bg-[#F5F5F4] py-6 text-center text-xs text-[#57534E]">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>CCargo Transportes Rodoviários &copy; {new Date().getFullYear()} — Plataforma de Prospecção</span>
            <span className="text-[#78716C]">Design System: Postum / ThoughtStream Adapted</span>
          </div>
        </footer>
      </body>
    </html>
  );
}

