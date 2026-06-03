import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "menunico — menús del día en Barcelona",
  description: "Descubre los menús del día de los restaurantes de Barcelona.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      {/*
        Playfair Display loaded via <link> because next/font/google has issues
        with display=swap for variable fonts in some Next 16 builds.
      */}
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full flex flex-col overflow-hidden">{children}</body>
    </html>
  );
}
