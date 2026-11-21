import type { Metadata } from "next";
// Fuentes autoalojadas (@fontsource): el build no depende de Google Fonts.
import "@fontsource/orbitron/500.css";
import "@fontsource/orbitron/700.css";
import "@fontsource/orbitron/800.css";
import "@fontsource/exo-2/300.css";
import "@fontsource/exo-2/400.css";
import "@fontsource/exo-2/600.css";
import "@fontsource/exo-2/700.css";
import "./globals.css";
import StarField from "@/components/StarField";

export const metadata: Metadata = {
  title: "Bingo Galáctico — Party Star Wars",
  description:
    "Bingo multijugador estilo Kahoot en una consola imperial: ruleta de categorías, preguntas con foto, siluetas y planetas. Crea una sala y comparte el código.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="font-body antialiased">
        <StarField />
        {children}
        <div className="fx-vignette" aria-hidden />
      </body>
    </html>
  );
}
