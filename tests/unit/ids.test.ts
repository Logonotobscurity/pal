import { describe, expect, it } from "vitest";
import { createId, isTraceableId } from "@/lib/utils/ids";

describe("createId", () => {
  it("creates ids with the requested prefix", () => {
    expect(createId("trace")).toMatch(/^trace_[0-9a-f-]{36}$/);
    expect(createId("sess")).toMatch(/^sess_[0-9a-f-]{36}$/);
    expect(createId("proposal")).toMatch(/^proposal_[0-9a-f-]{36}$/);
  });

  it("creates unique ids", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => createId("run")));
    expect(ids.size).toBe(1000);
  });
});

describe("isTraceableId", () => {
  it("accepts ids with the matching prefix and a UUID body", () => {
    const id = createId("execution");
    expect(isTraceableId(id, "execution")).toBe(true);
  });

  it("rejects ids with a different prefix", () => {
    const id = createId("trace");
    expect(isTraceableId(id, "run")).toBe(false);
  });

  it("rejects malformed values", () => {
    expect(isTraceableId("", "trace")).toBe(false);
    expect(isTraceableId("trace_", "trace")).toBe(false);
    expect(isTraceableId("trace_not-a-uuid", "trace")).toBe(false);
  });
});
