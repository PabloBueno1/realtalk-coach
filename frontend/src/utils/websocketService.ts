import { useState, useEffect, useCallback } from 'react';

// Define types for the WebSocket service
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  transcript: string;
  reply: string;
  sentence?: string;  // For streaming responses
  audioUrl?: string;  // For binary messages
}

export interface AudioQueueItem {
  audioBlob: Blob;
  sentence: string;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  isManualDisconnect: boolean;
}

export interface WebSocketService {
  connect: (scenarioId?: string) => Promise<void>;
  disconnect: () => void;
  sendVideo: (videoBlob: Blob) => Promise<void>;
  state: WebSocketState;
  messages: ChatMessage[];
  onMessageReceived: (callback: (response: ChatResponse) => void) => void;
  handleAudioComplete: () => void;
  onEndCall: (callback: () => void) => void;
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
  const [audioQueue, setAudioQueue] = useState<AudioQueueItem[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [endCallCallbacks, setEndCallCallbacks] = useState<(() => void)[]>([]);

  // Get authentication token from localStorage
  const getAuthToken = () => {
    const token = localStorage.getItem('access_token');
    return token;
  };

  // Connect to the WebSocket server
  const connect = useCallback(async (scenarioId?: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null, isManualDisconnect: false }));

    try {
      // Get the WebSocket URL from environment variables or use a default
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/chat/ws/chat';
      
      // Get authentication token
      const token = getAuthToken();
      
      // Create WebSocket with authentication and scenario ID
      let newSocket: WebSocket;
      
      if (token) {
        // Build query parameters
        const params = new URLSearchParams();
        params.append('access_token', token);
        if (scenarioId) {
          params.append('scenario_id', scenarioId);
        }
        
        const urlWithParams = `${wsUrl}?${params.toString()}`;
        newSocket = new WebSocket(urlWithParams);
      } else {
        newSocket = new WebSocket(wsUrl);
      }

      newSocket.onopen = () => {
        setState(prev => ({ ...prev, isConnected: true, isConnecting: false }));
      };

      newSocket.onclose = (event) => {
        setState(prev => ({ 
          ...prev, 
          isConnected: false, 
          isConnecting: false,
          error: prev.isManualDisconnect ? null : (
            event.code === 1008 ? (
              event.reason.includes('No usage tokens available') 
                ? 'You have no usage tokens available. Please upgrade your plan to continue.'
                : 'Please log in to continue'
            ) : 'Connection closed'
          )
        }));
      };

      newSocket.onerror = (error) => {
        setState(prev => ({ 
          ...prev, 
          isConnected: false, 
          isConnecting: false,
          error: 'Connection error occurred'
        }));
      };

      newSocket.onmessage = (event) => {
        try {
          if (event.data instanceof Blob) {
            // Handle binary audio data
            const audioBlob = event.data;
            
            // Add to audio queue
            addToAudioQueue({
              audioBlob,
              sentence: ""  // The sentence will be updated when we receive the JSON message
            });
          } else {
            // Handle JSON message
            const response: ChatResponse = JSON.parse(event.data);
            
            if (response.sentence) {
              // This is a streaming sentence update
              setMessages(prev => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage && lastMessage.role === 'assistant') {
                  // Update the last assistant message
                  return [
                    ...prev.slice(0, -1),
                    { ...lastMessage, content: lastMessage.content + (response.sentence || '') }
                  ];
                } else {
                  // Start a new assistant message
                  return [
                    ...prev,
                    { role: 'assistant', content: response.sentence || '' }
                  ];
                }
              });

              // Update the last item in the queue with the sentence
              setAudioQueue(prev => {
                if (prev.length > 0) {
                  const lastItem = prev[prev.length - 1];
                  return [
                    ...prev.slice(0, -1),
                    { ...lastItem, sentence: response.sentence || '' }
                  ];
                }
                return prev;
              });
            } else if (response.transcript) {
              // This is a new message with transcript
              setMessages(prev => [
                ...prev,
                { role: 'user', content: response.transcript }
              ]);
            }
            
            // Call all registered callbacks
            messageCallbacks.forEach(callback => callback(response));
          }
        } catch (error) {
          // Error handling without
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
    }
  }, [socket, messageCallbacks]);

  // Disconnect from the WebSocket server
  const disconnect = useCallback(() => {
    if (socket) {
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

      // Trigger end call callback
      endCallCallbacks.forEach(callback => callback());
    }
  }, [socket, endCallCallbacks]);

  // Send video data to the server
  const sendVideo = useCallback(async (videoBlob: Blob) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    try {
      // Send the video blob directly
      socket.send(videoBlob);
    } catch (error) {
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

  // Function to add to audio queue
  const addToAudioQueue = (item: AudioQueueItem) => {
    setAudioQueue(prev => [...prev, item]);
  };

  // Function to play next item in queue
  const playNextInQueue = () => {
    if (audioQueue.length > 0 && !isPlaying) {
      const nextItem = audioQueue[0];
      setAudioQueue(prev => prev.slice(1));
      setIsPlaying(true);
      
      // Create a new URL for the blob
      const audioUrl = URL.createObjectURL(nextItem.audioBlob);
      
      // Call all registered callbacks with the audio URL
      messageCallbacks.forEach(callback => callback({
        transcript: "",
        reply: "",
        audioUrl: audioUrl,
        sentence: nextItem.sentence
      }));

      // Clean up the URL after a delay to ensure it's been used
      setTimeout(() => {
        URL.revokeObjectURL(audioUrl);
      }, 1000);
    }
  };

  // Effect to handle audio queue
  useEffect(() => {
    if (audioQueue.length > 0 && !isPlaying) {
      playNextInQueue();
    }
  }, [audioQueue, isPlaying]);

  // Function to handle audio playback completion
  const handleAudioComplete = () => {
    setIsPlaying(false);
    if (audioQueue.length === 0) {
      // Check if the last message was a goodbye
      const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || "";
      const END_TRIGGERS = [
        "that's all for now",
        "thanks for the chat",
        "talk to you later",
        "goodbye",
        "bye",
        "see you later",
        "take care",
        "have a good day",
        "have a nice day",
        "that's it for today",
        "that's all i have to say",
        "i'm done for now",
        "thanks for your time",
        "appreciate your help",
        "that's everything",
        "that's all i needed",
        "that's all i wanted to say",
        "that's all i had to say",
        "that's all i needed to know",
        "that's all i wanted to know"
      ];
      
      if (END_TRIGGERS.some(trigger => lastMessage.includes(trigger))) {
        // If it's a goodbye message and queue is empty, disconnect first then call endCall callbacks
        disconnect();
        endCallCallbacks.forEach(callback => callback());
      }
    }
    playNextInQueue();
  };

  // Register a callback for when the call should end
  const onEndCall = useCallback((callback: () => void) => {
    setEndCallCallbacks(prev => [...prev, callback]);
    
    // Return a cleanup function to remove the callback
    return () => {
      setEndCallCallbacks(prev => prev.filter(cb => cb !== callback));
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
    onMessageReceived,
    handleAudioComplete,
    onEndCall
  };
};

// Export a singleton instance for use outside of React components
const websocketService = {
  connect: async () => {},
  disconnect: () => {},
  sendVideo: async (videoBlob: Blob) => {},
  state: {
    isConnected: false,
    isConnecting: false,
    error: null
  },
  messages: [],
  onMessageReceived: (callback: (response: ChatResponse) => void) => {
    return () => {};
  },
  handleAudioComplete: () => {},
  onEndCall: (callback: () => void) => {
    return () => {};
  }
};

export default websocketService; 