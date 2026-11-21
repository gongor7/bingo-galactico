import type { ReactNode } from "react";

/** Panel plano con hairline y título técnico. `accent` activa el filo cian. */
export default function HoloPanel({
  title,
  children,
  className = "",
  accent = false,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <section className={`panel ${accent ? "panel-accent" : ""} p-5 sm:p-6 ${className}`}>
      {title ? <h2 className="panel-title mb-4">{title}</h2> : null}
      {children}
    </section>
  );
}
