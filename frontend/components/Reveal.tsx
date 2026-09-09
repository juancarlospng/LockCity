import type { ReactNode } from "react";
export function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return <div className={`lc-reveal ${className}`}>{children}</div>;
}
export function MaskText({
  lines,
  className = "",
  lineClassName = "",
}: {
  lines: ReactNode[];
  className?: string;
  lineClassName?: string;
  delay?: number;
  stagger?: number;
  once?: boolean;
}) {
  return (
    <span className={className}>
      {lines.map((line, i) => (
        <span key={i} className={`mask-line ${lineClassName}`}>
          {line}
        </span>
      ))}
    </span>
  );
}
