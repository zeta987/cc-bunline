# cc-bunline

**English** | [正體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md)

A multi-line Claude Code statusline powered by Bun. It renders model information, session costs, token usage, rate limits, and Git status directly in your terminal.

![Bun](https://img.shields.io/badge/runtime-Bun-f472b6) ![License](https://img.shields.io/badge/license-MIT-green)

## Features

Renders a rich, four-line ANSI statusline for Claude Code:

1. **Model** — Name, context usage progress bar, and session ID.
2. **Cost** — Session cost, duration, and cached/uncached token breakdown.
3. **Rate Limits** — 5-hour and 7-day windows with reset timers.
4. **Git** — Repository name, branch, and working tree change statistics.

![screenshot](https://raw.githubusercontent.com/zeta987/cc-bunline/main/assets/screenshot-en.jpg)

## Requirements

- [Bun](https://bun.sh) >= 1.0.0

## Installation

### Global Install (Recommended)

```sh
bun add -g cc-bunline
```

### Run Without Installing

```sh
bunx cc-bunline
```

### Manual Download

```sh
curl -o ~/.claude/statusline.mts https://raw.githubusercontent.com/zeta987/cc-bunline/main/statusline.mts
```

## Usage

Add the following to your Claude Code settings file (`~/.claude/settings.json`):

```json
{
  "statusLine": {
    "type": "command",
    "command": "cc-bunline"
  }
}
```

Or, to use `bunx` without a global installation:

```json
{
  "statusLine": {
    "type": "command",
    "command": "bunx cc-bunline"
  }
}
```

If you downloaded the file manually:

```json
{
  "statusLine": {
    "type": "command",
    "command": "bun ~/.claude/statusline.mts"
  }
}
```

### How It Works

Claude Code pipes a JSON status object to the command's `stdin`. `cc-bunline` parses it and writes ANSI-formatted lines to `stdout`. No configuration files are needed—everything is driven dynamically by the JSON input from Claude Code.

## License

[MIT](./LICENSE)
