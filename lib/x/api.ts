import { randomUUID } from "crypto";
import { createHmac } from "crypto";
import { getEnv } from "@/lib/env";

export type XTweet = {
  id: string;
  text: string;
  createdAt: string | null;
};

export type XProfileTweetsResult = {
  profile: {
    displayName: string;
    username: string;
    profileUrl: string;
    description: string | null;
    profileImageUrl: string | null;
  };
  tweets: XTweet[];
  transcript: string;
};

function trim(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function trimOrNull(value: string | null | undefined): string | null {
  const next = trim(value);
  return next || null;
}

function normalizeBaseUrl(rawBaseUrl: string): string {
  const trimmed = rawBaseUrl.replace(/\/+$/, "");
  return trimmed.endsWith("/2") ? trimmed : `${trimmed}/2`;
}

function percentEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function buildOAuth1Header(input: {
  method: string;
  url: string;
  query: Record<string, string | number | boolean | undefined>;
}): string | null {
  const env = getEnv();
  const consumerKey = env.X_API_CONSUMER_KEY;
  const consumerSecret = env.X_API_CONSUMER_SECRET;
  const accessToken = env.X_API_ACCESS_TOKEN;
  const accessTokenSecret = env.X_API_ACCESS_TOKEN_SECRET;

  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
    return null;
  }

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: randomUUID().replace(/-/g, ""),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  const normalizedParams = [
    ...Object.entries(input.query)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [percentEncode(key), percentEncode(String(value))] as const),
    ...Object.entries(oauthParams).map(([key, value]) => [percentEncode(key), percentEncode(value)] as const),
  ].sort(([leftKey, leftValue], [rightKey, rightValue]) =>
    leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey),
  );

  const parameterString = normalizedParams.map(([key, value]) => `${key}=${value}`).join("&");
  const baseString = [
    input.method.toUpperCase(),
    percentEncode(input.url),
    percentEncode(parameterString),
  ].join("&");

  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(accessTokenSecret)}`;
  const signature = createHmac("sha1", signingKey).update(baseString).digest("base64");

  const headerParams = {
    ...oauthParams,
    oauth_signature: signature,
  };

  return `OAuth ${Object.entries(headerParams)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
    .join(", ")}`;
}

function buildXAuthHeaders(input: {
  method: string;
  url: string;
  query: Record<string, string | number | boolean | undefined>;
}): Headers {
  const env = getEnv();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "HyperMythsX/1.0 (+https://x.com/HyperMythX)",
  };

  if (env.X_API_BEARER_TOKEN) {
    headers.Authorization = `Bearer ${env.X_API_BEARER_TOKEN}`;
    return new Headers(headers);
  }

  const oauthHeader = buildOAuth1Header(input);
  if (oauthHeader) {
    headers.Authorization = oauthHeader;
    return new Headers(headers);
  }

  throw new Error("X API credentials are not configured yet.");
}

function decodeHandleSegment(value: string): string {
  return decodeURIComponent(value).replace(/^@+/, "").trim();
}

/**
 * Export OAuth 1.0a header builder for use in X client posting
 */
export function buildOAuth1aHeaders(input: {
  method: string;
  url: string;
  body?: Record<string, unknown>;
}): string | null {
  const env = getEnv();
  const consumerKey = env.X_API_CONSUMER_KEY;
  const consumerSecret = env.X_API_CONSUMER_SECRET;
  const accessToken = env.X_API_ACCESS_TOKEN;
  const accessTokenSecret = env.X_API_ACCESS_TOKEN_SECRET;

  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
    return null;
  }

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: randomUUID().replace(/-/g, ""),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  // For POST requests, body params are included in the signature base
  const bodyParams = input.body
    ? Object.entries(input.body)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([key, value]) => [percentEncode(key), percentEncode(String(value))] as const)
    : [];

  const normalizedParams = [
    ...bodyParams,
    ...Object.entries(oauthParams).map(([key, value]) => [percentEncode(key), percentEncode(value)] as const),
  ].sort(([leftKey, leftValue], [rightKey, rightValue]) =>
    leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey),
  );

  const parameterString = normalizedParams.map(([key, value]) => `${key}=${value}`).join("&");
  const baseString = [
    input.method.toUpperCase(),
    percentEncode(input.url),
    percentEncode(parameterString),
  ].join("&");

  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(accessTokenSecret)}`;
  const signature = createHmac("sha1", signingKey).update(baseString).digest("base64");

  const headerParams = {
    ...oauthParams,
    oauth_signature: signature,
  };

  return `OAuth ${Object.entries(headerParams)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
    .join(", ")}`;
}

/**
 * Check if OAuth 1.0a credentials are configured
 */
