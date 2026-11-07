import React, { useState, useMemo } from 'react';
import {
  StockRiskProfile,
  InfraSite,
  HazardType,
} from '../data/aftershockData';
import {
  Waves,
  Flame,
  Server,
  Cpu,
  Zap,
  ShieldCheck,
  MapPin,
} from 'lucide-react';

interface USInfrastructureMapTabProps {
  profiles: StockRiskProfile[];
  initialSelectedTicker?: string | null;
}

// Convert US lat/lng (24.5..49.2 N, -125..-66.5 W) to SVG 960x560 coordinates
function projectLatLng(lat: number, lng: number, offsetIdx = 0): { x: number; y: number } {
  const minLng = -125.5;
  const maxLng = -66.5;
  const minLat = 24.2;
  const maxLat = 49.5;

  const normX = (lng - minLng) / (maxLng - minLng);
  const normY = 1 - (lat - minLat) / (maxLat - minLat);

  // Deterministic slight radial offset when multiple sites share a city (e.g. Ashburn VA or Santa Clara CA)
  const angle = offsetIdx * 2.2;
  const radius = offsetIdx === 0 ? 0 : 12 + (offsetIdx % 2) * 5;

  const x = 65 + normX * 830 + Math.cos(angle) * radius;
  const y = 45 + normY * 465 + Math.sin(angle) * radius;

  return {
    x: Math.max(45, Math.min(915, x)),
    y: Math.max(40, Math.min(520, y)),
  };
}

