import { useCallback, useEffect, useRef, useState } from "react";
import { advance, createMachine, type MachineState, type Program } from "./machine/machine";

export const MAX_STEPS = 1_000_000;
/** Steps per chunk in "run to end" mode; small enough to keep each frame responsive. */
const TURBO_CHUNK = 20_000;

type Mode = "idle" | "playing" | "turbo";

/**
 * Drives a machine: single-step, auto-run at a given speed, or run to completion.
 * "Run to end" proceeds in chunks between frames so the UI stays responsive and it can be paused.
 */
export function useMachine(program: Program | null, input: string, stepsPerSecond: number) {
  const [machine, setMachineState] = useState<MachineState | null>(() => (program ? createMachine(program, input) : null));
  const [mode, setMode] = useState<Mode>("idle");
  const machineRef = useRef(machine);
  const programRef = useRef(program);
  programRef.current = program;

  const setMachine = useCallback((m: MachineState | null) => {
    machineRef.current = m;
    setMachineState(m);
  }, []);

  const reset = useCallback(() => {
    setMode("idle");
    setMachine(program ? createMachine(program, input) : null);
  }, [program, input, setMachine]);

  useEffect(reset, [reset]);

  const stepBy = useCallback(
    (n: number) => {
      const p = programRef.current;
      const m = machineRef.current;
      if (!p || !m) return;
      const next = advance(p, m, Math.min(n, MAX_STEPS - m.steps));
      if (next !== m) setMachine(next);
    },
    [setMachine],
  );

  useEffect(() => {
    if (mode === "playing") {
      // Cap the timer at ~60fps and take several steps per tick at high speeds.
      const interval = Math.max(1000 / stepsPerSecond, 16);
      const perTick = Math.max(1, Math.round((stepsPerSecond * interval) / 1000));
      const id = setInterval(() => stepBy(perTick), interval);
      return () => clearInterval(id);
    }
    if (mode === "turbo") {
      let id = 0;
      const tick = () => {
        stepBy(TURBO_CHUNK);
        id = window.setTimeout(tick, 0);
      };
      id = window.setTimeout(tick, 0);
      return () => clearTimeout(id);
    }
  }, [mode, stepsPerSecond, stepBy]);

  const done = !machine || machine.status !== "running" || machine.steps >= MAX_STEPS;
  useEffect(() => {
    if (done) setMode("idle");
  }, [done]);

  return {
    machine,
    /** True while auto-running or running to end. */
    running: mode !== "idle",
    turbo: mode === "turbo",
    done,
    reset,
    stepOnce: () => stepBy(1),
    toggle: () => setMode((m) => (m === "idle" && !done ? "playing" : "idle")),
    runToEnd: () => {
      if (!done) setMode("turbo");
    },
  };
}
