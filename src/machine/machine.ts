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

    const m = text.match(/^(.+?)\s*,\s*(\S)\s*->\s*(\S)\s*,\s*([LRS])\s*,\s*(.+)$/i);
    if (!m) {
      errors.push({ line: lineNo, message: "書式: 状態, 読む記号 -> 書く記号, L|R|S, 次の状態" });
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

export function read(m: MachineState, pos: number = m.head): string {
  return m.tape.get(pos) ?? BLANK;
}

/** Returns a new state (the input is not mutated). */
export function step(program: Program, m: MachineState): MachineState {
  if (m.status !== "running") return m;
  const t = program.table.get(key(m.state, read(m)));
  if (!t) return { ...m, status: "stuck", lastTransition: null };

  const tape = new Map(m.tape);
  if (t.write === BLANK) tape.delete(m.head);
  else tape.set(m.head, t.write);
  const head = m.head + (t.move === "L" ? -1 : t.move === "R" ? 1 : 0);

  return {
    tape,
    head,
    state: t.next,
    steps: m.steps + 1,
    status: program.halt.has(t.next) ? "halted" : "running",
    lastTransition: t,
  };
}

export function run(program: Program, input: string, maxSteps = 1_000_000): MachineState {
  let m = createMachine(program, input);
  while (m.status === "running" && m.steps < maxSteps) m = step(program, m);
  return m;
}

/** Non-blank tape content from leftmost to rightmost written cell. */
export function tapeContent(m: MachineState): string {
  if (m.tape.size === 0) return "";
  const positions = [...m.tape.keys()];
  const lo = Math.min(...positions);
  const hi = Math.max(...positions);
  let s = "";
  for (let i = lo; i <= hi; i++) s += read(m, i);
  return s;
}