export const USInfrastructureMapTab: React.FC<USInfrastructureMapTabProps> = ({
  profiles,
  initialSelectedTicker,
}) => {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(
    initialSelectedTicker || null
  );
  const [hazardFilter, setHazardFilter] = useState<'ALL' | 'Hurricane' | 'Earthquake'>('ALL');
  const [hoveredSite, setHoveredSite] = useState<InfraSite | null>(null);

  // Sort stocks by most negative unpriced risk first
  const sortedProfiles = useMemo(
    () => [...profiles].sort((a, b) => a.unpricedRiskPct - b.unpricedRiskPct),
    [profiles]
  );

  // Flatten and project all sites with city-collision offsets
  const projectedSites = useMemo(() => {
    const cityCounts: Record<string, number> = {};
    const list: (InfraSite & { x: number; y: number })[] = [];

    for (const stock of profiles) {
      for (const site of stock.sites) {
        if (hazardFilter !== 'ALL' && site.hazard !== hazardFilter) continue;
        const cityKey = `${site.city}-${site.state}`;
        const count = cityCounts[cityKey] || 0;
        cityCounts[cityKey] = count + 1;
        const coords = projectLatLng(site.lat, site.lng, count);
        list.push({
          ...site,
          x: coords.x,
          y: coords.y,
        });
      }
    }
    return list;
  }, [profiles, hazardFilter]);

  const activeSite =
    hoveredSite ||
    (selectedTicker
      ? projectedSites.find((s) => s.ticker === selectedTicker) || projectedSites[0]
      : projectedSites[0]) ||
    null;

  const riskColor = (level: 'high' | 'moderate' | 'low') => {
    if (level === 'high') return '#F25C54'; // Coral Red
    if (level === 'moderate') return '#F4A261'; // Amber
    return '#52B788'; // Emerald Green
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 8 Columns: High-Clarity US Infrastructure & Risk Map */}
      <div className="lg:col-span-8 bg-[#221B16] border border-[#382C24] rounded-[28px] p-5 shadow-xl">
        {/* Map Top Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setHazardFilter('ALL');
                setSelectedTicker(null);
              }}
              className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                hazardFilter === 'ALL' && !selectedTicker
                  ? 'bg-[#F7F2EB] text-[#16110E]'
                  : 'bg-[#191410] text-[#B5A698] hover:text-[#F7F2EB] border border-[#332820]'
              }`}
            >
              All Infrastructure ({profiles.reduce((s, p) => s + p.sites.length, 0)})
            </button>
            <button
              onClick={() =>
                setHazardFilter(hazardFilter === 'Hurricane' ? 'ALL' : 'Hurricane')
              }
              className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                hazardFilter === 'Hurricane'
                  ? 'bg-[#F4A261]/20 border-[#F4A261] text-[#F4A261]'
                  : 'bg-[#191410] border-[#332820] text-[#B5A698] hover:text-[#F7F2EB]'
              }`}
            >
              <Waves className="w-3.5 h-3.5" />
              <span>Hurricanes</span>
            </button>
            <button
              onClick={() =>
                setHazardFilter(hazardFilter === 'Earthquake' ? 'ALL' : 'Earthquake')
              }
              className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                hazardFilter === 'Earthquake'
                  ? 'bg-[#F25C54]/20 border-[#F25C54] text-[#F25C54]'
                  : 'bg-[#191410] border-[#332820] text-[#B5A698] hover:text-[#F7F2EB]'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Earthquakes</span>
            </button>
          </div>

          {/* Color Risk Legend */}
          <div className="flex items-center gap-4 text-xs bg-[#191410] px-3.5 py-1.5 rounded-2xl border border-[#332820]">
            <span className="flex items-center gap-1.5 text-[#F7F2EB] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F25C54]" />
              Severe
            </span>
            <span className="flex items-center gap-1.5 text-[#F7F2EB] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F4A261]" />
              Moderate
            </span>
            <span className="flex items-center gap-1.5 text-[#F7F2EB] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#52B788]" />
              Safe Inland
            </span>
          </div>
        </div>

        {/* SVG US Map Canvas */}
        <div className="relative rounded-[22px] bg-[#15100D] border border-[#332820] overflow-hidden">
          <svg
            viewBox="0 0 960 560"
            className="w-full h-auto block select-none"
            onClick={() => setSelectedTicker(null)}
          >
            <defs>
              <radialGradient id="quakeZone" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F25C54" stopOpacity="0.28" />
                <stop offset="70%" stopColor="#F25C54" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#F25C54" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="hurricaneZone" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F4A261" stopOpacity="0.26" />
                <stop offset="70%" stopColor="#F4A261" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#F4A261" stopOpacity="0" />
              </radialGradient>
              <pattern
                id="mapGrid"
                width="48"
                height="48"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 48 0 L 0 0 0 48"
                  fill="none"
                  stroke="#261E18"
                  strokeWidth="0.8"
                />
              </pattern>
            </defs>

            {/* Subtle Coordinate Grid */}
            <rect width="960" height="560" fill="url(#mapGrid)" />

            {/* Continental US Silhouette + Major State Boundaries */}
            <g>
              {/* Continental US Base */}
              <path
                d="M 92 72 L 185 68 L 310 68 L 445 68 L 555 76 L 635 108 L 705 128 L 775 112 L 845 78 L 885 95 L 892 142 L 855 185 L 848 228 L 818 282 L 778 345 L 762 415 L 785 485 L 752 505 L 712 435 L 645 422 L 575 445 L 515 478 L 465 512 L 425 462 L 368 422 L 265 415 L 182 385 L 112 335 L 72 248 L 68 152 Z"
                fill="#211914"
                stroke="#49392E"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />

              {/* Subtle Internal State / Regional Dividers for Spatial Clarity */}
              <g stroke="#31261E" strokeWidth="1.2" strokeDasharray="4 4" fill="none">
                {/* West Coast / Rockies */}
                <path d="M 185 68 L 178 382" />
                <path d="M 310 68 L 305 418" />
                {/* Central / Texas / Midwest */}
                <path d="M 465 70 L 465 512" />
                <path d="M 625 105 L 615 432" />
                {/* Latitudinal bands */}
                <path d="M 70 185 L 855 185" />
                <path d="M 92 310 L 802 310" />
              </g>
            </g>

            {/* HAZARD OVERLAY 1: West Coast San Andreas & Cascadia Earthquake Fault Corridor */}
            {(hazardFilter === 'ALL' || hazardFilter === 'Earthquake') && (
              <g>
                <ellipse
                  cx="105"
                  cy="245"
                  rx="75"
                  ry="165"
                  fill="url(#quakeZone)"
                  transform="rotate(-10 105 245)"
                />
                {/* Seismic Fault Line */}
                <path
                  d="M 88 95 Q 72 195 102 285 T 145 365"
                  fill="none"
                  stroke="#F25C54"
                  strokeWidth="2"
                  strokeDasharray="6 5"
                  opacity="0.7"
                />
                <text
                  x="130"
                  y="125"
                  fill="#F25C54"
                  fontSize="10"
                  fontWeight="700"
                  opacity="0.85"
                >
                  PACIFIC SEISMIC FAULT ZONE
                </text>
              </g>
            )}

            {/* HAZARD OVERLAY 2: Gulf Coast & Atlantic Hurricane Alley */}
            {(hazardFilter === 'ALL' || hazardFilter === 'Hurricane') && (
              <g>
                {/* Gulf + Florida Hurricane Zone */}
                <ellipse
                  cx="625"
                  cy="445"
                  rx="210"
                  ry="95"
                  fill="url(#hurricaneZone)"
                />
                {/* Atlantic / Virginia Data Center Alley Storm Corridor */}
                <ellipse
                  cx="795"
                  cy="285"
                  rx="95"
                  ry="135"
                  fill="url(#hurricaneZone)"
                  transform="rotate(20 795 285)"
                />
                <path
                  d="M 480 475 Q 640 445 755 385 T 825 225"
                  fill="none"
                  stroke="#F4A261"
                  strokeWidth="2"
                  strokeDasharray="6 5"
                  opacity="0.7"
                />
                <text
                  x="530"
                  y="495"
                  fill="#F4A261"
                  fontSize="10"
                  fontWeight="700"
                  opacity="0.85"
                >
                  GULF &amp; ATLANTIC HURRICANE CORRIDOR
                </text>
              </g>
            )}

            {/* Regional Hub Labels */}
            <g fill="#7D6B5D" fontSize="10" fontWeight="600" className="pointer-events-none">
              <text x="115" y="102">PACIFIC NW (OR/WA)</text>
              <text x="112" y="295">SILICON VALLEY (CA)</text>
              <text x="475" y="225">MIDWEST CORE (IA/OH)</text>
              <text x="455" y="438">TEXAS / GULF HUB</text>
              <text x="665" y="220">ASHBURN DATA ALLEY (VA)</text>
              <text x="660" y="475">SOUTH FLORIDA</text>
            </g>

            {/* Connecting Network Arcs for Selected Stock */}
            {selectedTicker && (
              <g>
                {projectedSites
                  .filter((s) => s.ticker === selectedTicker)
                  .map((site, idx, arr) => {
                    if (idx === 0) return null;
                    const prev = arr[0];
                    const midX = (prev.x + site.x) / 2;
                    const midY = Math.min(prev.y, site.y) - 45;
                    return (
                      <path
                        key={`arc-${site.id}`}
                        d={`M ${prev.x} ${prev.y} Q ${midX} ${midY} ${site.x} ${site.y}`}
                        fill="none"
                        stroke="#F7F2EB"
                        strokeWidth="1.8"
                        strokeDasharray="4 4"
                        opacity="0.65"
                      />
                    );
                  })}
              </g>
            )}

            {/* Infrastructure Nodes */}
            {projectedSites.map((site) => {
              const isSelectedStock =
                !selectedTicker || site.ticker === selectedTicker;
              const isHovered = activeSite?.id === site.id;
              const nodeColor = riskColor(site.riskLevel);

              return (
                <g
                  key={site.id}
                  transform={`translate(${site.x}, ${site.y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTicker(site.ticker);
                    setHoveredSite(site);
                  }}
                  onMouseEnter={() => setHoveredSite(site)}
                  className="cursor-pointer transition-opacity duration-300"
                  style={{ opacity: isSelectedStock ? 1 : 0.22 }}
                >
                  {/* Outer Pulse Ring for High Risk or Active Node */}
                  {(site.riskLevel === 'high' || isHovered) && (
                    <circle
                      r={isHovered ? 20 : 14}
                      fill={nodeColor}
                      opacity={isHovered ? 0.28 : 0.18}
                      className="animate-pulse-soft"
                    />
                  )}

                  {/* Main Infrastructure Pin */}
                  <circle
                    r={isHovered ? 9 : 7}
                    fill={nodeColor}
                    stroke="#16110E"
                    strokeWidth="2.5"
                  />

                  {/* Compact Ticker + Unpriced % Pill right on map */}
                  <g transform="translate(11, -10)">
                    <rect
                      x="0"
                      y="0"
                      width="76"
                      height="20"
                      rx="8"
                      fill={isHovered ? '#2E241D' : '#1B1511'}
                      stroke={isHovered ? nodeColor : '#3A2E25'}
                      strokeWidth="1.2"
                      opacity="0.95"
                    />
                    <text
                      x="7"
                      y="13.5"
                      fill="#F7F2EB"
                      fontSize="10"
                      fontWeight="800"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {site.ticker}
                    </text>
                    <text
                      x="42"
                      y="13.5"
                      fill={site.riskLevel === 'low' ? '#52B788' : '#F25C54'}
                      fontSize="9.5"
                      fontWeight="700"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {site.unpricedImpactPct.toFixed(1)}%
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Bottom Floating Active Facility Pill inside Map */}
          {activeSite && (
            <div className="m-3 p-3.5 rounded-2xl bg-[#221B16]/95 backdrop-blur-md border border-[#3E3127] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[#16110E] font-mono text-xs font-extrabold"
                  style={{ backgroundColor: riskColor(activeSite.riskLevel) }}
                >
                  {activeSite.ticker}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#F7F2EB]">
                      {activeSite.name}
                    </span>
                    <span className="text-xs text-[#A8988A]">
                      · {activeSite.city}, {activeSite.state}
                    </span>
                  </div>
                  <div className="text-xs text-[#A8988A] flex items-center gap-2 mt-0.5">
                    <span>{activeSite.category}</span>
                    <span>•</span>
                    <span>
                      Threat:{' '}
                      <strong className="text-[#F7F2EB]">{activeSite.hazard}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-[#A8988A]">
                    Unpriced Site Risk
                  </div>
                  <div className="font-mono text-sm font-extrabold text-[#F25C54]">
                    {activeSite.unpricedImpactPct.toFixed(1)}% value drag
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right 4 Columns: Stocks in Danger & Unpriced Discount Leaderboard */}
      <div className="lg:col-span-4 bg-[#221B16] border border-[#382C24] rounded-[28px] p-5 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-[#332820]">
            <div>
              <h2 className="text-base font-bold text-[#F7F2EB]">
                Stocks in Danger
              </h2>
              <p className="text-xs text-[#A8988A] mt-0.5">
                Real value below market price due to unpriced risk
              </p>
            </div>
            {selectedTicker && (
              <button
                onClick={() => setSelectedTicker(null)}
                className="px-2.5 py-1 rounded-xl bg-[#2E241D] text-[11px] font-semibold text-[#E57A54] hover:text-[#F7F2EB] cursor-pointer"
              >
                Show All
              </button>
            )}
          </div>

          {/* Stock Danger Cards */}
          <div className="mt-4 space-y-2.5">
            {sortedProfiles.map((stock) => {
              const isSelected = selectedTicker === stock.ticker;
              const isHurricane = stock.primaryHazard === 'Hurricane';

              return (
                <div
                  key={stock.ticker}
                  onClick={() =>
                    setSelectedTicker(isSelected ? null : stock.ticker)
                  }
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#2E231C] border-[#E57A54] shadow-md'
                      : 'bg-[#191410] border-[#31261F] hover:bg-[#241C16]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-mono text-xs font-extrabold text-[#16110E]"
                        style={{ backgroundColor: stock.color }}
                      >
                        {stock.ticker}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#F7F2EB]">
                          {stock.company}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#A8988A] mt-0.5">
                          {isHurricane ? (
                            <Waves className="w-3 h-3 text-[#F4A261]" />
                          ) : (
                            <Flame className="w-3 h-3 text-[#F25C54]" />
                          )}
                          <span>{stock.primaryHazard} Exposure</span>
                        </div>
                      </div>
                    </div>

                    {/* Prominent Red Unpriced % Badge */}
                    <div className="text-right">
                      <span className="inline-flex items-center px-3 py-1 rounded-xl bg-[#F25C54]/15 border border-[#F25C54]/35 font-mono text-sm font-extrabold text-[#F25C54] tabular-nums">
                        {stock.unpricedRiskPct.toFixed(1)}%
                      </span>
                      <div className="text-[10px] text-[#8C7A6B] mt-0.5">
                        not priced in
                      </div>
                    </div>
                  </div>

                  {/* Facility Chips */}
                  <div className="mt-3 pt-2.5 border-t border-[#2C221B] flex flex-wrap gap-1.5">
                    {stock.sites.map((site) => (
                      <span
                        key={site.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTicker(stock.ticker);
                          setHoveredSite(site);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#221B16] border border-[#382C24] text-[11px] text-[#D6C7B8] hover:border-[#E57A54]"
                      >
                        <MapPin
                          className="w-2.5 h-2.5"
                          style={{ color: riskColor(site.riskLevel) }}
                        />
                        <span>
                          {site.city}, {site.state}
                        </span>
                        <span className="font-mono text-[10px] text-[#F25C54] font-bold">
                          {site.unpricedImpactPct.toFixed(1)}%
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
