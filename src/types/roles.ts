export const ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "RECEPTIONIST",
  "DOCTOR",
  "NURSE",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  RECEPTIONIST: "Receptionist",
  DOCTOR: "Doctor",
  NURSE: "Nurse",
};

/** Roles that SUPER_ADMIN may assign when creating accounts. */
export const ASSIGNABLE_BY_SUPER_ADMIN: Role[] = [
  "ADMIN",
  "RECEPTIONIST",
  "DOCTOR",
  "NURSE",
  "SUPER_ADMIN",
];

/** Roles that ADMIN may assign (never SUPER_ADMIN). */
export const ASSIGNABLE_BY_ADMIN: Role[] = [
  "RECEPTIONIST",
  "DOCTOR",
  "NURSE",
];
