# Poly MCP Integration — HyperCinema

## What Is Poly MCP?

Poly MCP is a **Model Context Protocol server** giving AI agents direct access to **73 system-level tools** across 11 modules. It runs via stdio or HTTP transports.

## Available Tools (73 total)

| Module | Tools | Purpose |
|--------|-------|---------|
| **Filesystem** (17) | fs_read, fs_write, fs_move, fs_copy, fs_create, fs_delete, fs_find, fs_ld, fs_stat, fs_permissions, fs_watch, fs_snapshot, fs_tree, fs_grep, fs_tail, fs_replace, fs_move_desktop | File operations, searching, watching |
| **Git** (8) | git_status, git_diff, git_commit, git_branch, git_checkout, git_blame, git_log, git_tag | Standard version control |
| **Diagnostics** (1) | diagnostics_get | Auto-detected code diagnostics |
| **Network** (6) | net_fetch, net_cargo, net_node, net_python, net_apt, net_ping | Web fetching, package registries |
| **Silent** (2) | silent_script, silent_resources | Headless script execution |
| **Context** (7) | ctx_context, ctx_compact, ctx_remove, ctx_token_count, ctx_memory_store, ctx_memory_recall, ctx_estimate_cost | LLM context management |
| **Time** (7) | time_now, time_sleep, time_schedule, time_timezone, time_stopwatch, time_timer, time_alarm | Scheduling, timers, alarms |
| **Input** (6) | input_notify, input_prompt, input_select, input_progress, input_clipboard_read, input_clipboard_write | Interactive prompts |
| **Gitent** (7) | gitent_init, gitent_status, gitent_track, gitent_commit, gitent_log, gitent_diff, gitent_rollback | Advanced git workflows |
| **Clipboard** (5) | clip_copy_file, clip_copy, clip_paste_file, clip_paste, clip_clear | System clipboard ops |
| **Transform** (7) | transform_diff, transform_encode, transform_hash, transform_regex, transform_json, transform_text, transform_archive | Data transformation |

## Available Skills

| Skill | Description | Use When |
|-------|-------------|----------|
| **mcp-builder** | Build and validate MCP servers | Creating new HTTP/stdio MCP servers |
| **mcp-operator** | Operate and troubleshoot runtime | Server endpoints fail, tool invocations fail |

## Install

```bash
# Rust (Cargo)
cargo install poly-mcp

# Python
pip install polymcp

# TypeScript
npm install @poly/mcp
```

## Configure For HyperCinema

Add to `.env.local`:
```bash
POLY_MCP_URL=http://localhost:8000/mcp
POLY_MCP_TRANSPORT=http
POLY_MCP_API_KEY=your_api_key_if_required
```

## Integration Files Created

| File | Purpose |
|------|---------|
| `lib/poly-mcp/client.ts` | Poly MCP HTTP client with all 73 tools |
| `lib/poly-mcp/skills.ts` | Skill definitions and injection |
| `lib/poly-mcp/types.ts` | TypeScript interfaces for all tool I/O |
| `lib/poly-mcp/config.ts` | Configuration and transport setup |
| `app/api/poly-mcp/proxy/route.ts` | API proxy for Poly MCP tools |

## Usage

```typescript
import { getPolyMCPClient } from "@/lib/poly-mcp/client";

const client = getPolyMCPClient();

// Read a file
const content = await client.callTool("fs_read", { path: "app/page.tsx" });

// Run git command
const status = await client.callTool("git_status", {});

// Estimate token cost
const cost = await client.callTool("ctx_estimate_cost", { prompt: "hello" });
```

## Agent Mode

Poly MCP enables autonomous agent workflows via **PolyClaw**:

```bash
polymcp agent run --type polyclaw --query "Scan the codebase and fix all TypeScript errors"
```

## Inspector

Launch the Poly MCP Inspector for testing:

```bash
python -m polymcp_inspector --host 127.0.0.1 --port 6274 --no-browser
```

Then connect to your server at `http://localhost:8000/mcp`.

## Skills Injection

Skills are automatically injected into agent prompts:

```bash
npx skills add poly-mcp/skills
```

Skills load from:
- `./.agents/skills`
- `./.skills`
- `~/.agents/skills`
