import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ECOVERDICT — Green claims, tested in public",
  description: "Audit environmental claims against live public evidence and issue renewable GenLayer consensus passports.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="antialiased">{children}</body></html>;
}
