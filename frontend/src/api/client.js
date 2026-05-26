// frontend/src/api/client.js
const API_URL = 'https://lloyds-delivery.onrender.com/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export const api = {
  get: async (url) => {
    const res = await fetch(`${API_URL}${url}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  post: async (url, body) => {
    const res = await fetch(`${API_URL}${url}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    return res.json();
  },

  put: async (url, body) => {
    const res = await fetch(`${API_URL}${url}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    return res.json();
  },

  delete: async (url) => {
    const res = await fetch(`${API_URL}${url}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return res.json();
  },
};