import { lookup, read, type MachineState, type Program } from "../machine/machine";

/** Keep the row visible by scrolling only its scroll container (never the page). */
function scrollWithinContainer(row: HTMLTableRowElement | null) {
  const box = row?.closest(".table-scroll");
  if (!row || !(box instanceof HTMLElement)) return;
  const header = box.querySelector("thead")?.getBoundingClientRect().height ?? 0;
  const r = row.getBoundingClientRect();
  const b = box.getBoundingClientRect();
  const viewTop = b.top + box.clientTop + header;
  const viewBottom = b.top + box.clientTop + box.clientHeight;
  if (r.top < viewTop) box.scrollTop -= viewTop - r.top;
  else if (r.bottom > viewBottom) box.scrollTop += r.bottom - viewBottom;
}

export function TransitionTable({ program, machine }: { program: Program; machine: MachineState | null }) {
  const next = machine && machine.status === "running" ? lookup(program, machine.state, read(machine)) : undefined;

  return (
    <div className="table-scroll">
      <table className="transitions">
        <thead>
          <tr>
            <th>状態</th>
            <th>読む</th>
            <th>書く</th>
            <th>移動</th>
            <th>次の状態</th>
          </tr>
        </thead>
        <tbody>
          {program.transitions.map((t) => {
            const isNext = t === next;
            const isLast = t === machine?.lastTransition;
            return (
              <tr
                key={t.line}
                className={isNext ? "next" : isLast ? "last" : undefined}
                ref={isNext ? scrollWithinContainer : undefined}
              >
                <td>{t.state}</td>
                <td className="sym">{t.read}</td>
                <td className="sym">{t.write}</td>
                <td>{t.move}</td>
                <td>{t.next}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
