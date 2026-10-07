/**
 * Dataset 100% fictício e determinístico (mesma semente → mesmos dados).
 * Projetos e achados são inventados; os nomes de CWE e as categorias OWASP Top 10 (2021) são reais.
 */
import { baseScore, severityOf, type Severity } from "./cvss";

export type Source = "SAST" | "DAST" | "SCA";
export type Status = "OPEN" | "IN_PROGRESS" | "RISK_ACCEPTED" | "FALSE_POSITIVE" | "FIXED";

export interface Project { id: string; name: string }
export interface Cwe { id: string; name: string }
export interface StatusChange { from: Status; to: Status; at: string; justification: string | null }

export interface Finding {
  id: string;
  cwe: Cwe;
  owasp: string;
  source: Source;
  severity: Severity;
  cvssScore: number;
  cvssVector: string;
  status: Status;
  projectId: string;
  location: string;
  detectedAt: string;
  updatedAt: string;
  history: StatusChange[];
}

export const PROJECTS: Project[] = [
  { id: "p1", name: "Portal do Cliente" },
  { id: "p2", name: "API de Pagamentos" },
  { id: "p3", name: "App Mobile" },
  { id: "p4", name: "Backoffice" },
  { id: "p5", name: "Gateway de Notificações" },
];

interface Template {
  cwe: Cwe;
  owasp: string;
  sources: Source[];
  vectors: string[];
  locations: string[];
}

const T: Template[] = [
  {
    cwe: { id: "CWE-89", name: "SQL Injection" }, owasp: "A03:2021", sources: ["SAST", "DAST"],
    vectors: ["CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N"],
    locations: ["src/repositories/pedido.repository.ts:{n}", "GET /api/v1/relatorios?ordem=", "app/Models/Cliente.php:{n}"],
  },
  {
    cwe: { id: "CWE-79", name: "Cross-site Scripting" }, owasp: "A03:2021", sources: ["SAST", "DAST"],
    vectors: ["CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N", "CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:C/C:L/I:L/A:N"],
    locations: ["src/components/Comentario.vue:{n}", "GET /busca?q=", "src/pages/perfil.tsx:{n}"],
  },
  {
    cwe: { id: "CWE-639", name: "Authorization Bypass Through User-Controlled Key" }, owasp: "A01:2021", sources: ["DAST", "SAST"],
    vectors: ["CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N", "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N"],
    locations: ["GET /api/v1/faturas/{id}", "PUT /api/v1/usuarios/{id}", "src/controllers/pedido.controller.ts:{n}"],
  },
  {
    cwe: { id: "CWE-22", name: "Path Traversal" }, owasp: "A01:2021", sources: ["SAST", "DAST"],
    vectors: ["CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N", "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N"],
    locations: ["GET /download?arquivo=", "src/services/anexo.service.ts:{n}"],
  },
  {
    cwe: { id: "CWE-352", name: "Cross-Site Request Forgery (CSRF)" }, owasp: "A01:2021", sources: ["DAST"],
    vectors: ["CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:H/A:N", "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:L/A:N"],
    locations: ["POST /conta/email", "POST /configuracoes/senha"],
  },
  {
    cwe: { id: "CWE-798", name: "Use of Hard-coded Credentials" }, owasp: "A07:2021", sources: ["SAST"],
    vectors: ["CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", "CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N"],
    locations: ["config/database.ts:{n}", "src/integracoes/sms.client.ts:{n}", "android/app/src/main/res/values/strings.xml:{n}"],
  },
  {
    cwe: { id: "CWE-307", name: "Improper Restriction of Excessive Authentication Attempts" }, owasp: "A07:2021", sources: ["DAST"],
    vectors: ["CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N", "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N"],
    locations: ["POST /api/v1/auth/login", "POST /api/v1/auth/recuperar-senha"],
  },
  {
    cwe: { id: "CWE-327", name: "Use of a Broken or Risky Cryptographic Algorithm" }, owasp: "A02:2021", sources: ["SAST"],
    vectors: ["CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N", "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N"],
    locations: ["src/utils/hash.ts:{n}", "lib/token.dart:{n}"],
  },
  {
    cwe: { id: "CWE-918", name: "Server-Side Request Forgery (SSRF)" }, owasp: "A10:2021", sources: ["DAST", "SAST"],
    vectors: ["CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:N/A:N", "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:L/I:N/A:N"],
    locations: ["POST /api/v1/webhooks/testar", "src/services/preview-link.service.ts:{n}"],
  },
  {
    cwe: { id: "CWE-502", name: "Deserialization of Untrusted Data" }, owasp: "A08:2021", sources: ["SAST"],
    vectors: ["CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H"],
    locations: ["src/filas/consumidor.ts:{n}", "app/Jobs/ImportarPlanilha.php:{n}"],
  },
  {
    cwe: { id: "CWE-1104", name: "Use of Unmaintained Third Party Components" }, owasp: "A06:2021", sources: ["SCA"],
    vectors: ["CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:N/A:H", "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L"],
    locations: ["package-lock.json › lib-exemplo-a@1.{n}.0", "composer.lock › pacote-exemplo/b@2.{n}", "pubspec.lock › plugin_exemplo_c@0.{n}.1"],
  },
  {
    cwe: { id: "CWE-693", name: "Protection Mechanism Failure" }, owasp: "A05:2021", sources: ["DAST"],
    vectors: ["CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N", "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:L/A:N"],
    locations: ["GET / (sem Content-Security-Policy)", "GET /login (sem X-Frame-Options)"],
  },
  {
    cwe: { id: "CWE-532", name: "Insertion of Sensitive Information into Log File" }, owasp: "A09:2021", sources: ["SAST"],
    vectors: ["CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N", "CVSS:3.1/AV:L/AC:L/PR:H/UI:N/S:U/C:L/I:N/A:N"],
    locations: ["src/middlewares/logger.ts:{n}", "app/Http/Middleware/RegistrarRequisicao.php:{n}"],
  },
];

