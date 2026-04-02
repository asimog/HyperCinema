import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";

const COCKPIT_COOKIE_NAME = "hypercinema-cockpit";
const COCKPIT_USERNAME = "CamiKey";
const COCKPIT_PASSWORD = "8c2c9f16d57aa627dfd1772c85210c3d116b1a4c40a114238ad29cbb8329ae42";
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
  return (
    safeEqual(input.username, COCKPIT_USERNAME) &&
    safeEqual(input.password, COCKPIT_PASSWORD)
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
