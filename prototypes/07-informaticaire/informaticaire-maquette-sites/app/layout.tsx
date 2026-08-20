import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Informaticaire — maquette vivante", description: "Explorer les ressources, acteurs et relations de l’intercompréhension.", icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="fr"><body>{children}</body></html>; }
