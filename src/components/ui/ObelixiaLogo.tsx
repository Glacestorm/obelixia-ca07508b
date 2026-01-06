import { cn } from "@/lib/utils";
import brainLogo from "@/assets/brain-logo.png";

interface ObelixiaLogoProps {
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  variant?: "full" | "icon" | "text";
  animated?: boolean;
  className?: string;
  dark?: boolean;
}

/**
 * ObelixIA Cinematic Logo - Ultra Luxury Brand Identity
 * Features: Realistic longitudinal AI brain with neural sparkles
 */
export function ObelixiaLogo({ 
  size = "md", 
  variant = "full",
  animated = true,
  className,
  dark = true
}: ObelixiaLogoProps) {
  const sizeClasses = {
    sm: { container: "h-8", text: "text-xl", iconW: 40, iconH: 32 },
    md: { container: "h-12", text: "text-3xl", iconW: 60, iconH: 48 },
    lg: { container: "h-16", text: "text-5xl", iconW: 80, iconH: 64 },
    xl: { container: "h-24", text: "text-7xl", iconW: 120, iconH: 96 },
    hero: { container: "h-32", text: "text-8xl md:text-9xl", iconW: 175, iconH: 140 },
  };

  const currentSize = sizeClasses[size];

  // Realistic AI Brain Icon with Neural Sparkles
  const CinematicBrainIcon = () => {
    return (
      <div 
        className="relative overflow-hidden" 
        style={{ 
          width: currentSize.iconW, 
          height: currentSize.iconH,
          borderRadius: '50%',
        }}
      >
        {/* Outer Glow Layer */}
        <div 
          className="absolute inset-[-50%] blur-2xl opacity-60"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.5) 0%, rgba(59,130,246,0.3) 40%, transparent 70%)',
          }}
        />
        
        {/* Brain Image with circular clip and gradient mask */}
        <div 
          className="relative w-full h-full overflow-hidden"
          style={{
            borderRadius: '50%',
            maskImage: 'radial-gradient(ellipse 100% 100% at center, black 50%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at center, black 50%, transparent 80%)',
          }}
        >
          <img 
            src={brainLogo}
            alt="ObelixIA Brain"
            className="w-full h-full object-cover scale-125"
            style={{ 
              filter: 'drop-shadow(0 0 15px rgba(139,92,246,0.6)) drop-shadow(0 0 30px rgba(59,130,246,0.4))',
            }}
          />
        </div>
        
        {/* Animated sparkle overlay */}
        {animated && (
          <svg 
            viewBox="0 0 100 80" 
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            <defs>
              <filter id={`sparkle-glow-${size}`} x="-400%" y="-400%" width="900%" height="900%">
                <feGaussianBlur stdDeviation="2" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Neural sparkles on brain surface */}
            {[
              { cx: 30, cy: 25, delay: 0, duration: 1.5 },
              { cx: 45, cy: 18, delay: 0.3, duration: 1.2 },
              { cx: 60, cy: 22, delay: 0.6, duration: 1.4 },
              { cx: 70, cy: 30, delay: 0.9, duration: 1.3 },
              { cx: 55, cy: 35, delay: 0.2, duration: 1.5 },
              { cx: 35, cy: 40, delay: 0.5, duration: 1.1 },
              { cx: 50, cy: 45, delay: 0.8, duration: 1.4 },
              { cx: 65, cy: 42, delay: 0.1, duration: 1.2 },
              { cx: 25, cy: 35, delay: 0.4, duration: 1.6 },
              { cx: 75, cy: 38, delay: 0.7, duration: 1.3 },
              { cx: 40, cy: 30, delay: 1.0, duration: 1.5 },
              { cx: 58, cy: 28, delay: 0.3, duration: 1.2 },
            ].map((node, i) => (
              <g key={`sparkle-${i}`} filter={`url(#sparkle-glow-${size})`}>
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r="1"
                  fill="white"
                >
                  <animate
                    attributeName="opacity"
                    values="0.2;0.2;1;1;0.2;0.2"
                    dur={`${node.duration}s`}
                    begin={`${node.delay}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="r"
                    values="0.8;0.8;2;1.5;1;0.8"
                    dur={`${node.duration}s`}
                    begin={`${node.delay}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            ))}
          </svg>
        )}
      </div>
    );
  };

  // Full Logo with Dual Gradient Text
  if (variant === "full") {
    return (
      <div className={cn("flex items-center gap-4", className)}>
        <CinematicBrainIcon />
        <div className="relative">
          {/* Glow behind text */}
          <span 
            className={cn(
              currentSize.text,
              "absolute inset-0 blur-lg opacity-50 font-black tracking-tight"
            )}
            style={{
              fontFamily: "'Crimson Pro', Georgia, serif",
              background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
            aria-hidden="true"
          >
            ObelixIA
          </span>
          
          {/* Main Text with Dual Gradient (blue→violet→purple) */}
          <span 
            className={cn(
              currentSize.text,
              "relative font-black tracking-tight"
            )}
            style={{
              fontFamily: "'Crimson Pro', Georgia, serif",
              letterSpacing: "-0.02em",
              background: animated 
                ? 'linear-gradient(90deg, #3b82f6 0%, #6366f1 25%, #8b5cf6 50%, #a855f7 75%, #3b82f6 100%)'
                : 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #a855f7 100%)',
              backgroundSize: animated ? '200% 100%' : '100% 100%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: animated ? 'gradientShift 4s ease infinite' : 'none',
            }}
          >
            ObelixIA
          </span>
          
          {/* Shine sweep effect on text */}
          {animated && (
            <span 
              className={cn(
                currentSize.text,
                "absolute inset-0 font-black tracking-tight pointer-events-none overflow-hidden"
              )}
              style={{
                fontFamily: "'Crimson Pro', Georgia, serif",
                letterSpacing: "-0.02em",
                background: 'linear-gradient(120deg, transparent 0%, transparent 40%, rgba(255,255,255,0.6) 50%, transparent 60%, transparent 100%)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'textShine 3s ease-in-out infinite',
              }}
              aria-hidden="true"
            >
              ObelixIA
            </span>
          )}
        </div>
        
        <style>{`
          @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          @keyframes textShine {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    );
  }

  // Icon Only
  if (variant === "icon") {
    return (
      <div className={cn("inline-flex items-center justify-center", className)}>
        <CinematicBrainIcon />
      </div>
    );
  }

  // Text Only
  return (
    <div className="relative inline-block">
      <span 
        className={cn(
          currentSize.text,
          "absolute inset-0 blur-lg opacity-50 font-black tracking-tight"
        )}
        style={{
          fontFamily: "'Crimson Pro', Georgia, serif",
          background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #a855f7 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
        aria-hidden="true"
      >
        ObelixIA
      </span>
      <span 
        className={cn(
          currentSize.text,
          "relative font-black tracking-tight",
          className
        )}
        style={{
          fontFamily: "'Crimson Pro', Georgia, serif",
          letterSpacing: "-0.02em",
          background: animated 
            ? 'linear-gradient(90deg, #3b82f6 0%, #6366f1 25%, #8b5cf6 50%, #a855f7 75%, #3b82f6 100%)'
            : 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #a855f7 100%)',
          backgroundSize: animated ? '200% 100%' : '100% 100%',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: animated ? 'gradientShift 4s ease infinite' : 'none',
        }}
      >
        ObelixIA
      </span>
      <style>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}

/**
 * Cinematic Loading Spinner with Large Brain & Synaptic Connections
 */
export function ObelixiaLoadingSpinner({ 
  size = "md",
  text = "Cargando...",
  showText = true 
}: { 
  size?: "sm" | "md" | "lg" | "xl";
  text?: string;
  showText?: boolean;
}) {
  const sizeClasses = {
    sm: { width: 60, height: 60, text: "text-sm" },
    md: { width: 100, height: 100, text: "text-base" },
    lg: { width: 180, height: 180, text: "text-lg" },
    xl: { width: 380, height: 380, text: "text-xl" },
  };

  const current = sizeClasses[size];

  // Neural nodes distributed on brain surface with more density - INTERNAL SYNAPSES ENHANCED
  const nodes = [
    // Outer ring
    { cx: 50, cy: 10, delay: 0, isInternal: false },
    { cx: 22, cy: 22, delay: 0.15, isInternal: false },
    { cx: 78, cy: 22, delay: 0.3, isInternal: false },
    { cx: 10, cy: 50, delay: 0.45, isInternal: false },
    { cx: 90, cy: 50, delay: 0.6, isInternal: false },
    { cx: 22, cy: 78, delay: 0.75, isInternal: false },
    { cx: 78, cy: 78, delay: 0.9, isInternal: false },
    { cx: 50, cy: 90, delay: 1.05, isInternal: false },
    // Middle ring
    { cx: 35, cy: 30, delay: 0.2, isInternal: false },
    { cx: 65, cy: 30, delay: 0.35, isInternal: false },
    { cx: 28, cy: 50, delay: 0.5, isInternal: false },
    { cx: 72, cy: 50, delay: 0.65, isInternal: false },
    { cx: 35, cy: 70, delay: 0.8, isInternal: false },
    { cx: 65, cy: 70, delay: 0.95, isInternal: false },
    // Inner core - BRIGHT SYNAPSES
    { cx: 50, cy: 40, delay: 0.1, isInternal: true },
    { cx: 42, cy: 50, delay: 0.25, isInternal: true },
    { cx: 58, cy: 50, delay: 0.4, isInternal: true },
    { cx: 50, cy: 60, delay: 0.55, isInternal: true },
    { cx: 50, cy: 50, delay: 0, isInternal: true }, // Center - BRIGHTEST
    // Additional internal synaptic points - ENHANCED GLOW
    { cx: 38, cy: 38, delay: 0.7, isInternal: true },
    { cx: 62, cy: 38, delay: 0.85, isInternal: true },
    { cx: 38, cy: 62, delay: 1.0, isInternal: true },
    { cx: 62, cy: 62, delay: 0.45, isInternal: true },
    // NEW: Extra internal synapses for more density
    { cx: 45, cy: 35, delay: 0.12, isInternal: true },
    { cx: 55, cy: 35, delay: 0.28, isInternal: true },
    { cx: 45, cy: 65, delay: 0.42, isInternal: true },
    { cx: 55, cy: 65, delay: 0.58, isInternal: true },
    { cx: 35, cy: 45, delay: 0.72, isInternal: true },
    { cx: 65, cy: 45, delay: 0.88, isInternal: true },
    { cx: 35, cy: 55, delay: 0.18, isInternal: true },
    { cx: 65, cy: 55, delay: 0.32, isInternal: true },
    // Deep core extra synapses
    { cx: 46, cy: 46, delay: 0.05, isInternal: true },
    { cx: 54, cy: 46, delay: 0.15, isInternal: true },
    { cx: 46, cy: 54, delay: 0.25, isInternal: true },
    { cx: 54, cy: 54, delay: 0.35, isInternal: true },
  ];

  // More complex synaptic connections
  const connections = [
    // Outer to middle
    { x1: 50, y1: 10, x2: 35, y2: 30 },
    { x1: 50, y1: 10, x2: 65, y2: 30 },
    { x1: 22, y1: 22, x2: 35, y2: 30 },
    { x1: 78, y1: 22, x2: 65, y2: 30 },
    { x1: 10, y1: 50, x2: 28, y2: 50 },
    { x1: 90, y1: 50, x2: 72, y2: 50 },
    { x1: 22, y1: 78, x2: 35, y2: 70 },
    { x1: 78, y1: 78, x2: 65, y2: 70 },
    { x1: 50, y1: 90, x2: 35, y2: 70 },
    { x1: 50, y1: 90, x2: 65, y2: 70 },
    // Middle to inner
    { x1: 35, y1: 30, x2: 50, y2: 40 },
    { x1: 65, y1: 30, x2: 50, y2: 40 },
    { x1: 28, y1: 50, x2: 42, y2: 50 },
    { x1: 72, y1: 50, x2: 58, y2: 50 },
    { x1: 35, y1: 70, x2: 50, y2: 60 },
    { x1: 65, y1: 70, x2: 50, y2: 60 },
    // Inner core connections (synaptic)
    { x1: 50, y1: 40, x2: 42, y2: 50 },
    { x1: 50, y1: 40, x2: 58, y2: 50 },
    { x1: 42, y1: 50, x2: 50, y2: 60 },
    { x1: 58, y1: 50, x2: 50, y2: 60 },
    { x1: 50, y1: 40, x2: 50, y2: 50 },
    { x1: 42, y1: 50, x2: 50, y2: 50 },
    { x1: 58, y1: 50, x2: 50, y2: 50 },
    { x1: 50, y1: 60, x2: 50, y2: 50 },
    // Cross connections (neural pathways)
    { x1: 38, y1: 38, x2: 50, y2: 50 },
    { x1: 62, y1: 38, x2: 50, y2: 50 },
    { x1: 38, y1: 62, x2: 50, y2: 50 },
    { x1: 62, y1: 62, x2: 50, y2: 50 },
    { x1: 38, y1: 38, x2: 62, y2: 62 },
    { x1: 62, y1: 38, x2: 38, y2: 62 },
    // Horizontal synaptic bridges
    { x1: 35, y1: 30, x2: 65, y2: 30 },
    { x1: 28, y1: 50, x2: 72, y2: 50 },
    { x1: 35, y1: 70, x2: 65, y2: 70 },
  ];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: current.width, height: current.height }}>
        {/* Ambient glow */}
        <div 
          className="absolute inset-0 blur-xl opacity-60"
          style={{
            background: 'radial-gradient(ellipse, rgba(6,182,212,0.5) 0%, rgba(16,185,129,0.3) 50%, transparent 70%)',
          }}
        />
        
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <linearGradient id="spinner-brain-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0ea5e9">
                <animate attributeName="stop-color" values="#0ea5e9;#10b981;#0ea5e9" dur="2s" repeatCount="indefinite" />
              </stop>
              <stop offset="50%" stopColor="#10b981">
                <animate attributeName="stop-color" values="#10b981;#06b6d4;#10b981" dur="2s" repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor="#06b6d4">
                <animate attributeName="stop-color" values="#06b6d4;#0ea5e9;#06b6d4" dur="2s" repeatCount="indefinite" />
              </stop>
            </linearGradient>
            <filter id="spinner-brain-glow">
              <feGaussianBlur stdDeviation="2" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="spinner-node-glow">
              <feGaussianBlur stdDeviation="1.5" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            {/* Enhanced glow filter for internal synapses */}
            <filter id="spinner-internal-glow">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feColorMatrix in="blur" type="saturate" values="2" result="saturated"/>
              <feMerge>
                <feMergeNode in="saturated"/>
                <feMergeNode in="saturated"/>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Spherical outline */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="rgba(6,182,212,0.1)"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="2"
          />
          
          {/* Animated flowing outline */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="url(#spinner-brain-gradient)"
            strokeWidth="2"
            strokeDasharray="40 224"
            filter="url(#spinner-brain-glow)"
          >
            <animate
              attributeName="stroke-dashoffset"
              values="0;-264"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
          
          {/* Neural connections */}
          {connections.map((conn, i) => (
            <line
              key={i}
              x1={conn.x1}
              y1={conn.y1}
              x2={conn.x2}
              y2={conn.y2}
              stroke="url(#spinner-brain-gradient)"
              strokeWidth="0.5"
              opacity="0.4"
            />
          ))}
          
          {/* Neural nodes - INTERNAL SYNAPSES GLOW BRIGHTER */}
          {nodes.map((node, i) => (
            <g key={i} filter={node.isInternal ? "url(#spinner-internal-glow)" : "url(#spinner-node-glow)"}>
              {/* Extra glow layer for internal synapses */}
              {node.isInternal && (
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r="4"
                  fill="none"
                  stroke="url(#spinner-brain-gradient)"
                  strokeWidth="0.5"
                  opacity="0.6"
                >
                  <animate
                    attributeName="r"
                    values="2;6;2"
                    dur="1.2s"
                    begin={`${node.delay}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.8;0.2;0.8"
                    dur="1.2s"
                    begin={`${node.delay}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              )}
              <circle
                cx={node.cx}
                cy={node.cy}
                r={node.isInternal ? 2.5 : 1.5}
                fill={node.isInternal ? "url(#spinner-brain-gradient)" : "white"}
              >
                <animate
                  attributeName="opacity"
                  values={node.isInternal ? "0.6;1;0.6" : "0.3;1;0.3"}
                  dur={node.isInternal ? "1.2s" : "1.5s"}
                  begin={`${node.delay}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="r"
                  values={node.isInternal ? "2;4;2" : "1;2.5;1"}
                  dur={node.isInternal ? "1.2s" : "1.5s"}
                  begin={`${node.delay}s`}
                  repeatCount="indefinite"
                />
              </circle>
              {/* Bright center dot for internal synapses */}
              {node.isInternal && (
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r="1"
                  fill="white"
                >
                  <animate
                    attributeName="opacity"
                    values="0.5;1;0.5"
                    dur="0.8s"
                    begin={`${node.delay}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          ))}
        </svg>
      </div>

      {showText && (
        <span 
          className={cn(current.text, "font-medium")}
          style={{
            background: 'linear-gradient(90deg, #06b6d4, #10b981)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {text}
        </span>
      )}
    </div>
  );
}

/**
 * Full Page Cinematic Loading Screen
 */
export function ObelixiaFullscreenLoader({ text = "Cargando ObelixIA..." }: { text?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 6 + 2,
              height: Math.random() * 6 + 2,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: i % 3 === 0 ? '#10b981' : i % 3 === 1 ? '#06b6d4' : '#8b5cf6',
              opacity: 0,
              animation: `particleFloat ${4 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>
      
      {/* Radial glow - larger for big brain */}
      <div 
        className="absolute inset-0 opacity-40"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.4) 0%, rgba(139,92,246,0.2) 30%, transparent 60%)',
        }}
      />

      {/* Logo with XL brain */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        <ObelixiaLogo size="hero" variant="full" animated />
        
        {/* LARGE BRAIN with synaptic connections */}
        <div className="mt-4">
          <ObelixiaLoadingSpinner size="xl" text={text} />
        </div>

        {/* Tagline */}
        <p 
          className="text-sm tracking-[0.3em] uppercase mt-4"
          style={{
            background: 'linear-gradient(90deg, #64748b, #94a3b8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          CRM Bancari Intel·ligent
        </p>
      </div>

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-40 h-40">
        <div className="absolute top-8 left-8 w-24 h-[2px] bg-gradient-to-r from-cyan-500/50 to-transparent" />
        <div className="absolute top-8 left-8 w-[2px] h-24 bg-gradient-to-b from-cyan-500/50 to-transparent" />
      </div>
      <div className="absolute bottom-0 right-0 w-40 h-40">
        <div className="absolute bottom-8 right-8 w-24 h-[2px] bg-gradient-to-l from-emerald-500/50 to-transparent" />
        <div className="absolute bottom-8 right-8 w-[2px] h-24 bg-gradient-to-t from-emerald-500/50 to-transparent" />
      </div>
      
      <style>{`
        @keyframes particleFloat {
          0%, 100% { 
            transform: translateY(0) scale(0.8); 
            opacity: 0;
          }
          10% { opacity: 0.6; }
          50% { 
            transform: translateY(-30px) scale(1.2); 
            opacity: 0.8;
          }
          90% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

export default ObelixiaLogo;
