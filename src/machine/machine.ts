export const BLANK = "_";

export type Move = "L" | "R" | "S";

export interface Transition {
  state: string;
  read: string;
  write: string;
  move: Move;
  next: string;
  /** 1-indexed line in the source program, for highlighting. */
  line: number;
}

export interface Program {
  start: string;
  halt: Set<string>;
  /** key: `${state}\u0000${read}` */
  table: Map<string, Transition>;
  transitions: Transition[];
}

export interface ParseError {
  line: number;
  message: string;
}

export type MachineStatus = "running" | "halted" | "stuck";

export interface MachineState {
  tape: Map<number, string>;
  head: number;
  state: string;
  steps: number;
  status: MachineStatus;
  lastTransition: Transition | null;
}

const key = (state: string, read: string) => `${state}\u0000${read}`;

/**
 * Program format (one item per line, `//` starts a comment):
 *
 *   start: q0
 *   halt: done, reject
 *   q0, 1 -> 0, R, q1
 *
 * Symbols are single characters; `_` is the blank.
 */
export function parseProgram(source: string): { program: Program | null; errors: ParseError[] } {
  const errors: ParseError[] = [];
  const transitions: Transition[] = [];
  const table = new Map<string, Transition>();
  let start: string | null = null;
  const halt = new Set<string>();

  source.split("\n").forEach((raw, i) => {
    const lineNo = i + 1;
    const text = raw.replace(/\/\/.*$/, "").trim();
    if (!text) return;

    const directive = text.match(/^(start|halt)\s*:\s*(.+)$/i);
    if (directive) {
      const values = directive[2].split(",").map((s) => s.trim()).filter(Boolean);
      if (directive[1].toLowerCase() === "start") {
        if (values.length !== 1) errors.push({ line: lineNo, message: "start には状態を1つだけ指定してください" });
        else start = values[0];
      } else {
        values.forEach((v) => halt.add(v));
      }
      return;
    }

    const m = text.match(/^([^\s,]+)\s*,\s*(\S)\s*->\s*(\S)\s*,\s*([LRS])\s*,\s*([^\s,]+)$/i);
    if (!m) {
      errors.push({ line: lineNo, message: "書式: 状態, 読む記号 -> 書く記号, L|R|S, 次の状態（状態名に空白やカンマは使えません）" });
      return;
    }
    const t: Transition = {
      state: m[1].trim(),
      read: m[2],
      write: m[3],
      move: m[4].toUpperCase() as Move,
      next: m[5].trim(),
      line: lineNo,
    };
    const k = key(t.state, t.read);
    const dup = table.get(k);
    if (dup) {
      errors.push({ line: lineNo, message: `(${t.state}, ${t.read}) の遷移が ${dup.line} 行目と重複しています` });
      return;
    }
    table.set(k, t);
    transitions.push(t);
  });

  if (start === null) {
    if (transitions.length > 0) start = transitions[0].state;
    else errors.push({ line: 0, message: "遷移が1つもありません" });
  }
  if (halt.size === 0) halt.add("halt");

  if (errors.length > 0 || start === null) return { program: null, errors };
  return { program: { start, halt, table, transitions }, errors };
}

export function createMachine(program: Program, input: string): MachineState {
  const tape = new Map<number, string>();
  [...input].forEach((ch, i) => {
    if (ch !== BLANK) tape.set(i, ch);
  });
  return {
    tape,
    head: 0,
    state: program.start,
    steps: 0,
    status: program.halt.has(program.start) ? "halted" : "running",
    lastTransition: null,
  };
}

/** The transition that applies to (state, symbol), if any. */
export function lookup(program: Program, state: string, symbol: string): Transition | undefined {
  return program.table.get(key(state, symbol));
}

export function read(m: MachineState, pos: number = m.head): string {
  return m.tape.get(pos) ?? BLANK;
}

/**
 * Runs up to `n` steps and returns a new state (the input is not mutated).
 * The tape is copied once per call, so cost is O(tape + n), not O(tape × n).
 */
export function advance(program: Program, m: MachineState, n: number): MachineState {
  if (m.status !== "running" || n <= 0) return m;
  const tape = new Map(m.tape);
  let { head, state, steps } = m;
  let status: MachineStatus = "running";
  let lastTransition = m.lastTransition;

  for (let i = 0; i < n; i++) {
    const t = program.table.get(key(state, tape.get(head) ?? BLANK));
    if (!t) {
      status = "stuck";
      lastTransition = null;
      break;
    }
    if (t.write === BLANK) tape.delete(head);
    else tape.set(head, t.write);
    head += t.move === "L" ? -1 : t.move === "R" ? 1 : 0;
    state = t.next;
    steps++;
    lastTransition = t;
    if (program.halt.has(state)) {
      status = "halted";
      break;
    }
  }
  return { tape, head, state, steps, status, lastTransition };
}

export function step(program: Program, m: MachineState): MachineState {
  return advance(program, m, 1);
}

export function run(program: Program, input: string, maxSteps = 1_000_000): MachineState {
  const m = createMachine(program, input);
  return advance(program, m, maxSteps - m.steps);
}

/** Non-blank tape content from leftmost to rightmost written cell. */
export function tapeContent(m: MachineState): string {
  if (m.tape.size === 0) return "";
  let lo = Infinity;
  let hi = -Infinity;
  for (const pos of m.tape.keys()) {
    if (pos < lo) lo = pos;
    if (pos > hi) hi = pos;
  }
  let s = "";
  for (let i = lo; i <= hi; i++) s += read(m, i);
  return s;
}
