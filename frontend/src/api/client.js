const API_URL = "http://localhost:5000/api";

export const api = {
  get: async (url, token) => {
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const res = await fetch(`${API_URL}${url}`, {
      headers,
    });
    
    const data = await res.json();
    return data;
  },

  post: async (url, body, token) => {
    const headers = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const res = await fetch(`${API_URL}${url}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    
    return res.json();
  },

  put: async (url, body, token) => {
    const headers = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const res = await fetch(`${API_URL}${url}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });
    
    return res.json();
  },

  delete: async (url, token) => {
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const res = await fetch(`${API_URL}${url}`, {
      method: "DELETE",
      headers,
    });
    
    return res.json();
  },
};
// Remove the extra 'x' at the end - there should be nothing after the closing brace