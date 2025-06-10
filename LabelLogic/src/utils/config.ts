const LOCAL_IP = '192.168.1.134';

export const API_BASE_URL = __DEV__ 
  ? `http://${LOCAL_IP}:8000/api/v1`
  : 'https://your-production-url.com/api/v1';

export const config = {
  apiUrl: API_BASE_URL,
};