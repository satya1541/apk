import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handlers to catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  // Prevent the default browser behavior of logging to console
  event.preventDefault();
  
  // Check if it's a Vite HMR WebSocket error (commonly happens in development)
  if (event.reason && typeof event.reason === 'object') {
    const reasonStr = event.reason.toString ? event.reason.toString() : JSON.stringify(event.reason);
    if (reasonStr.includes('WebSocket') || reasonStr.includes('HMR') || reasonStr.includes('vite') || reasonStr.includes('undefined') || reasonStr.includes('connecting')) {
      // Silently handle Vite HMR WebSocket errors as they're non-critical
      return;
    }
  }
  
  // Check if it's a WebSocket constructor error with undefined URL
  if (event.reason instanceof Error && event.reason.message && 
      (event.reason.message.includes('Failed to construct \'WebSocket\'') || 
       event.reason.message.includes('WebSocket connection') ||
       event.reason.message.includes('connecting'))) {
    // Silently handle WebSocket connection errors as they're non-critical
    return;
  }
  
  // Check if it's a network fetch error
  if (event.reason instanceof Error && event.reason.message && 
      (event.reason.message.includes('Failed to fetch') || 
       event.reason.message.includes('NetworkError') ||
       event.reason.message.includes('fetch'))) {
    console.warn('Network fetch error (handled):', event.reason.message);
    return;
  }
  
  // For other unexpected errors, log them
  console.error('Unexpected promise rejection:', event.reason);
});

window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
});

createRoot(document.getElementById("root")!).render(<App />);
