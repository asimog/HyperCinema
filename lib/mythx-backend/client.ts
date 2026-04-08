// MythX Cloud API client
// Handles agents, chat, video, knowledge

import { getEnv } from "@/lib/env";

// Agent identity and status
export interface MythXAgent {
  id: string;
  name: string;
  character?: Record<string, unknown>;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

// Chat message for completions API
export interface MythXChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// Chat request payload
export interface MythXChatCompletionRequest {
  model?: string;
  messages: MythXChatMessage[];
  temperature?: number;
  max_tokens?: number;
  agentId?: string;
}

// Chat response from API
export interface MythXChatCompletionResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Video generation request
export interface MythXVideoGenerationRequest {
  prompt: string;
  model?: string;
  duration?: number;
  aspectRatio?: string;
  style?: string;
  agentId?: string;
}

// Video generation response
export interface MythXVideoGenerationResponse {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

// Knowledge base query
export interface MythXKnowledgeRequest {
  query: string;
  agentId?: string;
  topK?: number;
}

// Knowledge base results
export interface MythXKnowledgeResponse {
  results: Array<{
    content: string;
    score: number;
    source?: string;
  }>;
}

// MythX API client class
export class MythXClient {
  private baseUrl: string;
  private apiKey: string;

  // Load config from environment
  constructor() {
    const env = getEnv();
    this.baseUrl = normalizeMythXBaseUrl(env.MYTHX_BASE_URL);
    this.apiKey = env.MYTHX_API_KEY || "";
  }

  // Throw if API key missing
  private ensureConfigured(): void {
    if (!this.apiKey) {
      throw new Error("MYTHX_API_KEY is required. Set your MythX API key in environment variables.");
    }
  }

  // Build auth headers for requests
  private getHeaders(extraHeaders: Record<string, string> = {}): HeadersInit {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      "X-API-Key": this.apiKey,
      ...extraHeaders,
    };
  }

  // Register or update agent config
  async createOrUpdateAgent(input: {
    agentId: string;
    name: string;
    character: Record<string, unknown>;
  }): Promise<MythXAgent> {
    this.ensureConfigured();
    const response = await fetch(`${this.baseUrl}/api/agents/${input.agentId}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify({
        name: input.name,
        character: input.character,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create/update MythX agent (${response.status}): ${errorText}`);
    }

    return (await response.json()) as MythXAgent;
  }

  // Fetch agent details by ID
  async getAgent(agentId: string): Promise<MythXAgent> {
    this.ensureConfigured();
    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get MythX agent (${response.status}): ${errorText}`);
    }

    return (await response.json()) as MythXAgent;
  }

  // Send chat messages to agent
  async chatCompletion(
    input: MythXChatCompletionRequest
  ): Promise<MythXChatCompletionResponse> {
    this.ensureConfigured();
    const response = await fetch(`${this.baseUrl}/api/chat/completions`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: input.model || "default",
        messages: input.messages,
        temperature: input.temperature ?? 0.7,
        max_tokens: input.max_tokens,
        agent_id: input.agentId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MythX chat completion failed (${response.status}): ${errorText}`);
    }

    return (await response.json()) as MythXChatCompletionResponse;
  }

  // Generate video from prompt
  async generateVideo(
    input: MythXVideoGenerationRequest
  ): Promise<MythXVideoGenerationResponse> {
    this.ensureConfigured();
    const response = await fetch(`${this.baseUrl}/api/videos/generations`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        prompt: input.prompt,
        model: input.model,
        duration: input.duration,
        aspect_ratio: input.aspectRatio,
        style: input.style,
        agent_id: input.agentId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MythX video generation failed (${response.status}): ${errorText}`);
    }

    return (await response.json()) as MythXVideoGenerationResponse;
  }

  // Poll video generation status
  async getVideoStatus(videoId: string): Promise<MythXVideoGenerationResponse> {
    const response = await fetch(`${this.baseUrl}/api/videos/${videoId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get video status (${response.status}): ${errorText}`);
    }

    return (await response.json()) as MythXVideoGenerationResponse;
  }

  // Query agent knowledge base
  async queryKnowledge(
    input: MythXKnowledgeRequest
  ): Promise<MythXKnowledgeResponse> {
    const response = await fetch(`${this.baseUrl}/api/knowledge/query`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        query: input.query,
        agent_id: input.agentId,
        top_k: input.topK ?? 5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MythX knowledge query failed (${response.status}): ${errorText}`);
    }

    return (await response.json()) as MythXKnowledgeResponse;
  }

  // Upload document to knowledge base
  async uploadKnowledge(input: {
    agentId: string;
    document: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ id: string }> {
    const response = await fetch(`${this.baseUrl}/api/knowledge/documents`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        agent_id: input.agentId,
        content: input.document,
        metadata: input.metadata,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload knowledge (${response.status}): ${errorText}`);
    }

    return (await response.json()) as { id: string };
  }
}

// Global singleton for reuse
let mythxClientInstance: MythXClient | null = null;

// Get or create client instance
export function getMythXClient(): MythXClient {
  if (!mythxClientInstance) {
    mythxClientInstance = new MythXClient();
  }
  return mythxClientInstance;
}

function normalizeMythXBaseUrl(value?: string): string {
  const fallback = "https://cloud.milady.ai";
  const trimmed = (value || fallback).replace(/\/+$/, "");
  return trimmed.replace(/\/api(?:\/v1)?$/i, "");
}
