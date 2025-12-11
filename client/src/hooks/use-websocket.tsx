import { useEffect, useRef, useState } from "react";

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    try {
      // Clean up any existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      // Use window.location.host which includes port automatically
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        try {
          setIsConnected(true);
          reconnectAttempts.current = 0;
          options.onConnect?.();
        } catch (error) {
          console.warn('Error in WebSocket onopen callback:', error);
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          // Processing sensor data
          setLastMessage(message);
          try {
            options.onMessage?.(message);
          } catch (callbackError) {
            console.warn('Error in WebSocket message callback:', callbackError);
          }
        } catch (error) {
          console.warn('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        try {
          setIsConnected(false);
          options.onDisconnect?.();
          
          // Only attempt to reconnect if it wasn't a normal close
          if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              try {
                connect();
              } catch (error) {
                console.warn('Error during WebSocket reconnection:', error);
              }
            }, delay);
          }
        } catch (error) {
          console.warn('Error in WebSocket onclose callback:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        try {
          options.onError?.(error);
        } catch (callbackError) {
          console.warn('Error in WebSocket onerror callback:', callbackError);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      options.onError?.(error as Event);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const sendMessage = (message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
  };
}
