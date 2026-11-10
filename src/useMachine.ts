import { useCallback, useEffect, useRef, useState } from "react";
import { createMachine, step, type MachineState, type Program } from "./machine/machine";

export const MAX_STEPS = 1_000_000;

/** Drives a machine: single-step, auto-run at a given speed, or run to completion. */
export function useMachine(program: Program | null, input: string, stepsPerSecond: number) {
  const [machine, setMachine] = useState<MachineState | null>(() => (program ? createMachine(program, input) : null));
  const [playing, setPlaying] = useState(false);
  const programRef = useRef(program);
  programRef.current = program;

  const reset = useCallback(() => {
    setPlaying(false);
    setMachine(program ? createMachine(program, input) : null);
  }, [program, input]);

  useEffect(reset, [reset]);

  const advance = useCallback((n: number) => {
    const p = programRef.current;
    if (!p) return;
    setMachine((m) => {
      if (!m) return m;
      let cur = m;
      for (let i = 0; i < n && cur.status === "running" && cur.steps < MAX_STEPS; i++) cur = step(p, cur);
      return cur;
    });
  }, []);

  useEffect(() => {
    if (!playing) return;
    // Cap the timer at ~60fps and take several steps per tick at high speeds.
    const interval = Math.max(1000 / stepsPerSecond, 16);
    const perTick = Math.max(1, Math.round((stepsPerSecond * interval) / 1000));
    const id = setInterval(() => advance(perTick), interval);
    return () => clearInterval(id);
  }, [playing, stepsPerSecond, advance]);

  const done = !machine || machine.status !== "running" || machine.steps >= MAX_STEPS;
  useEffect(() => {
    if (done) setPlaying(false);
  }, [done]);

  return {
    machine,
    playing,
    done,
    reset,
    stepOnce: () => advance(1),
    toggle: () => setPlaying((p) => !p && !done),
    runToEnd: () => {
      setPlaying(false);
      advance(MAX_STEPS);
    },
  };
}
