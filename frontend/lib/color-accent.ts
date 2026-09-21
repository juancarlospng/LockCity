export interface ColorAccent {
  background: string;
  borderColor: string;
}

const NEUTRAL: ColorAccent = { background: "#777775", borderColor: "#9a9a96" };

const COLOR_RULES: { pattern: RegExp; accent: ColorAccent }[] = [
  { pattern: /vintage black|washed black|faded black/i, accent: { background: "#343434", borderColor: "#5c5c5c" } },
  { pattern: /asphalt|charcoal|dark gr[ae]y/i, accent: { background: "#3f4141", borderColor: "#646666" } },
  { pattern: /black|negro/i, accent: { background: "#090909", borderColor: "#3a3a3a" } },
  { pattern: /white|blanco/i, accent: { background: "#f3f1e9", borderColor: "#8b8a84" } },
  { pattern: /navy|azul marino/i, accent: { background: "#101c35", borderColor: "#344362" } },
  { pattern: /maroon|burgundy|granate/i, accent: { background: "#5a1723", borderColor: "#82404b" } },
  { pattern: /forest|verde bosque/i, accent: { background: "#183b2b", borderColor: "#3d624f" } },
  { pattern: /olive|oliva/i, accent: { background: "#5c6040", borderColor: "#7d8160" } },
  { pattern: /khaki|caqui/i, accent: { background: "#a6956b", borderColor: "#c0b18d" } },
  { pattern: /cream|natural|beige|sand|stone/i, accent: { background: "#d4cbb9", borderColor: "#8f8779" } },
  { pattern: /gr[ae]y|gris|silver/i, accent: { background: "#858686", borderColor: "#aaa" } },
  { pattern: /blue|azul/i, accent: { background: "#315b88", borderColor: "#5a7fa7" } },
  { pattern: /green|verde/i, accent: { background: "#397052", borderColor: "#609177" } },
  { pattern: /red|rojo/i, accent: { background: "#9a2b2f", borderColor: "#bd5659" } },
  { pattern: /brown|marr[oó]n/i, accent: { background: "#674735", borderColor: "#896957" } },
  { pattern: /purple|violet|morado/i, accent: { background: "#624574", borderColor: "#846895" } },
  { pattern: /pink|rosa/i, accent: { background: "#c28291", borderColor: "#dda6b2" } },
  { pattern: /orange|naranja/i, accent: { background: "#bd632e", borderColor: "#dc8651" } },
  { pattern: /yellow|amarillo|volt/i, accent: { background: "#b8c832", borderColor: "#d5df61" } },
];

export function getColorAccent(label: string): ColorAccent {
  return COLOR_RULES.find(({ pattern }) => pattern.test(label))?.accent ?? NEUTRAL;
}

export function isColorAttribute(name: string): boolean {
  return /colou?r|color|colour/i.test(name);
}
