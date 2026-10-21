import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Beslutsdashboard",
    template: "%s | Beslutsdashboard",
  },
  description:
    "Internt beslutsstöd för uthyrning och felanmälan. Rekommendationer är beslutsstöd och kräver mänsklig granskning.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="sv">
      <body>
        <div className="app-shell">
          <header className="site-header">
            <a className="site-header__brand" href="/">
              Beslutsstöd
            </a>
            <span className="site-header__tag">Demo · syntetisk data</span>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
