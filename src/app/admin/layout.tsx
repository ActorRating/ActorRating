import { MainLayout } from "@/components/layout"

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