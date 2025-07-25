# E2Eテスト設定

## セットアップ

Playwright MCP サーバーとE2Eテスト環境が設定済みです。

### 利用可能なコマンド

```bash
# E2Eテストを実行
npm run test:e2e

# UIモードでテストを実行
npm run test:e2e:ui

# ヘッド付きモードでテストを実行（ブラウザを表示）
npm run test:e2e:headed
```

## テスト実行前の準備

1. 開発サーバーを起動：
```bash
npm run dev
```

2. 別のターミナルでE2Eテストを実行：
```bash
npm run test:e2e
```

## テストファイル

- `e2e/basic.spec.ts` - 基本的な接続テスト
- `e2e/home.spec.ts` - ホームページのテスト
- `e2e/projects.spec.ts` - プロジェクト機能のテスト

## Playwright MCP

Claude Code用にPlaywright MCPサーバーが設定されており、E2Eテストの作成や実行をClaude経由で行うことができます。

## 設定ファイル

- `playwright.config.ts` - Playwrightの設定
- 対象ブラウザ: Chromium, Firefox, WebKit
- ベースURL: http://localhost:3005

## 注意事項

- テスト実行前に開発サーバーが起動していることを確認してください
- CIではwebServerが自動起動するように設定されています