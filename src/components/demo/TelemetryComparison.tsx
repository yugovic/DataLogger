import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as echarts from 'echarts';

// ─── Mock Data ───────────────────────────────────────────────
const GRAPH_DATA: Record<string, { a: number[]; b: number[]; unit: string; max: number; interval: number; legendA: string; legendB: string }> = {
  '速度': {
    a: [0,45,88,135,178,215,240,252,248,230,195,160,140,155,185,220,245,255,250,235,200,165,130,110,125,160,195,230,248,255,250,238,210,175,145,120,105,130,165,200,235,250,255,248,230,195,160,135,120,140,170,205,238,250,247,230,195,155,120,0],
    b: [0,42,85,130,172,210,235,247,243,225,190,155,135,150,180,215,240,250,245,230,195,160,125,105,120,155,190,225,243,250,245,233,205,170,140,115,100,125,160,195,230,245,250,243,225,190,155,130,115,135,165,200,233,245,242,225,190,150,115,0],
    unit: 'km/h', max: 300, interval: 60, legendA: 'ラップ A 1:31.987', legendB: 'ラップ B 1:32.456',
  },
  'スロットル': {
    a: [0,35,65,85,100,100,100,95,60,30,10,5,15,40,75,100,100,100,98,80,50,20,5,0,10,45,80,100,100,100,100,95,70,35,15,5,0,20,55,85,100,100,100,100,90,55,25,10,0,15,50,80,100,100,100,90,60,25,5,0],
    b: [0,30,60,80,95,100,100,90,55,25,8,3,12,35,70,95,100,100,95,75,45,18,3,0,8,40,75,95,100,100,100,90,65,30,12,3,0,18,50,80,95,100,100,95,85,50,22,8,0,12,45,75,95,100,100,85,55,22,3,0],
    unit: '%', max: 100, interval: 20, legendA: 'ラップ A', legendB: 'ラップ B',
  },
  'ブレーキ': {
    a: [0,0,0,0,0,0,0,15,60,85,95,80,50,10,0,0,0,0,5,30,70,90,85,60,20,0,0,0,0,0,0,10,45,75,90,85,65,15,0,0,0,0,0,8,35,70,85,80,50,10,0,0,0,0,5,30,65,80,70,0],
    b: [0,0,0,0,0,0,0,20,65,90,98,85,55,15,0,0,0,0,8,35,75,95,90,65,25,0,0,0,0,0,0,15,50,80,95,90,70,20,0,0,0,0,0,12,40,75,90,85,55,15,0,0,0,0,8,35,70,85,75,0],
    unit: '%', max: 100, interval: 20, legendA: 'ラップ A', legendB: 'ラップ B',
  },
  'ステアリング': {
    a: [0,5,15,25,10,-5,-15,-25,-35,-20,5,30,55,40,15,-10,-25,-35,-20,0,15,35,50,35,10,-15,-30,-20,-5,5,10,-5,-20,-35,-50,-40,-20,5,20,10,-5,-15,-20,-10,5,25,40,30,10,-10,-25,-15,0,10,5,-10,-25,-35,-15,0],
    b: [0,4,13,22,8,-7,-18,-28,-38,-23,3,28,52,38,12,-12,-28,-38,-23,-2,13,33,48,33,8,-17,-33,-23,-7,3,8,-7,-23,-38,-53,-43,-23,3,18,8,-7,-18,-23,-12,3,23,38,28,8,-12,-28,-18,-2,8,3,-12,-28,-38,-18,0],
    unit: '°', max: 60, interval: 20, legendA: 'ラップ A', legendB: 'ラップ B',
  },
  'エンジン回転数': {
    a: [800,2500,4200,5800,7200,8200,8500,8300,6500,4500,3200,2800,3500,4800,6200,7800,8400,8600,8300,7200,5500,4000,3000,2500,3200,4800,6500,8000,8500,8600,8400,8000,6800,5000,3800,3000,2500,3500,5200,7000,8200,8500,8600,8300,7500,5800,4200,3200,2600,3500,5000,6800,8200,8500,8400,7800,6000,4000,2800,800],
    b: [800,2300,4000,5500,6900,7900,8200,8000,6200,4200,3000,2600,3300,4500,6000,7500,8100,8300,8000,6900,5200,3800,2800,2300,3000,4500,6200,7700,8200,8300,8100,7700,6500,4800,3600,2800,2300,3300,5000,6700,7900,8200,8300,8000,7200,5500,4000,3000,2400,3300,4800,6500,7900,8200,8100,7500,5700,3800,2600,800],
    unit: 'rpm', max: 9000, interval: 1500, legendA: 'ラップ A', legendB: 'ラップ B',
  },
  'Gフォース': {
    a: [0,0.2,0.4,0.5,0.3,0.1,-0.2,-0.8,-1.2,-0.9,-0.3,0.5,1.1,0.8,0.3,-0.1,-0.3,-0.1,0.2,0.6,1.0,1.2,0.9,0.5,0.1,-0.4,-0.9,-0.5,0,0.1,0.2,-0.3,-0.8,-1.1,-1.3,-1.0,-0.5,0.2,0.5,0.3,0,-0.2,-0.5,-0.8,-0.4,0.3,0.8,1.0,0.6,0.1,-0.3,-0.6,-0.2,0.1,0.2,-0.4,-0.9,-1.1,-0.5,0],
    b: [0,0.18,0.35,0.45,0.25,0.08,-0.25,-0.85,-1.15,-0.85,-0.25,0.45,1.0,0.7,0.25,-0.15,-0.35,-0.15,0.15,0.5,0.9,1.1,0.8,0.4,0.05,-0.45,-0.85,-0.45,-0.05,0.05,0.15,-0.35,-0.85,-1.05,-1.25,-0.95,-0.45,0.15,0.45,0.25,-0.05,-0.25,-0.55,-0.75,-0.35,0.25,0.7,0.9,0.5,0.05,-0.35,-0.55,-0.15,0.05,0.15,-0.45,-0.85,-1.05,-0.45,0],
    unit: 'G', max: 1.5, interval: 0.5, legendA: 'ラップ A', legendB: 'ラップ B',
  },
};

const DISTANCE_LABELS = Array.from({ length: 60 }, (_, i) => (i * 0.1).toFixed(1));

