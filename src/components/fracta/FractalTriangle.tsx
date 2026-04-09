"use client";
import { useEffect, useRef } from "react";

interface Props {
  size?: number;
  animate?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function FractalTriangle({ size = 120, animate = true, className, style }: Props) {
  const refs = useRef<(SVGCircleElement | null)[]>([]);
  const rafIds = useRef<number[]>([]);

  useEffect(() => {
    if (!animate) return;
    rafIds.current.forEach(cancelAnimationFrame);
    rafIds.current = [];

    refs.current.forEach((el, i) => {
      if (!el) return;
      const duration = 1600 + i * 280;
      const offset = i * 220;
      let start: number | null = null;

      function tick(ts: number) {
        if (start === null) start = ts;
        const t = ((ts - start + offset) % duration) / duration;
        const opacity = 0.45 + 0.55 * Math.sin(t * Math.PI * 2);
        if (el) el.style.opacity = String(opacity.toFixed(3));
        const id = requestAnimationFrame(tick);
        rafIds.current[i] = id;
      }
      rafIds.current[i] = requestAnimationFrame(tick);
    });

    return () => rafIds.current.forEach(cancelAnimationFrame);
  }, [animate, size]);

  const h = size * 0.866;
  const cx = size / 2;

  const nodes: [number, number, number, string][] = [
    [cx,       4,        4,   "#7AE040"],
    [size - 4, h - 4,    4,   "#2A7BA8"],
    [4,        h - 4,    4,   "#2A7BA8"],
    [cx,       h * .22,  3.5, "#2BBFA4"],
    [size*.78, h * .85,  3,   "#2BBFA4"],
    [size*.22, h * .85,  3,   "#2BBFA4"],
    [size*.35, h * .50,  3,   "#7AE040"],
    [size*.65, h * .50,  3,   "#7AE040"],
    [cx,       h * .85,  3,   "#2BBFA4"],
  ];

  const lines: [number,number,number,number,string][] = [
    [cx, 4,       cx,       h*.22,  "#2BBFA4"],
    [cx, h*.22,   size*.35, h*.50,  "#2BBFA4"],
    [cx, h*.22,   size*.65, h*.50,  "#2BBFA4"],
    [size*.35, h*.50, cx,   h*.55,  "#7AE040"],
    [size*.65, h*.50, cx,   h*.55,  "#7AE040"],
    [cx, h*.55,   cx,       h*.85,  "#2BBFA4"],
  ];

  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`}
      fill="none" className={className} style={style} aria-hidden>
      <defs>
        <radialGradient id={`fg-${size}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7AE040" />
          <stop offset="100%" stopColor="#2BBFA4" />
        </radialGradient>
      </defs>
      <polygon points={`${cx},4 ${size-4},${h-4} 4,${h-4}`}
        stroke={`url(#fg-${size})`} strokeWidth="1.5" fill="rgba(43,191,164,0.06)" />
      <polygon points={`${cx},${h*.22} ${size*.78},${h*.85} ${size*.22},${h*.85}`}
        stroke={`url(#fg-${size})`} strokeWidth="1" fill="rgba(122,224,64,0.05)" />
      <polygon points={`${cx},${h*.44} ${size*.65},${h*.76} ${size*.35},${h*.76}`}
        stroke="#2BBFA4" strokeWidth="1" fill="rgba(43,191,164,0.08)" />
      {lines.map(([x1,y1,x2,y2,s], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={s} strokeWidth="0.8" opacity="0.5" />
      ))}
      {nodes.map(([x, y, r, fill], i) => (
        <circle key={i} ref={el => { refs.current[i] = el; }}
          cx={x} cy={y} r={r} fill={fill} />
      ))}
      <circle cx={cx} cy={h*.55} r={size*.07} fill={`url(#fg-${size})`} opacity="0.9" />
      <circle cx={cx - size*.025} cy={h*.52} r={size*.022} fill="white" opacity="0.4" />
    </svg>
  );
}
