import { redirect } from "next/navigation";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import AdminLoginForm from "@/components/admin/admin-login-form";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const admin = await getAuthenticatedAdmin();
  if (admin) redirect("/admin");

  return <AdminLoginForm />;
}
