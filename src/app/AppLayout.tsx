import * as React from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/shared/components/sidebar';
import { AppSidebar } from './AppSidebar';
import { Outlet } from 'react-router-dom';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  
  // Asegurar que el sidebar esté expandido al cargar
  React.useEffect(() => {
    // Eliminar cookie previa si existe
    document.cookie = 'sidebar:state=; path=/; max-age=0';
    setSidebarOpen(true);
  }, []);

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-12 items-center border-b border-border px-4">
            <SidebarTrigger />
          </header>
          <div className="flex-1 overflow-auto p-6">
            <Outlet />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
