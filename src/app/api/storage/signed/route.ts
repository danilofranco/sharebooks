import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

const LISTING_PHOTOS_BUCKET = "listing-photos";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const bucket = params.get("bucket") ?? LISTING_PHOTOS_BUCKET;
  const path = params.get("path");
  const redirect = params.get("redirect");

  if (bucket !== LISTING_PHOTOS_BUCKET) {
    return NextResponse.json({ error: "bucket not allowed" }, { status: 403 });
  }

  if (
    !path ||
    /[\\%?#\x00-\x1f\x7f]/.test(path) ||
    path.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    return NextResponse.json({ error: "invalid photo path" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  if (!checkRateLimit("listing_photo_url:" + ip, { windowSec: 60, maxRequests: 30 }).allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Photo storage unavailable" }, { status: 503 });
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: { publicUrl } } = supabase.storage.from(LISTING_PHOTOS_BUCKET).getPublicUrl(path);

  if (redirect === "1" || redirect === "true") {
    return NextResponse.redirect(publicUrl);
  }

  // Keep the response field used by existing listing clients.
  return NextResponse.json({ signedUrl: publicUrl });
}