export function hasOAuth1aCredentials(): boolean {
  const env = getEnv();
  return !!(env.X_API_CONSUMER_KEY && env.X_API_CONSUMER_SECRET && env.X_API_ACCESS_TOKEN && env.X_API_ACCESS_TOKEN_SECRET);
}

export function normalizeXProfileInput(input: string): {
  username: string | null;
  profileUrl: string | null;
} {
  const trimmed = trim(input);
  if (!trimmed) {
    return { username: null, profileUrl: null };
  }

  const isProfileUrl =
    /^(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\//i.test(trimmed);

  if (!trimmed.includes("://") && !isProfileUrl) {
    const handle = decodeHandleSegment(trimmed);
    if (!handle) {
      return { username: null, profileUrl: null };
    }
    return {
      username: handle,
      profileUrl: `https://x.com/${encodeURIComponent(handle)}`,
    };
  }

  try {
    const parsed = new URL(
      trimmed.includes("://") ? trimmed : `https://${trimmed.replace(/^\/+/, "")}`,
    );
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (!host.includes("x.com") && !host.includes("twitter.com")) {
      return { username: null, profileUrl: null };
    }

    const username = parsed.pathname
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean)
      .find((segment) => !["i", "home", "explore", "search", "intent"].includes(segment.toLowerCase()));

    const decodedUsername = username ? decodeHandleSegment(username) : null;
    if (!decodedUsername) {
      return { username: null, profileUrl: null };
    }

    return {
      username: decodedUsername,
      profileUrl: `https://x.com/${encodeURIComponent(decodedUsername)}`,
    };
  } catch {
    const handle = decodeHandleSegment(trimmed);
    if (!handle) {
      return { username: null, profileUrl: null };
    }

    return {
      username: handle,
      profileUrl: `https://x.com/${encodeURIComponent(handle)}`,
    };
  }
}

export async function fetchXProfileTweets(input: {
  profileInput: string;
  maxTweets?: number;
}): Promise<XProfileTweetsResult> {
  const baseUrl = process.env.X_API_BASE_URL?.trim() || "https://api.x.com/2";

  const normalized = normalizeXProfileInput(input.profileInput);
  if (!normalized.username || !normalized.profileUrl) {
    throw new Error("Enter a valid X profile link or @handle.");
  }

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const maxTweets = Math.max(1, Math.min(42, input.maxTweets ?? 42));
  const userUrl = `${normalizedBaseUrl}/users/by/username/${encodeURIComponent(normalized.username)}`;
  const userQuery = {
    "user.fields": "description,profile_image_url,name,username",
  } as const;
  const headers = buildXAuthHeaders({
    method: "GET",
    url: userUrl,
    query: userQuery,
  });

  const userResponse = await fetch(
    `${userUrl}?user.fields=description,profile_image_url,name,username`,
    {
      headers,
      cache: "no-store",
    },
  );

  if (!userResponse.ok) {
    throw new Error("Failed to resolve the X profile through the X API.");
  }

  const userPayload = (await userResponse.json()) as {
    data?: {
      id?: string;
      name?: string;
      username?: string;
      description?: string;
      profile_image_url?: string;
    };
    errors?: Array<{ detail?: string; title?: string }>;
  };

  const user = userPayload.data;
  if (!user?.id || !user.username) {
    throw new Error("The X profile could not be resolved.");
  }

  const tweetsUrl = `${normalizedBaseUrl}/users/${encodeURIComponent(user.id)}/tweets`;
  const tweetsHeaders = buildXAuthHeaders({
    method: "GET",
    url: tweetsUrl,
    query: {
      max_results: maxTweets,
      "tweet.fields": "created_at",
    },
  });

  const tweetsResponse = await fetch(
    `${tweetsUrl}?max_results=${maxTweets}&tweet.fields=created_at`,
    {
      headers: tweetsHeaders,
      cache: "no-store",
    },
  );

  if (!tweetsResponse.ok) {
    throw new Error("Failed to fetch the latest tweets from X.");
  }

  const tweetsPayload = (await tweetsResponse.json()) as {
    data?: Array<{
      id?: string;
      text?: string;
      created_at?: string;
    }>;
  };

  const tweets = (tweetsPayload.data ?? [])
    .map((tweet) => ({
      id: tweet.id ?? randomUUID(),
      text: trim(tweet.text),
      createdAt: trimOrNull(tweet.created_at),
    }))
    .filter((tweet) => Boolean(tweet.text));

  if (!tweets.length) {
    throw new Error("The X profile has no tweets available to build the autobiography.");
  }

  return {
    profile: {
      displayName: trim(user.name) || normalized.username,
      username: user.username,
      profileUrl: normalized.profileUrl,
      description: trimOrNull(user.description),
      profileImageUrl: trimOrNull(user.profile_image_url),
    },
    tweets,
    transcript: tweets
      .map((tweet, index) => `${index + 1}. ${tweet.text}`)
      .join("\n"),
  };
}
