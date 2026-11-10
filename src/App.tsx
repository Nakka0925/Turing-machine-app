import { useMemo, useState } from "react";
import { parseProgram, tapeContent } from "./machine/machine";
import { PRESETS } from "./machine/presets";
import { MAX_STEPS, useMachine } from "./useMachine";
import { Tape } from "./components/Tape";
import { TransitionTable } from "./components/TransitionTable";

const CUSTOM = "custom";

export default function App() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const preset = PRESETS.find((p) => p.id === presetId);
  const [source, setSource] = useState(PRESETS[0].source);
  const [input, setInput] = useState(PRESETS[0].sampleInput);
  const [speed, setSpeed] = useState(10);

  const { program, errors } = useMemo(() => parseProgram(source), [source]);
  const { machine, playing, done, reset, stepOnce, toggle, runToEnd } = useMachine(program, input, speed);

  const choosePreset = (id: string) => {
    setPresetId(id);
    const p = PRESETS.find((x) => x.id === id);
    if (p) {
      setSource(p.source);
      setInput(p.sampleInput);
    }
  };

  const editSource = (text: string) => {
    setSource(text);
    if (preset && text !== preset.source) setPresetId(CUSTOM);
  };

  const inputError = preset && input && !preset.inputPattern.test(input) ? `入力は ${preset.inputHint} にしてください` : null;
  const output = machine ? tapeContent(machine) : "";
  const expected = useMemo(() => {
    if (!preset || inputError || !input) return null;
    try {
      return preset.expected(input);
    } catch {
      return null;
    }
  }, [preset, inputError, input]);

  return (
    <div className="app">
      <header>
        <h1>チューリングマシン シミュレータ</h1>
        <p className="lead">遷移表に従ってヘッドがテープを読み書きする様子を、1ステップずつ観察できます。</p>
      </header>

      <section className="panel controls-panel">
        <div className="field">
          <label htmlFor="preset">プログラム</label>
          <select id="preset" value={presetId} onChange={(e) => choosePreset(e.target.value)}>
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value={CUSTOM}>カスタム（編集中）</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="input">入力</label>
          <input
            id="input"
            value={input}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => setInput(e.target.value.trim())}
            aria-invalid={!!inputError}
          />
        </div>
        {preset && <p className="description">{preset.description}</p>}
        {inputError && <p className="error">{inputError}</p>}
      </section>

      <section className="panel">
        {machine ? <Tape machine={machine} /> : <p className="muted">プログラムにエラーがあります</p>}

        <div className="buttons">
          <button onClick={reset}>⟲ リセット</button>
          <button onClick={stepOnce} disabled={done || playing}>
            1ステップ
          </button>
          <button className="primary" onClick={toggle} disabled={done}>
            {playing ? "❚❚ 一時停止" : "▶ 実行"}
          </button>
          <button onClick={runToEnd} disabled={done}>
            ⏭ 最後まで
          </button>
          <label className="speed">
            速度
            <input type="range" min={0} max={3} step={0.1} value={Math.log10(speed)} onChange={(e) => setSpeed(Math.round(10 ** Number(e.target.value)))} />
            <span>{speed} 歩/秒</span>
          </label>
        </div>

        {machine && (
          <dl className="stats">
            <div>
              <dt>状態</dt>
              <dd>{machine.state}</dd>
            </div>
            <div>
              <dt>ステップ数</dt>
              <dd>{machine.steps.toLocaleString()}</dd>
            </div>
            <div>
              <dt>ステータス</dt>
              <dd className={`status ${machine.status}`}>
                {machine.status === "halted"
                  ? "停止（受理）"
                  : machine.status === "stuck"
                    ? "停止（該当する遷移なし）"
                    : machine.steps >= MAX_STEPS
                      ? "ステップ上限に到達"
                      : "実行中"}
              </dd>
            </div>
          </dl>
        )}

        {machine?.status === "halted" && (
          <div className="result">
            <div>
              <span className="label">出力</span>
              <code>{output || "（空）"}</code>
            </div>
            {expected !== null && (
              <div>
                <span className="label">期待値</span>
                <code>{expected || "（空）"}</code>
                <span className={output === expected ? "ok" : "ng"}>{output === expected ? "✓ 一致" : "✗ 不一致"}</span>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="grid">
        <section className="panel">
          <h2>遷移表</h2>
          {program ? <TransitionTable program={program} machine={machine} /> : <p className="muted">—</p>}
          <p className="legend">
            <span className="swatch next" /> 次に使う遷移 <span className="swatch last" /> 直前に使った遷移
          </p>
        </section>

        <section className="panel">
          <h2>プログラム編集</h2>
          <textarea value={source} onChange={(e) => editSource(e.target.value)} spellCheck={false} aria-label="プログラム" />
          {errors.length > 0 && (
            <ul className="errors">
              {errors.map((e, i) => (
                <li key={i}>
                  {e.line > 0 && `${e.line} 行目: `}
                  {e.message}
                </li>
              ))}
            </ul>
          )}
          <p className="legend">
            書式: <code>状態, 読む -&gt; 書く, L|R|S, 次の状態</code>　<code>_</code> は空白、<code>//</code> 以降はコメント
          </p>
        </section>
      </div>
    </div>
  );
}
