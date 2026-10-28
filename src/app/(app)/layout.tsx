import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { getSessionFromCookies } from "@/lib/auth/session";
import { connectDb } from "@/lib/db/connection";
import { HospitalSettings } from "@/lib/db/models/HospitalSettings";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect("/login");
  }

  let hospitalName = " Hospital Management System";
  try {
    await connectDb();
    const settings = await HospitalSettings.findOne({ key: "default" }).lean();
    if (settings?.hospitalName) {
      hospitalName = settings.hospitalName;
    }
  } catch {
    // Keep default name if settings cannot be loaded.
  }

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <div className="hidden md:flex">
        <Sidebar role={session.user.role} hospitalName={hospitalName} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar fullName={session.user.fullName} role={session.user.role} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
