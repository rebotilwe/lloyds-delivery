import { mockRestaurants } from '@/data/restaurants';
import { mockMenuItems } from '@/data/menuItems';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Initialize orders from localStorage or empty array
const getStoredOrders = () => {
  const stored = localStorage.getItem('lloyds_orders');
  return stored ? JSON.parse(stored) : [];
};

const saveOrders = (orders) => {
  localStorage.setItem('lloyds_orders', JSON.stringify(orders));
};

// Initialize users from localStorage
const getStoredUsers = () => {
  const stored = localStorage.getItem('lloyds_users');
  if (stored) return JSON.parse(stored);
  
  // Default users
  const defaultUsers = [
    { id: 1, email: 'customer@test.com', full_name: 'Test Customer', role: 'customer', address: '123 Test St' },
    { id: 2, email: 'driver@test.com', full_name: 'John Driver', role: 'driver', is_available: true },
    { id: 3, email: 'admin@test.com', full_name: 'Admin User', role: 'admin' },
  ];
  localStorage.setItem('lloyds_users', JSON.stringify(defaultUsers));
  return defaultUsers;
};

export const apiClient = {
  get: async (endpoint, token = null) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (endpoint.includes('/restaurants')) {
      return mockRestaurants;
    }
    if (endpoint.includes('/orders/my-orders')) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const orders = getStoredOrders();
      return orders.filter(o => o.customer_email === user.email);
    }
    return [];
  },
  
  post: async (endpoint, data, token = null) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (endpoint.includes('/orders')) {
      const newOrder = {
        id: Date.now(),
        ...data,
        created_date: new Date().toISOString(),
        order_id: `LD-${Date.now()}`,
        items: data.items || [],
      };
      
      const orders = getStoredOrders();
      orders.unshift(newOrder); // Add to beginning of array
      saveOrders(orders);
      
      return newOrder;
    }
    
    return { success: true, id: Date.now() };
  },
  
  put: async (endpoint, data, token = null) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  },
  
  delete: async (endpoint, token = null) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  },
};

export const base44 = {
  auth: {
    me: async () => {
      const user = localStorage.getItem('user');
      const users = getStoredUsers();
      
      if (user) {
        return JSON.parse(user);
      }
      
      // Return first customer for testing
      return users.find(u => u.role === 'customer') || null;
    },
    updateMe: async (data) => {
      console.log('Update user:', data);
      return { success: true };
    },
    login: async (email, password) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      const users = getStoredUsers();
      const user = users.find(u => u.email === email);
      
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', 'mock-token');
        return { user, token: 'mock-token' };
      }
      
      throw new Error('Invalid credentials');
    }
  },
  entities: {
    Restaurant: {
      filter: async (conditions) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        let restaurants = [...mockRestaurants];
        if (conditions) {
          restaurants = restaurants.filter(r => {
            for (let [key, value] of Object.entries(conditions)) {
              if (r[key] !== value) return false;
            }
            return true;
          });
        }
        return restaurants;
      },
      list: async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return mockRestaurants;
      },
    },
    MenuItem: {
      filter: async (conditions) => {
        await new Promise(resolve => setTimeout(resolve, 300));
        if (conditions && conditions.restaurant_id) {
          return mockMenuItems[conditions.restaurant_id] || [];
        }
        return [];
      },
    },
    Order: {
      filter: async (conditions, order) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        let orders = getStoredOrders();
        
        if (conditions && conditions.customer_email) {
          orders = orders.filter(o => o.customer_email === conditions.customer_email);
        }
        
        return orders;
      },
      list: async (order, limit) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return getStoredOrders();
      },
      create: async (orderData) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const newOrder = {
          id: Date.now(),
          order_id: `LD-${Date.now()}`,
          created_date: new Date().toISOString(),
          status: 'pending',
          ...orderData,
          items: orderData.items || [],
        };
        
        const orders = getStoredOrders();
        orders.unshift(newOrder);
        saveOrders(orders);
        
        console.log('Order created:', newOrder);
        return newOrder;
      },
      update: async (orderId, data) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        const orders = getStoredOrders();
        const index = orders.findIndex(o => o.id === orderId || o.order_id === orderId);
        
        if (index !== -1) {
          orders[index] = { ...orders[index], ...data };
          saveOrders(orders);
        }
        
        return { success: true };
      },
      subscribe: (callback) => {
        // Mock subscription
        const interval = setInterval(() => {
          callback();
        }, 5000);
        return () => clearInterval(interval);
      },
    },
    Payment: {
      create: async (paymentData) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Payment created:', paymentData);
        return { success: true, id: Date.now() };
      },
    },
    User: {
      list: async () => {
        return getStoredUsers();
      },
    },
  },
};

export default base44;