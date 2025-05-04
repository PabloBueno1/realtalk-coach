/**
 * Development Configuration
 * 
 * This file contains settings for development environments to help
 * control excessive API calls and other development-specific behavior.
 */

export const DEV_CONFIG = {
  // API throttling settings
  api: {
    // Default throttle duration in milliseconds
    defaultThrottleMs: 5000,
    
    // Endpoint-specific throttling (milliseconds)
    endpoints: {
      '/auth/dev/users': 30000,  // 30 seconds between user list refreshes
      '/auth/profile': 10000,    // 10 seconds between profile refreshes
    },
    
    // Should we log API requests to console?
    logRequests: true,
    
    // Use mocked data instead of API calls when possible
    useMockData: false,
  },
  
  // Auth settings for development
  auth: {
    // Should we allow automatic switching between saved users?
    enableUserSwitching: true,
    
    // Cache authenticated users between page reloads?
    persistUsers: true,
    
    // Show full user switching UI for development
    showDevAuthPanel: true,
  },
  
  // Debug settings
  debug: {
    // Log store actions
    logStoreActions: true,
    
    // Log component renders
    logComponentRenders: false,
  }
};

export default DEV_CONFIG; 