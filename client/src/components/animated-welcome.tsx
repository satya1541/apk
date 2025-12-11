import { useEffect, useState } from 'react';
import './animated-welcome.css';

interface AnimatedWelcomeProps {
  onComplete?: () => void;
  duration?: number;
}

export function AnimatedWelcome({ onComplete, duration = 7000 }: AnimatedWelcomeProps) {
  const texts = ['W', 'e', 'l', 'c', 'o', 'm', 'e', '!'];
  const numberOfParticles = 12;
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsComplete(true);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (isComplete) {
    return null;
  }

  return (
    <div className="animated-welcome-container" data-testid="animated-welcome">
      {/* Background elements */}
      {texts.map((_, i) => (
        <div key={`bg-${i}`} className={`welcome-background welcome-background-${i}`} />
      ))}
      
      <div className="welcome-criterion">
        {/* Text elements */}
        {texts.map((text, i) => (
          <div key={`text-${i}`} className={`welcome-text welcome-text-${i}`}>
            {text}
          </div>
        ))}
        
        {/* Frame elements */}
        {texts.map((_, i) => (
          <div key={`frame-${i}`} className={`welcome-frame welcome-frame-${i}`} />
        ))}
        
        {/* Particle elements */}
        {texts.map((_, i) =>
          Array.from({ length: numberOfParticles }, (_, j) => (
            <div
              key={`particle-${i}-${j}`}
              className={`welcome-particle welcome-particle-${i}-${j}`}
            />
          ))
        )}
      </div>
    </div>
  );
}