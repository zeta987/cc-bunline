#!/usr/bin/env bun
// Ambient runtime declarations. Bun provides these at runtime; keeping them
// inline (rather than importing from `node:*`) means this file type-checks
// in any IDE without pulling in `@types/node`, matching the original pattern
// the author already used for `Bun.spawnSync` and `process.env`.

interface BunFile {
  exists(): Promise<boolean>;
  text(): Promise<string>;
}

interface BunCryptoHasher {
  update(data: string): BunCryptoHasher;
  digest(encoding: "hex"): string;
}

declare const Bun: {
  spawnSync(
    cmd: string[],
    opts: { stdout: "pipe"; stderr: "pipe" },
  ): { exitCode: number; stdout: { toString(): string } };
  stdin: { text(): Promise<string> };
  file(path: string): BunFile;
  write(path: string, data: string): Promise<number>;
  CryptoHasher: new (algorithm: "sha1") => BunCryptoHasher;
};
declare const process: {
  env: Record<string, string | undefined>;
  stdout: { write(s: string): void };
  stderr: { columns?: number };
  platform: string;
};

/**
 * Claude Code status line
 * Line 0: Opus 4.6 (1M context)]  [♥ ♥ ♥ ♥ ♥ 39.9K/1M] 4.0%  🆔 abcd1234
 * Line 1: 💰 $0.00     ⏱️  1m 15s     ⚡ Cached: 0     📝 Uncached: 39.7K
 * Line 2: 🕐 5h 9% (resets in 1h 22m)       📅 7d 35% (resets in 31h 22m)
 * Line 3: [Abcdef]  🌿 dasdsaasddasdsaasddasdsaasddasds... ~2files(+2 -2)
 */

interface ContextUsage {
  input_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  output_tokens: number;
}

interface ContextWindow {
  used_percentage: number | null;
  remaining_percentage: number | null;
  context_window_size: number;
  current_usage: ContextUsage | null;
  total_input_tokens: number;
  total_output_tokens: number;
}

interface ModelInfo {
  display_name: string;
  id: string;
}

interface CostInfo {
  total_cost_usd: number;
  total_duration_ms: number;
  total_api_duration_ms: number;
  total_lines_added: number;
  total_lines_removed: number;
}

interface WorkspaceInfo {
  current_dir: string;
  project_dir: string;
}

interface VimInfo {
  mode: string;
}

interface AgentInfo {
  name: string;
}

interface WorktreeInfo {
  name: string;
  path: string;
  branch?: string;
  original_cwd: string;
  original_branch?: string;
}

interface RateLimitWindow {
  used_percentage: number;
  resets_at: number;
}

interface RateLimits {
  five_hour?: RateLimitWindow;
  seven_day?: RateLimitWindow;
}

interface StatusInput {
  cwd: string;
  session_id: string;
  transcript_path: string;
  version: string;
  model: ModelInfo;
  workspace: WorkspaceInfo;
  cost: CostInfo;
  context_window: ContextWindow;
  exceeds_200k_tokens: boolean;
  vim?: VimInfo;
  agent?: AgentInfo;
  worktree?: WorktreeInfo;
  rate_limits?: RateLimits;
}

// ── Visual width helpers ─────────────────────────────────────────────────────

// Detect CJK locale to handle East Asian Ambiguous Width characters.
// In CJK terminals (zh/ja/ko), characters like ♥ ♡ ★ render as 2 columns
// instead of the usual 1, because their Unicode East Asian Width is "Ambiguous".
const isCJKContext = /^(zh|ja|ko)/i.test(
  new Intl.DateTimeFormat().resolvedOptions().locale,
);

// East Asian Ambiguous Width ranges that render as 2 columns in CJK terminals.
// Focused on ranges commonly encountered in terminal UIs.
const EA_AMBIGUOUS: ReadonlyArray<[number, number]> = [
  [0x2500, 0x257f], // Box Drawing
  [0x2580, 0x259f], // Block Elements
  [0x25a0, 0x25ff], // Geometric Shapes
  [0x2600, 0x266f], // Miscellaneous Symbols (♠♡♣♥♦♧★☆ etc.)
];

