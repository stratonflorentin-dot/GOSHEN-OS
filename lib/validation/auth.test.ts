import { describe, expect, it } from "vitest";
import { signInSchema, signUpSchema } from "./auth";

describe("authentication input validation", () => {
  it("accepts a valid signup", () => {
    expect(
      signUpSchema.safeParse({
        fullName: "Amina Tesha",
        email: "amina@example.com",
        password: "secure-password-123",
      }).success,
    ).toBe(true);
  });

  it("rejects invalid email, short password, and oversized passwords", () => {
    expect(signUpSchema.safeParse({ fullName: "Amina", email: "bad", password: "short" }).success).toBe(false);
    expect(signUpSchema.safeParse({ fullName: "Amina", email: "amina@example.com", password: "x".repeat(73) }).success).toBe(false);
  });

  it("requires a valid email and minimum password for sign-in", () => {
    expect(signInSchema.safeParse({ email: "amina@example.com", password: "12345678" }).success).toBe(true);
    expect(signInSchema.safeParse({ email: "amina@example.com", password: "short" }).success).toBe(false);
  });
});
