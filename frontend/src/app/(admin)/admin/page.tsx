import type { Metadata } from 'next';
import { ADMIN_SECTIONS } from '@/components/admin/admin-sections';
import { AdminOverview } from '@/components/admin/admin-overview';

const section = ADMIN_SECTIONS.overview;

export const metadata: Metadata = { title: section.label };

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{section.label}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {section.description}
        </p>
      </header>
      <AdminOverview />
    </div>
  );
}
