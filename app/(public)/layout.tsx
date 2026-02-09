import ClientSidebar from '@/components/ClientSidebar';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      <ClientSidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-64 overflow-hidden bg-[#F9FAFB]">
        {/* Content - pt-16 to account for fixed header height */}
        <main className="flex-1 overflow-y-auto pt-16">
          {children}
        </main>
      </div>
    </div>
  );
}
