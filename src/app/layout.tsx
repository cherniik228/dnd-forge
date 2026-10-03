import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Используем шрифт Inter с поддержкой кириллицы
const inter = Inter({ 
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "D&D Forge",
  description: "Виртуальный стол для Мастера и Игроков",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}