const OSC_SEQUENCE_RE = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
const CSI_SEQUENCE_RE = /\x1b\[[0-9;:<=>?]*[@-~]/g;
const SINGLE_ESC_RE = /\x1b[@-_]/g;
const EMOJI_PRESENTATION_RE = /\p{Emoji_Presentation}/u;

const ZERO_WIDTH_RANGES: ReadonlyArray<[number, number]> = [
  [0x0300, 0x036f], // Combining Diacritical Marks
  [0x20d0, 0x20ff], // Combining Marks for Symbols
  [0xfe20, 0xfe2f], // Combining Half Marks
];

const WIDE_CODE_POINT_RANGES: ReadonlyArray<[number, number]> = [
  [0x1100, 0x115f],   // Hangul Jamo
  [0x2329, 0x2329],
  [0x232a, 0x232a],
  [0x2e80, 0x303e],   // CJK Radicals / Kangxi / desc
  [0x3040, 0x33ff],   // Japanese / CJK Symbols
  [0x3400, 0x4dbf],   // CJK Extension A
  [0x4e00, 0xa4cf],   // CJK Unified Ideographs
  [0xa960, 0xa97f],   // Hangul Jamo Extended-A
  [0xac00, 0xd7ff],   // Hangul Syllables + Jamo Ext-B
  [0xf900, 0xfaff],   // CJK Compatibility Ideographs
  [0xfe10, 0xfe19],   // Vertical forms
  [0xfe30, 0xfe6f],   // CJK Compatibility Forms
  [0xff00, 0xff60],   // Fullwidth Latin & punctuation
  [0xffe0, 0xffe6],   // Fullwidth signs
  [0x1b000, 0x1b0ff], // Kana Supplement
  [0x1f004, 0x1f0cf], // Mahjong / playing cards
  [0x1f300, 0x1f9ff], // Misc symbols, emoticons, transport, etc.
  [0x20000, 0x2a6df], // CJK Extension B
  [0x2a700, 0x2ceaf], // CJK Extension C/D/E
  [0x2ceb0, 0x2ebef], // CJK Extension F
  [0x2f800, 0x2fa1f], // CJK Compatibility Ideographs Supplement
];

function isCodePointInRanges(
  cp: number,
  ranges: ReadonlyArray<[number, number]>,
): boolean {
  for (const [start, end] of ranges) {
    if (cp >= start && cp <= end) {
      return true;
    }
  }
  return false;
}

function isZeroWidthCodePoint(cp: number): boolean {
  if (cp === 0x200d || cp === 0xfe0f || cp === 0xfe0e) {
    return true;
  }
  return isCodePointInRanges(cp, ZERO_WIDTH_RANGES);
}

function isWideCodePoint(cp: number): boolean {
  return isCodePointInRanges(cp, WIDE_CODE_POINT_RANGES);
}

/**
 * Strip ANSI escape sequences (CSI, OSC 8 hyperlinks, etc.) from a string so
 * we can measure the actual terminal column width without colour codes.
 *
 * Patterns removed:
 *   • CSI sequences  – ESC [ … final-byte  (colours, bold, etc.)
 *   • OSC sequences  – ESC ] … BEL | ST    (OSC 8 hyperlinks, window title, etc.)
 *   • Single-char Fe – ESC [A-Z\[\\\]^_]   (e.g. ESC M reverse-index)
 */
function stripAnsi(s: string): string {
  return s
    // OSC: ESC ] ... BEL  or  ESC ] ... ESC \  (ST)
    .replace(OSC_SEQUENCE_RE, "")
    // CSI: ESC [ ... final-byte (0x40-0x7E)
    .replace(CSI_SEQUENCE_RE, "")
    // Single-char Fe sequences (ESC followed by 0x40-0x5F)
    .replace(SINGLE_ESC_RE, "");
}

/**
 * Measure the display width of a (potentially ANSI-coloured) string.
 * Wide (CJK / emoji) characters count as 2 columns; narrow chars as 1.
 *
 * Uses Unicode `Emoji_Presentation` property + FE0F variation selector
 * lookahead to handle BMP-range emojis (like 🆔 ⚡ ⏱️) that fall outside
 * the simple 0x1F300-0x1F9FF range. Bun's JavaScriptCore engine has
 * supported `\p{...}/u` since the ES2018 spec.
 *
 * Known limitations (low priority — not used in this status line):
 *   • ZWJ sequences (e.g. 👨‍👩‍👧‍👦) are over-counted as N×2
 *   • Skin tone modifiers (e.g. 👍🏽) are over-counted as 4 instead of 2
 */
function displayWidth(s: string): number {
  const plain = stripAnsi(s);
  const codePoints = [...plain];
  let width = 0;
  for (let i = 0; i < codePoints.length; i++) {
    const ch = codePoints[i]!;
    const cp = ch.codePointAt(0) ?? 0;
    const nextCp = codePoints[i + 1]?.codePointAt(0);

    // Zero-width: combining marks, variation selectors, ZWJ
    if (isZeroWidthCodePoint(cp)) {
      continue;
    }

    // FE0F lookahead: variation selector forces emoji presentation (wide).
    // Handles `⏱` + FE0F = `⏱️` (wide), where `⏱` alone is text-presentation.
    if (nextCp === 0xFE0F) {
      width += 2;
      continue; // FE0F itself will be skipped on next iteration
    }

    // Default emoji presentation – handles 🆔 ⚡ 💰 📝 🕐 📅 🌿 etc.
    if (EMOJI_PRESENTATION_RE.test(ch)) {
      width += 2;
      continue;
    }

    // Wide ranges: CJK, fullwidth punctuation, fullwidth Latin, enclosed CJK,
    // CJK Compatibility, CJK Extension B+, CJK Compatibility Ideographs Supplement.
    // Kept as fallback because these are NOT covered by Emoji_Presentation.
    if (isWideCodePoint(cp)) {
      width += 2;
      continue;
    }

    width += 1;
  }
  return width;
}

/**
 * Right-pad `s` with spaces so its display width equals `targetWidth`.
 * If `s` is already at or beyond `targetWidth`, returns `s` unchanged.
 */
function padToWidth(s: string, targetWidth: number): string {
  const current = displayWidth(s);
  if (current >= targetWidth) return s;
  return s + " ".repeat(targetWidth - current);
}

/**
 * Truncate `text` so its display width fits within `maxWidth`, appending "..."
 * when truncation occurs. Measures width using `displayWidth()` to correctly
 * handle CJK / emoji characters.
 *
 * Edge cases:
 *   • maxWidth ≤ 0  → ""
 *   • maxWidth ≤ 3  → "..." sliced to maxWidth (e.g. maxWidth=2 → "..")
 *   • CJK boundary  → stops before a wide char that would overshoot
 */
function truncateWithEllipsis(text: string, maxWidth: number): string {
  if (maxWidth <= 0) return "";
  if (maxWidth <= 3) return "...".slice(0, maxWidth);
  const fullWidth = displayWidth(text);
  if (fullWidth <= maxWidth) return text;

  const target = maxWidth - 3; // reserve 3 columns for "..."
  const chars = [...text];
  let result = "";
  let w = 0;
  for (const ch of chars) {
    const cw = displayWidth(ch);
    if (w + cw > target) break;
    result += ch;
    w += cw;
  }
  return result + "...";
}

/**
 * Distribute `elements` across `targetWidth` columns by evenly spacing the
 * gaps between them. Each gap gets at least 2 spaces; any remainder from
 * the integer division is distributed left-to-right (one extra space per gap).
 */
function distributeElements(elements: string[], targetWidth: number): string {
  if (elements.length <= 1) return elements[0] ?? "";

  const totalContent = elements.reduce((sum, e) => sum + displayWidth(e), 0);
  const gaps = elements.length - 1;
  const totalSpacing = Math.max(targetWidth - totalContent, gaps * 2);
  const baseGap = Math.floor(totalSpacing / gaps);
  const extra = totalSpacing % gaps;

  const parts: string[] = [];
  for (let i = 0; i < elements.length; i++) {
    parts.push(elements[i]!);
    if (i < gaps) {
      parts.push(" ".repeat(baseGap + (i < extra ? 1 : 0)));
    }
  }
  return parts.join("");
}

// ── ANSI ─────────────────────────────────────────────────────────────────────

class Ansi {
  private static readonly ESC = "\x1b";
  static readonly RESET = "\x1b[0m";

  private static style(code: string, text: string): string {
    return `${Ansi.ESC}[${code}m${text}${Ansi.RESET}`;
  }

  static cyan(text: string): string {
    return Ansi.style("1;36", text);
  }
  static yellow(text: string): string {
    return Ansi.style("33", text);
  }
  static orange(text: string): string {
    return Ansi.style("38;5;208", text);
  }
  static red(text: string): string {
    return Ansi.style("31", text);
  }
  static brightRed(text: string): string {
    return Ansi.style("1;31", text);
  }
  static darkRed(text: string): string {
    return Ansi.style("38;5;88", text);
  }
  static darkGray(text: string): string {
    return Ansi.style("38;5;240", text);
  }
  static green(text: string): string {
    return Ansi.style("32", text);
  }
  static white(text: string): string {
    return Ansi.style("1;37", text);
  }
  static dim(text: string): string {
    return Ansi.style("90", text);
  }
  static blue(text: string): string {
    return Ansi.style("1;34", text);
  }
}

// ── CWD ───────────────────────────────────────────────────────────────────────

class CwdFormatter {
  static shorten(cwd: string): string {
    // Only show the last directory component (basename)
    const parts = cwd.replace(/\\/g, "/").split("/").filter(Boolean);
    return parts[parts.length - 1] ?? cwd;
  }
}

// ── OSC 8 Hyperlink ───────────────────────────────────────────────────────────

/**
 * Wraps text in an OSC 8 terminal hyperlink escape sequence.
 * Format: ESC]8;;<url>BEL<text>ESC]8;;BEL
 */
function hyperlink(url: string, text: string): string {
  // Strip C0 control characters and DEL to prevent OSC 8 injection —
  // a BEL (\x07) in the URL would prematurely terminate the hyperlink.
  const safeUrl = url.replace(/[\x00-\x1f\x7f]/g, "");
  return `\x1b]8;;${safeUrl}\x07${text}\x1b]8;;\x07`;
}

/**
 * Converts a git remote URL (SSH or HTTPS) to a browser-friendly HTTPS URL.
 * e.g. git@github.com:user/repo.git → https://github.com/user/repo
 * Trailing slashes are trimmed so appended paths don't produce double slashes.
 */
function remoteToHttps(remote: string): string {
  // Trim trailing slashes up front so callers appending "/tree/<branch>" etc. stay clean.
  const trimmed = remote.replace(/\/+$/, "");
  // SSH format: git@github.com:user/repo.git
  const sshMatch = trimmed.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
  if (sshMatch) {
    return `https://${sshMatch[1]}/${sshMatch[2]}`;
  }
  // HTTPS format: https://github.com/user/repo.git
  const httpsMatch = trimmed.match(/^(https?:\/\/.+?)(?:\.git)?$/);
  if (httpsMatch) {
    return httpsMatch[1];
  }
  // Unrecognized format — refuse to emit as hyperlink to avoid injecting
  // arbitrary schemes or control characters into OSC 8 sequences.
  return "";
}

// ── Formatters ────────────────────────────────────────────────────────────────

class Formatter {
  static tokens(n: number): string {
    if (n >= 1000) {
      return `${Math.floor(n / 1000)}.${Math.floor((n % 1000) / 100)}k`;
    }
    return String(n);
  }

  static contextSize(n: number): string {
    if (n >= 1_000_000) {
      return `${Math.floor(n / 1_000_000)}M`;
    }
    return `${Math.floor(n / 1_000)}K`;
  }

  // Higher-precision variant for displaying used token count (numerator only).
  // e.g. 53201 → "53.2K", 1234567 → "1.2M", 800 → "800"
  static contextSizePrecise(n: number): string {
    if (n >= 1_000_000) {
      return `${(n / 1_000_000).toFixed(1)}M`;
    }
    if (n >= 1_000) {
      return `${(n / 1_000).toFixed(1)}K`;
    }
    return String(n);
  }

  static duration(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    if (min > 0) {
      return `${min}m ${sec}s`;
    }
    return `${sec}s`;
  }

  static cost(usd: number): string {
    return `$${usd.toFixed(2)}`;
  }

  // Format seconds until reset as a human-readable "Xh Ym" or "Ym" string
  static timeUntil(epochSec: number): string {
    const now = Math.floor(Date.now() / 1000);
    const remaining = epochSec - now;
    if (remaining <= 0) return "soon";
    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    if (h > 0) return `${h}h${m > 0 ? ` ${m}m` : ""}`;
    return `${m}m`;
  }
}

// ── Progress bar ──────────────────────────────────────────────────────────────

class ProgressBar {
  private static readonly TOTAL = 5;

  static render(pct: number, used: string): string {
    // Each heart = 20%. Within a slot: <10% consumed = red, 10-20% = yellow half, 20% = empty
    const slotSize = 100 / ProgressBar.TOTAL; // 20
    const consumedSlots = Math.min(Math.floor(pct / slotSize), ProgressBar.TOTAL);
    const remainder = pct % slotSize;
    const partialSlot = consumedSlots < ProgressBar.TOTAL && remainder >= slotSize / 2 ? 1 : 0;
    const remainingSlots = ProgressBar.TOTAL - consumedSlots - partialSlot;

    const color = ProgressBar.heartColor(pct);
    const parts: string[] = [];
    if (remainingSlots > 0) {
      parts.push(color(Array(remainingSlots).fill("♥").join(" ")));
    }
    if (partialSlot) {
      parts.push(Ansi.yellow("♥"));
    }
    if (consumedSlots > 0) {
      parts.push(Ansi.dim(Array(consumedSlots).fill("♡").join(" ")));
    }

    const hearts = parts.join(" ");
    const pctStr = Ansi.dim(`${pct.toFixed(1)}%`);

    return color("[") + hearts + " " + Ansi.dim(used) + color("]") + " " + pctStr;
  }

  private static heartColor(pct: number): (t: string) => string {
    if (pct <= 40) return Ansi.brightRed;
    if (pct <= 70) return Ansi.darkRed;
    return Ansi.darkGray;
  }
}

// ── Git ───────────────────────────────────────────────────────────────────────

/**
 * A versioned, JSON-serializable snapshot of all git-derived fields needed by
 * the status line. Stored on disk so consecutive status line invocations can
 * skip up to 6 git subprocess spawns per render.
 */
interface DiffStat {
  files: number;
  added: number;
  removed: number;
}

interface GitSnapshot {
  v: 1;
  isRepo: boolean;
  remoteUrl: string | null;
  branch: string;
  staged: DiffStat;
  modified: DiffStat;
  untrackedCount: number;
}

/**
 * Structured parts returned by `GitContext.renderParts()` so the caller
 * (line4) can measure each piece independently and apply dynamic truncation
 * to root / branch while keeping staged / modified stats intact.
 */
interface GitRenderParts {
  branchText: string;        // raw branch name — NOT truncated
  branchUrl: string | null;  // full hyperlink URL, or null if no remote
  stagedStr: string | null;  // ANSI-coloured "+Nfiles(+A -R)", or null
  modifiedStr: string | null; // ANSI-coloured "~Nfiles(+A -R)", or null
}

interface CacheFile {
  snapshot: GitSnapshot;
  cwd: string;
  writtenAt: number;
}

/**
 * File-backed cache for `GitSnapshot`, keyed on `session_id + cwd hash`.
 *
 * Per the official guidance at
 * https://code.claude.com/docs/en/statusline#cache-expensive-operations,
 * `session_id` is stable within a session but unique across sessions, which
 * avoids the `$$` / PID pitfall that defeats caching. The cwd hash suffix
 * makes in-session `cd` / `/add-dir` switches isolate different repos.
 *
 * Uses Bun-native async file APIs (`Bun.file` / `Bun.write`) so the file
 * type-checks without `@types/node` — all external types come from the
 * `declare const Bun` block above.
 *
 * Errors on read or write are swallowed intentionally: the cache is a
 * pure optimization, so a broken cache must never take the status line down.
 */
class GitCache {
  private static readonly DEFAULT_TTL_MS = 5_000;
  private static readonly SCHEMA_VERSION = 1;

  private readonly filePath: string;
  private readonly ttlMs: number;

  constructor(sessionId: string | undefined, cwd: string) {
    const sid = sessionId ?? "nosession";
    const cwdHash = new Bun.CryptoHasher("sha1").update(cwd).digest("hex").slice(0, 8);

    // Normalize the OS temp dir to forward slashes so concatenation is uniform
    // regardless of `%TEMP%` on Windows vs. `$TMPDIR` / `/tmp` on Unix. Bun's
    // file APIs accept mixed separators, but forward-slash paths are easier
    // to eyeball in logs and cache listings.
    const rawTmp = process.env.TEMP ?? process.env.TMPDIR ?? "/tmp";
    const tmp = rawTmp.replace(/\\/g, "/").replace(/\/+$/, "");
    this.filePath = `${tmp}/cc-statusline-git-${sid}-${cwdHash}.json`;

    const envTtlRaw = process.env.CC_STATUSLINE_CACHE_TTL_MS;
    const envTtl = envTtlRaw !== undefined ? Number(envTtlRaw) : NaN;
    this.ttlMs = Number.isFinite(envTtl) && envTtl >= 0
      ? envTtl
      : GitCache.DEFAULT_TTL_MS;
  }

  async read(cwd: string): Promise<GitSnapshot | null> {
    if (this.ttlMs === 0) return null; // TTL=0 disables caching entirely
    try {
      const file = Bun.file(this.filePath);
      if (!(await file.exists())) return null;
      const parsed = JSON.parse(await file.text()) as CacheFile;
      if (parsed.snapshot?.v !== GitCache.SCHEMA_VERSION) return null;
      if (parsed.cwd !== cwd) return null;
      if (Date.now() - parsed.writtenAt > this.ttlMs) return null;
      return parsed.snapshot;
    } catch {
      return null;
    }
  }

  async write(cwd: string, snapshot: GitSnapshot): Promise<void> {
    if (this.ttlMs === 0) return; // TTL=0 disables caching entirely — skip writes too
    try {
      const payload: CacheFile = { snapshot, cwd, writtenAt: Date.now() };
      await Bun.write(this.filePath, JSON.stringify(payload));
    } catch {
      // Silently ignore cache write errors; caching is a best-effort optimization.
    }
  }
}

class GitContext {
  constructor(
    private readonly cwd: string,
    private readonly cache?: GitCache,
  ) {}

  /**
   * Single entry point for all git data. Returns a cached snapshot when one
   * is still fresh; otherwise runs every git command once, stores the result,
   * and returns it. This is the only place that spawns git subprocesses.
   *
   * Async because the underlying cache uses Bun's async file APIs. Git
   * subprocess invocations remain synchronous via `Bun.spawnSync`.
   */
  async snapshot(): Promise<GitSnapshot> {
    const cached = await this.cache?.read(this.cwd);
    if (cached) return cached;

    const isRepo = this.checkIsRepo();
    if (!isRepo) {
      const snap = this.createEmptySnapshot();
      await this.cache?.write(this.cwd, snap);
      return snap;
    }

    const remoteRaw = this.run(["remote", "get-url", "origin"]);
    const branchRaw = this.run(["branch", "--show-current"]);
    const staged = this.parseDiffStat(this.run(["diff", "--cached", "--numstat"]) ?? "");
    const modified = this.parseDiffStat(this.run(["diff", "--numstat"]) ?? "");
    // Count untracked (new) files — git diff misses these entirely
    const untrackedOutput = this.run(["ls-files", "--others", "--exclude-standard"]);
    const untrackedCount = untrackedOutput
      ? untrackedOutput.split("\n").filter(Boolean).length
      : 0;

    const snap: GitSnapshot = {
      v: 1,
      isRepo: true,
      remoteUrl: remoteRaw ? (remoteToHttps(remoteRaw) || null) : null,
      branch: branchRaw ?? "",
      staged,
      modified,
      untrackedCount,
    };
    // Don't cache snapshots built from failed git commands — avoids poisoning
    // the cache with a false-clean state when git is temporarily broken.
    if (branchRaw !== null) {
      await this.cache?.write(this.cwd, snap);
    }
    return snap;
  }

  /**
   * Returns structured parts for the git status display. Does not truncate
   * the branch name — the caller (line4) controls truncation based on the
   * available width budget.
   */
  renderParts(s: GitSnapshot): GitRenderParts {
    const branchUrl = (s.branch && s.remoteUrl)
      ? `${s.remoteUrl}/tree/${this.encodeBranchPath(s.branch)}`
      : null;

    let stagedStr: string | null = null;
    if (s.staged.files > 0) {
      const label = s.staged.files === 1 ? "file" : "files";
      stagedStr = Ansi.yellow(`+${s.staged.files}${label}(+${s.staged.added} -${s.staged.removed})`);
    }

    let modifiedStr: string | null = null;
    const totalModified = s.modified.files + s.untrackedCount;
    if (totalModified > 0) {
      const label = totalModified === 1 ? "file" : "files";
      modifiedStr = Ansi.yellow(`~${totalModified}${label}(+${s.modified.added} -${s.modified.removed})`);
    }

    return { branchText: s.branch, branchUrl, stagedStr, modifiedStr };
  }

  private createEmptySnapshot(): GitSnapshot {
    return {
      v: 1,
      isRepo: false,
      remoteUrl: null,
      branch: "",
      staged: this.createEmptyDiffStat(),
      modified: this.createEmptyDiffStat(),
      untrackedCount: 0,
    };
  }

  private createEmptyDiffStat(): DiffStat {
    return { files: 0, added: 0, removed: 0 };
  }

  private checkIsRepo(): boolean {
    const result = Bun.spawnSync(
      ["git", "-C", this.cwd, "rev-parse", "--git-dir"],
      {
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    return result.exitCode === 0;
  }

  /**
   * Encodes a branch name for use in a GitHub tree URL.
   * Preserves forward slashes (so "dev/feature" stays as "dev/feature")
   * while percent-encoding other special characters that would break the URL.
   */
  private encodeBranchPath(branch: string): string {
    return branch.split("/").map(encodeURIComponent).join("/");
  }

  private run(args: string[]): string | null {
    const result = Bun.spawnSync(
      ["git", "-C", this.cwd, "--no-optional-locks", ...args],
      {
        stdout: "pipe",
        stderr: "pipe",
      },
    );

    if (result.exitCode !== 0) return null;
    return result.stdout.toString().trim();
  }

  private parseDiffStat(output: string): DiffStat {
    let files = 0;
    let added = 0;
    let removed = 0;
    for (const line of output.split("\n").filter(Boolean)) {
      // numstat format: <added>\t<removed>\t<filename>
      // binary files show "-" instead of numbers
      const parts = line.split("\t");
      const a = Number.parseInt(parts[0] ?? "0", 10);
      const r = Number.parseInt(parts[1] ?? "0", 10);
      files++;
      if (!Number.isNaN(a)) added += a;
      if (!Number.isNaN(r)) removed += r;
    }
    return { files, added, removed };
  }
}

// ── Renderer ──────────────────────────────────────────────────────────────────

class StatusLineRenderer {
  constructor(private readonly input: StatusInput) {}

  async render(): Promise<string> {
    // ── Collect elements for lines 1–3 first ─────────────────────────────────
    const line1Elems = this.line1();
    const line2Elems = this.line2();
    const line3Elems = this.line3();

    // ── Decide which lines participate in width equalisation ──────────────────
    //
    // The rule:
    //   • Line 4 uses targetWidth for dynamic truncation but is NOT equalised.
    //   • Line 1 always participates.
    //   • Line 2 participates only when current_usage is present (4 elements).
    //   • Line 3 participates only when it is non-empty.

    const hasUsageBreakdown = this.input.context_window.current_usage !== null;

    interface EqLine { elements: string[]; shouldEqualise: boolean }
    const candidates: EqLine[] = [
      { elements: line1Elems, shouldEqualise: true },
      { elements: line2Elems, shouldEqualise: hasUsageBreakdown },
      ...(line3Elems.length > 0
        ? [{ elements: line3Elems, shouldEqualise: true }]
        : []),
    ];

    // Minimum width of a line = sum of element widths + 2-space minimum gaps
    const minWidth = (elems: string[]): number =>
      elems.reduce((s, e) => s + displayWidth(e), 0) + (elems.length - 1) * 2;

    // Terminal column width — stdout is piped so use stderr (still a TTY),
    // then fall back to $COLUMNS, then to a conservative 120.
    const termCols = process.stderr.columns
      ?? (Number(process.env.COLUMNS) || 120);

    // Target = max minimum width among participating lines, capped at terminal width.
    // When only 1 line participates, use its own width (not termCols) so that
    // line 4 truncates to match the actual content width, not the full terminal.
    const activeMinWidths = candidates
      .filter(c => c.shouldEqualise)
      .map(c => minWidth(c.elements));
    const contentWidth = activeMinWidths.length > 0
      ? Math.max(...activeMinWidths)
      : 0;
    const targetWidth = Math.min(contentWidth || termCols, termCols);

    // ── Line 4 is built AFTER targetWidth so it can truncate to fit ──────────
    // Line 4 is always left-aligned (verbatim join). Truncation is handled
    // inside line4() when the content would exceed targetWidth.
    const raw4 = (await this.line4(targetWidth)).join("  ");

    const buildLine = (c: EqLine): string =>
      (c.shouldEqualise && targetWidth > 0)
        ? distributeElements(c.elements, targetWidth)
        : c.elements.join("  ");

    // ── Build final output ────────────────────────────────────────────────────
    // Hard-cap every line to termCols as a safety net — prevents physical
    // wrapping in the fixed-height status area regardless of content width.
    const outputLines: string[] = [
      buildLine(candidates[0]!),
      buildLine(candidates[1]!),
      ...(line3Elems.length > 0 ? [buildLine(candidates[2]!)] : []),
      raw4,
    ].map(line =>
      displayWidth(line) > termCols
        ? truncateWithEllipsis(line, termCols) + Ansi.RESET
        : line
    );

    return outputLines.join("\n") + "\n";
  }

  private line1(): string[] {
    const { model, context_window, session_id } = this.input;
    const modelLabel = Ansi.cyan(`[${model.display_name}]`);
    const cu = context_window.current_usage;
    // Use precise token counts from current_usage when available; fall back to percentage estimate
    const usedTokens = cu
      ? cu.input_tokens + cu.cache_creation_input_tokens + cu.cache_read_input_tokens + cu.output_tokens
      : Math.round((context_window.context_window_size * (context_window.used_percentage ?? 0)) / 100);
    const precisePct = (usedTokens / context_window.context_window_size) * 100;
    const usedStr = Formatter.contextSizePrecise(usedTokens);
    const totalStr = Formatter.contextSize(context_window.context_window_size);
    const bar = ProgressBar.render(precisePct, `${usedStr}/${totalStr}`);

    const elements: string[] = [modelLabel, bar];
    if (session_id) {
      elements.push(Ansi.dim(`🆔 ${session_id.slice(0, 8)}`));
    }
    return elements;
  }

  private line2(): string[] {
    const { cost, context_window } = this.input;
    const elements: string[] = [
      `💰 ${Ansi.orange(Formatter.cost(cost.total_cost_usd))}`,
      `⏱️  ${Formatter.duration(cost.total_duration_ms)}`,
    ];
    const cu = context_window.current_usage;
    if (cu) {
      const cached = cu.cache_read_input_tokens;
      const uncached = cu.input_tokens + cu.cache_creation_input_tokens + cu.output_tokens;
      elements.push(Ansi.dim(`⚡ Cached: ${Formatter.contextSizePrecise(cached)}`));
      elements.push(Ansi.dim(`📝 Uncached: ${Formatter.contextSizePrecise(uncached)}`));
    }
    return elements;
  }

  private line3(): string[] {
    const rl = this.input.rate_limits;
    if (!rl) return [];

    const elements: string[] = [];

    if (rl.five_hour !== undefined) {
      elements.push(this.renderRateLimitWindow("🕐 5h", rl.five_hour));
    }

    if (rl.seven_day !== undefined) {
      elements.push(this.renderRateLimitWindow("📅 7d", rl.seven_day));
    }

    return elements;
  }

  private renderRateLimitWindow(label: string, window: RateLimitWindow): string {
    const pctStr = `${window.used_percentage.toFixed(0)}%`;
    const resets = Formatter.timeUntil(window.resets_at);
    return `${label} ${this.colorizeRateLimit(pctStr, window.used_percentage)}${Ansi.dim(` (resets in ${resets})`)}`;
  }

  private colorizeRateLimit(text: string, pct: number): string {
    if (pct >= 90) return Ansi.red(text);
    if (pct >= 70) return Ansi.yellow(text);
    return Ansi.green(text);
  }

  /**
   * Build line 4 with dynamic truncation of root / branch names.
   *
   * Scenario 1 — no .git:  [root] left-aligned, no truncation.
   * Scenario 2 — clean repo (no staged/modified/untracked):
   *   If [root] + 🌿 branch fits within targetWidth → no truncation.
   *   Otherwise → truncate root and branch 50/50 with "..." ellipsis.
   * Scenario 3 — dirty repo (staged / modified / untracked present):
   *   Staged and modified stats are NEVER truncated.
   *   Remaining space is split: branch 80%, root 20%.
   */
  private async line4(targetWidth: number): Promise<string[]> {
    const cwd = this.input.workspace.current_dir;
    const repoName = CwdFormatter.shorten(cwd);
    const cache = new GitCache(this.input.session_id, cwd);
    const git = new GitContext(cwd, cache);
    const snap = await git.snapshot();

    // ── Scenario 1: no .git — show [root] only, no truncation ────────────────
    if (!snap.isRepo) {
      return [Ansi.white(`[${repoName}]`)];
    }

    const parts = git.renderParts(snap);
    const isDirty = parts.stagedStr !== null || parts.modifiedStr !== null;

    // Layout: [root]  🌿 branch[ staged][ modified]
    //         ^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //         elem 1  elem 2 (combined git status string)
    // The 2 elements are joined with "  " (2 spaces) — always left-aligned.
    const BRACKET_W = 2;   // "[" + "]"
    const GAP_W = 2;       // gap between [root] and git-status
    const BR_PREFIX = "🌿 ";
    const BR_PREFIX_W = displayWidth(BR_PREFIX);

    // Staged/modified are part of the git-status string, prefixed by 1 space each
    const stagedInternal = parts.stagedStr ? 1 + displayWidth(parts.stagedStr) : 0;
    const modifiedInternal = parts.modifiedStr ? 1 + displayWidth(parts.modifiedStr) : 0;

    // Overhead = everything except rootText and branchText
    const overhead = BRACKET_W + GAP_W + BR_PREFIX_W + stagedInternal + modifiedInternal;
    const available = targetWidth - overhead;

    const rootTextW = displayWidth(repoName);
    const branchTextW = displayWidth(parts.branchText);
    const needed = rootTextW + branchTextW;

    let finalRoot = repoName;
    let finalBranch = parts.branchText;

    // Only truncate when the line would exceed targetWidth
    if (targetWidth > 0 && needed > available) {
      const weight = isDirty ? 0.8 : 0.5; // branch weight
      let branchBudget = Math.max(Math.floor(available * weight), 0);
      let rootBudget = Math.max(available - branchBudget, 0);

      // Redistribute surplus: if one side doesn't need its full budget,
      // give the remainder to the other side.
      if (branchTextW < branchBudget) {
        branchBudget = branchTextW;
        rootBudget = Math.max(available - branchBudget, 0);
      } else if (rootTextW < rootBudget) {
        rootBudget = rootTextW;
        branchBudget = Math.max(available - rootBudget, 0);
      }

      finalBranch = truncateWithEllipsis(parts.branchText, branchBudget);
      finalRoot = truncateWithEllipsis(repoName, rootBudget);
    }

    // ── Assemble: 2 elements, left-aligned ──────────────────────────────────
    const cwdLabel = snap.remoteUrl
      ? hyperlink(snap.remoteUrl, Ansi.white(`[${finalRoot}]`))
      : Ansi.white(`[${finalRoot}]`);

    const branchLabel = Ansi.yellow(`${BR_PREFIX}${finalBranch}`);
    let gitStr = parts.branchUrl
      ? hyperlink(parts.branchUrl, branchLabel)
      : branchLabel;

    if (parts.stagedStr) gitStr += ` ${parts.stagedStr}`;
    if (parts.modifiedStr) gitStr += ` ${parts.modifiedStr}`;

    return [cwdLabel, gitStr];
  }

}

// ── Entry point ───────────────────────────────────────────────────────────────

try {
  const raw = await Bun.stdin.text();
  const input = JSON.parse(raw) as StatusInput;
  process.stdout.write(await new StatusLineRenderer(input).render());
} catch {
  // Silently fail — a crashed statusline is worse than an empty one.
}
