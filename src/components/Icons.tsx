// Sistema de iconos de línea (SVG, stroke 1.8, currentColor). Sin emojis en toda la UI.

import type { ReactNode, SVGProps } from "react";

function Svg({ children, size = 18, ...rest }: { children: ReactNode; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Sables cruzados — JEDI */
export function IconJedi(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Svg {...props}>
      <path d="M4.5 19.5 14 10" />
      <path d="M3.5 20.5 6 18" />
      <path d="M19.5 19.5 10 10" />
      <path d="M20.5 20.5 18 18" />
      <path d="M14 10l1.8-1.8M10 10 8.2 8.2" />
    </Svg>
  );
}

/** Máscara angular — SITH */
export function IconSith(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Svg {...props}>
      <path d="M12 3l8 5.5L17.5 20h-11L4 8.5 12 3z" />
      <path d="M8 11h8" />
      <path d="M12 11v4" />
    </Svg>
  );
}

/** Casco con visor — CLONES */
export function IconClone(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Svg {...props}>
      <path d="M6 13a6 6 0 0 1 12 0" />
      <path d="M6 13v5.5h12V13" />
      <path d="M6.5 13.5h11" />
      <path d="M12 13.5V11" />
    </Svg>
  );
}

/** Cúpula astromecánico — DROIDES */
export function IconDroid(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Svg {...props}>
      <path d="M7 12a5 5 0 0 1 10 0v6H7v-6z" />
      <circle cx="12" cy="10.5" r="1.4" />
      <path d="M5 20.5h14" />
    </Svg>
  );
}

/** Planeta con anillo — PLANETAS */
export function IconPlanet(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="5.5" />
      <path d="M3.2 14.8c3 2.2 14.6 2.2 17.6 0" />
      <path d="M3.2 14.8c1.1.8 3 1.3 5.2 1.6" />
    </Svg>
  );
}

/** Busto en sombra — SILUETA (relleno, representa la sombra) */
export function IconSilueta(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={props.size ?? 18} height={props.size ?? 18} viewBox="0 0 24 24" aria-hidden {...props}>
      <circle cx="12" cy="8" r="3.4" fill="currentColor" />
      <path d="M4.5 20a7.5 5.6 0 0 1 15 0z" fill="currentColor" />
    </svg>
  );
}

/** Rompo — COMODÍN */
export function IconComodin(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Svg {...props}>
      <path d="M12 3l7.5 9L12 21 4.5 12 12 3z" />
      <circle cx="12" cy="12" r="1.3" />
    </Svg>
  );
}

export function IconSignal(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
      <path d="M8.6 14.6a5 5 0 0 1 6.8 0" />
      <path d="M6 11.8a9 9 0 0 1 12 0" />
    </Svg>
  );
}

export function IconTrophy(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Svg {...props}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
      <path d="M8 5H5a3 3 0 0 0 3 4.5M16 5h3a3 3 0 0 1-3 4.5" />
      <path d="M12 13v3.5" />
      <path d="M8.5 20h7" />
      <path d="M10 16.5h4" />
    </Svg>
  );
}

export function IconSpeaker(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Svg {...props}>
      <path d="M4 10v4h3l4.5 3.5v-11L7 10H4z" />
      <path d="M15 9.5a4 4 0 0 1 0 5" />
      <path d="M17.5 7.5a7.5 7.5 0 0 1 0 9" />
    </Svg>
  );
}

export function IconSpeakerOff(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Svg {...props}>
      <path d="M4 10v4h3l4.5 3.5v-11L7 10H4z" />
      <path d="M15.5 9.5 20 14M20 9.5 15.5 14" />
    </Svg>
  );
}

export function IconSend(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Svg {...props}>
      <path d="M4 12h14" />
      <path d="M13 6l6 6-6 6" />
    </Svg>
  );
}

export function IconCheck(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Svg {...props}>
      <path d="M5 12.5 10 17.5 19 7" />
    </Svg>
  );
}

export function IconClose(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

export function IconSpin(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Svg {...props}>
      <path d="M20 12a8 8 0 1 1-2.5-5.8" />
      <path d="M20 3.5V7h-3.5" />
    </Svg>
  );
}

/** Estrella de 4 puntas (celda libre del cartón) */
export function IconStarFree(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Svg {...props}>
      <path d="M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2L12 3z" />
    </Svg>
  );
}
