import React from 'react';

interface MapPlayerPinProps {
  uid: string;
  name: string;
  photoURL?: string;
  posX: number;
  posY: number;
  index: number;
  isMe: boolean;
}

export const MapPlayerPin: React.FC<MapPlayerPinProps> = ({
  uid, name, photoURL, posX, posY, index, isMe
}) => {
  // 간단한 해시 함수로 네임 컬러 생성
  const hash = uid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];
  const color = colors[hash % colors.length];

  // 여러 명일 때 겹치지 않게 오프셋 (원형으로 퍼지게)
  const angle = index * (Math.PI * 2 / 5); // up to 5 around center
  const radius = index === 0 ? 0 : 12;
  const offsetX = Math.cos(angle) * radius;
  const offsetY = Math.sin(angle) * radius;

  return (
    <g transform={`translate(${posX + offsetX}, ${posY + offsetY - 10})`}>
      {/* 핀 드롭 그림자 */}
      <ellipse cx={0} cy={10} rx={6} ry={3} fill="rgba(0,0,0,0.3)" />
      
      {/* 핀 몸체 (아바타) */}
      <circle 
        cx={0} cy={0} r={10} 
        fill={photoURL ? `url(#avatar-${uid})` : color}
        stroke={isMe ? '#ffffff' : color} 
        strokeWidth={isMe ? 2 : 1}
      />
      {photoURL && (
        <defs>
          <pattern id={`avatar-${uid}`} patternContentUnits="objectBoundingBox" width="1" height="1">
            <image href={photoURL} x="0" y="0" width="1" height="1" preserveAspectRatio="xMidYMid slice" />
          </pattern>
        </defs>
      )}

      {/* 라벨 (나일 경우만) */}
      {isMe && (
        <text 
          x={0} y={18} 
          fontSize={8} 
          fontWeight="bold" 
          fill="#ffffff" 
          textAnchor="middle"
          stroke="#000000"
          strokeWidth={2}
          strokeLinejoin="round"
          paintOrder="stroke"
        >
          나
        </text>
      )}
    </g>
  );
};
