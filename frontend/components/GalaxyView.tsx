"use client";
import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Database, FolderOpen, Table2, GitBranch, Clock, RotateCcw, Sparkles } from "lucide-react";
import type { Project } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { useStore } from "@/lib/store";

// ─────────────────────────────────────────────────────────────────────────────
// DB accent palette
// ─────────────────────────────────────────────────────────────────────────────
const DB_COLORS: Record<string, { core: string; glow: string; label: string }> = {
  postgresql: { core: "#63B3ED", glow: "rgba(99,179,237,0.45)",   label: "PostgreSQL" },
  mysql:      { core: "#FBBF24", glow: "rgba(251,191,36,0.45)",   label: "MySQL"      },
  sqlite:     { core: "#6EE7B7", glow: "rgba(110,231,183,0.45)",  label: "SQLite"     },
  mssql:      { core: "#FCA5A5", glow: "rgba(252,165,165,0.45)",  label: "SQL Server" },
  oracle:     { core: "#FDB06A", glow: "rgba(253,176,106,0.45)",  label: "Oracle"     },
  mongodb:    { core: "#86EFAC", glow: "rgba(134,239,172,0.45)",  label: "MongoDB"    },
  prisma:     { core: "#C4B5FD", glow: "rgba(196,181,253,0.45)",  label: "Prisma"     },
  django:     { core: "#34D399", glow: "rgba(52,211,153,0.45)",   label: "Django"     },
  laravel:    { core: "#FC8181", glow: "rgba(252,129,129,0.45)",  label: "Laravel"    },
  sequelize:  { core: "#93C5FD", glow: "rgba(147,197,253,0.45)",  label: "Sequelize"  },
  hibernate:  { core: "#FDE68A", glow: "rgba(253,230,138,0.45)",  label: "Hibernate"  },
};
const FALLBACK = { core: "#8BAA82", glow: "rgba(139,170,130,0.45)", label: "Database" };
const dbColor = (t: string) => DB_COLORS[t?.toLowerCase()] ?? FALLBACK;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function planetRadius(fileCount: number) {
  return Math.round(36 + Math.min(fileCount, 20) * 2.2);
}
function projectStats(p: Project) {
  let tables = 0, relationships = 0;
  for (const f of p.files) {
    if (f.stats) { tables += f.stats.tables ?? 0; relationships += f.stats.relationships ?? 0; }
  }
  return { tables, relationships };
}
function computePositions(list: Project[]): { x: number; y: number }[] {
  if (!list.length) return [];
  const PAD_X = 11, PAD_Y = 16, CW = 960, CH = 540;
  const placed: { x: number; y: number; r: number }[] = [];
  const result: { x: number; y: number }[] = [];
  for (let i = 0; i < list.length; i++) {
    const r = planetRadius(list[i].files.length);
    let x = 0, y = 0, ok = false;
    for (let a = 0; a < 400 && !ok; a++) {
      const xp = PAD_X + (r / CW) * 100 + Math.random() * (100 - 2 * PAD_X - (2 * r / CW) * 100);
      const yp = PAD_Y + (r / CH) * 100 + Math.random() * (100 - 2 * PAD_Y - (2 * r / CH) * 100);
      const hit = placed.some(p => {
        const dx = ((xp - p.x) / 100) * CW, dy = ((yp - p.y) / 100) * CH;
        return Math.hypot(dx, dy) < r + p.r + 72;
      });
      if (!hit) { x = xp; y = yp; ok = true; }
    }
    placed.push({ x, y, r }); result.push({ x, y });
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Viewport hook — pan (inertia), zoom around cursor, double-click/button reset.
// Writes directly to DOM transform — zero React re-renders during interaction.
// FIX: mousemove for parallax is attached to the container (pointer-events enabled),
//      not the canvas wrapper.
// ─────────────────────────────────────────────────────────────────────────────
interface VP { tx: number; ty: number; scale: number; }
const VP0: VP = { tx: 0, ty: 0, scale: 1 };
const ZOOM_MIN = 0.4, ZOOM_MAX = 2.5, FRICTION = 0.88, INERTIA_STOP = 0.12, RESET_K = 0.10;

function clamp(vp: VP, W: number, H: number): VP {
  const cW = W * vp.scale, cH = H * vp.scale;
  const MARGIN = 80;
  return {
    scale: vp.scale,
    tx: Math.min(MARGIN, Math.max(W - cW - MARGIN, vp.tx)),
    ty: Math.min(MARGIN, Math.max(H - cH - MARGIN, vp.ty)),
  };
}

function useViewport(
  containerRef: React.RefObject<HTMLDivElement | null>,
  worldRef: React.RefObject<HTMLDivElement | null>,
  // shared refs written from here, read by canvas loops
  mouseNormRef: React.RefObject<{ x: number; y: number }>,
  vpScaleRef: React.RefObject<{ scale: number }>,
) {
  const vp        = useRef<VP>({ ...VP0 });
  const vel       = useRef({ x: 0, y: 0 });
  const resetting = useRef(false);
  const dragging  = useRef(false);
  const dragMoved = useRef(false);          // distinguish click vs drag
  const lastPos   = useRef({ x: 0, y: 0 });
  const lastDelta = useRef({ x: 0, y: 0 });
  const mouseTarget = useRef({ x: 0, y: 0 });
  const mouseCur    = useRef({ x: 0, y: 0 });
  const rafId     = useRef(0);
  const resetFn   = useRef<() => void>(() => {});

  useEffect(() => {
    const el    = containerRef.current;
    const world = worldRef.current;
    if (!el || !world) return;

    function apply() {
      const { tx, ty, scale } = vp.current;
      world!.style.transform       = `translate(${tx}px,${ty}px) scale(${scale})`;
      world!.style.transformOrigin = "0 0";
      if (vpScaleRef.current) vpScaleRef.current.scale = scale;
    }
    function size() { return { W: el!.clientWidth || 960, H: el!.clientHeight || 560 }; }

    function doReset() { resetting.current = true; vel.current = { x: 0, y: 0 }; }
    resetFn.current = doReset;

    function tick() {
      rafId.current = requestAnimationFrame(tick);
      const LERP = 0.06;
      mouseCur.current.x += (mouseTarget.current.x - mouseCur.current.x) * LERP;
      mouseCur.current.y += (mouseTarget.current.y - mouseCur.current.y) * LERP;
      if (mouseNormRef.current) {
        mouseNormRef.current.x = mouseCur.current.x;
        mouseNormRef.current.y = mouseCur.current.y;
      }
      const { W, H } = size();
      if (resetting.current) {
        vp.current.tx    += (VP0.tx    - vp.current.tx)    * RESET_K;
        vp.current.ty    += (VP0.ty    - vp.current.ty)    * RESET_K;
        vp.current.scale += (VP0.scale - vp.current.scale) * RESET_K;
        if (Math.abs(vp.current.tx - VP0.tx) < 0.5 && Math.abs(vp.current.ty - VP0.ty) < 0.5 && Math.abs(vp.current.scale - VP0.scale) < 0.005) {
          vp.current = { ...VP0 }; resetting.current = false;
        }
        apply(); return;
      }
      if (!dragging.current && Math.hypot(vel.current.x, vel.current.y) > INERTIA_STOP) {
        vp.current.tx += vel.current.x; vp.current.ty += vel.current.y;
        vel.current.x *= FRICTION; vel.current.y *= FRICTION;
        vp.current = clamp(vp.current, W, H); apply();
      }
    }
    tick();

    function onPointerDown(e: PointerEvent) {
      if ((e.target as HTMLElement).closest("[data-planet]")) return;
      resetting.current = false; dragging.current = true; dragMoved.current = false;
      vel.current = { x: 0, y: 0 };
      lastPos.current = { x: e.clientX, y: e.clientY };
      lastDelta.current = { x: 0, y: 0 };
      el!.setPointerCapture(e.pointerId);
      el!.style.cursor = "grabbing";
    }
    function onPointerMove(e: PointerEvent) {
      // Update parallax target regardless of drag state
      const rect = el!.getBoundingClientRect();
      mouseTarget.current.x = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
      mouseTarget.current.y = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
      if (!dragging.current) return;
      const dx = e.clientX - lastPos.current.x, dy = e.clientY - lastPos.current.y;
      if (Math.hypot(dx, dy) > 3) dragMoved.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
      lastDelta.current = { x: dx, y: dy };
      const { W, H } = size();
      vp.current.tx += dx; vp.current.ty += dy;
      vp.current = clamp(vp.current, W, H); apply();
    }
    function onPointerLeave() { mouseTarget.current.x = 0; mouseTarget.current.y = 0; }
    function onPointerUp(e: PointerEvent) {
      if (!dragging.current) return;
      dragging.current = false;
      if (dragMoved.current) vel.current = { x: lastDelta.current.x, y: lastDelta.current.y };
      el!.releasePointerCapture(e.pointerId);
      el!.style.cursor = "";
    }
    function onWheel(e: WheelEvent) {
      e.preventDefault(); resetting.current = false;
      const rect = el!.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const newScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, vp.current.scale * (1 - e.deltaY * 0.0012)));
      const ratio = newScale / vp.current.scale;
      vp.current.tx = mx - ratio * (mx - vp.current.tx);
      vp.current.ty = my - ratio * (my - vp.current.ty);
      vp.current.scale = newScale;
      vp.current = clamp(vp.current, size().W, size().H); apply();
    }
    function onDblClick(e: MouseEvent) {
      if ((e.target as HTMLElement).closest("[data-planet]")) return;
      doReset();
    }

    el.addEventListener("pointerdown",  onPointerDown);
    el.addEventListener("pointermove",  onPointerMove);
    el.addEventListener("pointerup",    onPointerUp);
    el.addEventListener("pointerleave", onPointerLeave);
    el.addEventListener("wheel",        onWheel, { passive: false });
    el.addEventListener("dblclick",     onDblClick);

    return () => {
      cancelAnimationFrame(rafId.current);
      el.removeEventListener("pointerdown",  onPointerDown);
      el.removeEventListener("pointermove",  onPointerMove);
      el.removeEventListener("pointerup",    onPointerUp);
      el.removeEventListener("pointerleave", onPointerLeave);
      el.removeEventListener("wheel",        onWheel);
      el.removeEventListener("dblclick",     onDblClick);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return resetFn;
}

// ─────────────────────────────────────────────────────────────────────────────
// GalaxyBackground canvas — fixed layer (does NOT move with world)
// FIX: parallax mouse is now read from mouseNormRef written by useViewport
// ─────────────────────────────────────────────────────────────────────────────
interface Star  { x:number;y:number;r:number;op:number;ts:number;tp:number;layer:0|1|2; }
interface Drift { x:number;y:number;vx:number;vy:number;r:number;op:number; }
interface NebulaSpec { cx:number;cy:number;rx:number;ry:number;color:string;alpha:number; }

const NEBULAS: NebulaSpec[] = [
  { cx:0.15,cy:0.22,rx:0.38,ry:0.28,color:"#4B8FCC",alpha:0.028 },
  { cx:0.78,cy:0.68,rx:0.32,ry:0.24,color:"#8B6EC4",alpha:0.022 },
  { cx:0.50,cy:0.08,rx:0.28,ry:0.20,color:"#5A9E7A",alpha:0.018 },
  { cx:0.88,cy:0.30,rx:0.22,ry:0.18,color:"#C48B3E",alpha:0.014 },
];

function GalaxyBackground({ mouseRef }: { mouseRef: React.RefObject<{ x:number;y:number }> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const rafId     = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const c = ctx, wEl = wrap, cEl = canvas;
    const R = () => Math.random();
    let W = 0, H = 0, stars: Star[] = [], drifts: Drift[] = [];

    function resize() {
      W = wEl.clientWidth || 960; H = wEl.clientHeight || 560;
      cEl.width = W; cEl.height = H;
      stars = Array.from({ length: 220 }, (): Star => {
        const layer = (R() < 0.20 ? 0 : R() < 0.55 ? 1 : 2) as 0|1|2;
        return { x:R()*W, y:R()*H,
          r:  layer===0 ? 0.5+R()*0.4 : layer===1 ? 0.7+R()*0.5 : 0.9+R()*0.8,
          op: layer===0 ? 0.10+R()*0.25 : layer===1 ? 0.18+R()*0.35 : 0.28+R()*0.45,
          ts: 0.4+R()*1.2, tp: R()*Math.PI*2, layer };
      });
      drifts = Array.from({ length: 38 }, (): Drift => {
        const a = R()*Math.PI*2, s = 0.06+R()*0.12;
        return { x:R()*W,y:R()*H,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:0.6+R()*1.0,op:0.04+R()*0.09 };
      });
    }
    resize();
    const ro = new ResizeObserver(resize); ro.observe(wEl);

    let t = 0;
    function draw() {
      rafId.current = requestAnimationFrame(draw);
      t += 0.016;
      const mx = mouseRef.current?.x ?? 0, my = mouseRef.current?.y ?? 0;
      c.clearRect(0,0,W,H);
      const bg = c.createRadialGradient(W*.5,H*.45,0,W*.5,H*.45,Math.max(W,H)*.72);
      bg.addColorStop(0,"#0f0c1a"); bg.addColorStop(.5,"#08080f"); bg.addColorStop(1,"#050508");
      c.fillStyle = bg; c.fillRect(0,0,W,H);
      // Nebulas
      for (const nb of NEBULAS) {
        const cx=nb.cx*W+mx*W*.030, cy=nb.cy*H+my*H*.030, rx=nb.rx*W, ry=nb.ry*H;
        c.save(); c.globalAlpha=nb.alpha; c.translate(cx,cy); c.scale(1,ry/rx);
        const g = c.createRadialGradient(0,0,0,0,0,rx);
        g.addColorStop(0,nb.color+"ff"); g.addColorStop(.45,nb.color+"66"); g.addColorStop(1,nb.color+"00");
        c.beginPath(); c.arc(0,0,rx,0,Math.PI*2); c.fillStyle=g; c.fill(); c.restore();
      }
      // Stars
      const PX = [0.006,0.014,0.026] as const;
      for (const s of stars) {
        const px=mx*W*PX[s.layer], py=my*H*PX[s.layer];
        const tw = 0.5+0.5*Math.sin(t*s.ts+s.tp);
        c.globalAlpha = s.op*(0.55+0.45*tw); c.fillStyle="#ffffff"; c.beginPath();
        c.arc(((s.x+px)%W+W)%W,((s.y+py)%H+H)%H,s.r,0,Math.PI*2); c.fill();
      }
      // Particles
      for (const d of drifts) {
        d.x=(d.x+d.vx+W)%W; d.y=(d.y+d.vy+H)%H;
        c.globalAlpha=d.op; c.fillStyle="#c8d8ff"; c.beginPath();
        c.arc(((d.x+mx*W*.018)%W+W)%W,((d.y+my*H*.018)%H+H)%H,d.r,0,Math.PI*2); c.fill();
      }
      c.globalAlpha=1;
    }
    draw();
    return () => { cancelAnimationFrame(rafId.current); ro.disconnect(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={wrapRef} className="absolute inset-0 pointer-events-none" aria-hidden>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ConnectionCanvas — lives INSIDE the world layer, moves with it
// ─────────────────────────────────────────────────────────────────────────────
const HEX_CACHE: Record<string,[number,number,number]> = {};
function hexRgb(h: string): [number,number,number] {
  if (HEX_CACHE[h]) return HEX_CACHE[h];
  HEX_CACHE[h]=[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
  return HEX_CACHE[h];
}
interface Conn { ai:number;bi:number;rgb:[number,number,number];phase:number; }

interface ConnCanvasProps {
  projects: Project[];
  posRef:   React.RefObject<{ x:number;y:number }[]>;
  scaleRef: React.RefObject<{ scale:number }>;
}
function ConnectionCanvas({ projects, posRef, scaleRef }: ConnCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const rafId     = useRef(0);
  const conns     = useRef<Conn[]>([]);

  useEffect(() => {
    const list: Conn[] = [];
    for (let a=0;a<projects.length;a++)
      for (let b=a+1;b<projects.length;b++)
        if (projects[a].dbType===projects[b].dbType)
          list.push({ ai:a, bi:b, rgb:hexRgb(dbColor(projects[a].dbType).core), phase:Math.random()*1000 });
    conns.current = list;
  }, [projects]);

  useEffect(() => {
    const canvas=canvasRef.current, wrap=wrapRef.current;
    if (!canvas||!wrap) return;
    const ctx=canvas.getContext("2d"); if (!ctx) return;
    const c=ctx, wEl=wrap;
    let W=0,H=0;
    function resize(){ W=wEl.clientWidth||960; H=wEl.clientHeight||560; canvas!.width=W; canvas!.height=H; }
    resize();
    const ro=new ResizeObserver(resize); ro.observe(wEl);
    let t=0;
    function draw() {
      rafId.current=requestAnimationFrame(draw); t+=0.016;
      c.clearRect(0,0,W,H);
      const pos=posRef.current;
      if (!pos||pos.length!==projects.length) return;
      const scale=scaleRef.current?.scale??1;
      const zFade=Math.min(1,Math.max(0,(scale-0.38)/0.35));
      const diag=Math.hypot(W,H);
      for (const conn of conns.current) {
        const pa=pos[conn.ai], pb=pos[conn.bi];
        if (!pa||!pb) continue;
        const ax=(pa.x/100)*W,ay=(pa.y/100)*H,bx=(pb.x/100)*W,by=(pb.y/100)*H;
        const dist=Math.hypot(bx-ax,by-ay),ratio=dist/diag;
        const dFade=ratio>0.65?0.35:ratio>0.45?1-(ratio-0.45)/0.2*0.65:1;
        const alpha=0.18*dFade*zFade; if (alpha<0.01) continue;
        const mx2=(ax+bx)/2,my2=(ay+by)/2,dx=bx-ax,dy=by-ay;
        const cpx=mx2-dy*0.18,cpy=my2+dx*0.18;
        const [r,g,b]=conn.rgb;
        const off=-((t*22+conn.phase)%30);
        c.save(); c.globalAlpha=alpha*.55; c.strokeStyle=`rgb(${r},${g},${b})`;
        c.lineWidth=4.5; c.lineCap="round"; c.filter="blur(4px)";
        c.setLineDash([12,18]); c.lineDashOffset=off;
        c.beginPath(); c.moveTo(ax,ay); c.quadraticCurveTo(cpx,cpy,bx,by); c.stroke(); c.restore();
        c.save(); c.globalAlpha=alpha; c.strokeStyle=`rgb(${r},${g},${b})`;
        c.lineWidth=1.2; c.lineCap="round"; c.filter="none";
        c.setLineDash([12,18]); c.lineDashOffset=off;
        c.beginPath(); c.moveTo(ax,ay); c.quadraticCurveTo(cpx,cpy,bx,by); c.stroke(); c.restore();
      }
    }
    draw();
    return () => { cancelAnimationFrame(rafId.current); ro.disconnect(); };
  }, [projects.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={wrapRef} className="absolute inset-0 pointer-events-none" aria-hidden>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading skeleton
// ─────────────────────────────────────────────────────────────────────────────
function GalaxySkeleton() {
  const blobs = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => ({
      x: 12 + Math.random() * 76, y: 15 + Math.random() * 65,
      r: 36 + i * 6, delay: i * 0.1,
    })), []
  );
  return (
    <div className="relative w-full overflow-hidden rounded-2xl"
      style={{ minHeight:560, background:"radial-gradient(ellipse at 50% 50%,#0e0b16 0%,#08080f 55%,#050508 100%)",
        border:"1px solid rgba(255,255,255,0.055)" }}>
      {blobs.map((b,i) => (
        <motion.div key={i} className="absolute rounded-full"
          style={{ left:`${b.x}%`, top:`${b.y}%`, width:b.r*2, height:b.r*2,
            transform:"translate(-50%,-50%)",
            background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)" }}
          animate={{ opacity:[0.4,0.8,0.4], scale:[0.95,1.05,0.95] }}
          transition={{ duration:2, repeat:Infinity, ease:"easeInOut", delay:b.delay }}
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <motion.div animate={{ rotate:360 }} transition={{ duration:2,repeat:Infinity,ease:"linear" }}>
            <Sparkles size={22} style={{ color:"rgba(255,255,255,0.25)" }} />
          </motion.div>
          <span className="text-[11px] font-medium" style={{ color:"rgba(255,255,255,0.25)" }}>
            Placing planets…
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────
function GalaxyEmpty({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <motion.div initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }}
      transition={{ duration:0.5, ease:[0.16,1,0.3,1] }}
      className="relative w-full overflow-hidden rounded-2xl flex flex-col items-center justify-center gap-5"
      style={{ minHeight:480, background:"radial-gradient(ellipse at 50% 50%,#0e0b16 0%,#08080f 55%,#050508 100%)",
        border:"1px solid rgba(255,255,255,0.055)" }}>
      {/* ambient glow behind icon */}
      <div className="absolute w-48 h-48 rounded-full"
        style={{ background:"radial-gradient(circle,rgba(139,170,130,0.08) 0%,transparent 70%)",
          filter:"blur(30px)", top:"50%", left:"50%", transform:"translate(-50%,-60%)" }} />
      <motion.div className="relative w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}
        animate={{ y:[0,-6,0] }} transition={{ duration:4, repeat:Infinity, ease:"easeInOut" }}>
        <FolderOpen size={32} style={{ color:"rgba(255,255,255,0.25)" }} />
      </motion.div>
      <div className="text-center relative z-10">
        <p className="text-[15px] font-semibold" style={{ color:"rgba(255,255,255,0.70)" }}>
          Your galaxy is empty
        </p>
        <p className="text-[12px] mt-1.5" style={{ color:"rgba(255,255,255,0.30)" }}>
          Create a project to see it appear as a planet
        </p>
      </div>
      <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
        onClick={onCreateClick}
        className="relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
        style={{ background:"rgba(139,170,130,0.18)", border:"1px solid rgba(139,170,130,0.30)",
          color:"rgba(139,170,130,0.95)" }}>
        <Sparkles size={13} /> Create first project
      </motion.button>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tooltip — fixed in screen-space, uses screen pixel coords for positioning
// FIX: no longer uses %-based world coords which break after pan/zoom
// ─────────────────────────────────────────────────────────────────────────────
interface TooltipProps { project:Project; screenX:number; screenY:number; containerW:number; containerH:number; }
function Tooltip({ project, screenX, screenY, containerW, containerH }: TooltipProps) {
  const color = dbColor(project.dbType);
  const { tables, relationships } = projectStats(project);
  const CARD_W = 234, CARD_H = 195;
  const left  = screenX + 20 + CARD_W > containerW ? screenX - CARD_W - 12 : screenX + 20;
  const top   = screenY - 10 + CARD_H > containerH ? containerH - CARD_H - 8 : Math.max(8, screenY - 10);
  return (
    <motion.div initial={{ opacity:0, scale:0.92 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.92 }}
      transition={{ duration:0.16, ease:[0.16,1,0.3,1] }}
      className="absolute z-50 pointer-events-none"
      style={{ width:CARD_W, left, top }}>
      <div className="rounded-2xl overflow-hidden"
        style={{ background:"rgba(9,7,14,0.94)", border:`1px solid ${color.core}50`,
          backdropFilter:"blur(22px) saturate(1.5)",
          boxShadow:`0 16px 48px rgba(0,0,0,0.8),0 0 0 1px ${color.core}18,0 0 30px ${color.glow}` }}>
        <div className="h-px w-full" style={{ background:`linear-gradient(90deg,${color.core}95,transparent)` }} />
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background:`${color.core}18`,border:`1px solid ${color.core}40` }}>
              <Database size={14} style={{ color:color.core }} />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-white leading-tight truncate">{project.name}</p>
              <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-md mt-0.5"
                style={{ background:`${color.core}20`,color:color.core,border:`1px solid ${color.core}35` }}>
                {color.label}
              </span>
            </div>
          </div>
          <div className="h-px" style={{ background:"rgba(255,255,255,0.06)" }} />
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {[
              { icon:<Table2 size={10}/>,    label:"Tables",    val:tables>0?String(tables):"—" },
              { icon:<GitBranch size={10}/>, label:"Relations", val:relationships>0?String(relationships):"—" },
              { icon:<Database size={10}/>,  label:"Database",  val:color.label, span:true },
              { icon:<Clock size={10}/>,     label:"Modified",  val:timeAgo(project.updatedAt), span:true },
            ].map(({ icon,label,val,span }) => (
              <div key={label} className={span?"col-span-2":""}>
                <div className="flex items-center gap-1 mb-0.5" style={{ color:"rgba(255,255,255,0.30)" }}>
                  {icon}<span className="text-[8px] uppercase tracking-widest font-semibold">{label}</span>
                </div>
                <p className="text-[11px] font-bold text-white/85">{val}</p>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-white/22 text-center tracking-wide">Click to open</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Planet — staggered entrance, hover glow, click guard vs drag
// FIX: onClick now checks dragMoved via a passed prop
// ─────────────────────────────────────────────────────────────────────────────
interface PlanetProps {
  project: Project; posX:number; posY:number; floatSeed:number; index:number;
  isHovered:boolean; onClick:()=>void;
  onHoverEnter:(screenX:number,screenY:number)=>void;
  onHoverLeave:()=>void;
}
function Planet({ project,posX,posY,floatSeed,index,isHovered,onClick,onHoverEnter,onHoverLeave }: PlanetProps) {
  const r=planetRadius(project.files.length), color=dbColor(project.dbType);
  const { tables }=projectStats(project);
  return (
    <motion.div data-planet="1"
      className="absolute flex flex-col items-center cursor-pointer select-none"
      style={{ left:`${posX}%`, top:`${posY}%`, transform:"translate(-50%,-50%)", zIndex:isHovered?20:2 }}
      initial={{ opacity:0, scale:0.4 }}
      animate={{ opacity:1, scale:1, y:[0,-(7+floatSeed*3),0] }}
      transition={{
        opacity:{ duration:0.5, delay:index*0.07, ease:"easeOut" },
        scale:{ duration:0.6, delay:index*0.07, ease:[0.16,1,0.3,1] },
        y:{ duration:5.5+floatSeed*2.8, repeat:Infinity, ease:"easeInOut", delay:floatSeed*1.3+index*0.07+0.6 },
      }}
      onClick={onClick}
      onMouseEnter={e => onHoverEnter(e.clientX, e.clientY)}
      onMouseMove={e  => onHoverEnter(e.clientX, e.clientY)}
      onMouseLeave={() => onHoverLeave()}
    >
      {/* Glow halo */}
      <motion.div className="absolute rounded-full pointer-events-none"
        style={{ width:r*2+56,height:r*2+56,top:"50%",left:"50%",transform:"translate(-50%,-50%)",
          background:`radial-gradient(circle,${color.glow} 0%,transparent 68%)` }}
        animate={isHovered?{scale:[1.1,1.25,1.1],opacity:[0.95,1,0.95]}:{scale:[1,1.12,1],opacity:[0.4,0.65,0.4]}}
        transition={{ duration:isHovered?1.8:3.2+floatSeed,repeat:Infinity,ease:"easeInOut" }}
      />
      {/* Sphere */}
      <motion.div className="relative rounded-full flex items-center justify-center flex-shrink-0"
        style={{ width:r*2,height:r*2,
          background:`radial-gradient(circle at 33% 30%,${color.core}f0 0%,${color.core}60 45%,#080810 100%)`,
          border:`1.5px solid ${color.core}70` }}
        animate={isHovered
          ? { scale:1.05,boxShadow:`0 0 ${r*1.5}px ${color.glow},0 0 ${r*.7}px ${color.core}55,inset 0 1px 3px rgba(255,255,255,0.22)` }
          : { scale:1.00,boxShadow:`0 0 ${r*.8}px ${color.glow},0 0 ${r*.35}px ${color.core}33,inset 0 1px 2px rgba(255,255,255,0.12)` }}
        transition={{ type:"spring",stiffness:280,damping:22 }}>
        <div className="absolute inset-0 rounded-full pointer-events-none"
          style={{ background:"radial-gradient(circle at 30% 24%,rgba(255,255,255,0.17) 0%,transparent 52%)" }} />
        <Database size={Math.max(13,Math.round(r*.38))}
          style={{ color:color.core,opacity:.88,position:"relative",zIndex:1 }} />
      </motion.div>
      {/* Label */}
      <div className="mt-2 flex flex-col items-center gap-1 pointer-events-none" style={{ maxWidth:r*2+40 }}>
        <span className="text-[11px] font-semibold text-white/90 text-center leading-tight"
          style={{ textShadow:"0 1px 10px rgba(0,0,0,0.95)", maxWidth:r*2+32,
            overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical" }}>
          {project.name}
        </span>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none"
          style={{ background:`${color.core}20`,color:color.core,border:`1px solid ${color.core}40` }}>
          {color.label}
        </span>
        <div className="flex items-center gap-2 text-[9px] font-medium" style={{ color:"rgba(255,255,255,0.35)" }}>
          <span className="flex items-center gap-0.5">
            <Table2 size={9} style={{ color:color.core,opacity:.7 }} />
            {tables>0?`${tables} tables`:"0 tables"}
          </span>
          <span style={{ opacity:.3 }}>·</span>
          <span className="flex items-center gap-0.5">
            <Clock size={9} />{timeAgo(project.updatedAt)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini Legend — glass pill, bottom of canvas
// ─────────────────────────────────────────────────────────────────────────────
function Legend({ projects }: { projects: Project[] }) {
  const types = useMemo(() => Array.from(new Set(projects.map(p => p.dbType))).slice(0, 8), [projects]);
  return (
    <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.5,delay:0.4 }}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
      style={{ maxWidth:"calc(100% - 32px)" }}>
      <div className="flex items-center gap-3 flex-wrap justify-center px-4 py-2 rounded-2xl"
        style={{ background:"rgba(8,6,12,0.72)", border:"1px solid rgba(255,255,255,0.08)",
          backdropFilter:"blur(16px)" }}>
        {types.map(type => {
          const c=dbColor(type);
          return (
            <div key={type} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background:c.core,boxShadow:`0 0 6px ${c.glow}` }} />
              <span className="text-[9px] font-semibold whitespace-nowrap"
                style={{ color:"rgba(255,255,255,0.40)" }}>{c.label}</span>
            </div>
          );
        })}
        <div className="w-px h-3 flex-shrink-0" style={{ background:"rgba(255,255,255,0.10)" }} />
        <span className="text-[9px] whitespace-nowrap" style={{ color:"rgba(255,255,255,0.22)" }}>
          size = files
        </span>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Glass Controls — reset button + hint (top row)
// ─────────────────────────────────────────────────────────────────────────────
function GlassControls({ onReset }: { onReset: () => void }) {
  return (
    <motion.div initial={{ opacity:0,y:-8 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.4,delay:0.2 }}
      className="absolute top-3 left-0 right-0 z-30 flex items-center justify-between px-3 pointer-events-none">
      {/* Hint pill */}
      <div className="px-3 py-1.5 rounded-xl text-[9px] font-medium"
        style={{ background:"rgba(8,6,12,0.65)", border:"1px solid rgba(255,255,255,0.07)",
          backdropFilter:"blur(14px)", color:"rgba(255,255,255,0.28)" }}>
        Scroll to zoom · Drag to pan · Double-click to reset
      </div>
      {/* Reset button — needs pointer events */}
      <button onClick={onReset} title="Reset view"
        className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all"
        style={{ background:"rgba(8,6,12,0.65)", border:"1px solid rgba(255,255,255,0.10)",
          backdropFilter:"blur(14px)", color:"rgba(255,255,255,0.50)" }}
        onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.10)")}
        onMouseLeave={e=>(e.currentTarget.style.background="rgba(8,6,12,0.65)")}>
        <RotateCcw size={11} /> Reset
      </button>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main GalaxyView
// ─────────────────────────────────────────────────────────────────────────────
interface GalaxyViewProps { projects: Project[]; onNavigate: (p: string) => void; onCreateProject?: () => void; }

export default function GalaxyView({ projects, onNavigate, onCreateProject }: GalaxyViewProps) {
  const { setActiveProject } = useStore();

  // Positions: computed synchronously on first render to avoid flicker
  const [positions, setPositions] = useState<{ x:number;y:number }[]>(() => computePositions(projects));
  const [ready, setReady] = useState(() => projects.length === 0); // empty = skip skeleton
  
  // Tooltip state: screen-space pixel coordinates
  const [hovered, setHovered] = useState<{ project:Project; screenX:number; screenY:number } | null>(null);

  // Container size for tooltip clamping
  const [containerSize, setContainerSize] = useState({ W: 960, H: 560 });

  const containerRef  = useRef<HTMLDivElement>(null);
  const worldRef      = useRef<HTMLDivElement>(null);
  const posRef        = useRef<{ x:number;y:number }[]>(positions);
  const mouseNormRef  = useRef<{ x:number;y:number }>({ x:0, y:0 });
  const vpScaleRef    = useRef<{ scale:number }>({ scale:1 });

  const resetRef = useViewport(containerRef, worldRef, mouseNormRef, vpScaleRef);

  // Recompute positions when project count changes
  useEffect(() => {
    setReady(false);
    const next = computePositions(projects);
    setPositions(next);
    posRef.current = next;
    // Brief delay to show skeleton, then fade planets in
    const id = setTimeout(() => setReady(true), 120);
    return () => clearTimeout(id);
  }, [projects.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track container size for tooltip clamping
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const ro = new ResizeObserver(() => {
      setContainerSize({ W: el.clientWidth, H: el.clientHeight });
    });
    ro.observe(el);
    setContainerSize({ W: el.clientWidth || 960, H: el.clientHeight || 560 });
    return () => ro.disconnect();
  }, []);

  // Convert screen coords to container-relative for tooltip positioning
  const handleHoverEnter = useCallback((project: Project, clientX: number, clientY: number) => {
    const el = containerRef.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    setHovered({ project, screenX: clientX - rect.left, screenY: clientY - rect.top });
  }, []);

  const handleClick = useCallback((p: Project) => {
    setActiveProject(p.id);
    onNavigate("project-detail");
  }, [setActiveProject, onNavigate]);

  // Empty state
  if (projects.length === 0) {
    return <GalaxyEmpty onCreateClick={onCreateProject ?? (() => {})} />;
  }

  return (
    <motion.div
      initial={{ opacity:0, scale:0.98 }}
      animate={{ opacity:1, scale:1 }}
      exit={{ opacity:0, scale:0.98 }}
      transition={{ duration:0.35, ease:[0.16,1,0.3,1] }}
    >
      <AnimatePresence mode="wait">
        {!ready ? (
          <motion.div key="skeleton" initial={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.25 }}>
            <GalaxySkeleton />
          </motion.div>
        ) : (
          <motion.div key="canvas" initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.35 }}>
            <div
              ref={containerRef}
              className="relative w-full overflow-hidden rounded-2xl select-none"
              style={{ minHeight:560, border:"1px solid rgba(255,255,255,0.055)", cursor:"grab" }}
            >
              {/* Fixed starfield background */}
              <GalaxyBackground mouseRef={mouseNormRef} />

              {/* World layer: pans + zooms */}
              <div ref={worldRef} className="absolute inset-0" style={{ willChange:"transform" }}>
                {/* Connection arcs */}
                <ConnectionCanvas projects={projects} posRef={posRef} scaleRef={vpScaleRef} />

                {/* Planets */}
                {projects.map((p, i) => (
                  <Planet key={p.id} project={p}
                    posX={positions[i]?.x ?? 50} posY={positions[i]?.y ?? 50}
                    floatSeed={i / Math.max(projects.length - 1, 1)}
                    index={i}
                    isHovered={hovered?.project.id === p.id}
                    onClick={() => handleClick(p)}
                    onHoverEnter={(sx, sy) => handleHoverEnter(p, sx, sy)}
                    onHoverLeave={() => setHovered(null)}
                  />
                ))}
              </div>

              {/* Tooltip — screen-space, outside world layer */}
              <AnimatePresence>
                {hovered && (
                  <Tooltip
                    key={hovered.project.id}
                    project={hovered.project}
                    screenX={hovered.screenX}
                    screenY={hovered.screenY}
                    containerW={containerSize.W}
                    containerH={containerSize.H}
                  />
                )}
              </AnimatePresence>

              {/* Glass controls */}
              <GlassControls onReset={() => resetRef.current()} />

              {/* Legend */}
              <Legend projects={projects} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
