import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, MenuItem } from '../types';

interface CartState {
  items: CartItem[];
  kitchenId: string | null;
  addItem: (menuItem: MenuItem, kitchenId: string) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      kitchenId: null,
      addItem: (menuItem, kitchenId) => {
        const currentKitchenId = get().kitchenId;
        
        if (currentKitchenId && currentKitchenId !== kitchenId) {
          set({ items: [], kitchenId });
        }
        
        const items = get().items;
        const existingItem = items.find((item) => item.menuItem.id === menuItem.id);
        
        if (existingItem) {
          set({
            items: items.map((item) =>
              item.menuItem.id === menuItem.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          });
        } else {
          set({
            items: [...items, { menuItem, quantity: 1 }],
            kitchenId,
          });
        }
      },
      removeItem: (menuItemId) => {
        const items = get().items.filter((item) => item.menuItem.id !== menuItemId);
        set({
          items,
          kitchenId: items.length === 0 ? null : get().kitchenId,
        });
      },
      updateQuantity: (menuItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(menuItemId);
          return;
        }
        set({
          items: get().items.map((item) =>
            item.menuItem.id === menuItemId ? { ...item, quantity } : item
          ),
        });
      },
      clearCart: () => set({ items: [], kitchenId: null }),
      getTotal: () => {
        return get().items.reduce(
          (total, item) => total + item.menuItem.price * item.quantity,
          0
        );
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);
