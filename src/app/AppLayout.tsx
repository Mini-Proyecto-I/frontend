import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader';

export function AppLayout() {
  return (
    <div className="min-h-screen w-full flex flex-col bg-[#0A0F1C] text-slate-100 font-sans">
      <AppHeader />
      <main className="flex-1 w-full flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
