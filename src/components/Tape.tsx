import { BLANK, read, type MachineState } from "../machine/machine";

const RADIUS = 9;

export function Tape({ machine }: { machine: MachineState }) {
  const cells = [];
  for (let pos = machine.head - RADIUS; pos <= machine.head + RADIUS; pos++) {
    const symbol = read(machine, pos);
    const isHead = pos === machine.head;
    cells.push(
      <div key={pos} className={`cell${isHead ? " head" : ""}${symbol === BLANK ? " blank" : ""}`}>
        <span className="symbol">{symbol === BLANK ? "" : symbol}</span>
        <span className="pos">{pos}</span>
      </div>,
    );
  }
  return (
    <div className="tape-wrap" aria-label="テープ">
      <div className="head-marker">
        <span className="state-badge">{machine.state}</span>
        <span className="arrow">▼</span>
      </div>
      <div className="tape">{cells}</div>
    </div>
  );
}
