import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import MainNav from "@/components/main-nav";
import { ThemeProvider } from "@/components/theme-provider";
import { UserProvider } from "@/state/user-context";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Configuratore | ITECO SRL",
  description: "Sistema di gestione configurazioni - ITECO SRL",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <UserProvider>
            <div className="flex min-h-screen flex-col">
              <header className="top-0 z-50 border-b bg-background/95">
                <div className="container py-3">
                  <MainNav />
                </div>
              </header>
              <main className="container mx-auto px-4 py-8 max-w-5xl">
                {children}
              </main>
            </div>
            <footer className="border-t py-6 md:py-0">
              <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
                <p className="text-sm text-muted-foreground">
                  &copy; 2024-{new Date().getFullYear()} ITECO SRL. Tutti i
                  diritti riservati.
                </p>
              </div>
            </footer>
          </UserProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
