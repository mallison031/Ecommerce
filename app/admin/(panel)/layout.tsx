import { redirect } from "next/navigation";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import AdminSignOutButton from "@/components/admin/admin-sign-out-button";

export const dynamic = "force-dynamic";

// First authoritative check for the panel UI. Middleware only proves a cookie exists; this
// is where the session is looked up in the database. The admin API routes check again —
// this layout renders the shell, it is not what protects the data.
export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <>
      <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold truncate">
          Signed in as {admin.email}
          <span className="ml-2 px-2 py-0.5 rounded-full bg-white/10 text-white/80 font-normal lowercase">
            {admin.role}
          </span>
        </span>
        <AdminSignOutButton />
      </div>
      {children}
    </>
  );
}
