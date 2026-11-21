import type { ReactNode } from "react";

/** Holographic framed panel with HUD corner brackets. */
export default function HoloPanel({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`holo-panel holo-corners p-5 sm:p-6 ${className}`}>
      {title ? <h2 className="holo-title mb-4">{title}</h2> : null}
      {children}
    </section>
  );
}
