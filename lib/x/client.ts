// Twitter/X client - post, reply, monitor mentions
import { getEnv } from "@/lib/env";
import { buildOAuth1aHeaders, hasOAuth1aCredentials } from "@/lib/x/api";

// Result from posting a tweet
export interface XPostResult {
  id: string;
  text: string;
  url: string;
  createdAt: string;
}

// Input for replying to tweet
export interface XReplyInput {
  tweetId: string;
  text: string;
}

// Input for fetching mentions
export interface XMentionInput {
  username?: string;
  maxResults?: number;
}

// Parsed mention from X API
export interface XMention {
  id: string;
  text: string;
  authorId: string;
  authorUsername: string;
  createdAt: string;
  inReplyToTweetId: string | null;
}

// Parsed command from tweet text
export interface XCommandParseResult {
  isCommand: boolean;
  action: "generate" | "status" | "help" | null;
  profileInput: string | null;
  style: string | null;
  promoCode: string | null;
  rawText: string;
}

// X API client for posting and reading tweets
export class XClient {
  private baseUrl: string;
  private bearerToken: string | null;
  private consumerKey: string | null;
  private consumerSecret: string | null;
  private accessToken: string | null;
  private accessTokenSecret: string | null;

  // Load X API credentials from env
  constructor() {
    const env = getEnv();
    this.baseUrl = env.X_API_BASE_URL?.replace(/\/+$/, "") || "https://api.x.com/2";
    this.bearerToken = env.X_API_BEARER_TOKEN || null;
    this.consumerKey = env.X_API_CONSUMER_KEY || null;
    this.consumerSecret = env.X_API_CONSUMER_SECRET || null;
    this.accessToken = env.X_API_ACCESS_TOKEN || null;
    this.accessTokenSecret = env.X_API_ACCESS_TOKEN_SECRET || null;
  }

  // Check if OAuth 1.0a posting works
  canPost(): boolean {
    return hasOAuth1aCredentials();
  }

