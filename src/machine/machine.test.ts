import { describe, expect, it } from "vitest";
import { parseProgram, run, tapeContent } from "./machine";
import { PRESETS } from "./presets";

function load(id: string) {
  const preset = PRESETS.find((p) => p.id === id)!;
  const { program, errors } = parseProgram(preset.source);
  expect(errors).toEqual([]);
  return program!;
}

function exec(id: string, input: string) {
  const m = run(load(id), input);
  expect(m.status).toBe("halted");
  return tapeContent(m);
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

describe("parseProgram", () => {
  it("parses directives, comments and transitions", () => {
    const { program, errors } = parseProgram("start: a\nhalt: h, x\n// c\na, 1 -> 0, r, h  // note");
    expect(errors).toEqual([]);
    expect(program!.start).toBe("a");
    expect([...program!.halt]).toEqual(["h", "x"]);
    expect(program!.transitions[0]).toMatchObject({ state: "a", read: "1", write: "0", move: "R", next: "h", line: 4 });
  });

  it("reports malformed and duplicate lines", () => {
    const { program, errors } = parseProgram("a, 1 -> 0, R, b\noops\na, 1 -> 1, L, c");
    expect(program).toBeNull();
    expect(errors.map((e) => e.line)).toEqual([2, 3]);
  });

  it("gets stuck when no transition matches", () => {
    const { program } = parseProgram("a, 1 -> 1, R, a");
    expect(run(program!, "11").status).toBe("stuck");
  });
});

describe("presets", () => {
  it("all presets parse", () => {
    for (const p of PRESETS) expect(parseProgram(p.source).errors, p.id).toEqual([]);
  });

  it("binary +1", () => {
    for (const n of range(70)) expect(exec("bin-inc", n.toString(2))).toBe((n + 1).toString(2));
  });

  it("binary → unary", () => {
    for (const n of range(40)) expect(exec("bin-to-unary", n.toString(2))).toBe("1".repeat(n));
  });

  it("unary → binary", () => {
    for (const n of range(40).slice(1)) expect(exec("unary-to-bin", "1".repeat(n))).toBe(n.toString(2));
  });

  it("decimal → binary", () => {
    for (const n of [...range(130), 255, 256, 999, 1000]) expect(exec("dec-to-bin", String(n))).toBe(n.toString(2));
  });

  it("binary → decimal", () => {
    for (const n of [...range(130), 255, 256, 999, 1000]) expect(exec("bin-to-dec", n.toString(2))).toBe(String(n));
  });

  it("handles leading zeros", () => {
    expect(exec("dec-to-bin", "007")).toBe("111");
    expect(exec("bin-to-dec", "00101")).toBe("5");
  });
});
