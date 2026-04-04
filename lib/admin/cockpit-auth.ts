import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";

const COCKPIT_COOKIE_NAME = "hypercinema-cockpit";
const COCKPIT_COOKIE_VALUE = "hypercinema-cockpit-ok";

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function validateCockpitCredentials(input: {
  username: string;
  password: string;
}): boolean {
  const env = getEnv();
  return (
    safeEqual(input.username, env.COCKPIT_USERNAME) &&
    safeEqual(input.password, env.COCKPIT_PASSWORD)
  );
}

export async function hasCockpitAccess(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(COCKPIT_COOKIE_NAME)?.value === COCKPIT_COOKIE_VALUE;
}

export const cockpitSessionCookie = {
  name: COCKPIT_COOKIE_NAME,
  value: COCKPIT_COOKIE_VALUE,
};
