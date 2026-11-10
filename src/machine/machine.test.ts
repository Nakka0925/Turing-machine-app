import { describe, expect, it } from "vitest";
import { advance, createMachine, parseProgram, run, step, tapeContent } from "./machine";
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

  it("rejects trailing junk and commas in state names", () => {
    for (const line of ["a, 1 -> 0, R, b, c", "a, 1 -> 0, R, b c", "a b, 1 -> 0, R, c"]) {
      const { program, errors } = parseProgram(line);
      expect(program, line).toBeNull();
      expect(errors[0].line).toBe(1);
    }
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

describe("engine", () => {
  it("advance(n) matches n single steps", () => {
    const program = load("dec-to-bin");
    let a = createMachine(program, "57");
    let b = a;
    for (let i = 0; i < 300; i++) a = step(program, a);
    b = advance(program, b, 300);
    expect(b.steps).toBe(a.steps);
    expect(b.head).toBe(a.head);
    expect(b.state).toBe(a.state);
    expect(b.status).toBe(a.status);
    expect(tapeContent(b)).toBe(tapeContent(a));
  });

  it("does not mutate the input state", () => {
    const program = load("bin-inc");
    const m = createMachine(program, "101");
    advance(program, m, 100);
    expect(m.steps).toBe(0);
    expect(tapeContent(m)).toBe("101");
  });

  it("handles a tape of a million cells quickly without overflowing the stack", () => {
    const { program } = parseProgram("a, _ -> 1, R, a");
    const started = performance.now();
    const m = run(program!, "", 1_000_000);
    expect(m.status).toBe("running");
    expect(m.tape.size).toBe(1_000_000);
    expect(tapeContent(m)).toHaveLength(1_000_000);
    expect(performance.now() - started).toBeLessThan(5_000);
  });
});

// Inputs per preset, including leading zeros, to check preset.expected() (what the UI compares against).
const INPUTS: Record<string, string[]> = {
  "bin-inc": [...range(70).map((n) => n.toString(2)), "0", "00", "0011", "0111", "000"],
  "bin-to-unary": [...range(40).map((n) => n.toString(2)), "00", "0011"],
  "unary-to-bin": range(40).slice(1).map((n) => "1".repeat(n)),
  "dec-to-bin": [...range(130).map(String), "00", "007", "0100"],
  "bin-to-dec": [...range(130).map((n) => n.toString(2)), "00", "00101"],
};

describe("preset.expected() agrees with the machine", () => {
  it("covers every preset", () => {
    expect(Object.keys(INPUTS).sort()).toEqual(PRESETS.map((p) => p.id).sort());
  });

  for (const preset of PRESETS) {
    it(preset.id, () => {
      for (const input of [preset.sampleInput, ...(INPUTS[preset.id] ?? [])]) {
        expect(preset.inputPattern.test(input), input).toBe(true);
        expect(exec(preset.id, input), input).toBe(preset.expected(input));
      }
    });
  }
});
