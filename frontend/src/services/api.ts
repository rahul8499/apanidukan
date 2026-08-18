import axios from 'axios'

const getApiBase = () => {
  const envBase = (import.meta as any).env?.VITE_API_BASE
  if (envBase && !envBase.includes('localhost') && !envBase.includes('127.0.0.1')) {
    return envBase
  }
  return `${window.location.protocol}//${window.location.hostname}:8000/api/v1`
}
const API_BASE = getApiBase()

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
})

// attach token if present
const token = localStorage.getItem('access_token')
if(token){
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Add a response interceptor to handle 401 token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        isRefreshing = false;
        localStorage.removeItem('access_token');
        const isPublicRoute = typeof window !== 'undefined' && (
          window.location.pathname.startsWith('/store/') ||
          window.location.pathname.startsWith('/pwa/')
        );
        if (window.location.pathname !== '/login' && !isPublicRoute) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${API_BASE}/auth/refresh/`, { refresh: refreshToken });
        const { access } = res.data;
        
        localStorage.setItem('access_token', access);
        api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
        originalRequest.headers['Authorization'] = `Bearer ${access}`;
        
        processQueue(null, access);
        isRefreshing = false;
        
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        isRefreshing = false;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        delete api.defaults.headers.common['Authorization'];
        const isPublicRoute = typeof window !== 'undefined' && (
          window.location.pathname.startsWith('/store/') ||
          window.location.pathname.startsWith('/pwa/')
        );
        if (typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/register' && !isPublicRoute) {
          window.location.replace('/login');
        }
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

export default api