/** mulberry32: PRNG pequeno e determinístico, suficiente para dados de demonstração. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 86_400_000;
export const REFERENCE_DATE = Date.UTC(2026, 8, 30); // dados "congelados" em 30/09/2026

export function generateFindings(count = 240, seed = 2026): Finding[] {
  const r = rng(seed);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
  const out: Finding[] = [];

  for (let i = 1; i <= count; i++) {
    const t = pick(T);
    const vector = pick(t.vectors);
    const score = baseScore(vector);
    const detected = REFERENCE_DATE - Math.floor(r() * 180) * DAY - Math.floor(r() * DAY);
    const roll = r();
    const status: Status =
      roll < 0.42 ? "OPEN" : roll < 0.58 ? "IN_PROGRESS" : roll < 0.84 ? "FIXED" : roll < 0.93 ? "FALSE_POSITIVE" : "RISK_ACCEPTED";
    const changedAt = status === "OPEN" ? detected : Math.min(detected + Math.ceil(r() * 45) * DAY, REFERENCE_DATE);
    const history: StatusChange[] = [];
    if (status === "FIXED") {
      const mid = detected + Math.floor((changedAt - detected) / 2);
      history.push({ from: "OPEN", to: "IN_PROGRESS", at: new Date(mid).toISOString(), justification: null });
      history.push({ from: "IN_PROGRESS", to: "FIXED", at: new Date(changedAt).toISOString(), justification: null });
    } else if (status !== "OPEN") {
      const justification =
        status === "FALSE_POSITIVE" ? "Entrada já é validada antes de chegar neste ponto."
        : status === "RISK_ACCEPTED" ? "Sistema interno, sem exposição externa; correção planejada para o próximo trimestre."
        : null;
      history.push({ from: "OPEN", to: status, at: new Date(changedAt).toISOString(), justification });
    }

    out.push({
      id: `DEMO-2026-${String(i).padStart(4, "0")}`,
      cwe: t.cwe,
      owasp: t.owasp,
      source: pick(t.sources),
      severity: severityOf(score),
      cvssScore: score,
      cvssVector: vector,
      status,
      projectId: pick(PROJECTS).id,
      location: pick(t.locations).replace("{n}", String(10 + Math.floor(r() * 290))),
      detectedAt: new Date(detected).toISOString(),
      updatedAt: new Date(changedAt).toISOString(),
      history,
    });
  }
  return out;
}

export const OWASP_TOP10: Record<string, string> = {
  "A01:2021": "Broken Access Control",
  "A02:2021": "Cryptographic Failures",
  "A03:2021": "Injection",
  "A04:2021": "Insecure Design",
  "A05:2021": "Security Misconfiguration",
  "A06:2021": "Vulnerable and Outdated Components",
  "A07:2021": "Identification and Authentication Failures",
  "A08:2021": "Software and Data Integrity Failures",
  "A09:2021": "Security Logging and Monitoring Failures",
  "A10:2021": "Server-Side Request Forgery",
};

export const CWE_IDS = T.map((t) => t.cwe.id);
