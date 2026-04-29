import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({
    items: [],
    restaurantId: null,
    restaurantName: null,
    deliveryFee: 0,
  });

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to load cart:', e);
      }
    }
  }, []);

  // Save cart to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  // Add item to cart (original method)
  const addToCart = (item, restaurantId, restaurantName) => {
    setCart(prev => {
      // If adding from a different restaurant, clear cart first
      if (prev.restaurantId && prev.restaurantId !== restaurantId) {
        if (!confirm('Adding items from a different restaurant will clear your current cart. Continue?')) {
          return prev;
        }
        return {
          items: [{ ...item, quantity: 1 }],
          restaurantId,
          restaurantName,
          deliveryFee: prev.deliveryFee,
        };
      }

      // Check if item already exists
      const existingItem = prev.items.find(i => i.id === item.id);
      if (existingItem) {
        return {
          ...prev,
          items: prev.items.map(i =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }

      // Add new item
      return {
        ...prev,
        items: [...prev.items, { ...item, quantity: 1 }],
        restaurantId: restaurantId || prev.restaurantId,
        restaurantName: restaurantName || prev.restaurantName,
      };
    });
  };

  // Add item method that matches your MenuItemCard component
  const addItem = (item, restaurant) => {
    addToCart(item, restaurant?.id, restaurant?.name);
  };

  // Remove item from cart
  const removeFromCart = (itemId) => {
    setCart(prev => ({
      ...prev,
      items: prev.items.filter(i => i.id !== itemId),
    }));
  };

  // Update item quantity
  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(prev => ({
      ...prev,
      items: prev.items.map(i =>
        i.id === itemId ? { ...i, quantity } : i
      ),
    }));
  };

  // Clear entire cart
  const clearCart = () => {
    setCart({
      items: [],
      restaurantId: null,
      restaurantName: null,
      deliveryFee: 0,
    });
  };

  // Get total number of items
  const getTotalItems = () => {
    return cart.items.reduce((total, item) => total + item.quantity, 0);
  };

  // Get subtotal price
  const getSubtotal = () => {
    return cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Get total price (subtotal + delivery fee)
  const getTotalPrice = () => {
    return getSubtotal() + (cart.deliveryFee || 0);
  };

  // Legacy function names for compatibility
  const itemCount = getTotalItems();
  const subtotal = getSubtotal();
  const total = getTotalPrice();

  const value = {
    cart,
    cartItems: cart.items,
    addToCart,
    addItem, // Added this for MenuItemCard
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalItems,
    getSubtotal,
    getTotalPrice,
    itemCount,
    subtotal,
    total,
    // Legacy support
    getTotalPrice: getTotalPrice,
    getTotalItems: getTotalItems,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};