import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, MenuItem } from '../types';

interface KitchenCart {
  kitchenId: string;
  kitchenName: string;
  items: CartItem[];
}

interface CartState {
  // Legacy single-kitchen support
  items: CartItem[];
  kitchenId: string | null;
  
  // Multi-restaurant support
  multiKitchenCarts: KitchenCart[];
  multiRestaurantMode: boolean;
  
  // Actions
  addItem: (menuItem: MenuItem, kitchenId: string, kitchenName: string) => void;
  removeItem: (menuItemId: string, kitchenId?: string) => void;
  updateQuantity: (menuItemId: string, quantity: number, kitchenId?: string) => void;
  clearCart: () => void;
  clearKitchenCart: (kitchenId: string) => void;
  getTotal: () => number;
  getKitchenTotal: (kitchenId: string) => number;
  enableMultiRestaurant: () => void;
  disableMultiRestaurant: () => void;
  getAllKitchens: () => string[];
  getItemsByKitchen: (kitchenId: string) => CartItem[];
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      kitchenId: null,
      multiKitchenCarts: [],
      multiRestaurantMode: true, // Default enabled for multi-restaurant ordering
      
      addItem: (menuItem, kitchenId, kitchenName) => {
        const { multiRestaurantMode, multiKitchenCarts } = get();
        
        if (!multiRestaurantMode) {
          // Legacy single-kitchen mode
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
        } else {
          // Multi-restaurant mode
          const kitchenCartIndex = multiKitchenCarts.findIndex(
            (cart) => cart.kitchenId === kitchenId
          );
          
          if (kitchenCartIndex >= 0) {
            // Kitchen already in cart
            const kitchenCart = multiKitchenCarts[kitchenCartIndex];
            const existingItem = kitchenCart.items.find(
              (item) => item.menuItem.id === menuItem.id
            );
            
            if (existingItem) {
              // Update quantity
              const updatedCarts = [...multiKitchenCarts];
              updatedCarts[kitchenCartIndex] = {
                ...kitchenCart,
                items: kitchenCart.items.map((item) =>
                  item.menuItem.id === menuItem.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
                ),
              };
              set({ multiKitchenCarts: updatedCarts });
            } else {
              // Add new item
              const updatedCarts = [...multiKitchenCarts];
              updatedCarts[kitchenCartIndex] = {
                ...kitchenCart,
                items: [...kitchenCart.items, { menuItem, quantity: 1 }],
              };
              set({ multiKitchenCarts: updatedCarts });
            }
          } else {
            // New kitchen
            set({
              multiKitchenCarts: [
                ...multiKitchenCarts,
                {
                  kitchenId,
                  kitchenName,
                  items: [{ menuItem, quantity: 1 }],
                },
              ],
            });
          }
        }
      },
      
      removeItem: (menuItemId, kitchenId) => {
        const { multiRestaurantMode, multiKitchenCarts } = get();
        
        if (!multiRestaurantMode) {
          // Legacy mode
          const items = get().items.filter((item) => item.menuItem.id !== menuItemId);
          set({
            items,
            kitchenId: items.length === 0 ? null : get().kitchenId,
          });
        } else {
          // Multi-restaurant mode
          if (!kitchenId) return;
          
          const updatedCarts = multiKitchenCarts
            .map((cart) => {
              if (cart.kitchenId === kitchenId) {
                return {
                  ...cart,
                  items: cart.items.filter((item) => item.menuItem.id !== menuItemId),
                };
              }
              return cart;
            })
            .filter((cart) => cart.items.length > 0); // Remove empty carts
          
          set({ multiKitchenCarts: updatedCarts });
        }
      },
      
      updateQuantity: (menuItemId, quantity, kitchenId) => {
        const { multiRestaurantMode, multiKitchenCarts } = get();
        
        if (quantity <= 0) {
          get().removeItem(menuItemId, kitchenId);
          return;
        }
        
        if (!multiRestaurantMode) {
          // Legacy mode
          set({
            items: get().items.map((item) =>
              item.menuItem.id === menuItemId ? { ...item, quantity } : item
            ),
          });
        } else {
          // Multi-restaurant mode
          if (!kitchenId) return;
          
          const updatedCarts = multiKitchenCarts.map((cart) => {
            if (cart.kitchenId === kitchenId) {
              return {
                ...cart,
                items: cart.items.map((item) =>
                  item.menuItem.id === menuItemId ? { ...item, quantity } : item
                ),
              };
            }
            return cart;
          });
          
          set({ multiKitchenCarts: updatedCarts });
        }
      },
      
      clearCart: () => set({ items: [], kitchenId: null, multiKitchenCarts: [] }),
      
      clearKitchenCart: (kitchenId) => {
        set({
          multiKitchenCarts: get().multiKitchenCarts.filter(
            (cart) => cart.kitchenId !== kitchenId
          ),
        });
      },
      
      getTotal: () => {
        const { multiRestaurantMode, items, multiKitchenCarts } = get();
        
        if (!multiRestaurantMode) {
          return items.reduce(
            (total, item) => total + item.menuItem.price * item.quantity,
            0
          );
        } else {
          return multiKitchenCarts.reduce((total, cart) => {
            return total + cart.items.reduce(
              (kitchenTotal, item) => kitchenTotal + item.menuItem.price * item.quantity,
              0
            );
          }, 0);
        }
      },
      
      getKitchenTotal: (kitchenId) => {
        const cart = get().multiKitchenCarts.find((c) => c.kitchenId === kitchenId);
        if (!cart) return 0;
        return cart.items.reduce(
          (total, item) => total + item.menuItem.price * item.quantity,
          0
        );
      },
      
      enableMultiRestaurant: () => set({ multiRestaurantMode: true }),
      
      disableMultiRestaurant: () => set({ multiRestaurantMode: false }),
      
      getAllKitchens: () => get().multiKitchenCarts.map((cart) => cart.kitchenId),
      
      getItemsByKitchen: (kitchenId) => {
        const cart = get().multiKitchenCarts.find((c) => c.kitchenId === kitchenId);
        return cart ? cart.items : [];
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);