  // Get headers for read-only API calls
  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.bearerToken) {
      headers.Authorization = `Bearer ${this.bearerToken}`;
    }

    return headers;
  }

  // Build OAuth 1.0a signed headers for POST
  private getOAuthHeaders(method: string, url: string, body: Record<string, unknown>): HeadersInit {
    const oauthHeader = buildOAuth1aHeaders({ method, url, body });
    if (!oauthHeader) {
      throw new Error(
        "OAuth 1.0a credentials required for posting. Set X_API_CONSUMER_KEY, X_API_CONSUMER_SECRET, X_API_ACCESS_TOKEN, and X_API_ACCESS_TOKEN_SECRET in environment."
      );
    }

    return {
      "Content-Type": "application/json",
      Authorization: oauthHeader,
    };
  }

  // Post new tweet with OAuth 1.0a
  async postTweet(text: string): Promise<XPostResult> {
    const url = `${this.baseUrl}/tweets`;
    const body = { text };

    const response = await fetch(url, {
      method: "POST",
      headers: this.getOAuthHeaders("POST", url, body),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to post tweet (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      data: {
        id: string;
        text: string;
      };
    };

    return {
      id: data.data.id,
      text: data.data.text,
      url: `https://x.com/i/web/status/${data.data.id}`,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Reply to a tweet (requires OAuth 1.0a)
   */
  async replyToTweet(input: XReplyInput): Promise<XPostResult> {
    const url = `${this.baseUrl}/tweets`;
    const body = {
      text: input.text,
      reply: {
        in_reply_to_tweet_id: input.tweetId,
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: this.getOAuthHeaders("POST", url, body),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to reply to tweet (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      data: {
        id: string;
        text: string;
      };
    };

    return {
      id: data.data.id,
      text: data.data.text,
      url: `https://x.com/i/web/status/${data.data.id}`,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Get mentions for the authenticated user
   */
  async getMentions(input?: XMentionInput): Promise<XMention[]> {
    const maxResults = input?.maxResults || 20;
    const url = `${this.baseUrl}/tweets/search/recent?query=@MythXEliza&max_results=${maxResults}&tweet.fields=author_id,created_at`;

    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch mentions (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      data?: Array<{
        id: string;
        text: string;
        author_id: string;
        created_at: string;
      }>;
      includes?: {
        users?: Array<{
          id: string;
          username: string;
        }>;
      };
    };

    const users = data.includes?.users || [];

    return (data.data || []).map((tweet) => {
      const user = users.find((u) => u.id === tweet.author_id);
      return {
        id: tweet.id,
        text: tweet.text,
        authorId: tweet.author_id,
        authorUsername: user?.username || "unknown",
        createdAt: tweet.created_at,
        inReplyToTweetId: null,
      };
    });
  }

  /**
   * Parse command from tweet text
   * Recognizes patterns like:
   * - "@MythXEliza generate @username"
   * - "@MythXEliza generate @username vhs_cinema"
   * - "@MythXEliza generate @username style CODE123"
   * - "@MythXEliza help"
   * - "@MythXEliza status"
   */
  parseCommand(text: string): XCommandParseResult {
    const normalized = text.trim();

    // Check if it's directed at MythXEliza
    const isCommand = /@MythXEliza/i.test(normalized);

    if (!isCommand) {
      return {
        isCommand: false,
        action: null,
        profileInput: null,
        style: null,
        promoCode: null,
        rawText: normalized,
      };
    }

    // Parse "generate" command
    const generateMatch = normalized.match(
      /@MythXEliza\s+generate\s+([@\w][^\s]+)(?:\s+([\w]+))?(?:\s+([\w-]+))?/i
    );

    if (generateMatch) {
      const profileInput = generateMatch[1];
      const styleOrCode = generateMatch[2] || null;
      const thirdArg = generateMatch[3] || null;

      // Known styles
      const knownStyles = new Set([
        "vhs_cinema",
        "black_and_white_noir",
        "hyperflow_assembly",
        "double_exposure",
        "glitch_digital",
        "found_footage_raw",
        "split_screen_diptych",
        "film_grain_70s",
      ]);

      let style: string | null = null;
      let promoCode: string | null = null;

      if (styleOrCode && knownStyles.has(styleOrCode.toLowerCase())) {
        style = styleOrCode.toLowerCase();
        promoCode = thirdArg;
      } else if (styleOrCode) {
        // Assume it's a promo code
        promoCode = styleOrCode;
      }

      return {
        isCommand: true,
        action: "generate",
        profileInput,
        style,
        promoCode,
        rawText: normalized,
      };
    }

    // Parse "help" command
    if (/@MythXEliza\s+help/i.test(normalized)) {
      return {
        isCommand: true,
        action: "help",
        profileInput: null,
        style: null,
        promoCode: null,
        rawText: normalized,
      };
    }

    // Parse "status" command
    if (/@MythXEliza\s+status/i.test(normalized)) {
      return {
        isCommand: true,
        action: "status",
        profileInput: null,
        style: null,
        promoCode: null,
        rawText: normalized,
      };
    }

    return {
      isCommand: true,
      action: null,
      profileInput: null,
      style: null,
      promoCode: null,
      rawText: normalized,
    };
  }

  /**
   * Build post text for MythX video
   */
  static buildVideoPostText(input: {
    profileUsername: string;
    profileDisplayName: string;
    style: string;
    videoUrl: string;
    galleryUrl: string;
  }): string {
    const styleLabels: Record<string, string> = {
      vhs_cinema: "VHS Cinema",
      black_and_white_noir: "B&W Noir",
      hyperflow_assembly: "Hyperflow",
      double_exposure: "Double Exposure",
      glitch_digital: "Glitch Digital",
      found_footage_raw: "Found Footage",
      split_screen_diptych: "Split Screen",
      film_grain_70s: "70s Film Grain",
    };

    const styleLabel = styleLabels[input.style] || input.style;

    return `🎬 New MythX Drop: ${input.profileDisplayName} (@${input.profileUsername})

An autobiographical video in "${styleLabel}" style, crafted from 42 tweets by AI cinema.

Watch: ${input.galleryUrl}

#MythX #ElizaOS #AICinema #Autobiographical`;
  }

  /**
   * Build reply text for video generation status
   */
  static buildGenerationReply(input: {
    profileUsername: string;
    status: "started" | "scraping" | "synthesizing" | "generating" | "completed" | "failed";
    videoUrl?: string;
    errorMessage?: string;
  }): string {
    const statusMessages: Record<string, string> = {
      started: `🎬 Starting video generation for @${input.profileUsername}...\n\n⏳ This will take 5-10 minutes. I'll update you when it's ready!`,
      scraping: `📊 Scraping 42 tweets from @${input.profileUsername}...`,
      synthesizing: `✍️ Synthesizing cinematic narrative from tweets...`,
      generating: `🎥 Generating video clips for each scene...`,
      completed: `✅ Video complete! Watch @${input.profileUsername}'s autobiographical cinema here: ${input.videoUrl || "link pending"}\n\n#MythX #ElizaOS`,
      failed: `❌ Video generation failed for @${input.profileUsername}: ${input.errorMessage || "Unknown error"}\n\nPlease try again or contact support.`,
    };

    return statusMessages[input.status] || "Status unknown";
  }
}

// Singleton instance
let xClientInstance: XClient | null = null;

export function getXClient(): XClient {
  if (!xClientInstance) {
    xClientInstance = new XClient();
  }
  return xClientInstance;
}
