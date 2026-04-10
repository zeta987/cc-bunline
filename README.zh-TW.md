# cc-bunline

[English](README.md) | **正體中文** | [简体中文](README.zh-CN.md)

Bun 專屬的 Claude Code 多行狀態列—在終端機中顯示模型資訊、費用、Token 用量、速率限制和 Git 狀態。

![Bun](https://img.shields.io/badge/runtime-Bun-f472b6) ![License](https://img.shields.io/badge/license-MIT-green)

## 功能展示

渲染四行 ANSI 狀態列：

1. **模型** —名稱、上下文用量進度條、Session ID
2. **費用** —本次費用、持續時間、快取 / 非快取 Token 明細
3. **速率限制** —5 小時與 7 天視窗，含重置倒計時
4. **Git** —儲存庫名稱、分支、工作區變更統計

![截圖](https://github.com/user-attachments/assets/766449ac-fe8c-459f-adbd-40a6dad02e66)

## 系統需求

- [Bun](https://bun.sh) >= 1.0.0

## 安裝

### 全域安裝（建議）

```sh
bun add -g cc-bunline
```

### 免安裝直接執行

```sh
bunx cc-bunline
```

### 手動下載

```sh
curl -o ~/.claude/statusline.mts https://raw.githubusercontent.com/zeta987/cc-bunline/main/statusline.mts
```

## 設定方式

在 Claude Code 設定檔（`~/.claude/settings.json`）中加入：

```json
{
  "statusLine": {
    "type": "command",
    "command": "cc-bunline"
  }
}
```

或使用 `bunx`（不需全域安裝）：

```json
{
  "statusLine": {
    "type": "command",
    "command": "bunx cc-bunline"
  }
}
```

若使用手動下載方式：

```json
{
  "statusLine": {
    "type": "command",
    "command": "bun ~/.claude/statusline.mts"
  }
}
```

### 運作原理

Claude Code 將 JSON 狀態物件透過 stdin 傳入，cc-bunline 解析後將 ANSI 格式化的多行文字輸出到 stdout。不需要設定檔—所有資料都由 Claude Code 提供的 JSON 輸入驅動。

## 授權條款

[MIT](./LICENSE)
