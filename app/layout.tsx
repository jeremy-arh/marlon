import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import AuthHashRedirect from "@/components/AuthHashRedirect";

export const metadata: Metadata = {
  title: {
    template: "%s | MARLON",
    default: "MARLON - Plateforme de Leasing",
  },
  description: "Plateforme de leasing de matériel médical",
};

const AUTH_HASH_SCRIPT = `
(function(){
  var h=window.location.hash;
  if(!h)return;
  var p=new URLSearchParams(h.substring(1));
  var t=p.get('access_token');
  var type=p.get('type');
  if(!t)return;
  var path=window.location.pathname;
  if(path==='/complete-invitation'||path==='/reset-password'||path==='/auth/callback')return;
  if(type==='invite'){
    window.location.replace('/complete-invitation'+(window.location.search||'')+h);
  }else if(type==='recovery'){
    window.location.replace('/reset-password'+h);
  }else if(type==='magiclink'){
    window.location.replace('/auth/callback'+h);
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <Script id="auth-hash-redirect" strategy="beforeInteractive">
          {AUTH_HASH_SCRIPT}
        </Script>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-16781949694"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-16781949694');
          `}
        </Script>
      </head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: AUTH_HASH_SCRIPT }} />
        <AuthHashRedirect />
        {children}
      </body>
    </html>
  );
}
