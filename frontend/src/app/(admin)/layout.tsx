import { RequireRole } from '@/components/require-role';
import { AdminShell } from '@/components/admin/admin-shell';

/** Layout for signed-in administrators: header, section sidebar, content. */
export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <RequireRole role="ADMIN">
      <AdminShell>{children}</AdminShell>
    </RequireRole>
  );
}
