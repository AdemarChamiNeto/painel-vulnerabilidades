import { baseScore, parseVector, roundUp, severityOf } from "../src/domain/cvss";

describe("CVSS 3.1", () => {
  // valores conferidos na calculadora oficial do FIRST
  it.each([
    ["CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", 9.8],
    ["CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H", 10],
    ["CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N", 6.1],
    ["CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N", 6.5],
    ["CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:N/A:N", 7.7],
    ["CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N", 5.5],
    ["CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:H/A:N", 6.5],
    ["CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N", 0],
  ])("%s → %s", (v, score) => expect(baseScore(v)).toBe(score));

  it("roundUp evita erro de ponto flutuante", () => {
    expect(roundUp(4.00001)).toBe(4.1);
    expect(roundUp(4.000001)).toBe(4); // abaixo de 5 casas a spec considera igual
    expect(roundUp(4.0)).toBe(4);
    expect(roundUp(4.02)).toBe(4.1);
  });

  it("faixas de severidade", () => {
    expect([9, 8.9, 7, 6.9, 4, 3.9, 0.1, 0].map(severityOf)).toEqual(
      ["CRITICAL", "HIGH", "HIGH", "MEDIUM", "MEDIUM", "LOW", "LOW", "NONE"],
    );
  });

  it("rejeita vetor malformado", () => {
    expect(() => parseVector("CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H")).toThrow();
    expect(() => parseVector("CVSS:3.1/AV:X/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H")).toThrow();
    expect(() => parseVector("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H")).toThrow(/sem A/);
    expect(() => parseVector("CVSS:3.1/AV:N/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H")).toThrow();
  });
});
