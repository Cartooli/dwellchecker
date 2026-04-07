import type { Metadata, Viewport } from "next";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://condition.homes";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Dwellchecker — Know what's wrong before you buy",
    template: "%s · Dwellchecker",
  },
  description:
    "Dwellchecker is a buyer-first property condition intelligence platform. Score risk, interpret inspection reports, and get a clear proceed-negotiate-walk recommendation.",
  applicationName: "Dwellchecker",
  authors: [{ name: "Dwellchecker" }],
  keywords: [
    "home inspection",
    "property condition",
    "buyer due diligence",
    "real estate risk",
    "inspection report analysis",
  ],
  openGraph: {
    type: "website",
    url: APP_URL,
    title: "Dwellchecker — Know what's wrong before you buy",
    description:
      "Score property risk, interpret inspection reports, and get a clear proceed-negotiate-walk recommendation.",
    siteName: "Dwellchecker",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Dwellchecker" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dwellchecker — Know what's wrong before you buy",
    description:
      "Buyer-first property condition intelligence. Decode inspection reports into proceed, negotiate, or walk.",
    images: ["/opengraph-image"],
  },
  alternates: { canonical: "https://condition.homes" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0b0d10",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="nav">
          <div className="container nav-inner">
            <a href="/" className="brand">
              <span className="brand-mark">D</span>
              <span>dwellchecker</span>
            </a>
            <nav>
              <a className="link" href="/dashboard">Dashboard</a>
              <a className="link" href="/dashboard/compare">Compare</a>
              <a className="link" href="/dashboard">Get started</a>
            </nav>
          </div>
        </header>
        {children}
        <footer>
          <div className="container">
            © {new Date().getFullYear()} Dwellchecker · The interpretation layer for property condition.
          </div>
        </footer>
      </body>
    </html>
  );
}
