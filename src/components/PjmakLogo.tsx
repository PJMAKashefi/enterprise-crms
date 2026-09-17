import React from 'react';

interface PjmakLogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'horizontal' | 'badge';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  lightText?: boolean;
}

export const PjmakLogo: React.FC<PjmakLogoProps> = ({
  className = '',
  variant = 'full',
  size = 'md',
  lightText = false,
}) => {
  // Dimensions
  const sizeMap = {
    sm: { h: 28, w: variant === 'compact' ? 28 : 98 },
    md: { h: 38, w: variant === 'compact' ? 38 : 132 },
    lg: { h: 52, w: variant === 'compact' ? 52 : 180 },
    xl: { h: 72, w: variant === 'compact' ? 72 : 250 },
  };

  const textColor = lightText ? '#FFFFFF' : '#0F172A';
  const outlineColor = lightText ? '#FFFFFF' : '#0F172A';

  if (variant === 'compact') {
    // Compact mark: Crown + 'M' with Dutch Flag stripes
    return (
      <svg
        viewBox="0 0 120 120"
        className={className}
        style={{ height: sizeMap[size].h, width: sizeMap[size].h }}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Exact geometry for M: 2 peaks at top y=38, center notch DOWN to y=80, 3 bottom feet at y=112 */}
          <clipPath id="compact-m-clip">
            <polygon points="18,112 18,38 38,38 60,78 82,38 102,38 102,112 84,112 84,68 70,98 50,98 36,68 36,112" />
          </clipPath>
        </defs>

        {/* Crown above M */}
        <g transform="translate(60, 20)">
          <path
            d="M -24,-3 L -19,-18 L -8,-9 L 0,-23 L 8,-9 L 19,-18 L 24,-3 Z"
            fill="#F59E0B"
          />
          <rect x="-24" y="-2" width="48" height="4" rx="1.5" fill="#D97706" />
        </g>

        {/* Letter M filled with Dutch flag stripes */}
        <rect x="15" y="36" width="90" height="26" fill="#C8102E" clipPath="url(#compact-m-clip)" />
        <rect x="15" y="62" width="90" height="25" fill="#FFFFFF" clipPath="url(#compact-m-clip)" />
        <rect x="15" y="87" width="90" height="27" fill="#21468B" clipPath="url(#compact-m-clip)" />

        {/* Crisp border on M for clarity */}
        <polygon
          points="18,112 18,38 38,38 60,78 82,38 102,38 102,112 84,112 84,68 70,98 50,98 36,68 36,112"
          fill="none"
          stroke={outlineColor}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Full Logo: Crown, PJMAK with Dutch flag M
  return (
    <svg
      viewBox="0 0 540 155"
      className={className}
      style={{ height: sizeMap[size].h, width: sizeMap[size].w }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* 
          Geometry of bold M:
          - Left vertical edge: (190, 130) to (190, 40)
          - Left top peak: (190, 40) to (214, 40)
          - Center V notch going DOWN: (214, 40) to (233, 88) to (252, 40)
          - Right top peak: (252, 40) to (276, 40)
          - Right vertical edge: (276, 40) to (276, 130)
          - Bottom right foot: (276, 130) to (256, 130)
          - Inner right leg: (256, 130) to (256, 76)
          - Center bottom apex: (242, 112) to (224, 112)
          - Inner left leg: (210, 76) to (210, 130)
          - Bottom left foot: (210, 130) to (190, 130)
        */}
        <clipPath id="full-m-clip">
          <polygon points="190,130 190,40 214,40 233,88 252,40 276,40 276,130 256,130 256,76 242,112 224,112 210,76 210,130" />
        </clipPath>
      </defs>

      {/* Royal Crown directly centered above M (x = 233) */}
      <g transform="translate(233, 24)">
        <path
          d="M -30,-4 L -23,-24 L -9,-12 L 0,-28 L 9,-12 L 23,-24 L 30,-4 Z"
          fill="#F59E0B"
        />
        <rect x="-30" y="-2" width="60" height="5" rx="1.5" fill="#D97706" />
      </g>

      {/* PJ & AK in bold sans-serif */}
      <g
        fill={textColor}
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontWeight="900"
        fontSize="98"
        letterSpacing="-2"
      >
        <text x="60" y="130">PJ</text>
        <text x="288" y="130">AK</text>
      </g>

      {/* Letter M with Dutch Flag Tricolor (Red, White, Blue) */}
      <rect x="185" y="38" width="96" height="32" fill="#C8102E" clipPath="url(#full-m-clip)" />
      <rect x="185" y="70" width="96" height="30" fill="#FFFFFF" clipPath="url(#full-m-clip)" />
      <rect x="185" y="100" width="96" height="32" fill="#21468B" clipPath="url(#full-m-clip)" />

      {/* Crisp outline on M */}
      <polygon
        points="190,130 190,40 214,40 233,88 252,40 276,40 276,130 256,130 256,76 242,112 224,112 210,76 210,130"
        fill="none"
        stroke={outlineColor}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
};
