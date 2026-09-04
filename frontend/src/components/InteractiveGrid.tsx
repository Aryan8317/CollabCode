import React, { useRef, useEffect } from 'react';

const InteractiveGrid: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Target mouse position
  const mouseRef = useRef({ x: -1000, y: -1000 });
  // Eased mouse position for smooth motion
  const smoothedMouseRef = useRef({ x: -1000, y: -1000 });
  // Intensity of the spotlight (0 to 1)
  const intensityRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width: number;
    let height: number;
    const dotSpacing = 32;
    const dots: { x: number; y: number }[] = [];

    const setup = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      dots.length = 0;
      for (let x = 0; x < width + dotSpacing; x += dotSpacing) {
        for (let y = 0; y < height + dotSpacing; y += dotSpacing) {
          dots.push({ x, y });
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Smoothly ease the intensity and position
      const ease = 0.08;
      const targetIntensity = mouseRef.current.x === -1000 ? 0 : 1;
      intensityRef.current += (targetIntensity - intensityRef.current) * ease;
      
      smoothedMouseRef.current.x += (mouseRef.current.x - smoothedMouseRef.current.x) * ease;
      smoothedMouseRef.current.y += (mouseRef.current.y - smoothedMouseRef.current.y) * ease;

      const spotlightRadius = 300;

      dots.forEach(dot => {
        const dx = smoothedMouseRef.current.x - dot.x;
        const dy = smoothedMouseRef.current.y - dot.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        let size = 0.8;
        let opacity = 0.08;
        
        if (distance < spotlightRadius && intensityRef.current > 0.01) {
          const factor = (1 - distance / spotlightRadius) * intensityRef.current;
          // Magnetic / spotlight feeling: brighten and enlarge
          size = 0.8 + factor * 2;
          opacity = 0.08 + factor * 0.8;
          ctx.fillStyle = `rgba(173, 198, 255, ${opacity})`;
        } else {
          ctx.fillStyle = `rgba(140, 144, 159, ${opacity})`;
        }

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseLeave = () => {
      // Trigger reset by moving target away and letting it fade
      mouseRef.current = { x: -1000, y: -1000 };
    };

    window.addEventListener('resize', setup);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    setup();
    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', setup);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef}
      className="fixed inset-0 w-full h-full bg-background pointer-events-none z-0"
    />
  );
};

export default InteractiveGrid;
