import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import {
  LayoutDashboard,
  ShoppingCart,
  UtensilsCrossed,
  Package,
  Truck,
  Wallet,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Store,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/lib/useMediaQuery';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  roles: string[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
    roles: ['SUPER_ADMIN', 'BRANCH_MANAGER'],
  },
  {
    label: 'POS Billing',
    icon: ShoppingCart,
    href: '/pos',
    roles: ['SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER'],
  },
  {
    label: 'Menu Manager',
    icon: UtensilsCrossed,
    href: '/menu',
    roles: ['SUPER_ADMIN', 'BRANCH_MANAGER'],
  },
  {
    label: 'Inventory',
    icon: Package,
    href: '/inventory',
    roles: ['SUPER_ADMIN', 'BRANCH_MANAGER'],
  },
  {
    label: 'Purchases',
    icon: Truck,
    href: '/purchases',
    roles: ['SUPER_ADMIN', 'BRANCH_MANAGER'],
  },
  {
    label: 'Expenses',
    icon: Wallet,
    href: '/expenses',
    roles: ['SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER'],
  },
  {
    label: 'Day Close',
    icon: Store,
    href: '/day-close',
    roles: ['SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER'],
  },
  {
    label: 'Reports',
    icon: BarChart3,
    href: '/reports',
    roles: ['SUPER_ADMIN', 'BRANCH_MANAGER'],
  },
  {
    label: 'Settings',
    icon: Settings,
    href: '/settings',
    roles: ['SUPER_ADMIN'],
  },
];

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed: collapsedPref, toggleSidebar, mobileNavOpen, setMobileNavOpen } = useUIStore();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  // Collapsed (icon-only) mode only applies on desktop; the mobile drawer is always full width
  const sidebarCollapsed = collapsedPref && isDesktop;

  // Close the drawer whenever the route changes
  React.useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const filteredNav = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <TooltipProvider delayDuration={0}>
      {/* Backdrop for the mobile/tablet drawer */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'flex flex-col border-r bg-card transition-all duration-300',
          // phones & tablets: off-canvas drawer; desktop: static column
          'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] lg:static lg:z-auto lg:max-w-none',
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          sidebarCollapsed ? 'lg:w-16' : 'lg:w-60'
        )}
      >
        {/* Logo / Brand */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!sidebarCollapsed && (
            <Link to="/dashboard" className="flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold text-primary">RestoPOS</span>
            </Link>
          )}
          {/* Close button (phones/tablets) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileNavOpen(false)}
            className="ml-auto lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            className="ml-auto hidden lg:inline-flex"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;

            const link = (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-3 lg:py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  sidebarCollapsed && 'justify-center px-0'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );

            if (sidebarCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return link;
          })}
        </nav>

        {/* User / Logout */}
        <div className="border-t p-2">
          {!sidebarCollapsed && user && (
            <div className="mb-2 px-3 py-1">
              <p className="text-sm font-medium truncate">{user.fullName}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {user.role.replace(/_/g, ' ').toLowerCase()}
              </p>
            </div>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'w-full text-destructive hover:text-destructive hover:bg-destructive/10',
                  sidebarCollapsed ? 'justify-center px-0' : 'justify-start'
                )}
                onClick={logout}
              >
                <LogOut className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && <span className="ml-3">Logout</span>}
              </Button>
            </TooltipTrigger>
            {sidebarCollapsed && (
              <TooltipContent side="right">Logout</TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}

