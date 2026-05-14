// Real API client - connects to your backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiClient = {
  get: async (url, token = null) => {
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_URL}${url}`, { headers });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }
    
    return response.json();
  },

  post: async (url, data, token = null) => {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_URL}${url}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }
    
    return response.json();
  },

  put: async (url, data, token = null) => {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_URL}${url}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }
    
    return response.json();
  },

  delete: async (url, token = null) => {
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_URL}${url}`, {
      method: 'DELETE',
      headers,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }
    
    return response.json();
  },
};

// Base44 compatibility layer (for components that still use base44)
export const base44 = {
  auth: {
    me: async () => {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      try {
        const user = await apiClient.get('/auth/me', token);
        return user;
      } catch (error) {
        console.error('Failed to get user:', error);
        return null;
      }
    },
    updateMe: async (data) => {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return apiClient.put(`/users/${user.id}`, data, token);
    },
    login: async (email, password) => {
      const response = await apiClient.post('/auth/login', { email, password });
      return response;
    },
    register: async (userData) => {
      return apiClient.post('/auth/register', userData);
    },
  },
  entities: {
    Restaurant: {
      filter: async (conditions) => {
        const restaurants = await apiClient.get('/restaurants');
        if (!conditions) return restaurants;
        
        return restaurants.filter(r => {
          for (const [key, value] of Object.entries(conditions)) {
            if (r[key] !== value) return false;
          }
          return true;
        });
      },
      list: async () => {
        return apiClient.get('/restaurants');
      },
    },
    MenuItem: {
      filter: async (conditions) => {
        if (conditions && conditions.restaurant_id) {
          return apiClient.get(`/menu-items/restaurant/${conditions.restaurant_id}`);
        }
        return apiClient.get('/menu-items');
      },
      list: async () => {
        return apiClient.get('/menu-items');
      },
    },
    Order: {
      filter: async (conditions) => {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (conditions && conditions.customer_email) {
          return apiClient.get(`/orders/customer/${user.id}`, token);
        }
        return apiClient.get('/orders', token);
      },
      list: async () => {
        const token = localStorage.getItem('token');
        return apiClient.get('/orders', token);
      },
      create: async (orderData) => {
        const token = localStorage.getItem('token');
        return apiClient.post('/orders/create', orderData, token);
      },
      update: async (orderId, data) => {
        const token = localStorage.getItem('token');
        return apiClient.put(`/orders/${orderId}`, data, token);
      },
      subscribe: (callback) => {
        // For real-time updates, we'll use polling as fallback
        const interval = setInterval(() => {
          callback();
        }, 10000);
        return () => clearInterval(interval);
      },
    },
    Payment: {
      create: async (paymentData) => {
        const token = localStorage.getItem('token');
        return apiClient.post('/payments', paymentData, token);
      },
    },
    User: {
      list: async () => {
        const token = localStorage.getItem('token');
        return apiClient.get('/users', token);
      },
      update: async (userId, data) => {
        const token = localStorage.getItem('token');
        return apiClient.put(`/users/${userId}`, data, token);
      },
    },
  },
};

export default base44;