import React, { useEffect, useRef, useState, useCallback } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Pencil, Eraser, Loader2, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { useGame } from '../contexts/GameContext';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  color: string;
  width: number;
  points: Point[];
  type: 'pen' | 'eraser';
}

export const Whiteboard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { profile } = useGame();
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#0F172A');
  const [mode, setMode] = useState<'pen' | 'eraser'>('pen');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [loading, setLoading] = useState(true);

  // Load strokes from Firestore
  useEffect(() => {
    const docRef = doc(db, 'whiteboard', 'shared');
    
    // Ensure document exists
    setDoc(docRef, { strokes: [] }, { merge: true }).catch(console.error);

    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setStrokes(data.strokes || []);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const drawStrokes = useCallback((ctx: CanvasRenderingContext2D, strokesToDraw: Stroke[]) => {
    if (!canvasRef.current) return;
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    strokesToDraw.forEach(stroke => {
      if (stroke.points.length === 0) return;
      
      ctx.beginPath();
      ctx.strokeStyle = stroke.type === 'eraser' ? '#ffffff' : stroke.color;
      ctx.lineWidth = stroke.type === 'eraser' ? 20 : stroke.width;
      
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
  }, []);

  // Redraw when strokes or currentStroke changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Need to clear and redraw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawStrokes(ctx, strokes);
    if (currentStroke) {
      drawStrokes(ctx, [currentStroke]);
    }
  }, [strokes, currentStroke, drawStrokes]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        // Since resize clears canvas, we set dimensions and it will redraw because strokes depend on it 
        // We actually only want to set this once or manage scaling. 
        // For simple whiteboard, fixed logical size mapped to visual size is better.
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    // Scale coordinates to canvas resolution
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const coords = getCoordinates(e);
    setCurrentStroke({
      color,
      width: 3,
      type: mode,
      points: [coords]
    });
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || !currentStroke) return;
    const coords = getCoordinates(e);
    setCurrentStroke(prev => {
      if(!prev) return prev;
      return {
        ...prev,
        points: [...prev.points, coords]
      };
    });
  };

  const stopDrawing = async (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!isDrawing || !currentStroke) return;
    setIsDrawing(false);
    
    // Save to Firestore
    if (currentStroke.points.length > 0) {
      try {
        await updateDoc(doc(db, 'whiteboard', 'shared'), {
          strokes: arrayUnion(currentStroke)
        });
      } catch (err) {
        console.error("Failed to save stroke:", err);
      }
    }
    setCurrentStroke(null);
  };

  const clearBoard = async () => {
    if (profile?.role !== 'admin') {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: '마스터만 초기화할 수 있습니다.', type: "error" } }));
      return;
    }
    if (window.confirm('보드를 초기화하시겠습니까?')) {
      await setDoc(doc(db, 'whiteboard', 'shared'), { strokes: [] });
    }
  };

  const colors = ['#0F172A', '#1E40AF', '#B91C1C', '#047857', '#eab308'];

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-inner relative">
      {/* Toolbox */}
      <div className="h-14 border-b border-slate-200 bg-slate-50 px-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
            <button 
              onClick={() => setMode('pen')}
              className={cn("p-1.5 rounded-md transition-colors", mode === 'pen' ? "bg-slate-100 text-[#0F172A]" : "text-slate-400 hover:text-slate-600")}
            >
              <Pencil size={18} />
            </button>
            <button 
              onClick={() => setMode('eraser')}
              className={cn("p-1.5 rounded-md transition-colors", mode === 'eraser' ? "bg-slate-100 text-[#0F172A]" : "text-slate-400 hover:text-slate-600")}
            >
              <Eraser size={18} />
            </button>
          </div>

          {mode === 'pen' && (
            <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-4">
              {colors.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 transition-transform",
                    color === c ? "scale-110 shadow-sm border-slate-300" : "border-transparent opacity-70 hover:opacity-100"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
        </div>
        
        {profile?.role === 'admin' && (
          <button onClick={clearBoard} className="text-xs font-bold text-slate-500 hover:text-red-500 transition-colors flex items-center gap-1">
             <RotateCcw size={14} /> 초기화
          </button>
        )}
      </div>

      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-20">
          <Loader2 className="animate-spin text-slate-300" size={32} />
        </div>
      ) : null}

      {/* Canvas Area */}
      <div 
        ref={containerRef}
        className="flex-1 w-full relative touch-none cursor-crosshair bg-slate-50/50"
      >
        <canvas
          ref={canvasRef}
          width={1200}
          height={800}
          className="absolute inset-0 w-full h-full object-contain bg-white"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
    </div>
  );
};
