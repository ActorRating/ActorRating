import { MainLayout } from "@/components/layout"

export const dynamic = "force-dynamic"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MainLayout showSidebar={true} showBreadcrumbs={true}>
      {children}
    </MainLayout>
  );
} 