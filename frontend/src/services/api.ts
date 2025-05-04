import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import DEV_CONFIG from '../config/development';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
}

// Track throttled requests
interface ThrottledRequest {
  promise: Promise<any>;
  timestamp: number;
}

const getThrottleDuration = (url: string): number => {
  // Extract the endpoint from the URL
  const endpoint = url.replace(/\?.*$/, ''); // Remove query parameters
  
  // Check if we have a specific throttle time for this endpoint
  for (const [pattern, duration] of Object.entries(DEV_CONFIG.api.endpoints)) {
    if (endpoint.includes(pattern)) {
      return duration;
    }
  }
  
  // Return the default throttle time
  return DEV_CONFIG.api.defaultThrottleMs;
};

const shouldLogRequest = (): boolean => {
  return DEV_CONFIG.api.logRequests;
};

// Token management
let currentToken: string | null = null;
let currentUserId: string | null = null;

class ApiService {
  private api: AxiosInstance;
  private throttledRequests: Map<string, ThrottledRequest> = new Map();
  private requestCounts: Map<string, number> = new Map();
  
  constructor() {
    // Initialize the current token from localStorage
    currentToken = localStorage.getItem('access_token');
    currentUserId = localStorage.getItem('auth_active_user_id');
    
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to attach authorization header
    this.api.interceptors.request.use((config) => {
      // Log request for debugging
      if (shouldLogRequest()) {
        // Count requests per URL
        const url = config.url || '';
        const currentCount = this.requestCounts.get(url) || 0;
        this.requestCounts.set(url, currentCount + 1);
        
        // Log with count
        console.log(
          `API Request [${currentCount + 1}]: ${config.method?.toUpperCase()} ${config.url}`
        );
      }
      
      // Always check localStorage directly to get the latest token
      const token = localStorage.getItem('access_token');
      
      if (token) {
        // Update our currentToken reference
        if (currentToken !== token) {
          currentToken = token;
          console.log('Token updated in request interceptor');
        }
        
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      return config;
    });
    
    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If error is 401 Unauthorized and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            // Check if user ID has changed in localStorage
            const activeUserId = localStorage.getItem('auth_active_user_id');
            if (activeUserId !== currentUserId) {
              // User has changed, update current state and retry with new token
              currentUserId = activeUserId;
              const newToken = localStorage.getItem('access_token');
              currentToken = newToken;
              
              if (newToken) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return this.api(originalRequest);
              }
            }
            
            // Otherwise, try to refresh token
            const refreshToken = localStorage.getItem('refresh_token');
            
            if (!refreshToken) {
              return Promise.reject(error);
            }
            
            // Call a refresh token endpoint
            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refresh_token: refreshToken
            });
            
            if (response.data.session?.access_token) {
              // Update tokens in localStorage
              const newToken = response.data.session.access_token;
              localStorage.setItem('access_token', newToken);
              currentToken = newToken;
              
              // If the refresh also returns a new refresh token, update it
              if (response.data.session.refresh_token) {
                localStorage.setItem('refresh_token', response.data.session.refresh_token);
              }
              
              // Dispatch a custom event to notify other code about the token update
              this.dispatchTokenChangeEvent(newToken);
              
              // Update Authorization header and retry
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // If token refresh fails, this might indicate the token is invalid
            // Dispatch an event to possibly trigger a logout in the auth context
            window.dispatchEvent(new CustomEvent('auth_token_invalid'));
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );
    
    // Listen for localStorage changes (for multi-tab token synchronization)
    this.setupStorageListener();
  }
  
  // Dispatch a custom event when token changes programmatically
  private dispatchTokenChangeEvent(newToken: string): void {
    // This helps synchronize token changes that happen programmatically
    window.dispatchEvent(new CustomEvent('auth_token_updated', { 
      detail: { token: newToken }
    }));
  }
  
  // Setup storage event listener to detect token changes in other tabs
  private setupStorageListener(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === 'access_token') {
        const newToken = event.newValue;
        
        if (newToken !== currentToken) {
          console.log('Token changed in another tab, updating...');
          currentToken = newToken;
          
          // Clear throttled requests cache when the token changes
          this.throttledRequests.clear();
        }
      } else if (event.key === 'auth_active_user_id') {
        const newUserId = event.newValue;
        
        if (newUserId !== currentUserId) {
          console.log('Active user changed in another tab, updating and clearing request cache...');
          currentUserId = newUserId;
          
          // Get the fresh token for this user
          const token = localStorage.getItem('access_token');
          if (token !== currentToken) {
            currentToken = token;
          }
          
          // Always clear the request cache when user changes
          this.throttledRequests.clear();
        }
      }
    });
    
    // Also listen for our custom event
    window.addEventListener('auth_token_updated', ((event: CustomEvent) => {
      const newToken = event.detail?.token;
      if (newToken && newToken !== currentToken) {
        console.log('Token updated via custom event');
        currentToken = newToken;
      }
    }) as EventListener);
    
    // Handle invalid token events
    window.addEventListener('auth_token_invalid', () => {
      console.log('Token invalid event received');
      // This could trigger additional logic like auto-logout if needed
    });
  }

  // Force refresh token from localStorage (useful after user switching)
  refreshToken(): void {
    const token = localStorage.getItem('access_token');
    const userId = localStorage.getItem('auth_active_user_id');
    
    let changed = false;
    
    if (token !== currentToken) {
      console.log('Manually refreshing token');
      currentToken = token;
      changed = true;
    }
    
    if (userId !== currentUserId) {
      console.log('Manually refreshing user ID');
      currentUserId = userId;
      changed = true;
    }
    
    if (changed) {
      // Clear the request cache when manually refreshing
      this.throttledRequests.clear();
    }
  }

  async throttledGet<T = any>(url: string, customThrottleMs?: number): Promise<ApiResponse<T>> {
    const key = `get:${url}`;
    const throttleMs = customThrottleMs || getThrottleDuration(url);
    
    // Include the current user ID in the cache key for user-specific requests
    const cacheKey = currentUserId ? `${currentUserId}:${key}` : key;
    
    if (this.throttledRequests.has(cacheKey)) {
      const request = this.throttledRequests.get(cacheKey)!;
      
      if (Date.now() - request.timestamp < throttleMs) {
        if (shouldLogRequest()) {
          console.log(`[THROTTLED] Reusing request for ${url} (throttle: ${throttleMs}ms)`);
        }
        return request.promise;
      }
    }
    
    const requestPromise = this.get<T>(url);
    this.throttledRequests.set(cacheKey, {
      promise: requestPromise,
      timestamp: Date.now()
    });
    
    return requestPromise;
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse = await this.api.get(url, config);
      
      return {
        data: response.data,
        status: response.status,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse = await this.api.post(url, data, config);
      
      return {
        data: response.data,
        status: response.status,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse = await this.api.put(url, data, config);
      
      return {
        data: response.data,
        status: response.status,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse = await this.api.delete(url, config);
      
      return {
        data: response.data,
        status: response.status,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  private handleError(error: any): ApiResponse {
    return {
      data: null,
      status: error.response?.status || 500,
      message: error.response?.data?.detail || error.message || 'Unknown error occurred',
    };
  }
  
  // For debugging purposes
  getRequestCount(url?: string): number {
    if (url) {
      return this.requestCounts.get(url) || 0;
    }
    
    // Calculate total requests - fix to avoid iterator issues
    let total = 0;
    this.requestCounts.forEach(count => {
      total += count;
    });
    return total;
  }
  
  // Reset request counts (for testing)
  resetRequestCounts(): void {
    this.requestCounts.clear();
    this.throttledRequests.clear();
  }
}

const apiService = new ApiService();
export default apiService; 