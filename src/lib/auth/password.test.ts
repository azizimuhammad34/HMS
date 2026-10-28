import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("hashes and verifies passwords without storing plaintext", async () => {
    const hash = await hashPassword("CorrectHorseBattery1");
    expect(hash).not.toContain("CorrectHorseBattery1");
    expect(await verifyPassword("CorrectHorseBattery1", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });
});
