import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface UIState {
  theme: Theme;
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean; // off-canvas menu on phones/tablets
  setMobileNavOpen: (open: boolean) => void;
  keyboardMode: boolean; // true = keyboard-first POS, false = mouse/touch
  showShortCodes: boolean; // show item short codes on cards

  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleKeyboardMode: () => void;
  setKeyboardMode: (mode: boolean) => void;
  toggleShortCodes: () => void;
}

export const useUIStore = create<UIState>((set, get) => {
  const storedTheme = (localStorage.getItem('restopos_theme') as Theme) || 'light';
  const storedKeyboardMode = localStorage.getItem('restopos_keyboard_mode') === 'true';

  // Apply theme to document
  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // system
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  // Apply initial theme
  setTimeout(() => applyTheme(storedTheme), 0);

  return {
    theme: storedTheme,
    sidebarCollapsed: false,
    mobileNavOpen: false,
    setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
    keyboardMode: storedKeyboardMode,
    showShortCodes: true,

    setTheme: (theme) => {
      localStorage.setItem('restopos_theme', theme);
      applyTheme(theme);
      set({ theme });
    },

    toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

    setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

    toggleKeyboardMode: () => {
      const newMode = !get().keyboardMode;
      localStorage.setItem('restopos_keyboard_mode', String(newMode));
      set({ keyboardMode: newMode });
    },

    setKeyboardMode: (mode) => {
      localStorage.setItem('restopos_keyboard_mode', String(mode));
      set({ keyboardMode: mode });
    },

    toggleShortCodes: () => set((s) => ({ showShortCodes: !s.showShortCodes })),
  };
});

