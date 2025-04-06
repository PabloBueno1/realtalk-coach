import { useState, useEffect, useCallback } from 'react';

// Define types for the WebSocket service
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  transcript: string;
  reply: string;
  audio_path: string;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  isManualDisconnect: boolean;
}

export interface WebSocketService {
  connect: () => Promise<void>;
  disconnect: () => void;
  sendVideo: (videoBlob: Blob) => Promise<void>;
  state: WebSocketState;
  messages: ChatMessage[];
  onMessageReceived: (callback: (response: ChatResponse) => void) => void;
}

// Create a custom hook for WebSocket functionality
export const useWebSocketService = (): WebSocketService => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    isManualDisconnect: false,
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageCallbacks, setMessageCallbacks] = useState<((response: ChatResponse) => void)[]>([]);

  // Get authentication token from localStorage
  const getAuthToken = () => {
    const token = localStorage.getItem('access_token');
    console.log('Auth token from localStorage:', token ? 'Token exists' : 'No token found');
    return token;
  };

  // Connect to the WebSocket server
  const connect = useCallback(async () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log('WebSocket is already connected');
      return; // Already connected
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null, isManualDisconnect: false }));
    console.log('Starting WebSocket connection process...');

    try {
      // Get the WebSocket URL from environment variables or use a default
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/chat/ws/chat';
      console.log('Base WebSocket URL:', wsUrl);
      
      // Get authentication token
      const token = getAuthToken();
      console.log('Token retrieved:', token ? 'Token exists' : 'No token found');
      
      // Create WebSocket with authentication
      let newSocket: WebSocket;
      
      if (token) {
        // Try multiple approaches to pass the token
        // 1. As a query parameter
        const urlWithToken = `${wsUrl}?access_token=${encodeURIComponent(token)}`;
        console.log('Attempting to connect with token as query parameter');
        console.log('Full WebSocket URL:', urlWithToken);
        newSocket = new WebSocket(urlWithToken);
      } else {
        console.log('No token found, attempting to connect without authentication');
        newSocket = new WebSocket(wsUrl);
      }

      newSocket.onopen = () => {
        console.log('WebSocket connection established successfully');
        setState(prev => ({ ...prev, isConnected: true, isConnecting: false }));
      };

      newSocket.onclose = (event) => {
        console.log('WebSocket connection closed');
        console.log('Close code:', event.code);
        console.log('Close reason:', event.reason);
        console.log('Was clean:', event.wasClean);
        
        setState(prev => ({ 
          ...prev, 
          isConnected: false, 
          isConnecting: false,
          error: prev.isManualDisconnect ? null : (event.code === 1008 ? 'Authentication failed. Please log in again.' : 'Connection closed')
        }));
      };

      newSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({ 
          ...prev, 
          isConnected: false, 
          isConnecting: false,
          error: 'Connection error occurred'
        }));
      };

      newSocket.onmessage = (event) => {
        try {
          const response: ChatResponse = JSON.parse(event.data);
          
          // Update messages state
          setMessages(prev => [
            ...prev,
            { role: 'user', content: response.transcript },
            { role: 'assistant', content: response.reply }
          ]);
          
          // Call all registered callbacks
          messageCallbacks.forEach(callback => callback(response));
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      setSocket(newSocket);
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        isConnecting: false,
        error: 'Failed to establish WebSocket connection' 
      }));
      console.error('Error establishing WebSocket connection:', error);
    }
  }, [socket, messageCallbacks]);

  // Disconnect from the WebSocket server
  const disconnect = useCallback(() => {
    if (socket) {
      console.log('Closing WebSocket connection...');
      
      // Set the manual disconnect flag
      setState(prev => ({ ...prev, isManualDisconnect: true }));
      
      // Remove all message callbacks
      setMessageCallbacks([]);
      
      // Close the socket with a normal closure code
      socket.close(1000, "User disconnected");
      
      // Reset the socket
      setSocket(null);
      
      // Update state
      setState(prev => ({ 
        ...prev, 
        isConnected: false,
        isConnecting: false,
        error: null
      }));
      
      console.log('WebSocket connection closed');
    }
  }, [socket]);

  // Send video data to the server
  const sendVideo = useCallback(async (videoBlob: Blob) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    try {
      // Send the video blob directly
      socket.send(videoBlob);
    } catch (error) {
      console.error('Error sending video data:', error);
      throw error;
    }
  }, [socket]);

  // Register a callback for when a message is received
  const onMessageReceived = useCallback((callback: (response: ChatResponse) => void) => {
    setMessageCallbacks(prev => [...prev, callback]);
    
    // Return a cleanup function to remove the callback
    return () => {
      setMessageCallbacks(prev => prev.filter(cb => cb !== callback));
    };
  }, []);

  // Clean up WebSocket connection when component unmounts
  useEffect(() => {
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [socket]);

  return {
    connect,
    disconnect,
    sendVideo,
    state,
    messages,
    onMessageReceived
  };
};

// Export a singleton instance for use outside of React components
const websocketService = {
  connect: async () => {
    console.warn('Using websocketService outside of React components is not recommended. Use useWebSocketService hook instead.');
  },
  disconnect: () => {
    console.warn('Using websocketService outside of React components is not recommended. Use useWebSocketService hook instead.');
  },
  sendVideo: async (videoBlob: Blob) => {
    console.warn('Using websocketService outside of React components is not recommended. Use useWebSocketService hook instead.');
  },
  state: {
    isConnected: false,
    isConnecting: false,
    error: null
  },
  messages: [],
  onMessageReceived: (callback: (response: ChatResponse) => void) => {
    console.warn('Using websocketService outside of React components is not recommended. Use useWebSocketService hook instead.');
    return () => {};
  }
};

export default websocketService; 