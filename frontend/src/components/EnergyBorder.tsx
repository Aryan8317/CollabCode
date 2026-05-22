import React from 'react';
import { motion, useTransform, useMotionValue, animate } from 'framer-motion';

interface EnergyBorderProps {
  children: React.ReactNode;
  className?: string;
}

const EnergyBorder: React.FC<EnergyBorderProps> = ({ children, className = "" }) => {
  // Progress along the border (0 to 1)
  const progress = useMotionValue(0);

  // Animate progress continuously
  React.useEffect(() => {
    const controls = animate(progress, 1, {
      duration: 10,
      repeat: Infinity,
      ease: "linear",
    });
    return controls.stop;
  }, [progress]);

  // Map progress to position (0-0.25: top, 0.25-0.5: right, 0.5-0.75: bottom, 0.75-1: left)
  const left = useTransform(progress, [0, 0.25, 0.5, 0.75, 1], ["0%", "100%", "100%", "0%", "0%"]);
  const top = useTransform(progress, [0, 0.25, 0.5, 0.75, 1], ["0%", "0%", "100%", "100%", "0%"]);
  
  // Rotate tail based on progress
  const rotate = useTransform(progress, 
    [0, 0.249, 0.25, 0.499, 0.5, 0.749, 0.75, 0.999, 1], 
    [0, 0, 90, 90, 180, 180, 270, 270, 360]
  );

  // Opacity of corner flares
  const flareOpacityTopLeft = useTransform(progress, [0.98, 0, 0.02], [0, 1, 0]);
  const flareOpacityTopRight = useTransform(progress, [0.23, 0.25, 0.27], [0, 1, 0]);
  const flareOpacityBottomRight = useTransform(progress, [0.48, 0.5, 0.52], [0, 1, 0]);
  const flareOpacityBottomLeft = useTransform(progress, [0.73, 0.75, 0.77], [0, 1, 0]);

  return (
    <div className={`relative ${className} p-[1px] rounded-xl overflow-hidden`}>
      {/* Background Container */}
      <div className="relative z-10 bg-[#0b0e14] rounded-xl overflow-hidden h-full">
        {children}
      </div>

      {/* Subtle border track */}
      <div className="absolute inset-0 border border-white/5 rounded-xl pointer-events-none" />

      {/* Comet Particle (Head + Trail) */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute"
          style={{ left, top, x: "-50%", y: "-50%", rotate }}
        >
          {/* Glowing Head */}
          <div className="w-1 h-1 bg-[#adc6ff] rounded-full shadow-[0_0_8px_#adc6ff]" />
          
          {/* Fading Tail */}
          <div 
            className="absolute top-1/2 right-full -translate-y-1/2 w-16 h-1 bg-gradient-to-r from-transparent to-[#adc6ff]/40 blur-[1px]"
          />
        </motion.div>
      </div>

      {/* Corner Flares */}
      <motion.div style={{ opacity: flareOpacityTopLeft }} className="absolute top-0 left-0 w-6 h-6 bg-[#adc6ff]/10 blur-md rounded-full -translate-x-1/2 -translate-y-1/2" />
      <motion.div style={{ opacity: flareOpacityTopRight }} className="absolute top-0 right-0 w-6 h-6 bg-[#adc6ff]/10 blur-md rounded-full translate-x-1/2 -translate-y-1/2" />
      <motion.div style={{ opacity: flareOpacityBottomRight }} className="absolute bottom-0 right-0 w-6 h-6 bg-[#adc6ff]/10 blur-md rounded-full translate-x-1/2 translate-y-1/2" />
      <motion.div style={{ opacity: flareOpacityBottomLeft }} className="absolute bottom-0 left-0 w-6 h-6 bg-[#adc6ff]/10 blur-md rounded-full -translate-x-1/2 translate-y-1/2" />
    </div>
  );
};

export default EnergyBorder;