const SECTOR_DATA = [
  { sector: 'セクター1', lapA: '26.742', lapB: '26.814', diff: '+0.072', diffPct: '+0.27%', best: true },
  { sector: 'セクター2', lapA: '37.451', lapB: '37.635', diff: '+0.184', diffPct: '+0.49%', best: true },
  { sector: 'セクター3', lapA: '27.794', lapB: '28.007', diff: '+0.213', diffPct: '+0.76%', best: false },
];

const METRICS = [
  { label: 'ラップタイム', valueA: '1:31.987', valueB: '1:32.456', diff: '+0.469', diffSub: '0.51%' },
  { label: '最高速度', valueA: '247.6', valueB: '244.1', unit: 'km/h', diff: '+3.5' },
  { label: 'ブレーキングポイント', valueA: '152', valueB: '138', unit: 'm', diff: '+14 m' },
  { label: '最小コーナリング速度', valueA: '63.2', valueB: '58.7', unit: 'km/h', diff: '+4.5 km/h' },
  { label: 'フルスロットル時間', valueA: '67.2', valueB: '63.8', unit: '%', diff: '+3.4 %' },
  { label: '平均コーナリングG', valueA: '1.28', valueB: '1.21', unit: 'G', diff: '+0.07 G' },
];

interface SessionData {
  id: number;
  circuit: string;
  date: string;
  car: string;
  best: string;
  time?: string;
  laps: number;
  sessions?: number;
  sectorBest?: string;
}

const SAVED_SESSIONS: SessionData[] = [
  { id: 0, circuit: '富士スピードウェイ', date: '2024/05/18', car: 'Porsche 911 GT3 (992)', best: '1:31.987', time: '9:42', laps: 12, sessions: 12, sectorBest: 'F:3' },
  { id: 1, circuit: '鈴鹿サーキット', date: '2024/05/11', car: 'Porsche 911 GT3 (992)', best: '1:58.102', laps: 8 },
  { id: 2, circuit: 'モビリティリゾートもてぎ', date: '2024/05/04', car: 'Porsche 911 GT3 (992)', best: '1:47.923', laps: 10 },
  { id: 3, circuit: '富士スピードウェイ', date: '2024/04/27', car: 'Porsche 911 GT3 (992)', best: '1:32.310', laps: 9 },
  { id: 4, circuit: '筑波サーキット コース2000', date: '2024/04/20', car: 'Porsche 911 GT3 (992)', best: '1:04.933', laps: 15 },
];

const FAVORITE_LAPS = [
  { circuit: '富士スピードウェイ', time: '1:31.987', date: '2024/05/18' },
  { circuit: '鈴鹿サーキット', time: '1:58.102', date: '2024/05/11' },
  { circuit: '筑波サーキット', time: '1:04.933', date: '2024/04/20' },
];

const GRAPH_TABS = ['速度', 'スロットル', 'ブレーキ', 'ステアリング', 'エンジン回転数', 'Gフォース'];

const AVAILABLE_LAPS = [
  { id: 'lap1', time: '1:31.987', date: '2024/05/18 09:42', label: 'ベストラップ' },
  { id: 'lap2', time: '1:32.456', date: '2024/05/18 10:15', label: '' },
  { id: 'lap3', time: '1:33.012', date: '2024/05/18 09:30', label: '' },
  { id: 'lap4', time: '1:33.587', date: '2024/05/18 09:18', label: '' },
  { id: 'lap5', time: '1:34.201', date: '2024/05/18 10:03', label: '' },
  { id: 'lap6', time: '1:35.844', date: '2024/05/18 09:06', label: 'ウォームアップ' },
];

const FILTER_OPTIONS: Record<string, string[]> = {
  'コース': ['富士 富士スピードウェイ', '鈴鹿サーキット', 'モビリティリゾートもてぎ', '筑波サーキット コース2000', 'オートポリス', 'スポーツランドSUGO'],
  '日付': ['2024/05/18', '2024/05/11', '2024/05/04', '2024/04/27', '2024/04/20'],
  'ドライバー': ['山田太郎', '佐藤花子', '鈴木一郎'],
  '車両': ['Porsche 911 GT3 (992)', 'BMW M4 GT3', 'Ferrari 296 GT3', 'Lamborghini Huracán GT3'],
  'タイヤ': ['Michelin CUP2 R', 'Pirelli P Zero', 'Bridgestone RE-71RS', 'Yokohama A052'],
  '天候 / 路面': ['ドライ / 23°C', 'ドライ / 30°C', 'ウェット / 18°C', 'ハーフウェット / 20°C'],
};

// ─── Toast ───────────────────────────────────────────────────

