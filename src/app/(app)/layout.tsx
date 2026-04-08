import { Sidebar } from "@/components/layout/sidebar";
import { ContentWrapper } from "@/components/layout/content-wrapper";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="w-full flex flex-1 overflow-y-auto bg-gray-50">
        <ContentWrapper>{children}</ContentWrapper>
      </main>
    </div>
  );
}
