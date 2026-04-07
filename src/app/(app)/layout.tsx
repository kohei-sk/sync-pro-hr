import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="w-full flex flex-1 overflow-y-auto bg-gray-50">
        <div className="w-full flex-1 px-8 pt-7 pb-8 max-w-4xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
