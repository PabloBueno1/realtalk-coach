/**
 * Debug tools for development
 * 
 * These utilities help during development to track API calls, performance issues,
 * and other development concerns.
 */

import apiService from '../services/api';
import DEV_CONFIG from '../config/development';

interface RequestStats {
  url: string;
  count: number;
  lastRequestTime: number;
}

// Keep track of API requests stats
const requestStats: Record<string, RequestStats> = {};

// Track component render counts 
const componentRenderCounts: Record<string, number> = {};

// Record API request
export const recordApiRequest = (url: string): void => {
  if (!DEV_CONFIG.debug.logStoreActions) return;
  
  const key = url.replace(/\?.*$/, ''); // Remove query params
  
  if (!requestStats[key]) {
    requestStats[key] = { 
      url: key, 
      count: 0, 
      lastRequestTime: 0 
    };
  }
  
  requestStats[key].count++;
  requestStats[key].lastRequestTime = Date.now();
};

// Track component render
export const trackComponentRender = (componentName: string): void => {
  if (!DEV_CONFIG.debug.logComponentRenders) return;
  
  componentRenderCounts[componentName] = (componentRenderCounts[componentName] || 0) + 1;
  
  console.log(`Component render: ${componentName} (${componentRenderCounts[componentName]} times)`);
};

// Get API request stats for a specific endpoint
export const getEndpointStats = (endpoint: string): RequestStats | undefined => {
  return requestStats[endpoint];
};

// Print request stats to console
export const logRequestStats = (): void => {
  console.group('API Request Statistics');
  console.log('Total API requests:', apiService.getRequestCount());
  
  // Sort endpoints by request count
  const sortedKeys = Object.keys(requestStats).sort(
    (a, b) => requestStats[b].count - requestStats[a].count
  );
  
  sortedKeys.forEach(key => {
    const stats = requestStats[key];
    console.log(`${stats.url}: ${stats.count} requests, last: ${new Date(stats.lastRequestTime).toLocaleTimeString()}`);
  });
  
  console.groupEnd();
};

// Create a monitoring component to automatically log stats periodically
export const startRequestMonitoring = (intervalMs = 10000): () => void => {
  const intervalId = setInterval(() => {
    logRequestStats();
  }, intervalMs);
  
  // Return a function to stop monitoring
  return () => clearInterval(intervalId);
};

// Reset all debug stats
export const resetDebugStats = (): void => {
  Object.keys(requestStats).forEach(key => delete requestStats[key]);
  Object.keys(componentRenderCounts).forEach(key => delete componentRenderCounts[key]);
  apiService.resetRequestCounts();
}; 