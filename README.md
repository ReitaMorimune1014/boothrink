# boothrink

安藤ゼミ（たこ焼き）と林ゼミ（唐揚げ）が、お互いのお客さんに特典チケットを渡し合うためのWebアプリ。
仕様と開発ルールは [CLAUDE.md](./CLAUDE.md)、当日の動かし方は [docs/operations.md](./docs/operations.md) を参照。

## 画面

| URL | 使う人 |
|---|---|
| `/tablet/ando`, `/tablet/hayashi` | 店のタブレット（QRを表示する。要パスワード） |
| `/c/{token}` | お客さん（QRを読み込むと開く） |
| `/t/{id}` | お客さん（チケット） |
| `/admin` | 責任者（発行数・使用数、受付停止。要パスワード） |

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
| `npm run load-test` | 400人ぶんの負荷テスト（`BASE_URL` と `STAFF_PASSWORD` を指定。[docs/operations.md](./docs/operations.md) の 1-2） |
| `npm run local-redis` | Upstash の代わりに手元の redis-server を使う（下の「Upstash なしで動かす」） |

## Upstash なしで動かす

Upstash のアカウントがなくても、手元の redis-server で画面を触れる。

```bash
docker run --rm -p 6379:6379 redis:7   # 1つ目のターミナル
npm run local-redis                    # 2つ目のターミナル。表示された2行を .env.local に書く
npm run dev                            # 3つ目のターミナル
```

`.env.local` には `STAFF_PASSWORD` も書いておく。`http://localhost:3000/tablet/ando` と `http://localhost:3000/admin` が開ける。

## テスト

テストは本物の Redis を使う（同時アクセスで二重発行されないことを、Redis 本体の動きで確かめるため）。
`npm test` の前に、手元で redis-server を起動しておく。

```bash
docker run --rm -p 6379:6379 redis:7   # または brew install redis && redis-server
```

- テストは15番のDB（`redis://127.0.0.1:6379/15`）を使い、各テストの前に中身を消す。別のRedisを使うときは `TEST_REDIS_URL` を指定する
- アプリは `@upstash/redis`（HTTPで通信）を使うので、テスト中は `test/upstash-rest-shim.ts` が HTTP を受けて本物の Redis に中継する

PRを出すと、GitHub Actions で lint → 型チェック → テスト → ビルド が順に実行される。
