import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import IntakeGate from "@/components/IntakeGate";
import PendingApprovalGate from "@/components/PendingApprovalGate";
import CapacitorBootstrap from "@/components/CapacitorBootstrap";
import AppViewportRoot from "@/components/AppViewportRoot";
import { KeyboardViewportProvider } from "@/components/KeyboardViewportProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { QueryProvider } from "@/components/QueryProvider";
import { ConfirmProvider } from "@/components/ui/ConfirmProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import SkipToContent from "@/components/ui/SkipToContent";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";
import "@/styles/mobile-shell.css";
import "@/styles/mobile-page-shell.css";
import "@/styles/mobile-athlete-polish.css";
import "@/styles/search-input.css";
import "@/styles/light-mode-contrast.css";
import "@/styles/motion-tokens.css";

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
    { media: "(prefers-color-scheme: light)", color: "#f8f9fc" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";document.documentElement.style.backgroundColor="#09090b";if(document.body){document.body.style.backgroundColor="#09090b";}}else{document.documentElement.classList.remove("dark");document.documentElement.style.colorScheme="light";document.documentElement.style.backgroundColor="#f8f9fc";if(document.body){document.body.style.backgroundColor="#f8f9fc";}}}catch(e){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";document.documentElement.style.backgroundColor="#09090b";if(document.body){document.body.style.backgroundColor="#09090b";}}})();`;

const iosViewportPinScript = `(function(){function isChat(){return location.pathname.indexOf("/chat")===0;}function isInnerScroll(){var p=location.pathname;return p==="/profile"||p.indexOf("/profile?")===0||p==="/intake";}function isCap(){return document.documentElement.classList.contains("capacitor-native");}function lockDoc(){window.scrollTo(0,0);document.documentElement.scrollTop=0;document.body.scrollTop=0;}function pinRoot(allowOffset){var r=document.getElementById("app-viewport-root");if(!r)return;if(isCap()){r.style.top="0px";r.style.height="100%";r.style.bottom="0px";return;}if(!allowOffset){r.style.top="0px";r.style.height="";r.style.bottom="0px";return;}var v=window.visualViewport;var o=v?Math.max(0,Math.round(v.offsetTop)):0;if(o>0){r.style.top="-"+o+"px";r.style.height="";r.style.bottom="0px";}else{r.style.top="0px";r.style.height="";r.style.bottom="0px";}}function p(allowOffset){if(isChat()||document.documentElement.getAttribute("data-chat-viewport-sync")==="true")return;lockDoc();pinRoot(allowOffset);}function b(){try{if(/Capacitor/i.test(navigator.userAgent)||window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform())document.documentElement.classList.add("capacitor-native");}catch(e){}p(true);requestAnimationFrame(function(){p(true);});}if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",b);}else{b();}if(window.visualViewport){window.visualViewport.addEventListener("scroll",function(){if(isInnerScroll())return;p(true);},{passive:true});window.visualViewport.addEventListener("resize",function(){p(true);},{passive:true});}window.addEventListener("orientationchange",b);})();`;

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
        {/* Inline CSP for dev mode: ensures unsafe-eval is allowed even when
            WKWebView serves a cached page without the HTTP header. */}
        {process.env.NODE_ENV === "development" && (
          <meta
            httpEquiv="Content-Security-Policy"
            content="default-src * 'unsafe-inline' 'unsafe-eval' blob: data:; connect-src * ws: wss:;"
          />
        )}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: iosViewportPinScript }} />
      </head>
      <body className="bg-app-bg text-app-text">
        <SkipToContent />
        <AppViewportRoot>
          <ThemeProvider>
            <CapacitorBootstrap />
            <QueryProvider>
              <AuthProvider>
                <AnalyticsProvider>
                  <ConfirmProvider>
                    <KeyboardViewportProvider>
                      <PendingApprovalGate>
                        <IntakeGate>{children}</IntakeGate>
                      </PendingApprovalGate>
                    </KeyboardViewportProvider>
                  </ConfirmProvider>
                </AnalyticsProvider>
              </AuthProvider>
            </QueryProvider>
          </ThemeProvider>
        </AppViewportRoot>
      </body>
    </html>
  );
}
