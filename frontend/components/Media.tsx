import { seededRandom } from "@/lib/utils";

interface MediaProps {
  seed: number;
  code?: string;
  label?: string;
  ratio?: "portrait" | "square" | "wide";
  compact?: boolean;
  className?: string;
}

// Procedural architectural graphic — a decorative design element of the
// city identity, never presented as product photography.
export function Media({
  seed,
  code,
  label = "Lock City graphic",
  ratio = "portrait",
  compact = false,
  className = "",
}: MediaProps) {
  const rand = seededRandom(seed * 7919 + 13);
  const w = 800;
  const h = ratio === "portrait" ? 1000 : ratio === "square" ? 800 : 500;

  const panels = Array.from({ length: compact ? 2 : 4 }, (_, i) => {
    const pw = w * (0.12 + rand() * 0.22);
    const px = rand() * (w - pw);
    const py = h * (0.05 + rand() * 0.25);
    const ph = h * (0.5 + rand() * 0.45);
    const shade = 18 + Math.floor(rand() * 16);
    return { x: px, y: py, w: pw, h: ph, fill: `rgb(${shade},${shade},${shade})`, i };
  });

  const beamX = w * (0.2 + rand() * 0.6);
  const spotX = w * (0.25 + rand() * 0.5);
  const spotY = h * (0.2 + rand() * 0.4);
  const gridGap = 80;
  const gid = `m${seed}${compact ? "c" : ""}${ratio[0]}`;

  return (
    <div
      className={`relative overflow-hidden bg-[#0A0A0A] ${className}`}
      style={{ aspectRatio: `${w}/${h}` }}
      role="img"
      aria-label={label}
    >
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      ><defs>
          <radialGradient id={`${gid}-spot`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F1EFE9" stopOpacity="0.22" />
            <stop offset="55%" stopColor="#F1EFE9" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#F1EFE9" stopOpacity="0" />
          </radialGradient>
          <filter id={`${gid}-noise`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.05" />
            </feComponentTransfer>
            <feComposite operator="over" in2="SourceGraphic" />
          </filter>
        </defs>

        {Array.from({ length: Math.floor(w / gridGap) + 1 }, (_, i) => (
          <line
            key={`v${i}`}
            x1={i * gridGap}
            y1={0}
            x2={i * gridGap}
            y2={h}
            stroke="#1D1D1D"
            strokeWidth="1"
          />
        ))}
        {Array.from({ length: Math.floor(h / gridGap) + 1 }, (_, i) => (
          <line
            key={`h${i}`}
            x1={0}
            y1={i * gridGap}
            x2={w}
            y2={i * gridGap}
            stroke="#1D1D1D"
            strokeWidth="1"
          />
        ))}

        <line x1={beamX} y1={0} x2={beamX - w * 0.35} y2={h} stroke="#2A2A2A" strokeWidth="1.5" />
        <line x1={beamX + 24} y1={0} x2={beamX - w * 0.35 + 24} y2={h} stroke="#1E1E1E" strokeWidth="1" />

        {panels.map((p) => (
          <rect
            key={p.i}
            x={p.x}
            y={p.y}
            width={p.w}
            height={p.h}
            fill={p.fill}
            stroke="#222222"
            strokeWidth="1"
          />
        ))}

        <circle cx={spotX} cy={spotY} r={h * 0.32} fill={`url(#${gid}-spot)`} />

        {!compact && (
          <text
            x={w * 0.5}
            y={h * 0.62}
            textAnchor="middle"
            fill="none"
            stroke="#2E2E2E"
            strokeWidth="1.5"
            fontSize={h * 0.34}
            fontFamily="var(--font-display), Arial Narrow, sans-serif"
          >
            {(code ?? String(seed)).replace("OBJECT_", "")}
          </text>
        )}

        <rect x="1" y="1" width={w - 2} height={h - 2} fill="none" stroke="#222222" strokeWidth="2" />
        <path d={`M 16 16 h 24 M 16 16 v 24 M ${w - 16} 16 h -24 M ${w - 16} 16 v 24 M 16 ${h - 16} h 24 M 16 ${h - 16} v -24 M ${w - 16} ${h - 16} h -24 M ${w - 16} ${h - 16} v -24`} stroke="#3A3A3A" strokeWidth="2" fill="none" />
      </svg>
    </div>
  );
}
