import { redirect } from "next/navigation";
import { CreateUserForm } from "@/components/users/CreateUserForm";
import { getSessionFromCookies } from "@/lib/auth/session";
import { connectDb } from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";
import { roleHasPermission } from "@/types/permissions";
import { ROLE_LABELS, type Role } from "@/types/roles";

export default async function UsersPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  if (!roleHasPermission(session.user.role, "users:manage")) {
    redirect("/dashboard");
  }

  await connectDb();
  const users = await User.find()
    .sort({ createdAt: -1 })
    .select("email fullName role isActive mustChangePassword createdAt")
    .lean();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Users</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Create staff accounts with a temporary password. Credentials are never
          emailed or written to logs.
        </p>
      </div>

      <CreateUserForm actorRole={session.user.role} />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">
          Existing accounts
        </h2>
        <div className="overflow-x-auto border-t border-[var(--color-border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-[var(--color-text-muted)]">
              <tr>
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Email</th>
                <th className="py-2 pr-4 font-medium">Role</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {users.map((u) => (
                <tr key={String(u._id)}>
                  <td className="py-2.5 pr-4 font-medium">{u.fullName}</td>
                  <td className="py-2.5 pr-4">{u.email}</td>
                  <td className="py-2.5 pr-4">
                    {ROLE_LABELS[u.role as Role]}
                  </td>
                  <td className="py-2.5">
                    {u.isActive ? "Active" : "Inactive"}
                    {u.mustChangePassword ? " · Must change password" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
