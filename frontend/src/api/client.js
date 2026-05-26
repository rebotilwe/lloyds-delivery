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
    const response = await fetch(`${API_URL}${url}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return { data, status: response.status, ok: response.ok };
  },

  post: async (url, body) => {
    const response = await fetch(`${API_URL}${url}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return { data, status: response.status, ok: response.ok };
  },

  put: async (url, body) => {
    const response = await fetch(`${API_URL}${url}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return { data, status: response.status, ok: response.ok };
  },

  delete: async (url) => {
    const response = await fetch(`${API_URL}${url}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return { data, status: response.status, ok: response.ok };
  },
};