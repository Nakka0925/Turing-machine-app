# Turing-machine-app

ブラウザで動くチューリングマシン シミュレータ（Vite + React + TypeScript）。題材は進数変換。

## コマンド
- `npm run dev` — 開発サーバ (http://localhost:5173)
- `npm test` — Vitest（エンジンと全プリセットの正しさを検証）
- `npm run typecheck` / `npm run build`

## 構成
- `src/machine/machine.ts` — パーサと実行エンジン（UI 非依存の純粋関数）
- `src/machine/presets.ts` — プリセットのプログラム。各プリセットに `expected()`（JS で計算した期待値）を持たせる
- `src/useMachine.ts` — ステップ実行・自動実行のフック
- `src/components/` — テープ表示、遷移表

## ルール
- プリセットを追加・変更したら `machine.test.ts` に多数の入力で期待値と照合するテストを追加する
- 完了条件: `npm run typecheck` と `npm test` が通り、ブラウザで実際に動作確認できていること
