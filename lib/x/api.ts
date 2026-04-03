import { randomUUID } from "crypto";

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

function decodeHandleSegment(value: string): string {
  return decodeURIComponent(value).replace(/^@+/, "").trim();
}

export function normalizeXProfileInput(input: string): {
  username: string | null;
  profileUrl: string | null;
} {
  const trimmed = trim(input);
  if (!trimmed) {
    return { username: null, profileUrl: null };
  }

  if (!trimmed.includes("://") && !trimmed.includes("x.com") && !trimmed.includes("twitter.com")) {
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
    const parsed = new URL(trimmed);
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
  const bearerToken = process.env.X_API_BEARER_TOKEN?.trim();
  const baseUrl = process.env.X_API_BASE_URL?.trim() || "https://api.x.com/2";

  if (!bearerToken) {
    throw new Error("X API bearer token is not configured yet.");
  }

  const normalized = normalizeXProfileInput(input.profileInput);
  if (!normalized.username || !normalized.profileUrl) {
    throw new Error("Enter a valid X profile link or @handle.");
  }

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const maxTweets = Math.max(1, Math.min(10, input.maxTweets ?? 10));
  const headers = {
    Authorization: `Bearer ${bearerToken}`,
    Accept: "application/json",
    "User-Agent": "HyperMythsX/1.0",
  };

  const userResponse = await fetch(
    `${normalizedBaseUrl}/users/by/username/${encodeURIComponent(normalized.username)}?user.fields=description,profile_image_url,name,username`,
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

  const tweetsResponse = await fetch(
    `${normalizedBaseUrl}/users/${encodeURIComponent(user.id)}/tweets?max_results=${maxTweets}&tweet.fields=created_at`,
    {
      headers,
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
