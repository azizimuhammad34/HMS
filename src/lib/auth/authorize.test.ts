import { describe, expect, it } from "vitest";
import { canAssignRole } from "@/lib/auth/authorize";
import type { AuthUser } from "@/lib/auth/session";

const superAdmin: AuthUser = {
  id: "1",
  email: "owner@example.com",
  fullName: "Owner",
  role: "SUPER_ADMIN",
  mustChangePassword: false,
};

const admin: AuthUser = {
  id: "2",
  email: "admin@example.com",
  fullName: "Admin",
  role: "ADMIN",
  mustChangePassword: false,
};

describe("canAssignRole", () => {
  it("allows Super Admin to assign any role including Super Admin", () => {
    expect(canAssignRole(superAdmin, "SUPER_ADMIN")).toBe(true);
    expect(canAssignRole(superAdmin, "DOCTOR")).toBe(true);
  });

  it("blocks Admin from creating Super Admin", () => {
    expect(canAssignRole(admin, "SUPER_ADMIN")).toBe(false);
    expect(canAssignRole(admin, "ADMIN")).toBe(false);
    expect(canAssignRole(admin, "NURSE")).toBe(true);
  });
});
