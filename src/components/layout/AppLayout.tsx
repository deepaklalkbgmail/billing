import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const location = useLocation();
  const isPos = location.pathname === '/pos';

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className={cn('flex-1', isPos ? 'overflow-y-auto lg:overflow-hidden p-2 sm:p-2.5 flex flex-col' : 'overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6')}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
