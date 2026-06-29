import React from 'react';
import { motion } from 'motion/react';
import { IsoMapArea, toIso, TILE_H } from '../../constants/mapData';
import { MapPlayerPin } from './MapPlayerPin';

export interface PlayerPin {
  uid: string;
  name: string;
  photoURL?: string;
}

export interface CluePin {
  nodeId: string;
  title: string;
  category: string;
}

export interface RoomStatus {
  roomId: string;
  state: 'normal' | 'locked' | 'danger' | 'event' | 'hidden';
  note?: string;
  updatedAt: any;
  presentPlayers: string[];
}

interface IsoRoomProps {
  area: IsoMapArea;
  isSelected: boolean;
  isHovered: boolean;
  isRevealing: boolean;
  isFogged?: boolean;
  isVisited?: boolean; // [신규] 체크인 기록 표시
  isAvailable?: boolean; // [신규] 게임 규칙상 가용 여부
  intensity?: number; // [신규] 폐쇄 강도 (0~1)
  playerPins: PlayerPin[];
  cluePins: CluePin[];
  roomStatus?: RoomStatus;
  myUid?: string;
  masterView?: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

const ROOM_COLORS: Record<string, { top: string; left: string; right: string; text?: string }> = {
  classroom: {
    top:   '#d4dff5',
    left:  '#aabde8',
    right: '#8fa8d8',
    text:  '#1e3a6e',
  },
  special: {
    top:   '#cceeff',
    left:  '#99ddee',
    right: '#77ccdd',
    text:  '#0e5a7a',
  },
  facility: {
    top:   '#ccf0e0',
    left:  '#99ddc0',
    right: '#77cca8',
    text:  '#0e6640',
  },
  store: {
    top:   '#fff0c0',
    left:  '#ffe080',
    right: '#ffd060',
    text:  '#7a5500',
  },
  danger: {
    top:   '#ffd0d0',
    left:  '#ffaaaa',
    right: '#ff8888',
    text:  '#7a0000',
  },
  hidden: {
    top:   '#1a2540',
    left:  '#101830',
    right: '#0a1020',
    text:  '#334466',
  },
  admin: {
    top:   '#e8e0f8',
    left:  '#ccc0f0',
    right: '#b8a8e8',
    text:  '#3a1a8a',
  },
  outdoor: {
    top:   '#d0f8d8',
    left:  '#a0e8b0',
    right: '#80d890',
    text:  '#0a5020',
  },
  // [신규] 부속 요소
  stair: { top: '#c8d8f0', left: '#a0b8e0', right: '#88a0cc', text: '#1a3060' },
  stair_emergency: { top: '#ffe0c0', left: '#ffb880', right: '#ff9850', text: '#7a3000' },
  elevator: { top: '#e0e8f8', left: '#b8c8f0', right: '#98b0e8', text: '#1a2a6a' },
  corridor: { top: '#e8ecf2', left: '#d0d8e4', right: '#b8c4d4', text: '#4a5568' },
  bridge: { top: '#d8f0e8', left: '#a8d8c0', right: '#88c0a8', text: '#0a4a2a' },
  toilet: { top: '#e8f4fd', left: '#c0dff5', right: '#a0c8ed', text: '#0a3a5a' },
  fire_exit: { top: '#fff0d0', left: '#ffd880', right: '#ffc040', text: '#7a4000' },
  elevator_restricted: { top: '#f0e8f8', left: '#d8c8f0', right: '#c0a8e8', text: '#3a0a7a' },
  utility: { top: '#d8d8e8', left: '#b8b8cc', right: '#9898b0', text: '#2a2a4a' },
};

function renderAccessoryIcon(type: string): React.ReactNode {
  const iconStyle = { filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' };

  switch(type) {
    case 'stair_both':
      return (
        <g style={iconStyle}>
          <polygon points="0,-8 5,-2 -5,-2" fill="white" opacity={0.9} />
          <polygon points="0,8 5,2 -5,2" fill="white" opacity={0.9} />
          <line x1="0" y1="-2" x2="0" y2="2" stroke="white" strokeWidth={1.5} opacity={0.7} />
        </g>
      );
    case 'stair_up':
      return (
        <g style={iconStyle}>
          <polygon points="0,-8 6,-1 -6,-1" fill="white" opacity={0.9} />
          <line x1="0" y1="-1" x2="0" y2="6" stroke="white" strokeWidth={1.5} opacity={0.7} />
        </g>
      );
    case 'stair_down':
      return (
        <g style={iconStyle}>
          <polygon points="0,8 6,1 -6,1" fill="white" opacity={0.9} />
          <line x1="0" y1="1" x2="0" y2="-6" stroke="white" strokeWidth={1.5} opacity={0.7} />
        </g>
      );
    case 'elevator':
      return (
        <g style={iconStyle}>
          <rect x={-7} y={-8} width={14} height={16} rx={2} fill="none" stroke="white" strokeWidth={1.5} opacity={0.8} />
          <polygon points="0,-5 4,-1 -4,-1" fill="white" opacity={0.9} />
          <polygon points="0,5 4,1 -4,1" fill="white" opacity={0.9} />
        </g>
      );
    case 'bridge_h':
      return (
        <g style={iconStyle}>
          <line x1={-14} y1={-3} x2={14} y2={-3} stroke="white" strokeWidth={2} opacity={0.9} strokeDasharray="3,2" />
          <line x1={-14} y1={3} x2={14} y2={3} stroke="white" strokeWidth={2} opacity={0.9} strokeDasharray="3,2" />
          <polygon points="12,0 8,-4 8,4" fill="white" opacity={0.8} />
        </g>
      );
    case 'bridge_v':
      return (
        <g style={iconStyle}>
          <line x1={-3} y1={-14} x2={-3} y2={14} stroke="white" strokeWidth={2} opacity={0.9} strokeDasharray="3,2" />
          <line x1={3} y1={-14} x2={3} y2={14} stroke="white" strokeWidth={2} opacity={0.9} strokeDasharray="3,2" />
          <polygon points="0,12 -4,8 4,8" fill="white" opacity={0.8} />
        </g>
      );
    case 'toilet_both':
      return (
        <g style={iconStyle}>
          {/* 남 (삼각형 바지) */}
          <circle cx={-5} cy={-8} r={3} fill="white" opacity={0.8} />
          <polygon points="-5,-4 -9,4 -1,4" fill="white" opacity={0.7} />
          {/* 여 (삼각형 치마) */}
          <circle cx={5} cy={-8} r={3} fill="white" opacity={0.8} />
          <path d="M2,-4 L2,4 L8,4 L8,-4 Z" fill="white" opacity={0.7} />
        </g>
      );
    case 'toilet_m':
      return (
        <g style={iconStyle}>
          <circle cx={0} cy={-7} r={3} fill="white" opacity={0.8} />
          <polygon points="0,-3 -5,5 5,5" fill="white" opacity={0.7} />
        </g>
      );
    case 'toilet_f':
      return (
        <g style={iconStyle}>
          <circle cx={0} cy={-7} r={3} fill="white" opacity={0.8} />
          <path d="M-4,-3 L-4,5 L4,5 L4,-3 Z" fill="white" opacity={0.7} />
        </g>
      );
    case 'fire_exit':
      return (
        <g style={iconStyle}>
          <rect x={-8} y={-10} width={16} height={20} rx={2} fill="#22c55e" opacity={0.9} />
          {/* 달리는 사람 심볼 (간소화) */}
          <circle cx={0} cy={-6} r={2.5} fill="white" />
          <path d="M0,-3 L-4,4 M0,-3 L4,4 M0,0 L-3,-2 M0,0 L3,-2" stroke="white" strokeWidth={1.5} strokeLinecap="round" fill="none" />
        </g>
      );
    case 'cctv':
      return (
        <g style={iconStyle}>
          <rect x={-8} y={-5} width={10} height={8} rx={2} fill="none" stroke="white" strokeWidth={1.5} opacity={0.8} />
          <polygon points="2,-3 10,-7 10,7 2,5" fill="white" opacity={0.7} />
          <circle cx={-4} cy={-1} r={1.5} fill="#ef4444" opacity={0.9} />
        </g>
      );
    default:
      return null;
  }
}

function getRoomLabelPos(col: number, row: number, colSpan: number, rowSpan: number, height: number) {
  const centerCol = col + colSpan / 2;
  const centerRow = row + rowSpan / 2;
  const { x, y } = toIso(centerCol, centerRow);
  return { x, y: y - height * TILE_H - 4 };
}

export const IsoRoom: React.FC<IsoRoomProps> = ({
  area, isSelected, isHovered, isRevealing, isFogged, isVisited, isAvailable = true, intensity = 0, playerPins, cluePins, roomStatus, myUid, masterView, onSelect, onHover
}) => {
  const { col, row, colSpan, rowSpan, height, roomType } = area;

  const { x: x0, y: y0 } = toIso(col, row);
  const { x: x1, y: y1 } = toIso(col + colSpan, row);
  const { x: x2, y: y2 } = toIso(col + colSpan, row + rowSpan);
  const { x: x3, y: y3 } = toIso(col, row + rowSpan);
  const h = height * TILE_H;

  const topFacePath = `M ${x0} ${y0 - h} L ${x1} ${y1 - h} L ${x2} ${y2 - h} L ${x3} ${y3 - h} Z`;
  const leftFacePath = `M ${x0} ${y0 - h} L ${x3} ${y3 - h} L ${x3} ${y3} L ${x0} ${y0} Z`;
  const rightFacePath = `M ${x1} ${y1 - h} L ${x2} ${y2 - h} L ${x2} ${y2} L ${x1} ${y1} Z`;

  // Determine colors based on state
  const baseColors = ROOM_COLORS[roomType] || ROOM_COLORS['classroom'];
  let topColor = baseColors.top;
  let leftColor = baseColors.left;
  let rightColor = baseColors.right;

  // 가용하지 않은 경우 어둡게 처리 (intensity에 따라)
  if (!isAvailable) {
    topColor = '#243b55';
    leftColor = '#141e30';
    rightColor = '#0f0c29';
  }

  if (roomStatus?.state === 'danger' || area.status.includes('위험')) {
    topColor = ROOM_COLORS['danger'].top;
    leftColor = ROOM_COLORS['danger'].left;
    rightColor = ROOM_COLORS['danger'].right;
  }

  const { x: labelX, y: labelY } = getRoomLabelPos(col, row, colSpan, rowSpan, height);
  const displayName = isFogged ? "???" : area.name;
  const isAccessory = ['stair', 'stair_emergency', 'elevator', 'toilet', 'fire_exit', 'bridge', 'utility', 'corridor'].includes(roomType);
  const fontSize = isAccessory ? 8 : (colSpan * rowSpan >= 6 ? 13 : colSpan * rowSpan >= 4 ? 12 : 10);
  const textWidth = displayName.length * (fontSize * 0.62) + 4;
  const labelOpacity = isAccessory ? 0.65 : 0.95;
  
  // Fog integration is handled in IsoGrid by drawing an overlay, but we can do internal logic here if needed.

  const renderPins = () => {
    // 플레이어 핀은 나이거나, 마스터뷰일 때만 렌더링하도록 필터
    const visiblePins = masterView 
        ? playerPins 
        : playerPins.filter(p => p.uid === myUid);

    return visiblePins.map((pin, i) => (
      <MapPlayerPin
        key={pin.uid}
        uid={pin.uid}
        name={pin.name}
        photoURL={pin.photoURL}
        posX={labelX}
        posY={labelY + 12}
        index={i}
        isMe={pin.uid === myUid}
      />
    ));
  };

  const renderCluePins = () => {
    return cluePins.map((clue, i) => {
      const px = labelX + 15 + (i * 10);
      const py = labelY - 5;
      const getCatColor = (cat: string) => {
         switch(cat) {
           case 'character': return '#3b82f6';
           case 'place': return '#10b981';
           case 'item': return '#f59e0b';
           case 'event': return '#ef4444';
           default: return '#8b5cf6';
         }
      };
      
      return (
        <g key={clue.nodeId} transform={`translate(${px}, ${py})`}>
           <path d="M0,-8 L4,0 L0,8 L-4,0 Z" fill={getCatColor(clue.category)} stroke="#fff" strokeWidth={1} />
        </g>
      );
    });
  };

  return (
    <g 
      className={["stair", "elevator", "toilet", "bridge", "fire_exit"].includes(area.roomType) ? "cursor-default" : "cursor-pointer"}
      onMouseEnter={() => onHover(area.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(area.id)}
    >
      <path d={leftFacePath} fill={leftColor} stroke="rgba(0,0,0,0.08)" strokeWidth={1} />
      <path d={rightFacePath} fill={rightColor} stroke="rgba(0,0,0,0.08)" strokeWidth={1} />
      
      {roomStatus?.state === 'event' ? (
        <motion.path 
          d={topFacePath} 
          fill={topColor} 
          stroke="rgba(0,0,0,0.1)" 
          strokeWidth={1}
          animate={{ fill: ['#fef08a', topColor] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
      ) : (
        <path d={topFacePath} fill={topColor} stroke="rgba(0,0,0,0.1)" strokeWidth={1} />
      )}

      {/* [시각] 그라디언트 덧씌우기 */}
      <path
        d={topFacePath}
        fill="url(#top-highlight)"
        style={{ pointerEvents: 'none', mixBlendMode: 'screen' }}
        opacity={0.3}
      />

      {/* [신규] 체크인 기록 표시 */}
      {isVisited && !isFogged && (
        <g pointerEvents="none">
          {/* 연한 초록 오버레이 */}
          <path d={topFacePath} fill="rgba(16, 185, 129, 0.18)" />
          {/* 체크 아이콘 */}
          <g transform={`translate(${labelX + textWidth/2 + 10}, ${labelY - 14})`}>
            <circle r={6} fill="rgba(16,185,129,0.85)" />
            <path
              d="M-2.5,0 L-0.5,2 L3,-2.5"
              stroke="white"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        </g>
      )}

      {/* [신규] 가용 불가 표시 (자물쇠) */}
      {!isAvailable && !isFogged && (
        <g pointerEvents="none">
          <path d={topFacePath} fill="rgba(0,0,0,0.3)" />
          <g transform={`translate(${labelX - textWidth/2 - 18}, ${labelY - 1})`}>
            <rect x="-6" y="-6" width="12" height="12" rx="1" fill="#ef4444" />
            <path d="M-3,-6 L-3,-9 A3,3 0 0,1 3,-9 L3,-6" fill="none" stroke="#ef4444" strokeWidth="2" />
            <circle r="1.5" fill="white" />
          </g>
        </g>
      )}

      {/* 안개 효과 — 루프 해금 구역 */}
      {roomType === 'hidden' && isFogged && (
        <g pointerEvents="none">
          {/* 안개 fill */}
          <path d={topFacePath} fill="rgba(10,15,30,0.9)" />
          <path d={leftFacePath} fill="rgba(10,15,30,0.95)" />
          <path d={rightFacePath} fill="rgba(10,15,30,0.98)" />
          {/* 물음표 라벨 */}
          <text
            x={labelX}
            y={labelY + 2}
            textAnchor="middle"
            fontSize={10}
            fontWeight={900}
            fill="rgba(100,130,180,0.6)"
          >
            ???
          </text>
        </g>
      )}

      {/* 막 해금된 방 (currentLoop === minLoop) — 첫 렌더링 시 fade in */}
      {roomType === 'hidden' && isRevealing && (
        <motion.g
          pointerEvents="none"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 2.5, ease: 'easeOut' }}
        >
          <path d={topFacePath} fill="rgba(10,15,30,0.85)" />
          <path d={leftFacePath} fill="rgba(10,15,30,0.9)" />
          <path d={rightFacePath} fill="rgba(10,15,30,0.95)" />
        </motion.g>
      )}

      {/* 방 라벨 */}
      {!isFogged && (
        <g pointerEvents="none">
          {/* [신규] 부속 요소 아이콘 오버레이 */}
          {area.accessoryType && (
            <g transform={`translate(${labelX}, ${labelY - 16})`}>
              {renderAccessoryIcon(area.accessoryType)}
            </g>
          )}

          {/* 라벨 배경 — 더 불투명하게 */}
          <rect
            x={labelX - textWidth / 2 - 8}
            y={labelY - 11}
            width={textWidth + 16}
            height={20}
            rx={5}
            fill={`rgba(6, 10, 24, ${isAccessory ? 0.6 : 0.82})`}
          />
          {/* 라벨 테두리 */}
          <rect
            x={labelX - textWidth / 2 - 8}
            y={labelY - 11}
            width={textWidth + 16}
            height={20}
            rx={5}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={0.8}
            opacity={labelOpacity}
          />
          {/* 라벨 텍스트 */}
          <text
            x={labelX}
            y={labelY + 3}
            textAnchor="middle"
            fontSize={fontSize}
            fontWeight={800}
            fill={`rgba(255,255,255,${labelOpacity})`}
            style={{ letterSpacing: '-0.02em', pointerEvents: 'none' }}
          >
            {area.name}
          </text>
        </g>
      )}

      {/* 선택 및 호버 강조 효과 */}
      {isSelected && (
        <g pointerEvents="none">
          <path d={topFacePath} fill="rgba(255,255,255,0.2)" />
          <path
            d={topFacePath}
            fill="none"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth={2.5}
            style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.7))' }}
          />
          <path
            d={leftFacePath}
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth={1.5}
          />
          <path
            d={rightFacePath}
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth={1.5}
          />
        </g>
      )}
      {isHovered && !isSelected && (
        <g pointerEvents="none">
          <path d={topFacePath} fill="rgba(255,255,255,0.12)" />
        </g>
      )}

      {/* Pins */}
      {!isFogged && renderPins()}
      {!isFogged && renderCluePins()}
    </g>
  );
};
