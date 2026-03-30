import { redirect } from "next/navigation";

import { LoginPageClient } from "@/components/auth/LoginPageClient";
import { getCrossmintViewerFromCookies } from "@/lib/crossmint/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const viewer = await getCrossmintViewerFromCookies();
  const { next } = await searchParams;
  const returnTo = next ?? "/";

  if (viewer) {
    redirect(returnTo);
  }

  return <LoginPageClient next={returnTo} />;
}
