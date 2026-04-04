/**
 * ElizaOS Client - Integration layer for ElizaOS Cloud API
 * Provides agent management, chat completions, and video generation
 */

import { getEnv } from "@/lib/env";

export interface ElizaOSAgent {
  id: string;
  name: string;
  character?: Record<string, unknown>;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface ElizaOSChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ElizaOSChatCompletionRequest {
  model?: string;
  messages: ElizaOSChatMessage[];
  temperature?: number;
  max_tokens?: number;
  agentId?: string;
}

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

export interface ElizaOSVideoGenerationRequest {
  prompt: string;
  model?: string;
  duration?: number;
  aspectRatio?: string;
  style?: string;
  agentId?: string;
}

export interface ElizaOSVideoGenerationResponse {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface ElizaOSKnowledgeRequest {
  query: string;
  agentId?: string;
  topK?: number;
}

export interface ElizaOSKnowledgeResponse {
  results: Array<{
    content: string;
    score: number;
    source?: string;
  }>;
}

export class ElizaOSClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    const env = getEnv();
    // ElizaOS Cloud API base URL (per https://www.elizacloud.ai/docs/api)
    this.baseUrl = (env.ELIZAOS_BASE_URL || "https://cloud.milady.ai/api/v1").replace(/\/+$/, "");
    this.apiKey = env.ELIZAOS_API_KEY || "";
  }

  private ensureConfigured(): void {
    if (!this.apiKey) {
      throw new Error("ELIZAOS_API_KEY is required. Set your ElizaOS API key in environment variables.");
    }
  }

  private getHeaders(extraHeaders: Record<string, string> = {}): HeadersInit {
    return {
      "Content-Type": "application/json",
      // ElizaOS supports both Authorization: Bearer and X-API-Key headers
      Authorization: `Bearer ${this.apiKey}`,
      "X-API-Key": this.apiKey,
      ...extraHeaders,
    };
  }

  /**
   * Create or update an agent with a specific character configuration
   */
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

  /**
   * Get agent details
   */
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

  /**
   * Chat completion using OpenAI-compatible endpoint
   */
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

  /**
   * Generate video from text prompt
   */
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

  /**
   * Poll video generation status
   */
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

  /**
   * Query knowledge base for RAG-powered responses
   */
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

  /**
   * Upload knowledge document to agent
   */
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

// Singleton instance for easy import
let elizaOSClientInstance: ElizaOSClient | null = null;

export function getElizaOSClient(): ElizaOSClient {
  if (!elizaOSClientInstance) {
    elizaOSClientInstance = new ElizaOSClient();
  }
  return elizaOSClientInstance;
}