const Toast: React.FC<{ message: string; type?: 'success' | 'info' | 'error'; onClose: () => void }> = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const bg = type === 'success' ? 'bg-emerald-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  return (
    <div className={`fixed top-6 right-6 z-[100] ${bg} text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-3 animate-slide-in`}>
      {type === 'success' && <span>&#10003;</span>}
      {type === 'info' && <span>&#9432;</span>}
      {type === 'error' && <span>&#10007;</span>}
      {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">&times;</button>
    </div>
  );
};

// ─── Modal ───────────────────────────────────────────────────

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; width?: string }> = ({ title, onClose, children, width = 'max-w-lg' }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
    <div className={`bg-[#161927] border border-gray-700 rounded-2xl shadow-2xl w-full ${width} mx-4 overflow-hidden`} onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  </div>
);

// ─── Dropdown Select ─────────────────────────────────────────

const SelectField: React.FC<{ label: string; value: string; options: string[]; onChange: (v: string) => void; icon?: React.ReactNode }> = ({ label, value, options, onChange, icon }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="flex flex-col gap-1 min-w-0 relative" ref={ref}>
      <span className="text-[11px] text-gray-400 tracking-wide">{label}</span>
      <div
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 bg-[#1e2130] border rounded-lg px-3 py-2 text-sm text-gray-200 cursor-pointer transition-colors ${open ? 'border-blue-500' : 'border-gray-700 hover:border-blue-500/50'}`}
      >
        {icon}
        <span className="truncate">{value}</span>
        <svg className={`w-3 h-3 text-gray-500 ml-auto flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1d2e] border border-gray-600 rounded-lg shadow-xl z-30 max-h-48 overflow-y-auto">
          {options.map(opt => (
            <div
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${opt === value ? 'bg-blue-500/20 text-blue-300' : 'text-gray-300 hover:bg-gray-700/50'}`}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Telemetry Chart ─────────────────────────────────────────

const TelemetryChart: React.FC<{ tab: string }> = ({ tab }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }
    const chart = chartInstance.current;
    const d = GRAPH_DATA[tab] || GRAPH_DATA['速度'];

    const sectorLines = [
      { xAxis: 14, label: 'S1' },
      { xAxis: 30, label: 'S2' },
      { xAxis: 46, label: 'S3' },
    ];

    const yMin = tab === 'ステアリング' ? -60 : tab === 'Gフォース' ? -1.5 : 0;

    chart.setOption({
      backgroundColor: 'transparent',
      grid: { left: 55, right: 20, top: 40, bottom: 35 },
      legend: {
        top: 8, right: 20,
        textStyle: { color: '#9ca3af', fontSize: 11 },
        data: [
          { name: d.legendA, icon: 'roundRect' },
          { name: d.legendB, icon: 'roundRect' },
        ],
      },
      xAxis: {
        type: 'category',
        data: DISTANCE_LABELS,
        axisLabel: { color: '#6b7280', fontSize: 11, interval: 9 },
        axisLine: { lineStyle: { color: '#374151' } },
        axisTick: { show: false },
        name: 'km', nameLocation: 'end',
        nameTextStyle: { color: '#6b7280', fontSize: 11, padding: [0, 0, 0, -20] },
      },
      yAxis: {
        type: 'value', min: yMin, max: d.max, interval: d.interval,
        axisLabel: { color: '#6b7280', fontSize: 11 },
        splitLine: { lineStyle: { color: '#1f2937', type: 'dashed' } },
        axisLine: { show: false },
        name: d.unit, nameLocation: 'end',
        nameTextStyle: { color: '#6b7280', fontSize: 11 },
      },
      series: [
        {
          name: d.legendA, type: 'line', data: d.a, smooth: true, showSymbol: false,
          lineStyle: { color: '#3b82f6', width: 2 }, itemStyle: { color: '#3b82f6' },
          markLine: {
            silent: true, symbol: 'none',
            data: sectorLines.map(s => ({
              xAxis: s.xAxis,
              label: { show: true, formatter: s.label, color: '#60a5fa', fontSize: 12, fontWeight: 'bold', position: 'start' as const, distance: 5 },
              lineStyle: { color: '#374151', type: 'dashed' as const, width: 1 },
            })),
          },
        },
        {
          name: d.legendB, type: 'line', data: d.b, smooth: true, showSymbol: false,
          lineStyle: { color: '#ef4444', width: 2, type: 'dashed' }, itemStyle: { color: '#ef4444' },
        },
      ],
      tooltip: {
        trigger: 'axis', backgroundColor: '#1f2937', borderColor: '#374151',
        textStyle: { color: '#e5e7eb', fontSize: 12 },
      },
    }, true);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); };
  }, [tab]);

  useEffect(() => {
    return () => { chartInstance.current?.dispose(); };
  }, []);

  return <div ref={chartRef} className="w-full h-[280px]" />;
};

// ─── Course Map ──────────────────────────────────────────────

const CourseMap: React.FC<{ highlightSector: number | null; onSectorClick: (s: number) => void }> = ({ highlightSector, onSectorClick }) => (
  <div className="flex flex-col items-center justify-center h-full">
    <div className="relative w-[220px] h-[160px]">
      <svg viewBox="0 0 220 160" className="w-full h-full">
        <path d="M 40 140 Q 10 140 10 110 L 10 50 Q 10 20 40 20 L 120 20 Q 160 20 170 50 L 200 110 Q 210 140 180 140 Z" fill="none" stroke="#374151" strokeWidth="3" />
        <path d="M 40 140 Q 10 140 10 110 L 10 50 Q 10 20 40 20 L 80 20" fill="none" stroke={highlightSector === 1 ? '#60a5fa' : '#3b82f6'} strokeWidth={highlightSector === 1 ? 5 : 3} className="cursor-pointer" onClick={() => onSectorClick(1)} />
        <path d="M 80 20 L 120 20 Q 160 20 170 50 L 185 90" fill="none" stroke={highlightSector === 2 ? '#f87171' : '#ef4444'} strokeWidth={highlightSector === 2 ? 5 : 3} className="cursor-pointer" onClick={() => onSectorClick(2)} />
        <path d="M 185 90 L 200 110 Q 210 140 180 140 L 40 140" fill="none" stroke={highlightSector === 3 ? '#4ade80' : '#22c55e'} strokeWidth={highlightSector === 3 ? 5 : 3} className="cursor-pointer" onClick={() => onSectorClick(3)} />
        <circle cx="110" cy="80" r="6" fill="#f59e0b" />
        <text x="106" y="84" fontSize="8" fill="#0f1117" fontWeight="bold">+</text>
      </svg>
      {[{ s: 1, cls: 'top-[85px] left-[15px]', color: 'blue' }, { s: 2, cls: 'top-[30px] right-[20px]', color: 'red' }, { s: 3, cls: 'bottom-[10px] right-[30px]', color: 'green' }].map(({ s, cls, color }) => (
        <div key={s} className={`absolute ${cls}`}>
          <button
            onClick={() => onSectorClick(s)}
            className={`bg-${color}-500/20 text-${color}-400 text-[10px] px-2 py-0.5 rounded-full border border-${color}-500/30 hover:bg-${color}-500/40 transition-colors ${highlightSector === s ? 'ring-2 ring-' + color + '-400' : ''}`}
          >
            S{s}
          </button>
        </div>
      ))}
    </div>
    <div className="flex gap-3 mt-4">
      {[
        { s: 1, diff: '+0.072', borderColor: 'border-blue-500/30', textColor: 'text-blue-400' },
        { s: 2, diff: '+0.184', borderColor: 'border-red-500/30', textColor: 'text-red-400' },
        { s: 3, diff: '+0.213', borderColor: 'border-green-500/30', textColor: 'text-green-400' },
      ].map(({ s, diff, borderColor, textColor }) => (
        <button
          key={s}
          onClick={() => onSectorClick(s)}
          className={`flex items-center gap-1.5 bg-[#1a2332] border ${borderColor} rounded-lg px-3 py-1.5 hover:bg-[#1f2940] transition-colors ${highlightSector === s ? 'ring-1 ring-yellow-400/50' : ''}`}
        >
          <span className={`${textColor} text-xs font-bold`}>S{s}</span>
          <span className="text-yellow-400 text-xs font-medium">{diff}</span>
        </button>
      ))}
    </div>
    <span className="text-[10px] text-gray-500 mt-2">比較ラップ差</span>
  </div>
);

// ─── Video Player ────────────────────────────────────────────

