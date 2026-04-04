// Poly MCP skills - auto-injected into agent prompts
export interface PolyMCPSkill {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  instructions: string;
}

// Available Poly MCP skills
export const POLY_MCP_SKILLS: PolyMCPSkill[] = [
  {
    id: "mcp-builder",
    name: "MCP Builder",
    description: "Build and validate MCP servers with PolyMCP.",
    triggers: [
      "create mcp server",
      "build mcp tool",
      "implement mcp",
      "validate mcp",
      "mcp server",
      "add mcp tool",
    ],
    instructions: `When creating a new HTTP or stdio MCP server:
1. Use expose_tools_http() to wrap functions as MCP tools
2. Define tool params with clear descriptions
3. Set title and description for each tool
4. Validate with /mcp/list_tools endpoint
5. Test with /mcp/invoke/{tool_name} endpoint
6. Produce reproducible runbooks for delivery`,
  },
  {
    id: "mcp-operator",
    name: "MCP Operator",
    description: "Operate and troubleshoot PolyMCP runtime environments.",
    triggers: [
      "mcp server down",
      "mcp health check",
      "mcp registry",
      "mcp tool failed",
      "mcp endpoint",
      "mcp triage",
      "mcp rollback",
    ],
    instructions: `When operating or troubleshooting PolyMCP:
1. Check server endpoints with health check
2. Verify registry entries are correct and fresh
3. Test tool invocations individually
4. Review server logs for error details
5. Use gitent_rollback if changes caused issues
6. Document all findings for incident reports`,
  },
  {
    id: "fs-ops",
    name: "File Operations",
    description: "Complete file and directory manipulation toolkit.",
    triggers: [
      "read file",
      "write file",
      "find files",
      "search code",
      "directory tree",
      "file permissions",
    ],
    instructions: `File operations available:
- fs_read: Read files or list directories
- fs_write: Write or append to files
- fs_find: Search for files by pattern
- fs_grep: Search file contents with regex
- fs_tree: Get directory tree structure
- fs_stat: Get file metadata
- fs_permissions: Check file permissions
- fs_replace: Search and replace in files
- fs_tail: Read last N lines of log files`,
  },
  {
    id: "git-ops",
    name: "Git Operations",
    description: "Standard and advanced git version control tools.",
    triggers: [
      "git status",
      "git commit",
      "git branch",
      "git diff",
      "git log",
      "git checkout",
    ],
    instructions: `Git operations available:
- git_status: Show working tree status
- git_diff: Show unstaged changes
- git_commit: Stage and commit changes
- git_branch: List or create branches
- git_checkout: Switch branches
- git_blame: Show line-by-line authorship
- git_log: Show commit history
- git_tag: Create or list tags
- gitent_*: Advanced git workflows with tracking`,
  },
  {
    id: "context-ops",
    name: "Context Management",
    description: "LLM token counting, context compression, memory storage.",
    triggers: [
      "token count",
      "estimate cost",
    ],
    instructions: `Context management tools:
- ctx_token_count: Count tokens in text
- ctx_estimate_cost: Estimate LLM API costs
- ctx_memory_store/recall: Persistent key-value storage
- ctx_compact: Compress conversation context
- ctx_context: Get current context state`,
  },
  {
    id: "transform-ops",
    name: "Data Transformation",
    description: "Hashing, encoding, regex, JSON parsing, unified diffs.",
    triggers: [
      "hash",
    ],
    instructions: `Transformation tools available:
- transform_hash: SHA256, MD5, SHA512 hashing
- transform_json: Parse, stringify, validate JSON
- transform_regex: Apply regex search and replace
- transform_diff: Generate unified diffs
- transform_encode: Base64 and other encodings
- transform_text: Text case and format transforms`,
  },
];

// Get all skills for injection into agent prompts
export function getPolyMCPSkills(): string {
  return POLY_MCP_SKILLS.map(
    (skill) => `## ${skill.name}\n${skill.description}\n\n${skill.instructions}`,
  ).join("\n\n");
}

// Find skills matching a user query
export function findMatchingSkills(query: string): PolyMCPSkill[] {
  const lowerQuery = query.toLowerCase();
  return POLY_MCP_SKILLS.filter((skill) =>
    skill.triggers.some((trigger) => lowerQuery.includes(trigger)),
  );
}
