# cc-bunline

[English](README.md) | [繁体中文](README.zh-TW.md) | **简体中文**

Bun 专用的 Claude Code 多行状态栏 —— 在终端底部实时显示模型信息、费用统计、Token 用量、速率限制及 Git 状态。

![Bun](https://img.shields.io/badge/runtime-Bun-f472b6) ![License](https://img.shields.io/badge/license-MIT-green)

## 功能特性

在终端底部输出四行 ANSI 状态栏：

1. **模型信息** —— 模型名称、上下文长度进度条、Session ID
2. **费用统计** —— 当前会话费用、运行时长、缓存/非缓存 Token 明细
3. **速率限制** —— 5 小时与 7 天窗口限制，含重置倒计时
4. **Git 状态** —— 仓库名称、当前分支、工作区变更统计

![截图](https://github.com/user-attachments/assets/766449ac-fe8c-459f-adbd-40a6dad02e66)

## 环境要求

- [Bun](https://bun.sh) >= 1.0.0

## 安装

### 全局安装（推荐）

```bash
bun add -g cc-bunline
```

### 无需安装，直接运行

```bash
bunx cc-bunline
```

### 手动下载

```bash
curl -o ~/.claude/statusline.mts https://raw.githubusercontent.com/zeta987/cc-bunline/main/statusline.mts
```

## 配置方法

编辑 Claude Code 配置文件（`~/.claude/settings.json`），添加如下配置：

```json
{
  "statusLine": {
    "type": "command",
    "command": "cc-bunline"
  }
}
```

或使用 `bunx`（无需全局安装）：

```json
{
  "statusLine": {
    "type": "command",
    "command": "bunx cc-bunline"
  }
}
```

若使用手动下载方式：

```json
{
  "statusLine": {
    "type": "command",
    "command": "bun ~/.claude/statusline.mts"
  }
}
```

### 实现原理

Claude Code 通过 stdin 传入 JSON 格式的状态对象，cc-bunline 解析后，将 ANSI 格式化的多行文本输出至 stdout。无需额外配置文件，所有数据均来自 Claude Code 提供的实时 JSON 输入。

## License

[MIT](./LICENSE)
