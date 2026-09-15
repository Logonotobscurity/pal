import { describe, expect, it } from "vitest";
import { LoginSchema, RegisterSchema } from "@/core/schemas/auth";
import { WorkspaceCreateSchema } from "@/core/schemas/workspace";

describe("RegisterSchema", () => {
  it("accepts a valid registration", () => {
    const result = RegisterSchema.safeParse({
      email: "ngozi@example.com",
      password: "correct-horse-battery",
      displayName: "Ngozi",
    });
    expect(result.success).toBe(true);
  });

  it("trims the display name", () => {
    const result = RegisterSchema.parse({
      email: "ngozi@example.com",
      password: "correct-horse-battery",
      displayName: "  Ngozi  ",
    });
    expect(result.displayName).toBe("Ngozi");
  });

  it.each([
    ["rejects a short password", { email: "a@example.com", password: "short", displayName: "A" }],
    ["rejects a bad email", { email: "not-an-email", password: "longenough1", displayName: "A" }],
    ["rejects an empty display name", { email: "a@example.com", password: "longenough1", displayName: "   " }],
  ])("%s", (_label, input) => {
    expect(RegisterSchema.safeParse(input).success).toBe(false);
  });
});

describe("LoginSchema", () => {
  it("accepts valid credentials", () => {
    expect(
      LoginSchema.safeParse({ email: "a@example.com", password: "whatever" }).success,
    ).toBe(true);
  });

  it("rejects an empty password", () => {
    expect(
      LoginSchema.safeParse({ email: "a@example.com", password: "" }).success,
    ).toBe(false);
  });
});

describe("WorkspaceCreateSchema", () => {
  it("accepts a valid name", () => {
    expect(WorkspaceCreateSchema.safeParse({ name: "Main Workshop" }).success).toBe(true);
  });

  it.each([
    ["rejects an empty name", { name: "   " }],
    ["rejects a too-long name", { name: "x".repeat(121) }],
  ])("%s", (_label, input) => {
    expect(WorkspaceCreateSchema.safeParse(input).success).toBe(false);
  });
});
