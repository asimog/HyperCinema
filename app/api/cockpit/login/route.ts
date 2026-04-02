import { NextResponse } from "next/server";

import {
  cockpitSessionCookie,
  validateCockpitCredentials,
} from "@/lib/admin/cockpit-auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!validateCockpitCredentials({ username, password })) {
    return NextResponse.redirect(new URL("/admin/moderation?error=invalid", request.url));
  }

  const response = NextResponse.redirect(new URL("/admin/moderation", request.url));
  response.cookies.set({
    name: cockpitSessionCookie.name,
    value: cockpitSessionCookie.value,
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
