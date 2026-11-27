// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const createClient = vi.hoisted(() => vi.fn());
vi.mock("@supabase/supabase-js", () => ({ createClient }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("listing photo URL policy", () => {
  it("returns a public photo URL with the public client", async () => {
    const publicUrl = "https://storage.example.test/listing-photos/cover.jpg";
    const getPublicUrl = vi.fn(() => ({ data: { publicUrl } }));
    const from = vi.fn(() => ({ getPublicUrl }));
    createClient.mockReturnValue({ storage: { from } });
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://storage.example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "fixture-public-key");

    const res = await GET(new Request("https://site.example.test/api/storage/signed?path=cover.jpg"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ signedUrl: publicUrl });
    expect(createClient).toHaveBeenCalledWith("https://storage.example.test", "fixture-public-key", expect.any(Object));
    expect(from).toHaveBeenCalledWith("listing-photos");
    expect(getPublicUrl).toHaveBeenCalledWith("cover.jpg");
  });

  it("rejects a bucket outside the public policy before creating a storage client", async () => {
    const res = await GET(new Request("https://site.example.test/api/storage/signed?path=cover.jpg&bucket=fixture-other"));
    expect(res.status).toBe(403);
    expect(createClient).not.toHaveBeenCalled();
  });
});
