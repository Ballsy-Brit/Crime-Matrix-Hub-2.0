import React, { useMemo, useState } from 'react';
import './App.css';

// Simplified thana points for a clean, non-overlapping map experience.
// Coordinates are illustrative, not a precise GIS projection.
const REGIONS = [
  { id: 'Uttara', x: 44, y: 16 },
  { id: 'Mirpur', x: 27, y: 28 },
  { id: 'Kafrul', x: 41, y: 31 },
  { id: 'Mohakhali', x: 56, y: 34 },
  { id: 'Gulshan', x: 68, y: 33 },
  { id: 'Tejgaon', x: 49, y: 41 },
  { id: 'Dhanmondi', x: 37, y: 46 },
  { id: 'Mohammadpur', x: 30, y: 41 },
  { id: 'Ramna', x: 55, y: 46 },
  { id: 'Paltan', x: 59, y: 51 },
  { id: 'Motijheel', x: 64, y: 58 },
  { id: 'Savar', x: 15, y: 53 },
  { id: 'Narayangonj', x: 84, y: 62 }
];

const ALIASES = {
  narayangonj: 'Narayangonj',
  narayanganj: 'Narayangonj',
};

function normalizeRegionKey(name) {
  const key = String(name || '').trim().toLowerCase();
  return ALIASES[key] || name;
}

export default function DhakaMap({ counts = {}, filteredCounts = {}, crimes = [], shouldHighlight = false, onRegionClick, selectedRegion = '' }) {
  const [hoveredRegion, setHoveredRegion] = useState('');

  const normalizedCounts = Object.entries(counts).reduce((acc, [k, v]) => {
    acc[normalizeRegionKey(k)] = v;
    return acc;
  }, {});

  const normalizedFilteredCounts = Object.entries(filteredCounts).reduce((acc, [k, v]) => {
    acc[normalizeRegionKey(k)] = v;
    return acc;
  }, {});

  const rows = REGIONS.map((region, index) => {
    const total = normalizedCounts[region.id] || 0;
    const filtered = normalizedFilteredCounts[region.id] || 0;
    return {
      ...region,
      number: index + 1,
      total,
      filtered,
      emphasis: filtered > 0 ? filtered : total,
    };
  }).sort((a, b) => b.emphasis - a.emphasis || a.id.localeCompare(b.id));

  const filteredMax = Math.max(1, ...rows.map((r) => r.filtered));
  const alertThreshold = Math.max(1, Math.ceil(filteredMax * 0.6));

  const activeInfo = useMemo(() => {
    const focus = hoveredRegion || selectedRegion;
    if (!focus) return null;
    const region = rows.find((r) => r.id === focus) || null;
    if (!region) return null;

    const ongoingTypes = crimes
      .filter((c) => normalizeRegionKey(c.region) === focus && c.status !== 'Closed')
      .reduce((acc, c) => {
        const key = c.crimeType || 'Other';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

    const ongoingEntries = Object.entries(ongoingTypes).sort((a, b) => b[1] - a[1]);
    const ongoingCount = ongoingEntries.reduce((sum, [, count]) => sum + count, 0);

    return {
      ...region,
      ongoingEntries,
      ongoingCount,
    };
  }, [hoveredRegion, selectedRegion, rows, crimes]);

  return (
    <div className="dhaka-map-wrap">
      <div className="dhaka-map-canvas">
        {activeInfo && (
          <div className="map-info-popup" role="status" aria-live="polite">
            <div className="map-info-title">{activeInfo.id}</div>
            <div className="map-info-row">Total Reports: <strong>{activeInfo.total}</strong></div>
            <div className="map-info-row">Matching Filters: <strong>{activeInfo.filtered}</strong></div>
            <div className="map-info-row">
              {activeInfo.ongoingCount > 0 ? (
                <span>Crime is happening here: <strong>{activeInfo.ongoingCount} ongoing</strong></span>
              ) : (
                <span>No ongoing crime right now</span>
              )}
            </div>

            {activeInfo.ongoingCount > 0 && (
              <div className="map-info-types">
                {activeInfo.ongoingEntries.slice(0, 3).map(([type, count]) => (
                  <span key={type} className="map-type-chip">{type} ({count})</span>
                ))}
              </div>
            )}

            {activeInfo.total >= alertThreshold && <div className="map-info-alert">Alert: High activity zone</div>}
          </div>
        )}

        <svg viewBox="0 0 100 75" className="dhaka-map-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Dhaka thana map">
          <defs>
            <radialGradient id="mapGlow" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="rgba(120, 210, 255, 0.22)" />
              <stop offset="100%" stopColor="rgba(120, 210, 255, 0)" />
            </radialGradient>
          </defs>

          <rect x="1" y="1" width="98" height="73" rx="8" className="dhaka-map-base" />
          <ellipse cx="50" cy="40" rx="36" ry="24" className="dhaka-map-shape" />

          {rows.map((region) => {
            const isMatch = shouldHighlight && region.filtered > 0;
            const neutralRadius = 2.45;
            const highlightedRadius = 2.45 + (Math.sqrt(region.filtered) / Math.sqrt(filteredMax || 1)) * 2.8;
            const r = isMatch ? highlightedRadius : neutralRadius;
            const isSelected = selectedRegion === region.id;
            const isAlert = isMatch && region.filtered >= alertThreshold;

            return (
              <g
                key={region.id}
                className={`map-node ${isMatch ? 'is-match' : ''} ${isSelected ? 'is-selected' : ''}`}
                onClick={() => onRegionClick && onRegionClick(region.id)}
                onMouseEnter={() => setHoveredRegion(region.id)}
                onMouseLeave={() => setHoveredRegion('')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && onRegionClick) {
                    e.preventDefault();
                    onRegionClick(region.id);
                  }
                }}
              >
                {isMatch && <circle cx={region.x} cy={region.y} r={r + 2.8} className="map-node-glow" fill="url(#mapGlow)" />}
                <circle cx={region.x} cy={region.y} r={r} className="map-node-dot" />
                <text x={region.x} y={region.y + 0.7} className="map-node-index">{region.number}</text>

                {isAlert && (
                  <g className="map-alert-badge" transform={`translate(${region.x + r - 0.2}, ${region.y - r + 0.5})`}>
                    <circle cx="0" cy="0" r="1.75" />
                    <text x="0" y="0.55">!</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="thana-panel">
        <div className="thana-panel-title">Dhaka Thanas</div>
        <div className="thana-list" role="list">
          {rows.map((region) => (
            <button
              key={region.id}
              className={`thana-item ${shouldHighlight && region.filtered > 0 ? 'is-active' : ''} ${selectedRegion === region.id ? 'is-selected' : ''}`}
              onClick={() => onRegionClick && onRegionClick(region.id)}
              onMouseEnter={() => setHoveredRegion(region.id)}
              onMouseLeave={() => setHoveredRegion('')}
              title={`View ${region.id}`}
            >
              <span className="thana-index">{region.number}</span>
              <span className="thana-name">{region.id}</span>
              <span className="thana-count">{region.total}</span>
              {shouldHighlight && region.filtered > 0 && <span className="thana-alert-pill">Alert</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
