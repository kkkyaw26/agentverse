import React, { useState, useRef } from 'react';
import {
  StockRiskProfile,
  PORTFOLIO_PRESETS,
  buildPortfolioProfiles,
} from '../data/aftershockData';
import {
  Upload,
  Sparkles,
  ArrowRight,
  Flame,
  Waves,
  Check,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';

interface PortfolioUploadTabProps {
  portfolioName: string;
  setPortfolioName: (name: string) => void;
  profiles: StockRiskProfile[];
  setProfiles: (profiles: StockRiskProfile[]) => void;
  isHedged: boolean;
  setIsHedged: (hedged: boolean) => void;
  onGoToMap: (selectedTicker?: string) => void;
}

export const PortfolioUploadTab: React.FC<PortfolioUploadTabProps> = ({
  portfolioName,
  setPortfolioName,
  profiles,
  setProfiles,
  isHedged,
  setIsHedged,
  onGoToMap,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null);
  const [activePresetId, setActivePresetId] = useState<string>('ai-cloud');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Portfolio-level weighted unpriced risk
  const originalPortfolioRisk = profiles.reduce(
    (sum, p) => sum + (p.weight / 100) * p.unpricedRiskPct,
    0
  );
  const hedgedPortfolioRisk = profiles.reduce(
    (sum, p) => sum + (p.hedgedWeight / 100) * p.unpricedRiskPct,
    0
  );
  const activePortfolioRisk = isHedged ? hedgedPortfolioRisk : originalPortfolioRisk;
  const totalSites = profiles.reduce((sum, p) => sum + p.sites.length, 0);

  const handleFileProcess = async (file: File) => {
    setIsUploading(true);
    setActivePresetId('');

    try {
      let imageBase64: string | undefined;
      let mimeType: string | undefined;
      let textContent: string | undefined;

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        setUploadedPreviewUrl(dataUrl);
        imageBase64 = dataUrl.split(',')[1];
        mimeType = file.type;
      } else {
        setUploadedPreviewUrl(null);
        textContent = await file.text();
      }

      const response = await fetch('/api/portfolio/extract-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          textContent,
          fileName: file.name,
        }),
      });

      const data = await response.json();
      if (data?.items && Array.isArray(data.items) && data.items.length > 0) {
        setPortfolioName(data.portfolioName || file.name.replace(/\.[^/.]+$/, ''));
        setProfiles(buildPortfolioProfiles(data.items));
      }
    } catch (err) {
      console.error('Upload extraction error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleSelectPreset = (presetId: string) => {
    const found = PORTFOLIO_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setActivePresetId(presetId);
    setUploadedPreviewUrl(null);
    setPortfolioName(found.label);
    setProfiles(buildPortfolioProfiles(found.items));
  };

  // SVG Donut chart segments
  let cumulativePercent = 0;
  const donutSegments = profiles.map((p) => {
    const w = isHedged ? p.hedgedWeight : p.weight;
    const start = cumulativePercent;
    cumulativePercent += w;
    return {
      ...p,
      activeWeight: w,
      start,
    };
  });

  return (
    <div className="space-y-6">
      {/* Main 2-Column Compact Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (5 cols): Drop Screenshot / Pie Chart + Visual Donut */}
        <div className="lg:col-span-5 bg-[#221B16] border border-[#382C24] rounded-[28px] p-6 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-[#F7F2EB] tracking-tight">
                  Drop Portfolio Snapshot
                </h2>
                <p className="text-xs text-[#A8988A] mt-0.5">
                  Screenshot, pie chart, or brokerage CSV
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#2E241D] border border-[#42342B] text-[11px] font-medium text-[#D6C7B8]">
                Vision AI Ready
              </span>
            </div>

            {/* Interactive Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-[22px] border-2 border-dashed transition-all p-6 text-center flex flex-col items-center justify-center min-h-[195px] ${
                isDragging
                  ? 'border-[#E57A54] bg-[#2E231C]'
                  : 'border-[#46372D] bg-[#1B1511]/80 hover:border-[#695244] hover:bg-[#261E18]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.csv,.txt,.tsv,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileProcess(file);
                }}
              />

              {isUploading ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#E57A54]/20 flex items-center justify-center text-[#E57A54]">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                  <div className="text-sm font-semibold text-[#F7F2EB]">
                    Reading portfolio chart...
                  </div>
                </div>
              ) : uploadedPreviewUrl ? (
                <div className="flex items-center gap-4 w-full text-left">
                  <img
                    src={uploadedPreviewUrl}
                    alt="Uploaded portfolio"
                    className="w-24 h-24 object-cover rounded-2xl border border-[#46372D] shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#52B788]/15 text-[#52B788] text-[11px] font-semibold mb-1.5">
                      <Check className="w-3 h-3" /> Extracted
                    </div>
                    <div className="text-sm font-bold text-[#F7F2EB] truncate">
                      {portfolioName}
                    </div>
                    <div className="text-xs text-[#A8988A] mt-1">
                      {profiles.length} stocks · {totalSites} US facilities mapped
                    </div>
                    <div className="text-[11px] text-[#E57A54] font-medium mt-2">
                      Click to upload another screenshot
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-[#2E241D] border border-[#45362C] flex items-center justify-center text-[#E57A54] mb-3 shadow-inner">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-semibold text-[#F7F2EB]">
                    Drop a pie chart or screenshot here
                  </div>
                  <div className="text-xs text-[#A8988A] mt-1">
                    PNG, JPG, WebP, or CSV — we extract tickers &amp; weights automatically
                  </div>
                </>
              )}
            </div>

            {/* Instant Sample Presets */}
            <div className="mt-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8C7A6B] mb-2">
                Or try a snapshot
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PORTFOLIO_PRESETS.map((preset) => {
                  const isActive = activePresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset.id)}
                      className={`p-2.5 rounded-2xl text-left transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-[#332720] border-[#E57A54] text-[#F7F2EB]'
                          : 'bg-[#1B1511] border-[#332820] text-[#B5A698] hover:bg-[#28201A]'
                      }`}
                    >
                      <div className="text-xs font-bold truncate">{preset.label}</div>
                      <div className="text-[10px] text-[#8C7A6B] truncate mt-0.5">
                        {preset.subtitle}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Interactive Donut Preview Footer */}
          <div className="mt-6 pt-5 border-t border-[#332820] flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 shrink-0">
                <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="transparent"
                    stroke="#2E241D"
                    strokeWidth="4.5"
                  />
                  {donutSegments.map((seg) => {
                    const circumference = 2 * Math.PI * 14;
                    const strokeDasharray = `${(seg.activeWeight / 100) * circumference} ${circumference}`;
                    const strokeDashoffset = -((seg.start / 100) * circumference);
                    return (
                      <circle
                        key={seg.ticker}
                        cx="18"
                        cy="18"
                        r="14"
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth="4.5"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-500"
                      />
                    );
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-xs font-bold text-[#F7F2EB]">
                    {profiles.length}
                  </span>
                  <span className="text-[9px] text-[#A8988A]">Stocks</span>
                </div>
              </div>

              <div>
                <div className="text-xs text-[#A8988A]">Active Portfolio</div>
                <div className="text-base font-bold text-[#F7F2EB]">{portfolioName}</div>
                <div className="text-xs text-[#A8988A] mt-0.5">
                  {totalSites} US Data Centers, Fabs &amp; Grid Nodes
                </div>
              </div>
            </div>

            <button
              onClick={() => onGoToMap()}
              className="px-4 py-2.5 rounded-2xl bg-[#E57A54] hover:bg-[#eb8967] text-[#16110E] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-md"
            >
              <span>View Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column (7 cols): Unpriced Risk Breakdown & 1-Click Auto-Hedge */}
        <div className="lg:col-span-7 bg-[#221B16] border border-[#382C24] rounded-[28px] p-6 flex flex-col justify-between shadow-xl">
          <div>
            {/* Top Metric Strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#332820]">
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-xs text-[#A8988A] font-medium">
                    Unpriced Disaster Risk
                  </div>
                  <div className="flex items-baseline gap-2.5 mt-1">
                    <span className="font-mono text-3xl font-extrabold text-[#F25C54] tabular-nums">
                      {activePortfolioRisk.toFixed(2)}%
                    </span>
                    {isHedged && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#52B788]/15 text-[#52B788] font-mono text-xs font-semibold">
                        +{Math.abs(originalPortfolioRisk - hedgedPortfolioRisk).toFixed(2)}% protected
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bubbly Auto-Hedge Toggle */}
              <div className="flex items-center bg-[#18130F] p-1.5 rounded-2xl border border-[#362B22]">
                <button
                  onClick={() => setIsHedged(false)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    !isHedged
                      ? 'bg-[#2E241D] text-[#F7F2EB] shadow'
                      : 'text-[#9A897A] hover:text-[#F7F2EB]'
                  }`}
                >
                  Current Weights
                </button>
                <button
                  onClick={() => setIsHedged(true)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isHedged
                      ? 'bg-[#52B788] text-[#16110E] shadow'
                      : 'text-[#9A897A] hover:text-[#F7F2EB]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Risk-Hedged</span>
                </button>
              </div>
            </div>

            {/* Holdings List */}
            <div className="mt-4 space-y-2.5">
              {profiles.map((stock) => {
                const displayWeight = isHedged ? stock.hedgedWeight : stock.weight;
                const weightDiff = Number((stock.hedgedWeight - stock.weight).toFixed(1));
                const isHurricane = stock.primaryHazard === 'Hurricane';

                return (
                  <div
                    key={stock.ticker}
                    onClick={() => onGoToMap(stock.ticker)}
                    className="group p-3.5 rounded-2xl bg-[#1A1410] hover:bg-[#281F19] border border-[#31261F] hover:border-[#4D3C31] transition-all cursor-pointer flex items-center justify-between gap-4"
                  >
                    {/* Left: Ticker + Company + Threat Badge */}
                    <div className="flex items-center gap-3.5 min-w-[180px]">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center font-mono text-xs font-extrabold text-[#16110E] shrink-0"
                        style={{ backgroundColor: stock.color }}
                      >
                        {stock.ticker}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#F7F2EB]">
                            {stock.company}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              isHurricane
                                ? 'bg-[#F4A261]/15 text-[#F4A261]'
                                : 'bg-[#E57A54]/15 text-[#E57A54]'
                            }`}
                          >
                            {isHurricane ? (
                              <Waves className="w-2.5 h-2.5" />
                            ) : (
                              <Flame className="w-2.5 h-2.5" />
                            )}
                            {stock.primaryHazard}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#9A897A] mt-0.5">
                          {stock.sites.length} US infrastructure sites
                        </div>
                      </div>
                    </div>

                    {/* Middle: Allocation Bar */}
                    <div className="flex-1 max-w-[220px] hidden sm:block">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-[#9A897A]">Weight</span>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="font-bold text-[#F7F2EB] tabular-nums">
                            {displayWeight.toFixed(1)}%
                          </span>
                          {isHedged && weightDiff !== 0 && (
                            <span
                              className={`text-[10px] font-semibold ${
                                weightDiff > 0 ? 'text-[#52B788]' : 'text-[#F4A261]'
                              }`}
                            >
                              ({weightDiff > 0 ? `+${weightDiff}%` : `${weightDiff}%`})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-[#2A201A] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, displayWeight * 2.5)}%`,
                            backgroundColor: stock.color,
                          }}
                        />
                      </div>
                    </div>

                    {/* Right: Unpriced Risk % in Red */}
                    <div className="text-right shrink-0">
                      <div className="inline-flex items-center px-3 py-1 rounded-xl bg-[#F25C54]/15 border border-[#F25C54]/30 font-mono text-sm font-bold text-[#F25C54] tabular-nums">
                        {stock.unpricedRiskPct.toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-[#8C7A6B] mt-0.5">
                        unpriced risk
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Summary Bar */}
          <div className="mt-5 pt-4 border-t border-[#332820] flex items-center justify-between text-xs text-[#A8988A]">
            <span>Click any stock to inspect its US data centers &amp; fault lines</span>
            <span className="font-mono text-[#F25C54] font-semibold">
              Red % = fair value discount not yet priced in
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
