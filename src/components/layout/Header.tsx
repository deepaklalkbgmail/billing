import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { branchAPI } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Moon, Sun, Monitor, Keyboard, Mouse, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Branch {
  id: string;
  name: string;
  code: string;
}

export function Header() {
  const { user, activeBranchId, activeBranchName, setActiveBranch } = useAuthStore();
  const { theme, setTheme, keyboardMode, toggleKeyboardMode } = useUIStore();
  const [branches, setBranches] = React.useState<Branch[]>([]);

  React.useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') {
      branchAPI.getAll().then((res) => setBranches(res.data.data || [])).catch(() => {});
    }
  }, [user]);

  const themeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const ThemeIcon = themeIcon;

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      {/* Left: Branch info */}
      <div className="flex items-center gap-4">
        {user?.role === 'SUPER_ADMIN' && branches.length > 0 ? (
          <Select
            value={activeBranchId || ''}
            onValueChange={(value) => {
              const branch = branches.find((b) => b.id === value);
              if (branch) setActiveBranch(branch.id, branch.name);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {activeBranchName || 'No Branch'}
            </Badge>
          </div>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2">
        {/* Keyboard/Mouse Mode Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleKeyboardMode}
          title={keyboardMode ? 'Keyboard Mode (Click for Touch)' : 'Touch Mode (Click for Keyboard)'}
        >
          {keyboardMode ? (
            <Keyboard className="h-5 w-5" />
          ) : (
            <Mouse className="h-5 w-5" />
          )}
        </Button>

        {/* Theme Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <ThemeIcon className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme('light')}>
              <Sun className="mr-2 h-4 w-4" /> Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              <Moon className="mr-2 h-4 w-4" /> Dark
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setTheme('system')}>
              <Monitor className="mr-2 h-4 w-4" /> System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Info */}
        <div className="flex items-center gap-2 ml-2 pl-2 border-l">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium leading-none">{user?.fullName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {user?.role.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

