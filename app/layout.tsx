import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { DepartmentProvider } from "@/context/DepartmentContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "AshokaSports Live | AITM Varanasi (Session 2026-27)",
  description:
    "Official sports portal for Ashoka Institute of Technology and Management (AITM), Varanasi — Ashoka Sports Club, Session 2026-27",
  icons: {
    icon: "/images/ashoka-logo.png",
    apple: "/images/ashoka-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="antialiased overflow-x-hidden max-w-full font-sans"
    >
      <body className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans flex flex-col overflow-x-hidden max-w-full">
        <DepartmentProvider>
          <Suspense fallback={<div className="h-16 bg-white border-b border-[#E2E8F0]" />}>
            <Navbar />
          </Suspense>
          <main className="flex-1 pb-24 md:pb-10 overflow-x-hidden max-w-full w-full">
            <Suspense fallback={null}>{children}</Suspense>
          </main>
          <Footer />
        </DepartmentProvider>
      </body>
    </html>
  );
}
