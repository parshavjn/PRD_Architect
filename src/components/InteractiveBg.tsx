import { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  decay: number;
}

export default function InteractiveBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, active: false });
  const [accentPalette, setAccentPalette] = useState<'cyber' | 'cosmic' | 'magnetic'>('cosmic');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];

    // Colors that look exceptionally glowing against charcoal #0A0A0B
    const getColors = () => {
      switch (accentPalette) {
        case 'cyber': // Electric Blue & Neon Cyan
          return ['#2563EB', '#3B82F6', '#60A5FA', '#06B6D4', '#22D3EE'];
        case 'magnetic': // High tech Magenta, Violet & Indigo
          return ['#4F46E5', '#6366F1', '#818CF8', '#EC4899', '#F472B6'];
        case 'cosmic': // Beautiful Royal Blue & Deep Purple gradient
        default:
          return ['#1E40AF', '#3B82F6', '#6366F1', '#8B5CF6', '#D8B4FE', '#A78BFA'];
      }
    };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Initialize ambient background particles
    const createAmbientParticle = (initialX?: number, initialY?: number) => {
      const colors = getColors();
      const isSpawned = initialX !== undefined && initialY !== undefined;
      return {
        x: isSpawned ? initialX! : Math.random() * canvas.width,
        y: isSpawned ? initialY! : Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4 + (isSpawned ? (Math.random() - 0.5) * 1.5 : 0),
        vy: (Math.random() - 0.5) * 0.4 + (isSpawned ? (Math.random() - 0.5) * 1.5 : 0),
        size: Math.random() * (isSpawned ? 4 : 2) + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: isSpawned ? 0.9 : Math.random() * 0.25 + 0.05,
        life: 1,
        decay: isSpawned ? Math.random() * 0.015 + 0.015 : 0,
      };
    };

    for (let i = 0; i < 45; i++) {
      particles.push(createAmbientParticle());
    }

    // Follower cursor interpolation loop
    const render = () => {
      ctx.fillStyle = '#0A0A0B';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Smooth pointer interpolation
      const dx = pointerRef.current.targetX - pointerRef.current.x;
      const dy = pointerRef.current.targetY - pointerRef.current.y;
      pointerRef.current.x += dx * 0.1;
      pointerRef.current.y += dy * 0.1;

      // Draw subtle background radial blue-purple glowing halos
      if (pointerRef.current.active) {
        const glowRadius = 320;
        const radialGrad = ctx.createRadialGradient(
          pointerRef.current.x,
          pointerRef.current.y,
          0,
          pointerRef.current.x,
          pointerRef.current.y,
          glowRadius
        );
        radialGrad.addColorStop(0, 'rgba(99, 102, 241, 0.08)'); // indigo
        radialGrad.addColorStop(0.5, 'rgba(139, 92, 246, 0.03)'); // purple
        radialGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = radialGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw and update particles
      particles.forEach((p, idx) => {
        // Update positions
        p.x += p.vx;
        p.y += p.vy;

        // Apply decay to clicks sparks
        if (p.decay > 0) {
          p.life -= p.decay;
          p.alpha = p.life;
        }

        // Draw particle representation
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 12;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();

        // Bounce check for ambient particles
        if (p.decay === 0) {
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        }
      });

      // Remove dead spawned particles and respawn basic ambient ones
      particles = particles.filter(p => p.decay === 0 || p.life > 0);
      while (particles.filter(p => p.decay === 0).length < 45) {
        particles.push(createAmbientParticle());
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Event handlers for mouse movement and interaction sparks
    const handleMouseMove = (e: MouseEvent) => {
      pointerRef.current.targetX = e.clientX;
      pointerRef.current.targetY = e.clientY + window.scrollY;
      pointerRef.current.active = true;

      // Rare spark emission on movement
      if (Math.random() < 0.12) {
        particles.push(createAmbientParticle(pointerRef.current.targetX, pointerRef.current.targetY));
      }
    };

    const handleMouseLeave = () => {
      pointerRef.current.active = false;
    };

    // Burst particles on mouse down
    const handleMouseDown = (e: MouseEvent) => {
      const clickX = e.clientX;
      const clickY = e.clientY + window.scrollY;
      for (let i = 0; i < 12; i++) {
        particles.push(createAmbientParticle(clickX, clickY));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    document.body.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      if (document.body) {
        document.body.removeEventListener('mouseleave', handleMouseLeave);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, [accentPalette]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <canvas ref={canvasRef} className="opacity-95" />
      {/* Dynamic Palette Toggle floating subtly in corner */}
      <div className="absolute bottom-4 right-4 pointer-events-auto flex items-center gap-1.5 bg-black/60 backdrop-blur-xl border border-white/5 rounded-full px-2.5 py-1 z-50 shadow-lg">
        <span className="text-[8px] font-black tracking-widest text-[#E0E0E6]/30 uppercase pr-1 select-none">Grid-Halos</span>
        <button
          onClick={() => setAccentPalette('cosmic')}
          className={`w-3 h-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 border ${accentPalette === 'cosmic' ? 'border-white scale-110 shadow-[0_0_8px_indigo]' : 'border-neutral-700 hover:scale-105'}`}
          title="Cosmic Theme"
        />
        <button
          onClick={() => setAccentPalette('cyber')}
          className={`w-3 h-3 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 border ${accentPalette === 'cyber' ? 'border-white scale-110 shadow-[0_0_8px_cyan]' : 'border-neutral-700 hover:scale-105'}`}
          title="Cyber Theme"
        />
        <button
          onClick={() => setAccentPalette('magnetic')}
          className={`w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 border ${accentPalette === 'magnetic' ? 'border-white scale-110 shadow-[0_0_8px_pink]' : 'border-neutral-700 hover:scale-105'}`}
          title="Magnetic Theme"
        />
      </div>
    </div>
  );
}
