/**
 * CVSS v3.1 — cálculo da nota base a partir do vetor, seguindo a especificação do FIRST
 * (https://www.first.org/cvss/v3.1/specification-document, seção 7).
 * A nota nunca é digitada à mão no dataset: ela sai sempre do vetor.
 */
export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";

export const METRICS = ["AV", "AC", "PR", "UI", "S", "C", "I", "A"] as const;
export type Metric = (typeof METRICS)[number];
export type CvssVector = Record<Metric, string>;

const ALLOWED: Record<Metric, string[]> = {
  AV: ["N", "A", "L", "P"],
  AC: ["L", "H"],
  PR: ["N", "L", "H"],
  UI: ["N", "R"],
  S: ["U", "C"],
  C: ["H", "L", "N"],
  I: ["H", "L", "N"],
  A: ["H", "L", "N"],
};

const W = {
  AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 } as Record<string, number>,
  AC: { L: 0.77, H: 0.44 } as Record<string, number>,
  UI: { N: 0.85, R: 0.62 } as Record<string, number>,
  CIA: { H: 0.56, L: 0.22, N: 0 } as Record<string, number>,
};

/** PR pesa mais quando o escopo muda (S:C). */
function privileges(pr: string, scopeChanged: boolean): number {
  if (pr === "N") return 0.85;
  if (pr === "L") return scopeChanged ? 0.68 : 0.62;
  return scopeChanged ? 0.5 : 0.27;
}

/** "Roundup" da spec: arredonda para cima na 1ª casa, imune a erro de ponto flutuante. */
export function roundUp(x: number): number {
  const i = Math.round(x * 100000);
  return i % 10000 === 0 ? i / 100000 : (Math.floor(i / 10000) + 1) / 10;
}

export function parseVector(vector: string): CvssVector {
  const parts = vector.split("/");
  if (parts[0] !== "CVSS:3.1") throw new Error(`Vetor inválido: ${vector}`);
  const out: Partial<CvssVector> = {};
  for (const part of parts.slice(1)) {
    const [k, v] = part.split(":") as [Metric, string];
    if (!METRICS.includes(k) || !ALLOWED[k].includes(v) || out[k]) throw new Error(`Vetor inválido: ${vector}`);
    out[k] = v;
  }
  for (const m of METRICS) if (!out[m]) throw new Error(`Vetor sem ${m}: ${vector}`);
  return out as CvssVector;
}

export function baseScore(vector: string): number {
  const v = parseVector(vector);
  const changed = v.S === "C";
  const iss = 1 - (1 - W.CIA[v.C]) * (1 - W.CIA[v.I]) * (1 - W.CIA[v.A]);
  const impact = changed ? 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15) : 6.42 * iss;
  if (impact <= 0) return 0;
  const exploitability = 8.22 * W.AV[v.AV] * W.AC[v.AC] * privileges(v.PR, changed) * W.UI[v.UI];
  return changed ? roundUp(Math.min(1.08 * (impact + exploitability), 10)) : roundUp(Math.min(impact + exploitability, 10));
}

/** Faixas qualitativas da spec (tabela 14). */
export function severityOf(score: number): Severity {
  if (score >= 9) return "CRITICAL";
  if (score >= 7) return "HIGH";
  if (score >= 4) return "MEDIUM";
  if (score > 0) return "LOW";
  return "NONE";
}

export const SEVERITY_ORDER: Record<Severity, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 };
