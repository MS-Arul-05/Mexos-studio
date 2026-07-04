import { create } from 'zustand';

interface WishlistState {
  ids: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
  clear: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  ids: [],
  toggle: (id) => {
    set((s) => ({
      ids: s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [...s.ids, id],
    }));
  },
  has: (id) => get().ids.includes(id),
  clear: () => set({ ids: [] }),
}));
