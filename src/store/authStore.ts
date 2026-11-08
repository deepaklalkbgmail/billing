import { create } from 'zustand';

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'BRANCH_MANAGER' | 'CASHIER';
  branchId: string | null;
  branchName?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  activeBranchId: string | null;
  activeBranchName: string | null;

  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  setActiveBranch: (branchId: string, branchName: string) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Initialize from localStorage
  const storedToken = localStorage.getItem('restopos_token');
  const storedUser = localStorage.getItem('restopos_user');
  const storedBranchId = localStorage.getItem('restopos_branch_id');
  const storedBranchName = localStorage.getItem('restopos_branch_name');

  return {
    user: storedUser ? JSON.parse(storedUser) : null,
    token: storedToken,
    isAuthenticated: !!storedToken,
    activeBranchId: storedBranchId,
    activeBranchName: storedBranchName,

    login: (user, token) => {
      localStorage.setItem('restopos_token', token);
      localStorage.setItem('restopos_user', JSON.stringify(user));
      
      // Set default active branch
      const branchId = user.branchId || '';
      const branchName = user.branchName || '';
      localStorage.setItem('restopos_branch_id', branchId);
      localStorage.setItem('restopos_branch_name', branchName);

      set({
        user,
        token,
        isAuthenticated: true,
        activeBranchId: branchId || null,
        activeBranchName: branchName || null,
      });
    },

    logout: () => {
      localStorage.removeItem('restopos_token');
      localStorage.removeItem('restopos_user');
      localStorage.removeItem('restopos_branch_id');
      localStorage.removeItem('restopos_branch_name');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        activeBranchId: null,
        activeBranchName: null,
      });
    },

    setActiveBranch: (branchId, branchName) => {
      localStorage.setItem('restopos_branch_id', branchId);
      localStorage.setItem('restopos_branch_name', branchName);
      set({ activeBranchId: branchId, activeBranchName: branchName });
    },
  };
});

