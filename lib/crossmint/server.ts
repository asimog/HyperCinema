import { getEnv } from "@/lib/env";
import { CrossmintAuth, createCrossmint } from "@crossmint/server-sdk";
import type { AuthSession } from "@crossmint/common-sdk-auth";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

let cachedAuth:
  | ReturnType<typeof CrossmintAuth.from>
  | null = null;

function getCrossmintAuthServer() {
  if (cachedAuth) {
    return cachedAuth;
  }

  const env = getEnv();
  if (!env.CROSSMINT_SERVER_API_KEY) {
    return null;
  }

  const crossmint = createCrossmint({
    apiKey: env.CROSSMINT_SERVER_API_KEY,
  });

  cachedAuth = CrossmintAuth.from(crossmint, {
    cookieOptions: {
      httpOnly: true,
      secure: env.APP_BASE_URL.startsWith("https://"),
      sameSite: "Lax",
      domain: env.CROSSMINT_COOKIE_DOMAIN,
    },
  });

  return cachedAuth;
}

async function resolveSession(input: {
  jwt?: string | null;
  refreshToken?: string | null;
}): Promise<AuthSession | null> {
  const auth = getCrossmintAuthServer();
  if (!auth || !input.refreshToken) {
    return null;
  }

  try {
    return await auth.getSession({
      jwt: input.jwt ?? undefined,
      refreshToken: input.refreshToken,
    });
  } catch {
    return null;
  }
}

export async function getCrossmintSessionFromCookies(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  return resolveSession({
    jwt: cookieStore.get("crossmint-session")?.value ?? null,
    refreshToken: cookieStore.get("crossmint-refresh-token")?.value ?? null,
  });
}

export async function getCrossmintSessionFromRequest(
  request: NextRequest,
): Promise<AuthSession | null> {
  return resolveSession({
    jwt: request.cookies.get("crossmint-session")?.value ?? null,
    refreshToken: request.cookies.get("crossmint-refresh-token")?.value ?? null,
  });
}

export function getCrossmintAuthHandler() {
  return getCrossmintAuthServer();
}

export async function getCrossmintViewerFromCookies(): Promise<{
  userId: string;
  email: string | null;
} | null> {
  const session = await getCrossmintSessionFromCookies();
  const auth = getCrossmintAuthServer();

  if (!session?.userId || !auth) {
    return null;
  }

  try {
    const user = await auth.getUser(session.userId);
    const email =
      typeof user?.email === "string"
        ? user.email
        : typeof user?.emailAddress === "string"
          ? user.emailAddress
          : null;

    return {
      userId: session.userId,
      email,
    };
  } catch {
    return {
      userId: session.userId,
      email: null,
    };
  }
}

export function isCrossmintAdmin(input: {
  email?: string | null;
  userId?: string | null;
}): boolean {
  const allowlist = getEnv().CROSSMINT_ADMIN_ALLOWLIST;
  if (!allowlist) {
    return false;
  }

  const allowed = allowlist
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const normalizedEmail = input.email?.trim().toLowerCase();
  const normalizedUserId = input.userId?.trim().toLowerCase();

  return (
    (normalizedEmail ? allowed.includes(normalizedEmail) : false) ||
    (normalizedUserId ? allowed.includes(normalizedUserId) : false)
  );
}
