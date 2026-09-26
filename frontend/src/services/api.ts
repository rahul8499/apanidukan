import axios from 'axios'

const getApiBase = () => {
  const envBase = (import.meta as any).env?.VITE_API_BASE
  if (envBase) {
    return envBase
  }
  return `${window.location.protocol}//${window.location.hostname}:8000/api/v1`
}
const API_BASE = getApiBase()

const isPublicPage = () => {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname
  return path === '/' ||
    path === '/customer-home' ||
    path === '/customer-stores' ||
    path === '/customer-orders' ||
    path === '/customer-account' ||
    path.startsWith('/store/') ||
    path.startsWith('/s/') ||
    path.startsWith('/pwa/')
}

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
        const isPublicRoute = isPublicPage();
        if (window.location.pathname !== '/login' && !isPublicRoute) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${API_BASE}/auth/refresh/`, { refresh: refreshToken });
        const { access, refresh } = res.data;
        
        localStorage.setItem('access_token', access);
        // SimpleJWT rotates refresh tokens in production. Persist the new token;
        // otherwise the next refresh reuses a blacklisted token and logs the seller out.
        if (refresh) {
          localStorage.setItem('refresh_token', refresh);
        }
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
        const isPublicRoute = isPublicPage();
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
