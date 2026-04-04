// Poly MCP types - all 73 tool inputs and outputs
import { z } from "zod";

// ── Filesystem Tools ────────────────────────────────────────

export const FsReadSchema = z.object({
  path: z.string().describe("File or directory path to read"),
  limit: z.number().optional().describe("Max lines for text files"),
});

export const FsWriteSchema = z.object({
  path: z.string().describe("File path to write"),
  content: z.string().describe("File content"),
  append: z.boolean().optional().describe("Append to existing file"),
});

export const FsFindSchema = z.object({
  path: z.string().describe("Starting directory"),
  pattern: z.string().optional().describe("Glob pattern to match"),
  depth: z.number().optional().describe("Max directory depth"),
});

export const FsGrepSchema = z.object({
  path: z.string().describe("Directory to search"),
  pattern: z.string().describe("Regex pattern to match"),
  ignoreCase: z.boolean().optional(),
});

export const FsStatSchema = z.object({
  path: z.string().describe("File or directory path"),
});

export const FsTreeSchema = z.object({
  path: z.string().describe("Root directory path"),
  depth: z.number().optional().default(3),
});

// ── Git Tools ───────────────────────────────────────────────

export const GitStatusSchema = z.object({
  repo: z.string().optional().describe("Repository path"),
});

export const GitDiffSchema = z.object({
  repo: z.string().optional(),
  staged: z.boolean().optional().describe("Show staged changes only"),
});

export const GitCommitSchema = z.object({
  message: z.string().describe("Commit message"),
  repo: z.string().optional(),
  files: z.array(z.string()).optional().describe("Files to stage"),
});

export const GitLogSchema = z.object({
  repo: z.string().optional(),
  limit: z.number().optional().default(10),
});

// ── Network Tools ───────────────────────────────────────────

export const NetFetchSchema = z.object({
  url: z.string().url(),
  method: z.string().optional().default("GET"),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
});

export const NetNodeSchema = z.object({
  command: z.string().describe("npm/npx command to run"),
  cwd: z.string().optional(),
});

export const NetPythonSchema = z.object({
  script: z.string().describe("Python script to execute"),
  args: z.array(z.string()).optional(),
});

// ── Context Tools ───────────────────────────────────────────

export const CtxTokenCountSchema = z.object({
  text: z.string().describe("Text to count tokens for"),
});

export const CtxEstimateCostSchema = z.object({
  prompt: z.string(),
  model: z.string().optional().default("gpt-4o-mini"),
});

export const CtxMemoryStoreSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export const CtxMemoryRecallSchema = z.object({
  key: z.string().optional().describe("Recall specific key or all"),
});

// ── Time Tools ──────────────────────────────────────────────

export const TimeNowSchema = z.object({});
export const TimeSleepSchema = z.object({ seconds: z.number() });
export const TimeTimezoneSchema = z.object({});
export const TimeStopwatchSchema = z.object({});
export const TimeTimerSchema = z.object({ seconds: z.number() });

// ── Input Tools ─────────────────────────────────────────────

export const InputNotifySchema = z.object({
  message: z.string(),
  level: z.enum(["info", "warn", "error"]).optional(),
});

export const InputPromptSchema = z.object({
  message: z.string(),
  default: z.string().optional(),
});

export const InputProgressSchema = z.object({
  message: z.string(),
  percent: z.number().min(0).max(100),
});

// ── Transform Tools ─────────────────────────────────────────

export const TransformHashSchema = z.object({
  input: z.string(),
  algorithm: z.enum(["sha256", "md5", "sha512"]).default("sha256"),
});

export const TransformJsonSchema = z.object({
  input: z.string(),
  action: z.enum(["parse", "stringify", "validate"]).default("parse"),
});

export const TransformRegexSchema = z.object({
  input: z.string(),
  pattern: z.string(),
  replacement: z.string().optional(),
});

export const TransformDiffSchema = z.object({
  oldContent: z.string(),
  newContent: z.string(),
  format: z.enum(["unified", "json"]).default("unified"),
});

// ── Tool Registry ───────────────────────────────────────────

