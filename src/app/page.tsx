import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/session";
import { connectDb } from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";

export default async function HomePage() {
  const session = await getSessionFromCookies();
  if (session) {
    redirect("/dashboard");
  }

  try {
    await connectDb();
    const hasSuperAdmin = await User.exists({ role: "SUPER_ADMIN" });
    if (!hasSuperAdmin) {
      redirect("/setup");
    }
  } catch {
    // DB may be unavailable during first boot; send user to login.
  }

  redirect("/login");
}
