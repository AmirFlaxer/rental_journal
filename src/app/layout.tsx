import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: "מנהל נכסים להשכרה",
  description: "נהל את נכסי ההשכרה שלך בקלות",
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
      className={`${heebo.variable} h-full antialiased`}
      style={{ fontFamily: "var(--font-heebo)" }}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