export const POLY_MCP_TOOLS = {
  // Filesystem (17 tools)
  fs_read: { schema: FsReadSchema, desc: "Read file or directory" },
  fs_write: { schema: FsWriteSchema, desc: "Write content to file" },
  fs_move: { schema: z.object({ from: z.string(), to: z.string() }), desc: "Move file or directory" },
  fs_copy: { schema: z.object({ from: z.string(), to: z.string() }), desc: "Copy file or directory" },
  fs_create: { schema: z.object({ path: z.string(), content: z.string().optional() }), desc: "Create new file" },
  fs_delete: { schema: z.object({ path: z.string() }), desc: "Delete file or directory" },
  fs_find: { schema: FsFindSchema, desc: "Find files matching pattern" },
  fs_ld: { schema: z.object({ path: z.string() }), desc: "List directory contents" },
  fs_stat: { schema: FsStatSchema, desc: "Get file metadata" },
  fs_permissions: { schema: z.object({ path: z.string() }), desc: "Get file permissions" },
  fs_watch: { schema: z.object({ path: z.string() }), desc: "Watch file for changes" },
  fs_snapshot: { schema: z.object({ path: z.string() }), desc: "Create file snapshot" },
  fs_tree: { schema: FsTreeSchema, desc: "Get directory tree structure" },
  fs_grep: { schema: FsGrepSchema, desc: "Search file contents with regex" },
  fs_tail: { schema: z.object({ path: z.string(), lines: z.number().optional() }), desc: "Read last N lines" },
  fs_replace: { schema: z.object({ path: z.string(), search: z.string(), replace: z.string() }), desc: "Replace text in file" },
  fs_move_desktop: { schema: z.object({ path: z.string() }), desc: "Move item to desktop" },

  // Git (8 tools)
  git_status: { schema: GitStatusSchema, desc: "Show git repository status" },
  git_diff: { schema: GitDiffSchema, desc: "Show git changes diff" },
  git_commit: { schema: GitCommitSchema, desc: "Create git commit" },
  git_branch: { schema: z.object({ name: z.string().optional() }), desc: "List or create branches" },
  git_checkout: { schema: z.object({ branch: z.string() }), desc: "Switch git branch" },
  git_blame: { schema: z.object({ file: z.string() }), desc: "Show line-by-line git blame" },
  git_log: { schema: GitLogSchema, desc: "Show git commit history" },
  git_tag: { schema: z.object({ name: z.string() }), desc: "Create or list git tags" },

  // Diagnostics (1 tool)
  diagnostics_get: { schema: z.object({ file: z.string().optional() }), desc: "Get code diagnostics" },

  // Network (6 tools)
  net_fetch: { schema: NetFetchSchema, desc: "Fetch URL content" },
  net_cargo: { schema: z.object({ command: z.string() }), desc: "Run cargo command" },
  net_node: { schema: NetNodeSchema, desc: "Run npm/npx command" },
  net_python: { schema: NetPythonSchema, desc: "Run Python script" },
  net_apt: { schema: z.object({ package: z.string() }), desc: "Install APT package" },
  net_ping: { schema: z.object({ host: z.string() }), desc: "Ping host" },

  // Silent (2 tools)
  silent_script: { schema: z.object({ script: z.string() }), desc: "Run headless script" },
  silent_resources: { schema: z.object({}), desc: "Get system resource usage" },

  // Context (7 tools)
  ctx_context: { schema: z.object({}), desc: "Get current context" },
  ctx_compact: { schema: z.object({}), desc: "Compress context" },
  ctx_remove: { schema: z.object({ id: z.string() }), desc: "Remove context entry" },
  ctx_token_count: { schema: CtxTokenCountSchema, desc: "Count tokens in text" },
  ctx_memory_store: { schema: CtxMemoryStoreSchema, desc: "Store value in memory" },
  ctx_memory_recall: { schema: CtxMemoryRecallSchema, desc: "Recall stored value" },
  ctx_estimate_cost: { schema: CtxEstimateCostSchema, desc: "Estimate LLM cost" },

  // Time (7 tools)
  time_now: { schema: TimeNowSchema, desc: "Get current time" },
  time_sleep: { schema: TimeSleepSchema, desc: "Sleep for seconds" },
  time_schedule: { schema: z.object({ at: z.string(), task: z.string() }), desc: "Schedule task" },
  time_timezone: { schema: TimeTimezoneSchema, desc: "Get current timezone" },
  time_stopwatch: { schema: TimeStopwatchSchema, desc: "Start stopwatch" },
  time_timer: { schema: TimeTimerSchema, desc: "Set timer" },
  time_alarm: { schema: z.object({ at: z.string() }), desc: "Set alarm" },

  // Input (6 tools)
  input_notify: { schema: InputNotifySchema, desc: "Show notification" },
  input_prompt: { schema: InputPromptSchema, desc: "Prompt user for input" },
  input_select: { schema: z.object({ message: z.string(), options: z.array(z.string()) }), desc: "Show selection menu" },
  input_progress: { schema: InputProgressSchema, desc: "Show progress bar" },
  input_clipboard_read: { schema: z.object({}), desc: "Read clipboard content" },
  input_clipboard_write: { schema: z.object({ text: z.string() }), desc: "Write to clipboard" },

  // Gitent (7 tools)
  gitent_init: { schema: z.object({ repo: z.string() }), desc: "Initialize gitent tracking" },
  gitent_status: { schema: z.object({ repo: z.string().optional() }), desc: "Get gitent status" },
  gitent_track: { schema: z.object({ path: z.string() }), desc: "Track file changes" },
  gitent_commit: { schema: z.object({ message: z.string() }), desc: "Commit with gitent" },
  gitent_log: { schema: z.object({ limit: z.number().optional() }), desc: "Show gitent log" },
  gitent_diff: { schema: z.object({ path: z.string().optional() }), desc: "Show gitent diff" },
  gitent_rollback: { schema: z.object({ target: z.string() }), desc: "Rollback to target" },

  // Clipboard (5 tools)
  clip_copy_file: { schema: z.object({ path: z.string() }), desc: "Copy file to clipboard" },
  clip_copy: { schema: z.object({ text: z.string() }), desc: "Copy text to clipboard" },
  clip_paste_file: { schema: z.object({ path: z.string() }), desc: "Paste clipboard to file" },
  clip_paste: { schema: z.object({}), desc: "Paste clipboard text" },
  clip_clear: { schema: z.object({}), desc: "Clear clipboard" },

  // Transform (7 tools)
  transform_diff: { schema: TransformDiffSchema, desc: "Generate unified diff" },
  transform_encode: { schema: z.object({ input: z.string(), encoding: z.string() }), desc: "Encode data" },
  transform_hash: { schema: TransformHashSchema, desc: "Hash input string" },
  transform_regex: { schema: TransformRegexSchema, desc: "Apply regex transform" },
  transform_json: { schema: TransformJsonSchema, desc: "Parse or stringify JSON" },
  transform_text: { schema: z.object({ input: z.string(), action: z.string() }), desc: "Transform text" },
  transform_archive: { schema: z.object({ files: z.array(z.string()) }), desc: "Create archive" },
} as const;

export type PolyMCPToolName = keyof typeof POLY_MCP_TOOLS;
