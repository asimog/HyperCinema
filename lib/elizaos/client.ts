// ElizaOS Cloud API client
// Handles agents, chat, video, knowledge

import { getEnv } from "@/lib/env";

// Agent identity and status
export interface ElizaOSAgent {
  id: string;
  name: string;
  character?: Record<string, unknown>;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

// Chat message for completions API
export interface ElizaOSChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// Chat request payload
export interface ElizaOSChatCompletionRequest {
  model?: string;
  messages: ElizaOSChatMessage[];
  temperature?: number;
  max_tokens?: number;
  agentId?: string;
}

// Chat response from API
export interface ElizaOSChatCompletionResponse {
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
export interface ElizaOSVideoGenerationRequest {
  prompt: string;
  model?: string;
  duration?: number;
  aspectRatio?: string;
  style?: string;
  agentId?: string;
}

// Video generation response
export interface ElizaOSVideoGenerationResponse {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

// Knowledge base query
export interface ElizaOSKnowledgeRequest {
  query: string;
  agentId?: string;
  topK?: number;
}

// Knowledge base results
export interface ElizaOSKnowledgeResponse {
  results: Array<{
    content: string;
    score: number;
    source?: string;
  }>;
}

// ElizaOS API client class
export class ElizaOSClient {
  private baseUrl: string;
  private apiKey: string;

  // Load config from environment
  constructor() {
    const env = getEnv();
    this.baseUrl = (env.ELIZAOS_BASE_URL || "https://cloud.milady.ai/api/v1").replace(/\/+$/, "");
    this.apiKey = env.ELIZAOS_API_KEY || "";
  }

  // Throw if API key missing
  private ensureConfigured(): void {
    if (!this.apiKey) {
      throw new Error("ELIZAOS_API_KEY is required. Set your ElizaOS API key in environment variables.");
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
  }): Promise<ElizaOSAgent> {
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
      throw new Error(`Failed to create/update ElizaOS agent (${response.status}): ${errorText}`);
    }

    return (await response.json()) as ElizaOSAgent;
  }

  // Fetch agent details by ID
  async getAgent(agentId: string): Promise<ElizaOSAgent> {
    this.ensureConfigured();
    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get ElizaOS agent (${response.status}): ${errorText}`);
    }

    return (await response.json()) as ElizaOSAgent;
  }

  // Send chat messages to agent
  async chatCompletion(
    input: ElizaOSChatCompletionRequest
  ): Promise<ElizaOSChatCompletionResponse> {
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
      throw new Error(`ElizaOS chat completion failed (${response.status}): ${errorText}`);
    }

    return (await response.json()) as ElizaOSChatCompletionResponse;
  }

  // Generate video from prompt
  async generateVideo(
    input: ElizaOSVideoGenerationRequest
  ): Promise<ElizaOSVideoGenerationResponse> {
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
      throw new Error(`ElizaOS video generation failed (${response.status}): ${errorText}`);
    }

    return (await response.json()) as ElizaOSVideoGenerationResponse;
  }

  // Poll video generation status
  async getVideoStatus(videoId: string): Promise<ElizaOSVideoGenerationResponse> {
    const response = await fetch(`${this.baseUrl}/api/videos/${videoId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get video status (${response.status}): ${errorText}`);
    }

    return (await response.json()) as ElizaOSVideoGenerationResponse;
  }

  // Query agent knowledge base
  async queryKnowledge(
    input: ElizaOSKnowledgeRequest
  ): Promise<ElizaOSKnowledgeResponse> {
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
      throw new Error(`ElizaOS knowledge query failed (${response.status}): ${errorText}`);
    }

    return (await response.json()) as ElizaOSKnowledgeResponse;
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
let elizaOSClientInstance: ElizaOSClient | null = null;

// Get or create client instance
export function getElizaOSClient(): ElizaOSClient {
  if (!elizaOSClientInstance) {
    elizaOSClientInstance = new ElizaOSClient();
  }
  return elizaOSClientInstance;
}