const VideoPlayer: React.FC<{ label: string; color: 'blue' | 'red'; speed: string; syncWith?: number; onTimeUpdate?: (t: number) => void; externalTime?: number }> = ({ label, color, speed, externalTime }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(30);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const speedMultiplier = speed === '0.5x' ? 0.5 : speed === '2x' ? 2.0 : 1.0;

  useEffect(() => {
    if (externalTime !== undefined) setProgress(externalTime);
  }, [externalTime]);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setProgress(p => {
          if (p >= 100) { setPlaying(false); return 0; }
          return Math.min(100, p + 0.5 * speedMultiplier);
        });
      }, 50);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, speedMultiplier]);

  const handleBarClick = (e: React.MouseEvent) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setProgress(Math.max(0, Math.min(100, pct)));
  };

  const totalSec = 92;
  const currentSec = Math.floor((progress / 100) * totalSec);
  const timeStr = `${Math.floor(currentSec / 60)}:${String(currentSec % 60).padStart(2, '0')}`;
  const totalStr = `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')}`;

  const bgColor = color === 'blue' ? 'bg-blue-500' : 'bg-red-500';
  const barColor = color === 'blue' ? 'bg-blue-500' : 'bg-red-500';
  const borderExtra = color === 'red' ? 'border border-red-400' : '';

  return (
    <div>
      <div className={`${bgColor} text-white text-[10px] font-medium px-2 py-0.5 rounded-t-md w-fit ${borderExtra}`}>{label}</div>
      <div
        className="bg-[#0a0d15] border border-gray-700 rounded-lg rounded-tl-none aspect-video flex items-center justify-center relative overflow-hidden cursor-pointer group"
        onClick={() => setPlaying(!playing)}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800/30 to-gray-900/80" />
        <div className={`relative text-gray-500 group-hover:text-gray-300 transition-colors ${playing ? 'opacity-0' : 'opacity-100'}`}>
          <svg className="w-12 h-12 drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        {playing && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex gap-1.5">
              <div className="w-1.5 h-8 bg-white/60 rounded-full animate-pulse" />
              <div className="w-1.5 h-8 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            </div>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-2" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            <button onClick={() => setPlaying(!playing)} className="hover:text-white transition-colors">
              {playing ? (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
              ) : (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>
            <span className="font-mono">{timeStr} / {totalStr}</span>
            <div
              ref={progressBarRef}
              className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden cursor-pointer relative group/bar"
              onClick={handleBarClick}
            >
              <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${progress}%` }} />
              <div
                className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 ${barColor} rounded-full shadow-lg opacity-0 group-hover/bar:opacity-100 transition-opacity`}
                style={{ left: `calc(${progress}% - 6px)` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Nav Dropdown ────────────────────────────────────────────

const NavDropdown: React.FC<{ label: string; items: string[] }> = ({ label, items }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <span
        onClick={() => setOpen(!open)}
        className="hover:text-white cursor-pointer flex items-center gap-1"
      >
        {label}
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </span>
      {open && (
        <div className="absolute top-full left-0 mt-2 bg-[#1a1d2e] border border-gray-600 rounded-lg shadow-xl z-40 min-w-[180px] py-1">
          {items.map(item => (
            <div key={item} className="px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50 cursor-pointer transition-colors" onClick={() => setOpen(false)}>
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────

export const TelemetryComparison: React.FC = () => {
  const [activeGraphTab, setActiveGraphTab] = useState('速度');
  const [syncGraph, setSyncGraph] = useState(true);
  const [syncVideo, setSyncVideo] = useState(true);
  const [videoSpeed, setVideoSpeed] = useState('1x');
  const [highlightSector, setHighlightSector] = useState<number | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState(0);
  const [showAllSessions, setShowAllSessions] = useState(false);

  // Filter state
  const [filterCourse, setFilterCourse] = useState('富士 富士スピードウェイ');
  const [filterDate, setFilterDate] = useState('2024/05/18');
  const [filterDriver, setFilterDriver] = useState('山田太郎');
  const [filterCar, setFilterCar] = useState('Porsche 911 GT3 (992)');
  const [filterTire, setFilterTire] = useState('Michelin CUP2 R');
  const [filterWeather, setFilterWeather] = useState('ドライ / 23°C');

  // Lap selection
  const [selectedLapA, setSelectedLapA] = useState(AVAILABLE_LAPS[0]);
  const [selectedLapB, setSelectedLapB] = useState(AVAILABLE_LAPS[1]);
  const [showLapPicker, setShowLapPicker] = useState<'A' | 'B' | null>(null);

  // Notes
  const [editingNotes, setEditingNotes] = useState(false);
  const [noteText, setNoteText] = useState('S2の最終コーナーでブレーキを早く離しすぎ。立ち上がりでリアが流れた。\nターン1のアプローチであと5km/h出したい。');

  // Modals
  const [showTutorial, setShowTutorial] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSectorInfo, setShowSectorInfo] = useState(false);
  const [, setShowSavedComparison] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  // Video sync
  const [videoTimeA, setVideoTimeA] = useState(30);
  const [videoTimeB, setVideoTimeB] = useState(30);

  const handleSectorClick = (s: number) => {
    setHighlightSector(prev => prev === s ? null : s);
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      showToast('共有リンクをコピーしました', 'success');
    }).catch(() => {
      showToast('共有リンクをコピーしました', 'success');
    });
  };

  const handleExportCSV = () => {
    const csvContent = [
      'セクター,ラップA,ラップB,差,差(%)',
      ...SECTOR_DATA.map(s => `${s.sector},${s.lapA},${s.lapB},${s.diff},${s.diffPct}`),
      `ラップタイム,${selectedLapA.time},${selectedLapB.time},+0.469,+0.51%`,
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telemetry_comparison_${filterDate.replace(/\//g, '')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSVファイルをダウンロードしました', 'success');
  };

  const handleExportPDF = () => {
    showToast('PDF レポートを生成中...', 'info');
    setTimeout(() => showToast('PDF レポートが完了しました', 'success'), 2000);
  };

  const handleClearLaps = () => {
    setSelectedLapA(AVAILABLE_LAPS[0]);
    setSelectedLapB(AVAILABLE_LAPS[1]);
    showToast('ラップ選択をリセットしました', 'info');
  };

  const lapDiff = (() => {
    const parseTime = (t: string) => {
      const [min, sec] = t.split(':');
      return parseFloat(min) * 60 + parseFloat(sec);
    };
    const diff = parseTime(selectedLapB.time) - parseTime(selectedLapA.time);
    return { value: diff >= 0 ? `+${diff.toFixed(3)}` : diff.toFixed(3), pct: `${((Math.abs(diff) / parseTime(selectedLapA.time)) * 100).toFixed(2)}%` };
  })();

  return (
    <div className="min-h-screen bg-[#0b0e17] text-gray-200">
      {/* Animations */}
      <style>{`
        @keyframes slide-in { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ─── Header ─── */}
      <header className="bg-[#0f1219] border-b border-gray-800">
        <div className="bg-[#12151e] border-b border-gray-800/50 px-4 py-1.5 flex items-center justify-between text-[11px] text-gray-500">
          <div className="flex items-center gap-4">
            <span>&#x1F69A; 税込10,000円以上で送料無料</span>
            <span>平日14時までのご注文で当日発送</span>
          </div>
          <div className="flex items-center gap-4">
            <span>こんにちは、{filterDriver} さん</span>
            <span className="hover:text-gray-300 cursor-pointer">マイページ</span>
            <span className="hover:text-gray-300 cursor-pointer">よくある質問</span>
            <span className="flex items-center gap-1 cursor-pointer hover:text-gray-300">&#x1F6D2; カート <span className="bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">0</span></span>
          </div>
        </div>
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div>
              <h1 className="text-xl font-bold italic text-white tracking-tight">TrackSync</h1>
              <p className="text-[9px] text-gray-500 -mt-0.5">データが、速さに変わる。</p>
            </div>
            <nav className="flex items-center gap-6 text-sm text-gray-300">
              <NavDropdown label="製品一覧" items={['データロガー Pro', 'データロガー Lite', 'GPS モジュール', 'OBD-II アダプター', 'センサーキット']} />
              <NavDropdown label="活用方法" items={['セットアップガイド', 'データ分析入門', 'プロドライバーの使い方', 'チーム活用事例']} />
              <span className="hover:text-white cursor-pointer text-blue-400 font-medium">比較</span>
              <span className="hover:text-white cursor-pointer" onClick={() => showToast('導入事例ページ（デモ）', 'info')}>導入事例</span>
              <span className="hover:text-white cursor-pointer" onClick={() => showToast('サポートページ（デモ）', 'info')}>サポート</span>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input type="text" placeholder="製品を検索" className="bg-[#1a1d28] border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 w-44 focus:outline-none focus:border-blue-500" />
              <svg className="w-4 h-4 text-gray-500 absolute right-2.5 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <button onClick={() => showToast('製品ページ（デモ）', 'info')} className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors">製品を見る</button>
          </div>
        </div>
      </header>

      {/* ─── Breadcrumb ─── */}
      <div className="px-6 py-2 text-[11px] text-gray-500 border-b border-gray-800/50">
        <span className="hover:text-gray-300 cursor-pointer" onClick={() => showToast('ホームページ（デモ）', 'info')}>ホーム</span>
        {' > '}
        <span className="hover:text-gray-300 cursor-pointer" onClick={() => showToast('データ分析ページ（デモ）', 'info')}>データ分析</span>
        {' > '}
        <span className="text-gray-300">走行データ比較</span>
      </div>

      {/* ─── Main Content ─── */}
      <div className="flex">
        <div className="flex-1 px-6 py-5 space-y-5 max-w-[calc(100%-320px)]">
          {/* Title row */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">走行データ比較</h2>
              <p className="text-sm text-gray-400 mt-1">2 つのラップを比較して、速さの違いを可視化します。</p>
              <div className="flex items-center gap-3 mt-3">
                <button onClick={() => setShowTutorial(true)} className="border border-gray-600 text-gray-300 text-xs px-4 py-1.5 rounded-full hover:bg-gray-800 transition-colors">使い方を見る &gt;</button>
                <button onClick={() => setShowTutorial(true)} className="border border-gray-600 text-gray-300 text-xs px-4 py-1.5 rounded-full hover:bg-gray-800 transition-colors flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  チュートリアル
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleExportPDF} className="flex items-center gap-2 border border-gray-600 text-gray-300 text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                レポート出力
              </button>
              <button onClick={handleCopyLink} className="flex items-center gap-2 border border-gray-600 text-gray-300 text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                共有リンクをコピー
              </button>
            </div>
          </div>

          {/* ─── Filters ─── */}
          <div className="bg-[#111422] border border-gray-800 rounded-xl p-4">
            <div className="grid grid-cols-6 gap-3">
              <SelectField label="コース" value={filterCourse} options={FILTER_OPTIONS['コース']} onChange={setFilterCourse} icon={<span className="text-xs">&#x1F3C1;</span>} />
              <SelectField label="日付" value={filterDate} options={FILTER_OPTIONS['日付']} onChange={setFilterDate} icon={<svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
              <SelectField label="ドライバー" value={filterDriver} options={FILTER_OPTIONS['ドライバー']} onChange={setFilterDriver} />
              <SelectField label="車両" value={filterCar} options={FILTER_OPTIONS['車両']} onChange={setFilterCar} />
              <SelectField label="タイヤ" value={filterTire} options={FILTER_OPTIONS['タイヤ']} onChange={setFilterTire} />
              <SelectField label="天候 / 路面" value={filterWeather} options={FILTER_OPTIONS['天候 / 路面']} onChange={setFilterWeather} />
            </div>
          </div>

          {/* ─── Lap Selector ─── */}
          <div className="bg-[#111422] border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 cursor-pointer" onClick={() => setShowLapPicker('A')}>
                <div className="text-[10px] text-blue-400 font-medium mb-1.5">比較ラップ A（ベストラップ）&#9733;</div>
                <div className="bg-[#0d1020] border border-blue-500/30 rounded-lg px-4 py-3 flex items-center gap-3 hover:border-blue-500/60 transition-colors">
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="text-2xl font-bold text-white tracking-tight font-mono">{selectedLapA.time}</span>
                  <span className="text-[10px] text-gray-500 ml-2">{selectedLapA.date}</span>
                  <svg className="w-3 h-3 text-gray-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
              <div className="text-gray-500 font-bold text-lg mt-5">VS</div>
              <div className="flex-1 cursor-pointer" onClick={() => setShowLapPicker('B')}>
                <div className="text-[10px] text-red-400 font-medium mb-1.5">比較ラップ B（ターゲットラップ）</div>
                <div className="bg-[#0d1020] border border-red-500/30 rounded-lg px-4 py-3 flex items-center gap-3 hover:border-red-500/60 transition-colors">
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="text-2xl font-bold text-white tracking-tight font-mono">{selectedLapB.time}</span>
                  <span className="text-[10px] text-gray-500 ml-2">{selectedLapB.date}</span>
                  <svg className="w-3 h-3 text-gray-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
              <div className="mt-5 text-center min-w-[100px]">
                <div className="text-[10px] text-gray-500 mb-1">ラップ差</div>
                <div className="text-3xl font-bold text-yellow-400 font-mono">{lapDiff.value}</div>
                <div className="text-[11px] text-gray-500">{lapDiff.pct}</div>
              </div>
              <div className="flex flex-col gap-2 mt-5">
                <button onClick={() => setShowLapPicker('A')} className="border border-gray-600 text-gray-300 text-xs px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors whitespace-nowrap">ラップを選択</button>
                <button onClick={handleClearLaps} className="border border-gray-600 text-gray-300 text-xs px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">クリア</button>
              </div>
            </div>
          </div>

          {/* ─── Graphs + Course Map ─── */}
          <div className="grid grid-cols-[1fr_340px] gap-5">
            <div className="bg-[#111422] border border-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-1 mb-3">
                {GRAPH_TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveGraphTab(tab)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                      activeGraphTab === tab ? 'bg-green-500 text-white font-medium' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <TelemetryChart tab={activeGraphTab} />
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <span>グラフを同期</span>
                  <button
                    onClick={() => { setSyncGraph(!syncGraph); showToast(syncGraph ? 'グラフ同期をOFFにしました' : 'グラフ同期をONにしました', 'info'); }}
                    className={`w-9 h-5 rounded-full transition-colors relative ${syncGraph ? 'bg-blue-500' : 'bg-gray-600'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${syncGraph ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                </label>
              </div>
            </div>
            <div className="bg-[#111422] border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-3">コースマップ（セクター）</h3>
              <CourseMap highlightSector={highlightSector} onSectorClick={handleSectorClick} />
            </div>
          </div>

          {/* ─── Metrics Cards ─── */}
          <div className="grid grid-cols-6 gap-3">
            {METRICS.map((m, i) => (
              <div key={i} className="bg-[#111422] border border-gray-800 rounded-xl p-3.5 text-center hover:border-gray-600 transition-colors cursor-default group">
                <div className="text-[11px] text-gray-500 mb-2 group-hover:text-gray-300 transition-colors">{m.label}</div>
                {i === 0 ? (
                  <>
                    <div className="text-sm">
                      <span className="text-blue-400 font-medium">A</span> <span className="text-red-400 font-bold">{m.valueA}</span>
                      <span className="text-gray-500 mx-1.5">/</span>
                      <span className="text-yellow-400 font-medium">{m.diff}</span>
                    </div>
                    <div className="text-sm mt-0.5">
                      <span className="text-blue-400 font-medium">B</span> <span className="text-white font-bold">{m.valueB}</span>
                      <span className="text-gray-500 ml-2 text-xs">{m.diffSub}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xl font-bold text-white">{m.valueA} <span className="text-xs text-gray-500 font-normal">{m.unit}</span></div>
                    <div className="text-[11px] text-gray-500 mt-1">A {m.valueA} / B {m.valueB}</div>
                    <div className="text-xs text-emerald-400 font-medium mt-0.5">{m.diff}</div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* ─── Sector Table + Onboard Video ─── */}
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-[#111422] border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-300">セクター比較</h3>
                <button onClick={() => setShowSectorInfo(true)}>
                  <svg className="w-4 h-4 text-gray-500 hover:text-gray-300 cursor-pointer transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-gray-500 border-b border-gray-700/50">
                    <th className="text-left py-2 font-normal">セクター</th>
                    <th className="text-right py-2 font-normal text-blue-400">ラップA</th>
                    <th className="text-right py-2 font-normal text-red-400">ラップB</th>
                    <th className="text-right py-2 font-normal">差</th>
                    <th className="text-right py-2 font-normal">差 (%)</th>
                    <th className="text-center py-2 font-normal">ベスト履歴</th>
                  </tr>
                </thead>
                <tbody>
                  {SECTOR_DATA.map((s, i) => (
                    <tr
                      key={i}
                      className={`border-b border-gray-800/50 cursor-pointer transition-colors ${highlightSector === i + 1 ? 'bg-blue-500/10' : 'hover:bg-gray-800/30'}`}
                      onClick={() => handleSectorClick(i + 1)}
                    >
                      <td className="py-2.5 text-gray-300">{s.sector}</td>
                      <td className="py-2.5 text-right text-white font-mono">{s.lapA}</td>
                      <td className="py-2.5 text-right text-gray-300 font-mono">{s.lapB}</td>
                      <td className="py-2.5 text-right text-yellow-400 font-mono">{s.diff}</td>
                      <td className="py-2.5 text-right text-yellow-400">{s.diffPct}</td>
                      <td className="py-2.5 text-center">{s.best ? <span className="text-yellow-400">&#9733;</span> : ''}</td>
                    </tr>
                  ))}
                  <tr className="font-medium">
                    <td className="py-2.5 text-gray-300">ラップタイム</td>
                    <td className="py-2.5 text-right text-white font-mono">{selectedLapA.time}</td>
                    <td className="py-2.5 text-right text-gray-300 font-mono">{selectedLapB.time}</td>
                    <td className="py-2.5 text-right text-yellow-400 font-mono">{lapDiff.value}</td>
                    <td className="py-2.5 text-right text-yellow-400">+{lapDiff.pct}</td>
                    <td className="py-2.5 text-center text-blue-400">A</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-[#111422] border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-3">オンボード映像（同期）</h3>
              <div className="grid grid-cols-2 gap-3">
                <VideoPlayer label="ラップA" color="blue" speed={videoSpeed} externalTime={syncVideo ? videoTimeB : undefined} onTimeUpdate={setVideoTimeA} />
                <VideoPlayer label="ラップB" color="red" speed={videoSpeed} externalTime={syncVideo ? videoTimeA : undefined} onTimeUpdate={setVideoTimeB} />
              </div>
              <div className="flex items-center justify-between mt-3">
                <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={syncVideo}
                    onChange={() => { setSyncVideo(!syncVideo); showToast(syncVideo ? '映像同期をOFFにしました' : '映像同期をONにしました', 'info'); }}
                    className="rounded border-gray-600 accent-blue-500"
                  />
                  映像を同期
                </label>
                <div className="flex gap-1">
                  {['0.5x', '1x', '2x'].map(s => (
                    <button
                      key={s}
                      onClick={() => setVideoSpeed(s)}
                      className={`text-[10px] px-2.5 py-1 rounded-md transition-colors ${
                        videoSpeed === s ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ─── Notes + Actions ─── */}
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-[#111422] border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-300">メモ / コメント</h3>
                <button
                  onClick={() => {
                    if (editingNotes) showToast('メモを保存しました', 'success');
                    setEditingNotes(!editingNotes);
                  }}
                  className={`flex items-center gap-1.5 border text-xs px-3 py-1 rounded-lg transition-colors ${
                    editingNotes ? 'border-blue-500 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20' : 'border-gray-600 text-gray-400 hover:bg-gray-800'
                  }`}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  {editingNotes ? '保存' : '編集'}
                </button>
              </div>
              {editingNotes ? (
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  className="w-full h-24 bg-[#0d1020] border border-gray-600 rounded-lg p-3 text-sm text-gray-200 resize-none focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              ) : (
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{noteText}</p>
              )}
              <p className="text-[10px] text-gray-600 mt-3">最終更新：2024/05/18 10:35　{filterDriver}</p>
            </div>

            <div className="bg-[#111422] border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-3">アクション</h3>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleExportPDF} className="flex items-center justify-center gap-2 border border-gray-600 text-gray-300 text-sm py-2.5 rounded-lg hover:bg-gray-800 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  レポート出力（PDF）
                </button>
                <button onClick={handleExportCSV} className="flex items-center justify-center gap-2 border border-gray-600 text-gray-300 text-sm py-2.5 rounded-lg hover:bg-gray-800 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  データをエクスポート（CSV）
                </button>
                <button onClick={() => { setShowSavedComparison(true); showToast('この比較を保存しました', 'success'); }} className="flex items-center justify-center gap-2 border border-gray-600 text-gray-300 text-sm py-2.5 rounded-lg hover:bg-gray-800 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                  この比較を保存
                </button>
                <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm py-2.5 rounded-lg hover:bg-red-500/20 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  比較を削除
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Right Sidebar ─── */}
        <aside className="w-[320px] border-l border-gray-800 bg-[#0d1019] px-4 py-5 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 100px)', position: 'sticky', top: 100 }}>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAddSession(true)} className="flex-1 flex items-center justify-center gap-1.5 bg-blue-500 text-white text-xs py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors">
              + セッションを追加
            </button>
          </div>

          <div>
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">保存済みセッション</h3>
            <div className="space-y-2">
              {(showAllSessions ? SAVED_SESSIONS : SAVED_SESSIONS.slice(0, 3)).map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    setSelectedSessionId(s.id);
                    setFilterCourse(s.circuit.includes('富士') ? '富士 富士スピードウェイ' : s.circuit);
                    setFilterDate(s.date);
                    showToast(`${s.circuit} のセッションを読み込みました`, 'info');
                  }}
                  className={`border rounded-xl p-3 cursor-pointer transition-all ${selectedSessionId === s.id ? 'bg-[#111a2e] border-blue-500/30 shadow-lg shadow-blue-500/5' : 'bg-[#111422] border-gray-800 hover:border-gray-600'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">&#x1F3C1;</span>
                      <span className="text-sm font-medium text-white">{s.circuit}</span>
                    </div>
                    <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1 ml-6">{s.date} {'\u2022'} {s.car}</div>
                  <div className="flex items-center gap-3 mt-1.5 ml-6">
                    <span className="text-xs text-gray-300 font-mono">{s.best}</span>
                    <span className="text-[10px] text-gray-500">周回 {s.laps}</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowAllSessions(!showAllSessions)}
              className="w-full text-center text-xs text-gray-500 mt-3 py-2 border border-gray-800 rounded-lg hover:bg-gray-800/50 transition-colors"
            >
              {showAllSessions ? '折りたたむ' : `すべてのセッションを見る (${SAVED_SESSIONS.length})`}
            </button>
          </div>

          <div>
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">お気に入りラップ</h3>
            <div className="space-y-2">
              {FAVORITE_LAPS.map((f, i) => (
                <div
                  key={i}
                  onClick={() => {
                    const matchedLap = AVAILABLE_LAPS.find(l => l.time === f.time);
                    if (matchedLap) {
                      setSelectedLapA(matchedLap);
                      showToast(`ラップ A を ${f.time} に設定しました`, 'info');
                    } else {
                      showToast(`${f.circuit} ${f.time} を選択しました`, 'info');
                    }
                  }}
                  className="flex items-center gap-3 bg-[#111422] border border-gray-800 rounded-xl p-3 cursor-pointer hover:border-gray-600 hover:bg-[#151830] transition-colors"
                >
                  <span className="text-yellow-400 text-sm">&#x1F3C6;</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{f.circuit}</div>
                    <div className="text-[10px] text-gray-500">{f.date}</div>
                  </div>
                  <span className="text-red-400 font-bold font-mono text-sm">{f.time}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* ─── Footer ─── */}
      <footer className="bg-[#0a0d14] border-t border-gray-800 mt-8 px-6 py-8">
        <div className="grid grid-cols-5 gap-8">
          <div>
            <h2 className="text-lg font-bold italic text-white mb-1">TrackSync</h2>
            <p className="text-[10px] text-gray-600">&copy; 2024 TrackSync. All Rights Reserved.</p>
          </div>
          {[
            { title: '製品', items: ['データロガー', 'アクセサリー', 'ソフトウェア'] },
            { title: 'サポート', items: ['ダウンロード', 'マニュアル', 'よくある質問', 'お問い合わせ'] },
            { title: '会社情報', items: ['会社概要', '特定商取引法に基づく表記', 'プライバシーポリシー', '利用規約'] },
          ].map(col => (
            <div key={col.title}>
              <h4 className="text-xs font-medium text-gray-400 mb-3">{col.title}</h4>
              <div className="space-y-1.5 text-xs text-gray-500">
                {col.items.map(item => (
                  <div key={item} className="hover:text-gray-300 cursor-pointer" onClick={() => showToast(`${item}（デモ）`, 'info')}>{item}</div>
                ))}
              </div>
            </div>
          ))}
          <div>
            <h4 className="text-xs font-medium text-gray-400 mb-3">ニュースレター</h4>
            <p className="text-[10px] text-gray-500 mb-2">最新情報やアップデートをお届けします。</p>
            <form onSubmit={e => { e.preventDefault(); const input = e.currentTarget.querySelector('input'); if (input?.value) { showToast(`${input.value} を登録しました`, 'success'); input.value = ''; } else { showToast('メールアドレスを入力してください', 'error'); } }} className="flex gap-1.5">
              <input type="email" placeholder="メールアドレスを入力" className="bg-[#1a1d28] border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300 flex-1 focus:outline-none focus:border-blue-500" />
              <button type="submit" className="bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-colors">登録する</button>
            </form>
          </div>
        </div>
      </footer>

      {/* ─── Modals ─── */}

      {/* Lap Picker */}
      {showLapPicker && (
        <Modal title={`比較ラップ ${showLapPicker} を選択`} onClose={() => setShowLapPicker(null)} width="max-w-md">
          <div className="space-y-2">
            {AVAILABLE_LAPS.map(lap => {
              const isSelected = showLapPicker === 'A' ? selectedLapA.id === lap.id : selectedLapB.id === lap.id;
              const isOtherSelected = showLapPicker === 'A' ? selectedLapB.id === lap.id : selectedLapA.id === lap.id;
              return (
                <button
                  key={lap.id}
                  onClick={() => {
                    if (showLapPicker === 'A') setSelectedLapA(lap);
                    else setSelectedLapB(lap);
                    setShowLapPicker(null);
                    showToast(`ラップ ${showLapPicker} を ${lap.time} に変更しました`, 'success');
                  }}
                  disabled={isOtherSelected}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors text-left ${
                    isSelected ? 'bg-blue-500/20 border border-blue-500/40' :
                    isOtherSelected ? 'opacity-40 cursor-not-allowed border border-gray-800' :
                    'border border-gray-700 hover:bg-gray-800/50 hover:border-gray-500'
                  }`}
                >
                  <span className="text-xl font-bold font-mono text-white">{lap.time}</span>
                  <span className="text-xs text-gray-400">{lap.date}</span>
                  {lap.label && <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">{lap.label}</span>}
                  {isSelected && <span className="ml-auto text-blue-400 text-sm">&#10003;</span>}
                  {isOtherSelected && <span className="ml-auto text-gray-500 text-[10px]">ラップ {showLapPicker === 'A' ? 'B' : 'A'} で選択中</span>}
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {/* Tutorial */}
      {showTutorial && (
        <Modal title="走行データ比較の使い方" onClose={() => setShowTutorial(false)} width="max-w-xl">
          <div className="space-y-4 text-sm text-gray-300">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">1</span>
              <div><strong className="text-white">セッションを選択</strong><br />右サイドバーから比較したいセッションを選択します。</div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">2</span>
              <div><strong className="text-white">ラップを選択</strong><br />比較したい2つのラップ（A / B）を選びます。ベストラップは自動で設定されます。</div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">3</span>
              <div><strong className="text-white">データを分析</strong><br />速度・スロットル・ブレーキなどのグラフを切り替えて、各セクターの差を確認します。</div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">4</span>
              <div><strong className="text-white">映像を同期再生</strong><br />2つのオンボード映像を同期再生し、視覚的にドライビングの違いを比較できます。</div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">5</span>
              <div><strong className="text-white">レポート出力</strong><br />分析結果をPDFまたはCSVでエクスポートし、チームと共有できます。</div>
            </div>
          </div>
          <button onClick={() => setShowTutorial(false)} className="mt-5 w-full bg-blue-500 text-white py-2.5 rounded-lg font-medium hover:bg-blue-600 transition-colors">閉じる</button>
        </Modal>
      )}

      {/* Add Session */}
      {showAddSession && (
        <Modal title="セッションを追加" onClose={() => setShowAddSession(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">コース名</label>
              <input type="text" placeholder="例: 富士スピードウェイ" className="w-full bg-[#0d1020] border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">日付</label>
                <input type="date" className="w-full bg-[#0d1020] border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">車両</label>
                <input type="text" placeholder="例: Porsche 911 GT3" className="w-full bg-[#0d1020] border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">テレメトリーファイル</label>
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-blue-500/50 transition-colors cursor-pointer">
                <svg className="w-8 h-8 text-gray-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                <p className="text-xs text-gray-400">ファイルをドラッグ&ドロップ<br />または <span className="text-blue-400">クリックして選択</span></p>
                <p className="text-[10px] text-gray-600 mt-1">.csv, .vbo, .ld 形式対応</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAddSession(false)} className="flex-1 border border-gray-600 text-gray-300 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm">キャンセル</button>
              <button onClick={() => { setShowAddSession(false); showToast('セッションを追加しました', 'success'); }} className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">追加する</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <Modal title="比較を削除" onClose={() => setShowDeleteConfirm(false)} width="max-w-sm">
          <p className="text-sm text-gray-300 mb-1">この比較データを削除しますか？</p>
          <p className="text-xs text-gray-500 mb-5">この操作は取り消せません。</p>
          <div className="flex gap-2">
            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 border border-gray-600 text-gray-300 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm">キャンセル</button>
            <button onClick={() => { setShowDeleteConfirm(false); handleClearLaps(); showToast('比較を削除しました', 'error'); }} className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium">削除する</button>
          </div>
        </Modal>
      )}

      {/* Sector Info */}
      {showSectorInfo && (
        <Modal title="セクター比較について" onClose={() => setShowSectorInfo(false)} width="max-w-md">
          <div className="text-sm text-gray-300 space-y-3">
            <p>セクター比較では、コースを3つの区間に分割し、各区間のタイム差を詳細に分析します。</p>
            <div className="bg-[#0d1020] rounded-lg p-3 space-y-2 text-xs">
              <div className="flex items-center gap-2"><span className="text-blue-400 font-bold">S1</span> スタート/フィニッシュ ～ 第1セクター終了</div>
              <div className="flex items-center gap-2"><span className="text-red-400 font-bold">S2</span> 第1セクター終了 ～ 第2セクター終了</div>
              <div className="flex items-center gap-2"><span className="text-green-400 font-bold">S3</span> 第2セクター終了 ～ スタート/フィニッシュ</div>
            </div>
            <p className="text-xs text-gray-500">&#9733; はそのセッション内のベストセクタータイムを示します。</p>
          </div>
          <button onClick={() => setShowSectorInfo(false)} className="mt-4 w-full bg-blue-500 text-white py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors text-sm">閉じる</button>
        </Modal>
      )}
    </div>
  );
};

export default TelemetryComparison;
