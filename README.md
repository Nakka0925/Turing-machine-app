# Turing-machine-app

チューリングマシンの動きを1ステップずつ観察できるシミュレータです。進数変換のプログラムをプリセットとして収録しています。

**公開URL**: https://nakka0925.github.io/Turing-machine-app/

## プリセット
- 10進 → 2進 / 2進 → 10進
- 2進 → 1進 / 1進 → 2進
- 2進数 +1

遷移表はアプリ上で編集でき、独自のプログラムも実行できます。

```
start: q0
halt: done
// 状態, 読む -> 書く, L|R|S, 次の状態   (_ は空白)
q0, 1 -> 0, R, q1
```

## 開発
```sh
npm install
npm run dev     # http://localhost:5173
npm test
```

## デプロイ
`main` に push すると GitHub Actions（`.github/workflows/deploy.yml`）が型チェック・テスト・ビルドを行い、成功したときだけ GitHub Pages に公開します。

- 初回のみ: リポジトリの Settings → Pages → Build and deployment の Source を「GitHub Actions」にしておく（未設定だとワークフローが失敗します）
- Node のバージョンは `.nvmrc` で指定しています（CI も同じファイルを参照）
- `npm run preview` で確認するときは http://localhost:4173/Turing-machine-app/ を開いてください
