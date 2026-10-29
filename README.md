# boothrink

安藤ゼミ（たこ焼き）と林ゼミ（唐揚げ）が、お互いのお客さんに特典チケットを渡し合うためのWebアプリ。
仕様と開発ルールは [CLAUDE.md](./CLAUDE.md) を参照。

## 開発の始め方

```bash
nvm use            # .nvmrc の Node.js 22 を使う
npm ci             # package-lock.json の通りに依存を入れる
cp .env.example .env.local   # 環境変数を設定（Redisを使うステップから必要）
npm run dev        # http://localhost:3000
```

## コマンド

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー |
| `npm run lint` | ESLint |
| `npm run typecheck` | ルートの型を生成してから `tsc --noEmit` |
| `npm test` | Vitest（1回だけ実行） |
| `npm run test:watch` | Vitest（ファイル変更を監視） |
| `npm run build` | 本番ビルド |

## テスト

テストは本物の Redis を使う（同時アクセスで二重発行されないことを、Redis 本体の動きで確かめるため）。
`npm test` の前に、手元で redis-server を起動しておく。

```bash
docker run --rm -p 6379:6379 redis:7   # または brew install redis && redis-server
```

- テストは15番のDB（`redis://127.0.0.1:6379/15`）を使い、各テストの前に中身を消す。別のRedisを使うときは `TEST_REDIS_URL` を指定する
- アプリは `@upstash/redis`（HTTPで通信）を使うので、テスト中は `test/upstash-rest-shim.ts` が HTTP を受けて本物の Redis に中継する

PRを出すと、GitHub Actions で lint → 型チェック → テスト → ビルド が順に実行される。
