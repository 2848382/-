import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MAP_DATA, IsoMapArea, toIso, TILE_H, TILE_W } from '../../constants/mapData';
import { IsoRoom, RoomStatus, PlayerPin, CluePin } from './IsoRoom';
import { UserProfile } from '../../types';
import { getRoomAvailability } from '../../lib/spacialAvailability';

interface IsoGridProps {
  building: string;
  floor: string;
  currentLoop: number;
  selectedAreaId: string | null;
  hoveredAreaId: string | null;
  visitedRoomIds: string[]; // [신규] 체크인한 방(오늘 루프)
  allPlayers: UserProfile[];
  clueNodes: any[]; // replace with proper type from ClueBoard
  roomStatuses: Record<string, RoomStatus>;
  myUid?: string;
  profile?: UserProfile | null;
  masterView?: boolean;
  onAreaSelect: (id: string) => void;
  onAreaHover: (id: string | null) => void;
}

export const IsoGrid: React.FC<IsoGridProps> = ({
  building, floor, currentLoop, 
  selectedAreaId, hoveredAreaId, visitedRoomIds,
  allPlayers, clueNodes, roomStatuses,
  myUid, profile, masterView,
  onAreaSelect, onAreaHover
}) => {
  const areas = MAP_DATA[building]?.[floor] || [];

  // Sort areas from back to front (Painter's algorithm)
  const sortedAreas = [...areas].sort((a, b) => (a.col + a.row) - (b.col + b.row));

  // 복도 바닥을 먼저 그리기 위해 전체 그리드 크기 계산 (간단히 10x10)
  const floorTiles = [];
  for (let c = 0; c < 14; c++) {
    for (let r = 0; r < 14; r++) {
      const { x, y } = toIso(c, r);
      const topFace = `M ${x} ${y} L ${x + TILE_W/2} ${y + TILE_H/2} L ${x} ${y + TILE_H} L ${x - TILE_W/2} ${y + TILE_H/2} Z`;
      floorTiles.push(
        <path key={`floor-${c}-${r}`} d={topFace} fill="#151f35" stroke="#1e2d4a" strokeWidth="0.5" />
      );
    }
  }

  // 계산된 경계 박스 (Bounding Box) 
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  if (sortedAreas.length === 0) {
    minX = -400; maxX = 400; minY = -200; maxY = 400;
  } else {
    sortedAreas.forEach(area => {
      const { col, row, colSpan, rowSpan, height } = area;
      const p0 = toIso(col, row);
      const p1 = toIso(col + colSpan, row);
      const p2 = toIso(col + colSpan, row + rowSpan);
      const p3 = toIso(col, row + rowSpan);

      const h = height * TILE_H;
      const xs = [p0.x, p1.x, p2.x, p3.x];
      const ys = [p0.y, p1.y, p2.y, p3.y];

      minX = Math.min(minX, Math.min(...xs) - TILE_W);
      maxX = Math.max(maxX, Math.max(...xs) + TILE_W);
      minY = Math.min(minY, Math.min(...ys) - h - TILE_H * 2);
      maxY = Math.max(maxY, Math.max(...ys) + TILE_H * 2);
    });

    const pLeft = toIso(0, 14);
    const pRight = toIso(14, 0);
    const pTop = toIso(0, 0);
    const pBottom = toIso(14, 14);

    minX = Math.min(minX, pLeft.x - TILE_W);
    maxX = Math.max(maxX, pRight.x + TILE_W);
    minY = Math.min(minY, pTop.y - TILE_H * 2);
    maxY = Math.max(maxY, pBottom.y + TILE_H * 2);
  }

  const padding = 40;
  const vbX = minX - padding;
  const vbY = minY - padding;
  const vbW = (maxX - minX) + padding * 2;
  const vbH = (maxY - minY) + padding * 2;
  const viewBoxStr = `${vbX} ${vbY} ${vbW} ${vbH}`;

  return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox={viewBoxStr} 
      preserveAspectRatio="xMidYMid meet"
      style={{
        // [루프] 루프 5+ : 약한 빨간 틴트
        filter: currentLoop >= 8
          ? 'contrast(1.15) hue-rotate(15deg) saturate(1.2)'
          : currentLoop >= 5
          ? 'contrast(1.05) saturate(1.1)'
          : 'none',
        transition: 'filter 2s ease',
      }}
    >
      <defs>
         <filter id="fog-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" />
         </filter>

         {/* [신규] 상단면 하이라이트 그라디언트 */}
         <linearGradient id="top-highlight" x1="0%" y1="0%" x2="100%" y2="100%">
           <stop offset="0%" stopColor="white" stopOpacity="0.4" />
           <stop offset="50%" stopColor="white" stopOpacity="0.1" />
           <stop offset="100%" stopColor="white" stopOpacity="0" />
         </linearGradient>

         {/* [신규] 선택 글로우 필터 */}
         <filter id="select-glow" x="-20%" y="-20%" width="140%" height="140%">
           <feGaussianBlur stdDeviation="4" result="blur" />
           <feMerge>
             <feMergeNode in="blur" />
             <feMergeNode in="SourceGraphic" />
           </feMerge>
         </filter>
      </defs>

    <g>
      {/* 바닥 타일 */}
      <g className="floor-grid opacity-50">
        {floorTiles}
      </g>

      {/* 방 블록 */}
      {sortedAreas.map(area => {
        // Find players presently in this room
        const status = roomStatuses[area.id];
        const presentUids = status?.presentPlayers || [];
        const pinsInRoom: PlayerPin[] = presentUids.map(uid => {
           const p = allPlayers.find(s => s.uid === uid);
           if (!p) return { uid, name: '알수없음' };
           return { uid: p.uid, name: p.name, photoURL: p.photoURL };
        });

        // Find clues connected to this room
        const cluesInRoom: CluePin[] = clueNodes
           .filter(node => node.category === 'place' && node.placeId === area.id)
           .map(node => ({
             nodeId: node.id,
             title: node.title,
             category: node.category
           }));

        const isRevealing = currentLoop === area.minLoop;
        const availability = getRoomAvailability(area, profile || null, presentUids.length);

        return (
          <g key={area.id}>
             <IsoRoom
               area={area}
               isSelected={selectedAreaId === area.id}
               isHovered={hoveredAreaId === area.id}
               isRevealing={isRevealing}
               isFogged={currentLoop < (area.minLoop ?? 999)}
               isVisited={visitedRoomIds.includes(area.id)}
               isAvailable={availability.isAvailable}
               intensity={availability.intensity}
               playerPins={pinsInRoom}
               cluePins={cluesInRoom}
               roomStatus={status}
               myUid={myUid}
               masterView={masterView}
               onSelect={onAreaSelect}
               onHover={onAreaHover}
             />
          </g>
        );
      })}

      {/* [신규] 구름다리 연결선 */}
      {sortedAreas
        .filter(a => a.roomType === 'bridge')
        .map(bridge => {
          const { x: bx, y: by } = toIso(
            bridge.col + bridge.colSpan / 2,
            bridge.row + bridge.rowSpan / 2
          );
          // 구름다리 방향에 따라 선 그리기
          const isHorizontal = bridge.accessoryType === 'bridge_h';
          return (
            <g key={`bridge-line-${bridge.id}`} pointerEvents="none" opacity={0.6}>
              <line
                x1={isHorizontal ? bx - 40 : bx}
                y1={isHorizontal ? by : by - 20}
                x2={isHorizontal ? bx + 40 : bx}
                y2={isHorizontal ? by : by + 20}
                stroke="#d8f0e8"
                strokeWidth={3}
                strokeDasharray="6,3"
              />
              {/* 연결 대상 건물 라벨 */}
              <text
                x={bx + (isHorizontal ? 45 : 0)}
                y={by + (isHorizontal ? 0 : 25)}
                fontSize={8}
                fontWeight={700}
                fill="#a8d8c0"
                textAnchor="middle"
              >
                ↔ {bridge.connectsTo}
              </text>
            </g>
          );
        })
      }
    </g>
    </svg>
  );
};

// Helper to get top face path for fog overlay
function getTopFace(area: IsoMapArea) {
  const { col, row, colSpan, rowSpan, height } = area;
  const { x: x0, y: y0 } = toIso(col, row);
  const { x: x1, y: y1 } = toIso(col + colSpan, row);
  const { x: x2, y: y2 } = toIso(col + colSpan, row + rowSpan);
  const { x: x3, y: y3 } = toIso(col, row + rowSpan);
  const h = height * TILE_H;
  return `M ${x0} ${y0 - h} L ${x1} ${y1 - h} L ${x2} ${y2 - h} L ${x3} ${y3 - h} Z`;
}
