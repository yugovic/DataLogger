import type * as echarts from 'echarts';
import type { LatLon } from '../../lib/telemetry';
import { makeLocalProjection, type XY } from '../../lib/telemetry/geo';
import type { TrackMap, TrackMapCurb } from '../../lib/tracks';

export interface XYBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface TrackMapOverlay {
  series: echarts.SeriesOption[];
  bounds: XYBounds | null;
}

interface TrackMapOverlayOptions {
  darkMode: boolean;
  showLabels?: boolean;
}

type OverlayLabelPosition = 'top' | 'bottom' | 'left' | 'right';

interface OverlayLabelStyle {
  position: OverlayLabelPosition;
  distance: number;
  offset?: [number, number];
}

const CENTERLINE_COLOR = 'rgba(148,163,184,0.72)';
const BOUNDARY_LIGHT = 'rgba(55,65,81,0.42)';
const BOUNDARY_DARK = 'rgba(229,231,235,0.35)';
const KERB_COLOR = '#ef4444';
const SECTOR_COLOR = '#0ea5e9';
const CORNER_COLOR = '#111827';

export function buildTrackMapOverlay(
  trackMap: TrackMap | null | undefined,
  origin: LatLon,
  options: TrackMapOverlayOptions,
): TrackMapOverlay {
  if (!trackMap || trackMap.centerline.length < 2) return { series: [], bounds: null };

  const { toXY } = makeLocalProjection(origin);
  const center = trackMap.centerline.map((point) => ({
    ...toXY(point),
    distanceM: point.distanceM,
  }));
  const boundaries = buildGeneratedBoundaries(center, trackMap.widthM);
  const bounds = createBounds([...center, ...boundaries.left, ...boundaries.right]);
  const boundaryColor = options.darkMode ? BOUNDARY_DARK : BOUNDARY_LIGHT;

  const series: echarts.SeriesOption[] = [
    {
      name: 'コース中心線',
      type: 'line',
      data: center.map(toValue),
      showSymbol: false,
      silent: true,
      z: 1,
      lineStyle: { width: 1, color: CENTERLINE_COLOR, type: 'dashed' },
    },
    {
      name: 'コース境界',
      type: 'line',
      data: boundaries.left.map(toValue),
      showSymbol: false,
      silent: true,
      z: 2,
      lineStyle: { width: 1.4, color: boundaryColor },
    },
    {
      name: 'コース境界',
      type: 'line',
      data: boundaries.right.map(toValue),
      showSymbol: false,
      silent: true,
      z: 2,
      lineStyle: { width: 1.4, color: boundaryColor },
    },
  ];

  const curbPoints = buildCurbPolyline(center, boundaries, trackMap.curbs);
  if (curbPoints.length > 0) {
    series.push({
      name: '縁石',
      type: 'line',
      data: curbPoints,
      showSymbol: false,
      silent: true,
      z: 5,
      lineStyle: { width: 3, color: KERB_COLOR, opacity: 0.85 },
    });
  }

  if (options.showLabels !== false) {
    const sectorLabels = trackMap.sectors.flatMap((sector) => {
      const mid = pointAtDistance(center, (sector.startDistanceM + sector.endDistanceM) / 2);
      return mid
        ? [{
            name: sector.name,
            value: [mid.x, mid.y] as [number, number],
            label: sectorLabelStyle(sector.id),
          }]
        : [];
    });
    if (sectorLabels.length > 0) {
      series.push({
        name: 'セクター',
        type: 'scatter',
        data: sectorLabels,
        symbolSize: 0,
        silent: true,
        z: 8,
        label: {
          show: true,
          position: 'top',
          distance: 6,
          formatter: (params: echarts.DefaultLabelFormatterCallbackParams) => String(params.name ?? ''),
          color: '#fff',
          fontSize: 10,
          backgroundColor: options.darkMode ? 'rgba(14,165,233,0.72)' : 'rgba(2,132,199,0.74)',
          borderRadius: 4,
          padding: [2, 5],
        },
        itemStyle: { color: SECTOR_COLOR },
      });
    }

    const cornerLabels = trackMap.markers.flatMap((marker) => {
      const point = pointAtDistance(center, marker.distanceM);
      return point
        ? [{
            name: marker.name,
            value: [point.x, point.y] as [number, number],
            markerKind: marker.kind,
            label: markerLabelStyle(marker.id),
          }]
        : [];
    });
    if (cornerLabels.length > 0) {
      series.push({
        name: 'コーナー',
        type: 'scatter',
        data: cornerLabels,
        symbolSize: 5,
        silent: true,
        z: 9,
        label: {
          show: true,
          position: 'right',
          distance: 4,
          formatter: (params: echarts.DefaultLabelFormatterCallbackParams) => String(params.name ?? ''),
          color: options.darkMode ? '#e5e7eb' : '#111827',
          fontSize: 10,
          backgroundColor: options.darkMode ? 'rgba(17,24,39,0.78)' : 'rgba(255,255,255,0.82)',
          borderColor: options.darkMode ? 'rgba(148,163,184,0.36)' : 'rgba(148,163,184,0.45)',
          borderWidth: 1,
          borderRadius: 4,
          padding: [2, 4],
        },
        itemStyle: { color: options.darkMode ? '#f8fafc' : CORNER_COLOR },
      });
    }
  }

  return { series, bounds };
}

