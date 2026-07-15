import React from 'react';

interface ShieldLogoProps {
  className?: string;
  size?: number | string;
}

export const ShieldLogo: React.FC<ShieldLogoProps> = ({ className = 'w-10 h-10', size }) => {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Soft shadow for a premium finish */}
        <filter id="shield-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.12" />
        </filter>
        <clipPath id="shield-clip">
          <path d="M 18 18 L 182 18 L 182 105 C 182 158 143 187 100 197 C 57 187 18 158 18 105 Z" />
        </clipPath>
      </defs>
      
      {/* Base White Shield with premium shadow */}
      <path 
        d="M 15 15 L 185 15 L 185 105 C 185 160 145 190 100 200 C 55 190 15 160 15 105 Z" 
        fill="white" 
        filter="url(#shield-shadow)"
      />
      
      {/* Internal clipped sections */}
      <g clipPath="url(#shield-clip)">
        {/* Top Left: Light Green */}
        <rect x="18" y="52" width="76" height="62" fill="#8ebd1c" />
        
        {/* Top Right: Deep Blue */}
        <rect x="106" y="52" width="76" height="62" fill="#005a8f" />
        
        {/* Bottom Left: Deep Blue */}
        <rect x="18" y="126" width="76" height="88" fill="#005a8f" />
        
        {/* Bottom Right: Light Green */}
        <rect x="106" y="126" width="76" height="88" fill="#8ebd1c" />
        
        {/* Top Left: Centered Gear */}
        <g transform="translate(56, 83)" fill="white">
          <circle cx="0" cy="0" r="14" />
          <circle cx="0" cy="0" r="6" fill="#8ebd1c" />
          {/* Gear teeth */}
          <rect x="-3" y="-18" width="6" height="5" rx="1" />
          <rect x="-3" y="-18" width="6" height="5" rx="1" transform="rotate(45)" />
          <rect x="-3" y="-18" width="6" height="5" rx="1" transform="rotate(90)" />
          <rect x="-3" y="-18" width="6" height="5" rx="1" transform="rotate(135)" />
          <rect x="-3" y="-18" width="6" height="5" rx="1" transform="rotate(180)" />
          <rect x="-3" y="-18" width="6" height="5" rx="1" transform="rotate(225)" />
          <rect x="-3" y="-18" width="6" height="5" rx="1" transform="rotate(270)" />
          <rect x="-3" y="-18" width="6" height="5" rx="1" transform="rotate(315)" />
        </g>

        {/* Top Right: "C" */}
        <text
          x="144"
          y="85"
          fill="white"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="48"
          textAnchor="middle"
          dominantBaseline="middle"
        >C</text>

        {/* Bottom Left: "J" */}
        <text
          x="56"
          y="157"
          fill="white"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="48"
          textAnchor="middle"
          dominantBaseline="middle"
        >J</text>

        {/* Bottom Right: Beautiful Centered Rosary */}
        <path
          d="M 120 136 C 117 156, 130 168, 144 168 C 158 168, 171 156, 168 136"
          stroke="white"
          strokeWidth="3.5"
          strokeDasharray="1, 5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="144" cy="168" r="3" fill="white" />
        <line x1="144" y1="171" x2="144" y2="178" stroke="white" strokeWidth="3" strokeDasharray="1, 4" strokeLinecap="round" />
        <line x1="144" y1="178" x2="144" y2="191" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="140" y1="183" x2="148" y2="183" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* Arched text "COLEGIO CATÓLICO" at the top white area */}
      <path id="textPath" d="M 28 42 Q 100 28 172 42" fill="none" />
      <text fill="#005a8f" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="11" letterSpacing="0.4">
        <textPath href="#textPath" startOffset="50%" textAnchor="middle">
          COLEGIO CATÓLICO
        </textPath>
      </text>
    </svg>
  );
};
