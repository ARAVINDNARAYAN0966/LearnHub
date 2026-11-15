import { DM_Sans, DM_Serif_Display, Geist_Mono } from "next/font/google";
import Script from "next/script";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const themeInitializer = `(() => {
  let savedTheme = null;
  try {
    savedTheme = window.localStorage.getItem("learnhub-theme");
  } catch {
    savedTheme = null;
  }
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = savedTheme === "light" || savedTheme === "dark"
    ? savedTheme
    : systemPrefersDark ? "dark" : "light";
})();`;

export const metadata = {
  title: {
    default: "LearnHub — Make room for what’s next",
    template: "%s | LearnHub",
  },
  description:
    "Build real-world skills with thoughtful, expert-led classes. Find your next favorite thing to learn on LearnHub.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${dmSerif.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Script
          id="learnhub-theme-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitializer }}
        />
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
