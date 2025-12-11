import { useEffect, useRef } from 'react';

export function AnimatedBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const background1Ref = useRef<HTMLDivElement>(null);
  const background2Ref = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const drawRef = useRef(1);

  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      if (containerRef.current && background1Ref.current && background2Ref.current) {
        [containerRef.current, background1Ref.current, background2Ref.current].forEach(el => {
          el.style.minWidth = `${width}px`;
          el.style.minHeight = `${height}px`;
        });
      }
    };

    const generateSvg = () => {
      // Always use fallback for now to avoid crashes
      return createFallbackBackground();
    };

    const createFallbackBackground = () => {
      const colors = ['#3b82f6', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444'];
      const randomColors = colors.sort(() => Math.random() - 0.5).slice(0, 3);
      
      const svg = `
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:${randomColors[0]};stop-opacity:0.8" />
              <stop offset="50%" style="stop-color:${randomColors[1]};stop-opacity:0.6" />
              <stop offset="100%" style="stop-color:${randomColors[2]};stop-opacity:0.8" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#grad)" />
        </svg>
      `;
      
      return 'data:image/svg+xml;base64,' + btoa(svg);
    };

    const fade = (showElement: HTMLDivElement, hideElement: HTMLDivElement) => {
      showElement.style.transition = 'opacity 3s ease-in-out';
      hideElement.style.transition = 'opacity 4s ease-in-out';
      
      showElement.style.opacity = '0.5';
      hideElement.style.opacity = '0';
    };

    const svgNew = () => {
      if (!background1Ref.current || !background2Ref.current) return;

      const dataUrl = generateSvg();
      
      if (drawRef.current === 1) {
        background1Ref.current.style.backgroundImage = `url("${dataUrl}")`;
        background1Ref.current.style.backgroundSize = 'cover';
        background1Ref.current.style.backgroundPosition = 'center';
        fade(background1Ref.current, background2Ref.current);
        drawRef.current = 2;
      } else {
        background2Ref.current.style.backgroundImage = `url("${dataUrl}")`;
        background2Ref.current.style.backgroundSize = 'cover';
        background2Ref.current.style.backgroundPosition = 'center';
        fade(background2Ref.current, background1Ref.current);
        drawRef.current = 1;
      }
    };

    // Initialize
    updateSize();
    svgNew();

    // Set up interval for background changes
    intervalRef.current = setInterval(svgNew, 5000);

    // Handle resize
    const handleResize = () => {
      updateSize();
      // Redraw current backgrounds to new size
      if (background1Ref.current && background2Ref.current) {
        const dataUrl = generateSvg();
        background1Ref.current.style.backgroundImage = `url("${dataUrl}")`;
        background2Ref.current.style.backgroundImage = `url("${dataUrl}")`;
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 -z-10"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -10 }}
    >
      <div
        ref={background1Ref}
        className="absolute inset-0"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.5,
          zIndex: 1,
        }}
      />
      <div
        ref={background2Ref}
        className="absolute inset-0"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0,
          zIndex: 0,
        }}
      />
    </div>
  );
}