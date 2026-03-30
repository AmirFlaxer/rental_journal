import type { Metadata } from "next";
import { Heebo, Outfit, Playfair_Display } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { HebrewValidation } from "@/components/hebrew-validation";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["700", "900"],
});

export const metadata: Metadata = {
  title: "מנהל נכסים להשכרה",
  description: "נהל את נכסי ההשכרה שלך בקלות",
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${heebo.variable} ${outfit.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <HebrewValidation />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
