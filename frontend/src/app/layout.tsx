import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Menteşe SYDV Hane Ziyareti Bilgi Sistemi",
  description: "Menteşe Sosyal Yardımlaşma ve Dayanışma Vakfı hane ziyaret kayıtlarını yönetin.",
  icons: {
    icon: "/sydv-logo.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-screen flex flex-col">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
