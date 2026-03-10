import { NextRequest } from "next/server";
import { isIP } from "node:net";

function normalizeIp(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return isIP(trimmed) ? trimmed : null;
}

export function getRequestIp(request: NextRequest): string {
  const realIp = normalizeIp(request.headers.get("x-real-ip"));
  if (realIp) {
    return realIp;
  }

  const cloudflareIp = normalizeIp(request.headers.get("cf-connecting-ip"));
  if (cloudflareIp) {
    return cloudflareIp;
  }

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const chain = forwarded
      .split(",")
      .map((part) => normalizeIp(part))
      .filter((ip): ip is string => Boolean(ip));

    // Most proxies append to X-Forwarded-For; the right-most trusted hop
    // reduces spoofing compared to blindly trusting the first value.
    const last = chain[chain.length - 1];
    if (last) {
      return last;
    }
  }

  return "unknown";
}
