import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { secLog } from "@/lib/security-logger";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const path = url.searchParams.get("path");
    const bucket = url.searchParams.get("bucket") || "listing-photos";
    const redirect = url.searchParams.get("redirect") === "1" || url.searchParams.get("redirect") === "true";

    if (!path) {
      return NextResponse.json({ error: "path required" }, { status: 400 });
    }

    // Basic validation: prevent path traversal
    if (path.includes("..")) {
      return NextResponse.json({ error: "invalid path" }, { status: 400 });
    }

    // Rate limit by IP
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rl = checkRateLimit(`signed_url:${ip}`, RATE_LIMITS.general ?? { window: 60, max: 30 });
    if (!rl.allowed) {
      secLog("rate_limit_signed_url", { ip, path, bucket });
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const admin = createAdminClient();
    let data: any = null;
    let error: any = null;
    try {
      const res = await (admin as any)
        .storage
        .from(bucket)
        .createSignedUrl(path, 60); // 60s expiry
      data = res.data;
      error = res.error;
    } catch (err: any) {
      error = err;
    }

    if (error || !data?.signedUrl) {
      const errMsg = (error && (error.message || error))?.toString() || "failed to create signed url";
      secLog("signed_url_error", { ip, path, bucket, error: errMsg });
      // Common misconfiguration: SUPABASE_SERVICE_ROLE_KEY invalid/missing leads to "Invalid Compact JWS"
      if (errMsg.includes("Invalid Compact JWS") || errMsg.includes("JWT")) {
        return NextResponse.json(
          { error: "Invalid SUPABASE_SERVICE_ROLE_KEY. Check your environment variable and restart the server." },
          { status: 502 },
        );
      }
      return NextResponse.json({ error: errMsg }, { status: 500 });
    }

    secLog("signed_url_generated", { ip, path, bucket });

    if (redirect) {
      return NextResponse.redirect(data.signedUrl);
    }

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "internal error" }, { status: 500 });
  }
}

