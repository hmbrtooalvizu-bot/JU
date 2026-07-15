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
        <clipPath id="shield-clip">
          <path d="M 20 20 L 180 20 L 180 105 C 180 155 140 185 100 195 C 60 185 20 155 20 105 Z" />
        </clipPath>
        <clipPath id="top-left-clip">
          <rect x="20" y="20" width="73" height="73" />
        </clipPath>
      </defs>
      
      {/* White shield background that forms the divider cross */}
      <path d="M 20 20 L 180 20 L 180 105 C 180 155 140 185 100 195 C 60 185 20 155 20 105 Z" fill="white" />
      
      <g clipPath="url(#shield-clip)">
        {/* Top Left: Light Green */}
        <rect x="20" y="20" width="73" height="73" fill="#8ebd1c" />
        
        {/* Top Right: Deep Blue */}
        <rect x="107" y="20" width="73" height="73" fill="#005a8f" />
        
        {/* Bottom Left: Deep Blue */}
        <rect x="20" y="107" width="73" height="88" fill="#005a8f" />
        
        {/* Bottom Right: Light Green */}
        <rect x="107" y="107" width="73" height="88" fill="#8ebd1c" />
        
        {/* Top Left Elements: Gear */}
        <g clipPath="url(#top-left-clip)">
          {/* Gear Ring */}
          <circle cx="100" cy="100" r="68" stroke="white" strokeWidth="18" fill="none" />
          {/* Gear Teeth */}
          <g fill="white">
            <rect x="91" y="10" width="18" height="20" transform="rotate(-105, 100, 100)" rx="2" />
            <rect x="91" y="10" width="18" height="20" transform="rotate(-125, 100, 100)" rx="2" />
            <rect x="91" y="10" width="18" height="20" transform="rotate(-145, 100, 100)" rx="2" />
            <rect x="91" y="10" width="18" height="20" transform="rotate(-165, 100, 100)" rx="2" />
          </g>
        </g>

        {/* Top Right Elements: "C" */}
        <text
          x="143.5"
          y="65"
          fill="white"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="56"
          textAnchor="middle"
          dominantBaseline="middle"
        >C</text>

        {/* Bottom Left Elements: "J" */}
        <text
          x="56.5"
          y="145"
          fill="white"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="56"
          textAnchor="middle"
          dominantBaseline="middle"
        >J</text>

        {/* Bottom Right Elements: Rosary */}
        <path
          d="M 115 115 C 112 142, 128 158, 143.5 158 C 159 158, 175 142, 172 115"
          stroke="white"
          strokeWidth="4"
          strokeDasharray="1, 6"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="143.5" cy="158" r="4.5" fill="white" />
        <line x1="143.5" y1="162" x2="143.5" y2="174" stroke="white" strokeWidth="4" strokeDasharray="1, 5" strokeLinecap="round" />
        
        {/* Rosary Bottom Cross */}
        <line x1="143.5" y1="174" x2="143.5" y2="190" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <line x1="138" y1="181" x2="149" y2="181" stroke="white" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
};
