import { describe, expect, it } from "vitest";
import { roleHasPermission } from "@/types/permissions";

describe("roleHasPermission", () => {
  it("allows SUPER_ADMIN hospital-wide permissions", () => {
    expect(roleHasPermission("SUPER_ADMIN", "reports:revenue")).toBe(true);
    expect(roleHasPermission("SUPER_ADMIN", "users:create_super_admin")).toBe(
      true,
    );
  });

  it("prevents ADMIN from creating Super Admin", () => {
    expect(roleHasPermission("ADMIN", "users:create_super_admin")).toBe(false);
    expect(roleHasPermission("ADMIN", "users:manage")).toBe(true);
  });

  it("keeps clinical write permissions role-scoped", () => {
    expect(roleHasPermission("DOCTOR", "clinical:prescriptions")).toBe(true);
    expect(roleHasPermission("NURSE", "clinical:prescriptions")).toBe(false);
    expect(roleHasPermission("NURSE", "clinical:vitals")).toBe(true);
    expect(roleHasPermission("RECEPTIONIST", "clinical:notes")).toBe(false);
  });

  it("scopes patient registration and demographics by role", () => {
    expect(roleHasPermission("RECEPTIONIST", "patients:register")).toBe(true);
    expect(roleHasPermission("RECEPTIONIST", "patients:update_demographics")).toBe(
      true,
    );
    expect(roleHasPermission("DOCTOR", "patients:read")).toBe(true);
    expect(roleHasPermission("DOCTOR", "patients:register")).toBe(false);
    expect(roleHasPermission("NURSE", "patients:update_demographics")).toBe(false);
  });

  it("scopes appointment permissions by role", () => {
    expect(roleHasPermission("RECEPTIONIST", "appointments:manage")).toBe(true);
    expect(roleHasPermission("RECEPTIONIST", "appointments:check_in")).toBe(true);
    expect(roleHasPermission("DOCTOR", "appointments:read")).toBe(true);
    expect(roleHasPermission("DOCTOR", "appointments:manage")).toBe(false);
    expect(roleHasPermission("NURSE", "appointments:check_in")).toBe(false);
  });

  it("scopes IPD permissions by role", () => {
    expect(roleHasPermission("RECEPTIONIST", "ipd:admit")).toBe(true);
    expect(roleHasPermission("RECEPTIONIST", "ipd:discharge")).toBe(false);
    expect(roleHasPermission("RECEPTIONIST", "ipd:manage_beds")).toBe(false);
    expect(roleHasPermission("DOCTOR", "ipd:read")).toBe(true);
    expect(roleHasPermission("DOCTOR", "ipd:discharge")).toBe(true);
    expect(roleHasPermission("DOCTOR", "ipd:admit")).toBe(false);
    expect(roleHasPermission("NURSE", "ipd:read")).toBe(true);
    expect(roleHasPermission("NURSE", "ipd:admit")).toBe(false);
    expect(roleHasPermission("ADMIN", "ipd:manage_beds")).toBe(true);
  });
});
