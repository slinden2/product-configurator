import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import MainNav from "@/components/MainNav";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Configuratore",
  description: "Created by ITECO SRL",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange>
          <div className="min-h-screen">
            <nav className="flex flex-col items-center border-b mb-5 px-5 py-3">
              <div className="max-w-6xl w-full">
                <MainNav />
              </div>
            </nav>
            <main className="flex flex-col items-center px-5">
              <div className="max-w-6xl w-full">{children}</div>
            </main>
          </div>
          <footer className="flex align-middle justify-center border-t px-5 py-3 my-3">
            &copy; Iteco SRL
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
