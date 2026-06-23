import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import IntakeGate from "@/components/IntakeGate";
import { AuthProvider } from "@/components/AuthProvider";
import { ConfirmProvider } from "@/components/ui/ConfirmProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";
import "@/styles/mobile-shell.css";
import "@/styles/chat-mobile.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Limitless Coaching",
  description: "Coaching app voor atleten en coaches",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}else{document.documentElement.classList.remove("dark");document.documentElement.style.colorScheme="light";}}catch(e){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nl"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-transparent text-app-text">
        <ThemeProvider>
          <AuthProvider>
            <ConfirmProvider>
              <IntakeGate>{children}</IntakeGate>
            </ConfirmProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
