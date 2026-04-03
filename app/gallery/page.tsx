import { redirect } from "next/navigation";

export default async function GalleryPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string }> | { token?: string };
}) {
  const params = (await Promise.resolve(searchParams)) ?? {};
  const tokenQuery = params.token?.trim() ?? "";
  const target = tokenQuery ? `/trending?token=${encodeURIComponent(tokenQuery)}` : "/trending";
  redirect(target);
}
