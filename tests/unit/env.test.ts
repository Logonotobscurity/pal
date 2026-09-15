import { afterEach, describe, expect, it, vi } from "vitest";
import { EnvConfigError, getPublicEnv, getServerEnv } from "@/lib/env";

const VALID_PUBLIC = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getPublicEnv", () => {
  it("returns parsed values when configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", VALID_PUBLIC.NEXT_PUBLIC_SUPABASE_URL);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", VALID_PUBLIC.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    expect(getPublicEnv()).toEqual(VALID_PUBLIC);
  });

  it("throws EnvConfigError naming missing variables", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    expect(() => getPublicEnv()).toThrow(EnvConfigError);
    try {
      getPublicEnv();
    } catch (err) {
      const missing = (err as EnvConfigError).missing;
      expect(missing).toContain("NEXT_PUBLIC_SUPABASE_URL");
      expect(missing).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
  });

  it("reports an invalid URL as invalid, not missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not-a-url");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");

    try {
      getPublicEnv();
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as EnvConfigError).missing).toEqual(["NEXT_PUBLIC_SUPABASE_URL"]);
    }
  });
});

describe("getServerEnv", () => {
  it("requires the service role key in addition to public vars", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", VALID_PUBLIC.NEXT_PUBLIC_SUPABASE_URL);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", VALID_PUBLIC.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
    vi.stubEnv("SAHARA_API_SECRET", "sahara-secret");
    vi.stubEnv("OPENAI_API_KEY", "openai-key");

    expect(getServerEnv().SUPABASE_SERVICE_ROLE_KEY).toBe("service-key");
    expect(getServerEnv().SAHARA_API_SECRET).toBe("sahara-secret");
    expect(getServerEnv().OPENAI_API_KEY).toBe("openai-key");
  });

  it("throws when the service role key is absent", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", VALID_PUBLIC.NEXT_PUBLIC_SUPABASE_URL);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", VALID_PUBLIC.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("SAHARA_API_SECRET", "");
    vi.stubEnv("OPENAI_API_KEY", "");

    try {
      getServerEnv();
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as EnvConfigError).missing).toEqual([
        "SUPABASE_SERVICE_ROLE_KEY",
        "SAHARA_API_SECRET",
        "OPENAI_API_KEY",
      ]);
    }
  });
});
