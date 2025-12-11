import { useCallback, useRef, useEffect } from "react";

type AlertLevel = "moderate" | "critical";

export function useSoundAlert() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastAlertTimeRef = useRef<Record<string, number>>({});

  // Initialize AudioContext on first user interaction
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };

    // Initialize on first click/touch
    document.addEventListener("click", initAudio, { once: true });
    document.addEventListener("touchstart", initAudio, { once: true });

    return () => {
      document.removeEventListener("click", initAudio);
      document.removeEventListener("touchstart", initAudio);
    };
  }, []);

  const playAlert = useCallback((level: AlertLevel, deviceId?: string) => {
    // Debounce alerts per device (minimum 5 seconds between alerts)
    const key = deviceId || "global";
    const now = Date.now();
    const lastTime = lastAlertTimeRef.current[key] || 0;
    
    if (now - lastTime < 5000) {
      return; // Skip if alert was played recently for this device
    }
    lastAlertTimeRef.current[key] = now;

    // Create or resume AudioContext
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (level === "moderate") {
      // Moderate drunk: Two-tone warning beep (yellow alert)
      oscillator.frequency.setValueAtTime(600, ctx.currentTime);
      oscillator.frequency.setValueAtTime(400, ctx.currentTime + 0.15);
      oscillator.frequency.setValueAtTime(600, ctx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } else {
      // Critical/Completely drunk: Urgent alarm (red alert)
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, ctx.currentTime + 0.2);
      oscillator.frequency.setValueAtTime(600, ctx.currentTime + 0.3);
      oscillator.frequency.setValueAtTime(800, ctx.currentTime + 0.4);
      gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.6);
    }
  }, []);

  const checkAndAlert = useCallback((alcoholLevel: number, alertStatus: string, deviceId?: string) => {
    if (alertStatus === "Completely Drunk" || alcoholLevel >= 2500) {
      playAlert("critical", deviceId);
    } else if (alertStatus === "Moderate Drunk" || (alcoholLevel >= 1700 && alcoholLevel < 2500)) {
      playAlert("moderate", deviceId);
    }
  }, [playAlert]);

  return { playAlert, checkAndAlert };
}