export function mergeBounds(bounds: readonly (XYBounds | null | undefined)[]): XYBounds | null {
  let merged: XYBounds | null = null;
  for (const bound of bounds) {
    if (!bound) continue;
    if (!merged) {
      merged = { ...bound };
      continue;
    }
    merged.minX = Math.min(merged.minX, bound.minX);
    merged.maxX = Math.max(merged.maxX, bound.maxX);
    merged.minY = Math.min(merged.minY, bound.minY);
    merged.maxY = Math.max(merged.maxY, bound.maxY);
  }
  return merged;
}

export function boundsFromPoints(points: readonly [number, number][]): XYBounds | null {
  return createBounds(points.map(([x, y]) => ({ x, y })));
}

interface CenterXY extends XY {
  distanceM: number;
}

function buildGeneratedBoundaries(center: readonly CenterXY[], widthM: number): { left: XY[]; right: XY[] } {
  const half = Math.max(1, widthM / 2);
  const left: XY[] = [];
  const right: XY[] = [];

  for (let i = 0; i < center.length; i++) {
    const prev = center[Math.max(0, i - 1)];
    const next = center[Math.min(center.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    left.push({ x: center[i].x + nx * half, y: center[i].y + ny * half });
    right.push({ x: center[i].x - nx * half, y: center[i].y - ny * half });
  }

  return { left, right };
}

function buildCurbPolyline(
  center: readonly CenterXY[],
  boundaries: { left: readonly XY[]; right: readonly XY[] },
  curbs: readonly TrackMapCurb[],
): [number, number][] {
  const points: [number, number][] = [];
  for (const curb of curbs) {
    if (curb.side === 'left' || curb.side === 'both') {
      appendRange(points, boundaries.left, center, curb.startDistanceM, curb.endDistanceM);
    }
    if (curb.side === 'right' || curb.side === 'both') {
      appendRange(points, boundaries.right, center, curb.startDistanceM, curb.endDistanceM);
    }
  }
  return points;
}

function appendRange(
  out: [number, number][],
  source: readonly XY[],
  center: readonly CenterXY[],
  startM: number,
  endM: number,
) {
  const start = pointAtDistanceOnPolyline(source, center, startM);
  const end = pointAtDistanceOnPolyline(source, center, endM);
  const interior = source.filter((_, i) => center[i].distanceM > startM && center[i].distanceM < endM);
  const segment = [start, ...interior, end].filter((point): point is XY => point !== null);
  if (segment.length < 2) return;
  if (out.length > 0) out.push([Number.NaN, Number.NaN]);
  out.push(...segment.map(toValue));
}

function pointAtDistance(center: readonly CenterXY[], distanceM: number): XY | null {
  return pointAtDistanceOnPolyline(center, center, distanceM);
}

function pointAtDistanceOnPolyline(points: readonly XY[], center: readonly CenterXY[], distanceM: number): XY | null {
  if (points.length === 0 || points.length !== center.length) return null;
  if (distanceM <= center[0].distanceM) return points[0];
  const last = center[center.length - 1];
  if (distanceM >= last.distanceM) return points[points.length - 1];

  for (let i = 1; i < center.length; i++) {
    const prev = center[i - 1];
    const next = center[i];
    if (next.distanceM < distanceM) continue;
    const span = next.distanceM - prev.distanceM;
    if (span <= 0) return points[i];
    const t = (distanceM - prev.distanceM) / span;
    return {
      x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
      y: points[i - 1].y + (points[i].y - points[i - 1].y) * t,
    };
  }
  return points[points.length - 1];
}

function createBounds(points: readonly XY[]): XYBounds | null {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;
  }
  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
    return null;
  }
  return { minX, maxX, minY, maxY };
}

function sectorLabelStyle(id: string): OverlayLabelStyle {
  switch (id) {
    case 's1':
      return { position: 'top', distance: 14, offset: [-42, -4] };
    case 's2':
      return { position: 'bottom', distance: 8, offset: [-6, 4] };
    case 's3':
      return { position: 'top', distance: 10, offset: [-18, 0] };
    case 's4':
      return { position: 'top', distance: 12, offset: [10, -2] };
    default:
      return { position: 'top', distance: 6 };
  }
}

function markerLabelStyle(id: string): OverlayLabelStyle {
  switch (id) {
    case 'turn-1':
      return { position: 'top', distance: 10, offset: [6, -2] };
    case 'turn-2':
      return { position: 'bottom', distance: 10, offset: [10, 4] };
    case 's-curves':
      return { position: 'top', distance: 8, offset: [6, -2] };
    case 'gyaku-bank':
      return { position: 'top', distance: 8, offset: [8, -2] };
    case 'degner':
      return { position: 'bottom', distance: 8, offset: [-12, 4] };
    case 'hairpin':
      return { position: 'top', distance: 8, offset: [10, -2] };
    case 'one-thirty-r':
      return { position: 'bottom', distance: 8, offset: [-8, 4] };
    case 'chicane':
      return { position: 'top', distance: 8, offset: [8, -2] };
    case 'final-corner':
      return { position: 'top', distance: 8, offset: [12, -2] };
    default:
      return { position: 'right', distance: 4 };
  }
}

function toValue(point: XY): [number, number] {
  return [point.x, point.y];
}
