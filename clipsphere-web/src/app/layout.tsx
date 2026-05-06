import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Syne, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import NotificationListener from "@/components/ui/NotificationListener";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ClipSphere",
  description: "Share and discover short video clips",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${jakarta.className} ${jakarta.variable} ${syne.variable} ${geistMono.variable} grain antialiased flex min-h-screen flex-col`}>
        <AuthProvider>
          <SocketProvider>
            <Navbar />
            <NotificationListener />
            <main className="flex-1">{children}</main>
            <Footer />
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}