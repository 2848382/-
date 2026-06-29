import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface GraphNode {
  id: string;
  name: string;
  isMe: boolean;
  stress: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
  isSecret: boolean;
  isMasterOnly: boolean;
}

interface RelationshipGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick: (node: GraphNode) => void;
  width?: number;
  height?: number;
  // [애니메이션: 추가]
  loop?: number;
  onlineUids?: string[];
  betrayalPair?: [string, string] | null;
}

const edgeColor: Record<string, string> = {
  pair:         '#3b5bdb',
  rival:        '#f97316',
  guard:        '#10b981',
  accomplice:   '#8b5cf6',
  debt:         '#eab308',
  informant:    '#06b6d4',
  echo:         '#ec4899',
  scapegoat:    '#ef4444',
  watcher:      '#64748b',
  mirror:       '#a78bfa',
  benefactor:   '#34d399',
  paranoia:     '#f43f5e',
  pact:         '#1e1b4b',
  mentor:       '#0ea5e9',
  nemesis:      '#dc2626',
  trauma_bond:  '#9333ea',
  broker:       '#d97706',
  curse:        '#18181b',
};

export const RelationshipGraph: React.FC<RelationshipGraphProps> = ({ nodes, edges, onNodeClick, width = 600, height = 400, loop, onlineUids, betrayalPair }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);

  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const w = wrapperRef.current.clientWidth || width;
    const h = wrapperRef.current.clientHeight || height;
    
    const simNodes = nodes.map(d => ({ ...d }));
    const simLinks = edges.map(d => ({ ...d }));

    // [애니메이션: 오염효과 오버레이]
    const contaminationLevel = Math.max(0, ((loop || 0) - 4) / 6);
    if (contaminationLevel > 0) {
      svg.insert("rect", ":first-child")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("fill", `rgba(${Math.round(contaminationLevel * 80)},0,0,${contaminationLevel * 0.08})`)
        .style("pointer-events", "none");
    }
    
    // [애니메이션: CSS 펄스 링, 진동 애니메이션 추가]
    const baseRadius = 15;
    svg.append("style").text(`
      @keyframes nodePulse {
        0%, 100% { r: ${baseRadius}px; opacity: 1; }
        50%       { r: ${baseRadius + 5}px; opacity: 0.7; }
      }
      .node-online circle.pulse-ring {
        animation: nodePulse 2s ease-in-out infinite;
        transform-origin: center;
        transform-box: fill-box;
      }
      @keyframes nodeShake {
        0%, 100% { transform: translate(0, 0); }
        20%      { transform: translate(-1.5px, 0.5px); }
        40%      { transform: translate(1.5px, -0.5px); }
        60%      { transform: translate(-0.8px, 1px); }
        80%      { transform: translate(0.8px, -1px); }
      }
      .node-highstress {
        animation: nodeShake 0.4s ease-in-out infinite;
      }
    `);

    const defs = svg.append("defs");
    
    if ((loop || 0) >= 8) {
      defs.append("filter")
        .attr("id", "contaminate")
        .append("feColorMatrix")
        .attr("type", "saturate")
        .attr("values", String(Math.max(0, 1 - contaminationLevel * 0.7)));
    }

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (e) => {
        g.attr('transform', e.transform);
      });

    svg.call(zoom);

    const g = svg.append('g');
    
    // [애니메이션: 군집화 Convex Hull]
    const hullGroup = g.insert("g", ":first-child").attr("class", "hulls");
    const clusterByType = (type: string) => {
      const typeEdges = simLinks.filter((e: any) => e.type === type);
      const uids = new Set<string>();
      typeEdges.forEach((e: any) => {
        if (e.source?.id) uids.add(e.source.id);
        if (e.target?.id) uids.add(e.target.id);
      });
      return simNodes.filter((n: any) => uids.has(n.id));
    };
    const hullTypes = ['pair', 'accomplice', 'echo', 'guard', 'pact'];

    const updateHulls = () => {
      hullGroup.selectAll("path.hull").remove();

      hullTypes.forEach(type => {
        const clusterNodes = clusterByType(type);
        if (clusterNodes.length < 3) return;

        const points = clusterNodes.map((n: any) => [n.x, n.y] as [number, number]);
        const hull = d3.polygonHull(points);
        if (!hull) return;

        const centroid = d3.polygonCentroid(hull);
        const paddedHull = hull.map(([x, y]) => {
          const dx = x - centroid[0];
          const dy = y - centroid[1];
          const dist = Math.sqrt(dx * dx + dy * dy);
          const pad = 32;
          return [x + (dx / dist) * pad, y + (dy / dist) * pad] as [number, number];
        });

        hullGroup.append("path")
          .attr("class", "hull")
          .attr("d", `M${paddedHull.join("L")}Z`)
          .attr("fill", edgeColor[type] || "#94a3b8")
          .attr("fill-opacity", 0.07)
          .attr("stroke", edgeColor[type] || "#94a3b8")
          .attr("stroke-opacity", 0.25)
          .attr("stroke-width", 2)
          .attr("stroke-linejoin", "round")
          .style("filter", `drop-shadow(0 0 8px ${edgeColor[type]}44)`);
      });
    };

    const simulation = d3.forceSimulation(simNodes as any)
      .force('link', d3.forceLink(simLinks as any).id((d: any) => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(w / 2, h / 2))
      .force('collision', d3.forceCollide().radius((d: any) => 30 + (d.stress / 100) * 10));
      
    simulationRef.current = simulation;

    const link = g.append("g")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(simLinks)
      .join("line")
      .attr("stroke-width", 2)
      .attr("stroke", (d: any) => edgeColor[d.type] || '#94a3b8')
      .attr("stroke-dasharray", (d: any) => d.isSecret ? "5,5" : "none")
      .style("display", (d: any) => d.isMasterOnly ? "none" : "block");
      
    // [애니메이션: 흐르는 빛 (linkFlow)]
    const linkFlow = g.append("g")
      .selectAll("line.flow")
      .data(simLinks.filter((d: any) => !d.isSecret))
      .join("line")
      .attr("class", "flow")
      .attr("stroke-width", 2.5)
      .attr("stroke-opacity", 0)
      .attr("stroke", (d: any) => edgeColor[d.type] || '#94a3b8')
      .style("display", (d: any) => d.isMasterOnly ? "none" : "block");

    const flowSpeed: Record<string, number> = {
      pair: 1.2, accomplice: 0.8, echo: 1.0, guard: 1.4,
      rival: 0.6, nemesis: 0.5, pact: 0.3, curse: 0.2,
    };

    const node = g.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("g")
      .data(simNodes)
      .join("g")
      .attr("class", "node-el")
      .style("cursor", "pointer")
      .call(drag(simulation) as any)
      .on("click", (e, d: any) => {
        onNodeClick(d as GraphNode);
      });
      
    // [애니메이션: 노드 연결 펄스 클래스 적용]
    node.classed("node-online", (d: any) => !reduced && (onlineUids || []).includes(d.id));
    node.classed("node-highstress", (d: any) => !reduced && d.stress >= 80);

    // [애니메이션: 온라인 파문 링 추가]
    node.insert("circle", "circle")
      .attr("class", "pulse-ring")
      .attr("r", (d: any) => {
        const base = 15 + (d.stress / 100) * 8;
        return (onlineUids || []).includes(d.id) ? base + 6 : 0;
      })
      .attr("fill", "none")
      .attr("stroke", (d: any) => d.isMe ? "#3b5bdb" : "#64748b")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.4);

    node.append("circle")
      .attr("r", (d: any) => 15 + (d.stress / 100) * 8)
      .attr("fill", (d: any) => d.isMe ? "#3b5bdb" : "#1e293b")
      .attr("stroke", (d: any) => d.isMe ? "#fff" : "#334155")
      .attr("stroke-width", (d: any) => d.isMe ? 3 : 1.5)
      .attr("opacity", (d: any) => (onlineUids || []).length > 0 ? ((onlineUids || []).includes(d.id) ? 1 : 0.45) : 1)
      .style("filter", (loop || 0) >= 8 ? "url(#contaminate)" : "none");

    node.append("text")
      .attr("dy", 35)
      .attr("text-anchor", "middle")
      .attr("fill", "currentColor")
      .attr("stroke", "none")
      .style("font-size", "12px")
      .style("font-weight", (d: any) => d.isMe ? "700" : "500")
      .text((d: any) => d.name);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
        
      linkFlow
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
      
      if (!reduced) updateHulls();
    });

    let frameId: number;
    let glitchInterval: NodeJS.Timeout | null = null;
    
    if (!reduced) {
      let t = 0;
      const animate = () => {
        t += 0.016;
        linkFlow
          .attr("stroke-opacity", 0.85)
          .attr("x1", (d: any) => {
            const speed = flowSpeed[d.type] || 0.8;
            const progress = (t * speed) % 1;
            return d.source.x + (d.target.x - d.source.x) * progress;
          })
          .attr("y1", (d: any) => {
            const speed = flowSpeed[d.type] || 0.8;
            const progress = (t * speed) % 1;
            return d.source.y + (d.target.y - d.source.y) * progress;
          })
          .attr("x2", (d: any) => {
            const speed = flowSpeed[d.type] || 0.8;
            const progress = Math.min(1, (t * speed) % 1 + 0.06);
            return d.source.x + (d.target.x - d.source.x) * progress;
          })
          .attr("y2", (d: any) => {
            const speed = flowSpeed[d.type] || 0.8;
            const progress = Math.min(1, (t * speed) % 1 + 0.06);
            return d.source.y + (d.target.y - d.source.y) * progress;
          });
        frameId = requestAnimationFrame(animate);
      };
      animate();
      
      if ((loop || 0) >= 5 && contaminationLevel > 0) {
        glitchInterval = setInterval(() => {
          link.attr("stroke-opacity", () => Math.random() > 0.92 ? 0.1 : 0.6);
          setTimeout(() => {
            link.attr("stroke-opacity", 0.6);
          }, 80);
        }, 2000);
      }
    }

    function drag(simulation: any) {
      if (reduced) return d3.drag();
      return d3.drag()
        .on("start", (event: any, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event: any, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event: any, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        });
    }

    return () => {
      simulation.stop();
      if (frameId) cancelAnimationFrame(frameId);
      if (glitchInterval) clearInterval(glitchInterval);
    };
  }, [nodes, edges, width, height, reduced, loop, onlineUids]);

  // [애니메이션: 배신 반발 효과]
  useEffect(() => {
    if (!betrayalPair || !svgRef.current || !simulationRef.current) return;
    const [uidA, uidB] = betrayalPair;

    const repulse = d3.forceManyBody().strength((d: any) => {
      if (d.id === uidA || d.id === uidB) return -2000;
      return -300;
    });

    simulationRef.current.force('charge', repulse).alpha(1).restart();

    const svg = d3.select(svgRef.current);
    const g = svg.select("g");

    [uidA, uidB].forEach(uid => {
      const nodeEl = g.selectAll("g.node-el").filter((d: any) => d.id === uid);
      if (nodeEl.empty()) return;

      [0, 200, 400].forEach(delay => {
        setTimeout(() => {
          nodeEl.append("circle")
            .attr("r", 20)
            .attr("fill", "none")
            .attr("stroke", "#ef4444")
            .attr("stroke-width", 2)
            .attr("opacity", 0.9)
            .transition()
            .duration(800)
            .attr("r", 60)
            .attr("opacity", 0)
            .remove();
        }, delay);
      });
    });

    const timer = setTimeout(() => {
        if (simulationRef.current) {
            simulationRef.current.force('charge', d3.forceManyBody().strength(-300)).alpha(0.3).restart();
        }
    }, 600);

    return () => clearTimeout(timer);
  }, [betrayalPair]);

  return (
    <div ref={wrapperRef} className="w-full h-full min-h-[400px] bg-slate-50/50 rounded-2xl overflow-hidden shadow-inner dark:bg-[#0F172A]">
      <svg ref={svgRef} className="w-full h-full cursor-move" />
    </div>
  );
};
