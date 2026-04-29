// App parameters for configuration
export const appParams = {
  appId: import.meta.env.VITE_APP_ID || 'lloyds-delivery',
  token: localStorage.getItem('token'),
  functionsVersion: 'v1',
  appBaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000',
};