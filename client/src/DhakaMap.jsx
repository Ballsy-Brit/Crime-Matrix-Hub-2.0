import React from 'react';
import './App.css';

// Simplified Dhaka regions with approximate coordinates for an SVG viewBox (0-100)
// Coordinates are illustrative — not geographically accurate.
const REGIONS = [
  { id: 'Uttara', x: 28, y: 12, labelOffset: { x: 4, y: -3 } },
  { id: 'Kafrul', x: 24, y: 38, labelOffset: { x: -28, y: -8 } },
  { id: 'Mohammadpur', x: 36, y: 44, labelOffset: { x: 6, y: -10 } },
  { id: 'Tejgaon', x: 54, y: 50, labelOffset: { x: 6, y: 8 } },
  { id: 'Gulshan', x: 78, y: 20, labelOffset: { x: 6, y: -6 } },
  { id: 'Dhanmondi', x: 48, y: 36, labelOffset: { x: -42, y: -12 } },
  { id: 'Mirpur', x: 20, y: 24, labelOffset: { x: -6, y: -8 } },
  { id: 'Motijheel', x: 68, y: 62, labelOffset: { x: 6, y: 6 } },
  { id: 'Ramna', x: 60, y: 36, labelOffset: { x: 6, y: -10 } },
  { id: 'Mohakhali', x: 72, y: 30, labelOffset: { x: 6, y: -2 } },
  { id: 'Paltan', x: 62, y: 46, labelOffset: { x: 6, y: 10 } },
  { id: 'Savar', x: 12, y: 60, labelOffset: { x: 6, y: 6 } },
  { id: 'Narayangonj', x: 100, y: 80, labelOffset: { x: -48, y: -8 } }
];

export default function DhakaMap({ counts = {}, filteredCounts = {}, onRegionClick }) {
  const SCALE_X = 1.3; // spread horizontally
  const SCALE_Y = 1.05; // slight vertical stretch

  // Utility to compute radius based on count
  const radiusFor = (count) => {
    const base = 6;
    if (!count || count <= 0) return 0;
    // scale: sqrt for diminishing returns
    return Math.min(70, base + Math.sqrt(count) * 6);
  };

  return (
    <div className="dhaka-map-wrap">
      <svg viewBox="0 0 140 110" className="dhaka-map-svg" preserveAspectRatio="xMidYMid meet">
        {/* background grid / subtle map plate */}
        <rect x="0" y="0" width="140" height="110" rx="6" ry="6" fill="#e9efe8" stroke="#d3d9d2" />

        {/* region labels */}
        {REGIONS.map((r) => {
          const count = counts[r.id] || 0;
          const fcount = filteredCounts[r.id] || 0;
          const showHighlight = fcount > 0;
          const rRadius = radiusFor(fcount);

          const sx = r.x * SCALE_X;
          const sy = r.y * SCALE_Y;

          return (
            <g key={r.id} className="region-group" onClick={() => onRegionClick && onRegionClick(r.id)} style={{ cursor: 'pointer' }}>
              {/* overall background small circle indicating presence */}
              <circle cx={`${sx}`} cy={`${sy}`} r={3.2} fill="#2f5a46" opacity={count?1:0.18} />

              {/* filtered highlight - translucent red circle sized by fcount */}
              {showHighlight && (
                <circle cx={`${sx}`} cy={`${sy}`} r={rRadius} fill="rgba(220,50,50,0.28)" stroke="rgba(200,30,30,0.6)" />
              )}

              {/* region label with translucent background to avoid overlap */}
              {(() => {
                const lx = sx + (r.labelOffset?.x ?? 3.5);
                const ly = sy + (r.labelOffset?.y ?? -2);
                const approxWidth = Math.max(24, r.id.length * 3.0);
                return (
                  <g>
                    <rect x={lx - 2} y={ly - 4} width={approxWidth} height={7} rx={3} fill={"rgba(255,255,255,0.86)"} />
                    <text x={lx + 1} y={ly + 1} fontSize="2.2" fill="#0b3a2a" fontWeight={700}>{r.id}</text>
                  </g>
                );
              })()}

              {/* small count badge */}
              <g transform={`translate(${sx + 2.5}, ${sy + 4})`}>
                <rect x="-1" y="-3" width="18" height="9" rx="2" fill="rgba(0,0,0,0.06)" />
                <text x="0" y="3.5" fontSize="3" fill="#111">{count}</text>
              </g>
            </g>
          );
        })}
      </svg>
      <div className="dhaka-map-legend">
        <div><span className="legend-dot big"></span> Highlight size ∝ verified crime count</div>
        <div><span className="legend-dot small"></span> Region marker</div>
      </div>
    </div>
  );
}
