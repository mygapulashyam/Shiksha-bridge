import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sb_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    // Do NOT attempt refresh on /auth/* endpoints (e.g. login, verify-otp, forgot-password)
    const isAuthRoute = originalRequest?.url && (
      originalRequest.url.includes('/auth/login') ||
      originalRequest.url.includes('/auth/register') ||
      originalRequest.url.includes('/auth/refresh-token') ||
      originalRequest.url.includes('/auth/verify-otp') ||
      originalRequest.url.includes('/auth/reset-password') ||
      originalRequest.url.includes('/auth/forgot-password')
    );

    if (err.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('sb_refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post((process.env.REACT_APP_API_URL || '/api') + '/auth/refresh-token', {
            refreshToken,
          });

          if (response.data?.success) {
            const { token, refreshToken: newRefreshToken } = response.data;
            localStorage.setItem('sb_token', token);
            if (newRefreshToken) {
              localStorage.setItem('sb_refresh_token', newRefreshToken);
            }
            originalRequest.headers.Authorization = `Bearer ${token}`;
            processQueue(null, token);
            isRefreshing = false;
            return api(originalRequest);
          } else {
            throw new Error('Refresh failed');
          }
        } catch (refreshError) {
          processQueue(refreshError, null);
          isRefreshing = false;
          localStorage.removeItem('sb_token');
          localStorage.removeItem('sb_refresh_token');
          localStorage.removeItem('sb_user');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        isRefreshing = false;
        localStorage.removeItem('sb_token');
        localStorage.removeItem('sb_refresh_token');
        localStorage.removeItem('sb_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
