// The exported code uses Tailwind CSS. Install Tailwind CSS in your dev environment to ensure all styles work.
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { AutoComplete, Input, InputNumber, Tabs, message, Modal, Select, Tooltip } from 'antd';
import { StepNumber } from './src/components/common/StepNumber';
import { ReloadOutlined } from '@ant-design/icons';
import { useAuth } from './src/contexts/AuthContext';
import { saveSetup, getUserSetups, getUserSetupsForTireUsage, getSetup, updateSetup, getSetupsByCarModel, deleteSetup } from './src/services/setupService';
import { getUserVehicles, addVehicle, updateVehicle } from './src/services/vehicleService';
import type { Vehicle } from './src/types/vehicle';
import type { CarSetup as CarSetupType, LapTime, WeatherType, SetupTelemetryRefs, DrivingFeedback } from './src/types/setup';
import {
  useSetupDraft,
  setupToDraft,
  copySetupToDraft,
  inheritSetupSettings,
  draftToSetupInput,
  emptyTelemetryRefs,
  createEmptyDraft,
  serializeDraft,
  isDraftDirty,
} from './src/lib/setupDraft';
import type { SetupDraft } from './src/lib/setupDraft';
import { buildCopyPath, buildSetupPath, isNewSave as computeIsNewSave } from './src/lib/setupNavigation';
import {
  suspensionConstraintsFromConfig,
  alignmentConstraintsFromConfig,
} from './src/lib/vehicleSetupConstraints';
import { buildDuplicatePreview, buildInheritPreview } from './src/lib/setupLoadPreview';
import { useUnsavedChangesGuard } from './src/hooks/useUnsavedChangesGuard';
import { findVehicleByCarModel, splitCarModel } from './src/lib/vehicleRegistration';
import { checkFirestoreConnection } from './src/utils/initFirestore';
import { BasicInfoTab } from './src/components/setup/tabs/BasicInfoTab';
import { SuspensionTab } from './src/components/setup/tabs/SuspensionTab';
import { AlignmentTab } from './src/components/setup/tabs/AlignmentTab';
import { DrivingTab } from './src/components/setup/tabs/DrivingTab';
import { VehicleAdjustmentsTab } from './src/components/setup/tabs/VehicleAdjustmentsTab';
import { DynamicSetupTab } from './src/components/setup/tabs/DynamicSetupTab';
import {
  activeAdjustmentDefinitions,
  adjustmentDefinitionsFromValues,
  reconcileAdjustmentValues,
  setAdjustmentValue,
} from './src/lib/setupAdjustments';
import { LapTimeModal } from './src/components/setup/modals/LapTimeModal';
import { SessionHighlightModal } from './src/components/setup/SessionHighlightModal';
import { computeSessionHighlight } from './src/lib/sessionHighlights';
import type { SessionHighlight } from './src/lib/sessionHighlights';
import { TelemetryImport } from './src/components/telemetry/TelemetryImport';
import { EvidenceBadge } from './src/components/telemetry/EvidenceBadge';
import type { LapAttachPayload } from './src/components/telemetry/evidence';
import type { TelemetryImportResult } from './src/components/telemetry/useTelemetryImport';
import { Header } from './src/components/common/Header';
import { buildTelemetryTraceFromImport } from './src/lib/telemetry';
import { saveTelemetryTrace, getComparableTraceCandidates } from './src/services/telemetryTraceService';
import type { ComparableTraceCandidate } from './src/services/telemetryTraceService';
import logger from './src/utils/logger';
import { getUserTireSets } from './src/services/tireSetService';
import { calculateTireSetUsage } from './src/lib/tireSetUsage';
import { TIRE_PRODUCT_CATALOG } from './src/lib/tireCatalog';
import type { TireSet } from './src/types/tire';
import { useTranslation } from 'react-i18next';
import { useLocale } from './src/contexts/LocaleContext';
import { formatDateTime } from './src/i18n/formatters';
import { WEATHER_CODES } from './src/lib/weather';
import { trackEvent } from './src/lib/analytics';
interface DropdownState {
isOpen: boolean;
position: { top: number; left: number };
currentInput: string;
options: { value: string; label: string }[];
}
// datetime-local入力用: ローカル時刻で YYYY-MM-DDTHH:mm に整形（toISOStringはUTCになるため使用不可）
const toLocalDatetimeInput = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const mergeTraceRef = (current: SetupTelemetryRefs, traceId: string): SetupTelemetryRefs => ({
  traceIds: Array.from(new Set([traceId, ...current.traceIds])),
  primaryTraceId: traceId,
  importStatus: 'trace_saved',
});

const App: React.FC = () => {
const { currentUser } = useAuth();
const { t } = useTranslation(['common', 'setup']);
const { locale } = useLocale();
const { id: setupId } = useParams<{ id: string }>();
const location = useLocation();
const navigate = useNavigate();
const searchParams = new URLSearchParams(location.search);
const copyId = searchParams.get('copy');
const [isViewMode, setIsViewMode] = useState(false);
const [, setLoadingSetup] = useState(false);
const [vehicles, setVehicles] = useState<Vehicle[]>([]);
const [tireSets, setTireSets] = useState<TireSet[]>([]);
const [tireUsageSetups, setTireUsageSetups] = useState<CarSetupType[]>([]);
// 自由入力は例外導線。ユーザーが明示的に選んだ場合だけ入力欄を開く。
const [manualVehicleEntry, setManualVehicleEntry] = useState(false);
const setupStartedTrackedRef = useRef(false);

useEffect(() => {
  if (setupId || setupStartedTrackedRef.current) return;
  setupStartedTrackedRef.current = true;
  void trackEvent('setup_started', { source: copyId ? 'copy' : 'new' });
}, [setupId, copyId]);

// Firestore接続確認
useEffect(() => {
  if (currentUser) {
    checkFirestoreConnection(currentUser.uid).then(success => {
      if (!success) {
        logger.error('Firestore connection check failed');
      }
    });
  }
}, [currentUser]);

useEffect(() => {
  if (!currentUser) return;
  getUserTireSets(currentUser.uid).then(async (nextTireSets) => {
    setTireSets(nextTireSets);
    if (nextTireSets.length > 0) {
      setTireUsageSetups(await getUserSetupsForTireUsage(currentUser.uid));
    } else {
      setTireUsageSetups([]);
    }
  }).catch((error) => logger.error('Failed to fetch tire sets:', error));
}, [currentUser]);

// 登録車両を取得（プルダウン候補として使用）。
// 過去のセットアップから車両を自動作成しない。未登録車種は保存時にユーザーへ確認する。
useEffect(() => {
  if (!currentUser) return;
  getUserVehicles(currentUser.uid)
    .then(setVehicles)
    .catch(e => logger.error('Failed to fetch vehicles:', e));
}, [currentUser]);
const [isSaving, setIsSaving] = useState(false);
// 連打・保存中の再送信を同期的にブロックするガード（isSaving の setState 反映前でも効く）
const savingRef = useRef(false);
const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
const [isInheriting, setIsInheriting] = useState(false);
// 読込導線の実行前プレビュー（複製 / 引き継ぎ）。確認するまで draft は書き換えない。
const [pendingLoad, setPendingLoad] = useState<{ kind: 'duplicate' | 'inherit'; source: CarSetupType } | null>(null);
// 複製元セレクタ（WP: 直近1件固定から、直近10件までの候補選択に拡張）
const [pickerOpen, setPickerOpen] = useState(false);
const [pickerLoading, setPickerLoading] = useState(false);
const [pickerList, setPickerList] = useState<CarSetupType[]>([]);
const [isDeleting, setIsDeleting] = useState(false);
type VehicleRegistrationChoice = 'register' | 'without' | 'cancel';
const [vehicleRegistrationPrompt, setVehicleRegistrationPrompt] = useState<{
  candidate: ReturnType<typeof splitCarModel>;
  inactiveVehicle: Vehicle | null;
} | null>(null);
const [registrationYear, setRegistrationYear] = useState(new Date().getFullYear());
const vehicleRegistrationResolverRef = useRef<((choice: VehicleRegistrationChoice) => void) | null>(null);
const [settingsModal, setSettingsModal] = useState(false);
const [currentSettingView, setCurrentSettingView] = useState('account');
const [dropdownState, setDropdownState] = useState<DropdownState>({
isOpen: false,
position: { top: 0, left: 0 },
currentInput: '',
options: []
});
// canonical フォーム state（新規・読込・コピー・引き継ぎ・保存が同じ変換関数を通る）
// 初期 draft を保持し、未保存離脱ガードの基準スナップショットの初期値と一致させる。
const initialDraftRef = useRef<SetupDraft>(createEmptyDraft());
const { draft, setField, replaceDraft } = useSetupDraft(initialDraftRef.current);

// ── 未保存離脱ガード用のダーティ判定 ──────────────────────────────────
// 基準スナップショット（保存済み/読込直後の draft の直列化）。
// これと現在の draft が異なれば「未保存の変更あり」とみなす。
const baselineRef = useRef<string>(serializeDraft(initialDraftRef.current));
// blocker/beforeunload から同期的に読むため draft も ref で保持する。
const draftRef = useRef(draft);
draftRef.current = draft;
const [isDirty, setIsDirty] = useState(false);

// 基準スナップショットを更新し、クリーン状態に戻す（読込完了・保存成功時に呼ぶ）。
const resetBaseline = useCallback((d: SetupDraft) => {
  baselineRef.current = serializeDraft(d);
  setIsDirty(false);
}, []);

// draft が変わるたびにダーティ状態を再計算する。
useEffect(() => {
  setIsDirty(isDraftDirty(baselineRef.current, draft));
}, [draft]);

// 閲覧モードでは編集不可のため常にクリーン扱い。blocker は同期的にこれを読む。
const hasUnsavedChanges = useCallback(
  () => !isViewMode && isDraftDirty(baselineRef.current, draftRef.current),
  [isViewMode],
);

useUnsavedChangesGuard({
  hasUnsavedChanges,
  isDirty: isDirty && !isViewMode,
  enabled: !isViewMode,
});

// JSX からは従来どおりの変数名で参照する（draft を分解した読み取りビュー）
const {
  weatherCondition, bestLap, totalLaps, detailedLaps, sessionDate, driver,
  lapSource, lapEvidence, telemetryRefs,
  tirePressures, targetPressures,
  airTemp, trackTemp, humidity, pressure,
  tireBrand, tireProductName, tireCompound, tireSetId, tireHeatCyclesAdded, distance, fuel,
  frontTireSize, rearTireSize,
  frontDamperCompression, frontDamperRebound, rearDamperCompression, rearDamperRebound,
  frontSpringRate, rearSpringRate, frontRideHeight, rearRideHeight, frontStabilizer, rearStabilizer,
  frontCamber, rearCamber, frontToe, rearToe, caster,
  frontBrakePad, rearBrakePad, frontBrakeRotor, rearBrakeRotor, brakeBalance,
  frontAero, rearAero, ecuMap, boost,
  adjustmentValues,
  notes, knowledge, drivingFeedback,
  circuit, carModel, sessionType,
} = draft;
const selectedVehicleId = draft.vehicleId;

// 選択中の登録車両の setupConfig → フォーム表示制約（未選択・未設定なら制約なし）
const selectedVehicleSetupConfig = useMemo(
  () => vehicles.find((v) => v.id === selectedVehicleId)?.setupConfig ?? null,
  [vehicles, selectedVehicleId],
);
const selectedAdjustmentDefinitions = useMemo(() => {
  const configured = activeAdjustmentDefinitions(selectedVehicleSetupConfig?.adjustmentDefinitions);
  return configured.length > 0 ? configured : adjustmentDefinitionsFromValues(adjustmentValues);
}, [selectedVehicleSetupConfig, adjustmentValues]);
const usesDynamicSetup = selectedAdjustmentDefinitions.length > 0;
const displayedAdjustmentValues = useMemo(
  () => reconcileAdjustmentValues(selectedAdjustmentDefinitions, adjustmentValues),
  [selectedAdjustmentDefinitions, adjustmentValues],
);
const suspensionConstraints = useMemo(
  () => suspensionConstraintsFromConfig(selectedVehicleSetupConfig),
  [selectedVehicleSetupConfig],
);
const alignmentConstraints = useMemo(
  () => alignmentConstraintsFromConfig(selectedVehicleSetupConfig),
  [selectedVehicleSetupConfig],
);
const availableTireSets = useMemo(
  () => tireSets.filter((set) =>
    set.status !== 'retired' && (!set.primaryVehicleId || set.primaryVehicleId === selectedVehicleId),
  ),
  [tireSets, selectedVehicleId],
);
const selectedTireSet = useMemo(
  () => tireSets.find((set) => set.id === tireSetId) ?? null,
  [tireSets, tireSetId],
);
const selectedTireUsage = useMemo(
  () => selectedTireSet
    ? calculateTireSetUsage(selectedTireSet, tireUsageSetups.filter((setup) => setup.id !== setupId))
    : null,
  [selectedTireSet, tireUsageSetups, setupId],
);
const tireSetOptions = useMemo(() => {
  const options = [...availableTireSets];
  if (selectedTireSet && !options.some((set) => set.id === selectedTireSet.id)) options.push(selectedTireSet);
  return options.map((set) => ({
    value: set.id as string,
    label: `${set.code} / ${set.manufacturer} ${set.productName}${set.compound ? ` / ${set.compound}` : ''}`,
  }));
}, [availableTireSets, selectedTireSet]);
const tireManufacturerOptions = useMemo(() => Array.from(new Set([
  ...TIRE_PRODUCT_CATALOG.map((entry) => entry.manufacturer),
  ...tireSets.map((set) => set.manufacturer),
  ...tireUsageSetups.map((setup) => setup.tireInfo.manufacturer ?? setup.tireInfo.brand),
].filter(Boolean))).map((value) => ({ value })), [tireSets, tireUsageSetups]);
const tireProductOptions = useMemo(() => Array.from(new Set([
  ...TIRE_PRODUCT_CATALOG
    .filter((entry) => !tireBrand || entry.manufacturer === tireBrand)
    .map((entry) => entry.productName),
  ...tireSets
    .filter((set) => !tireBrand || set.manufacturer === tireBrand)
    .map((set) => set.productName),
  ...tireUsageSetups
    .filter((setup) => !tireBrand || (setup.tireInfo.manufacturer ?? setup.tireInfo.brand) === tireBrand)
    .map((setup) => setup.tireInfo.productName ?? ''),
].filter(Boolean))).map((value) => ({ value })), [tireBrand, tireSets, tireUsageSetups]);
const tireCompoundOptions = useMemo(() => Array.from(new Set([
  ...tireSets
    .filter((set) => !tireProductName || set.productName === tireProductName)
    .map((set) => set.compound),
  ...tireUsageSetups
    .filter((setup) => !tireProductName || setup.tireInfo.productName === tireProductName)
    .map((setup) => setup.tireInfo.compound),
].filter(Boolean))).map((value) => ({ value })), [tireProductName, tireSets, tireUsageSetups]);

// draft フィールド用のセッター（value に関数を渡すと functional update）。
// これらを通すことで、全項目が単一の canonical state に集約される。
const setWeatherCondition = (v: WeatherType | '') => setField('weatherCondition', v);
const setBestLap = (v: string) => setField('bestLap', v);
const setTotalLaps = (v: string) => setField('totalLaps', v);
const setDetailedLaps = (v: LapTime[]) => setField('detailedLaps', v);
const setSessionDate = (v: Date) => setField('sessionDate', v);
const setDriver = (v: string) => setField('driver', v);
const setLapSource = setField.bind(null, 'lapSource') as (v: typeof draft.lapSource) => void;
const setLapEvidence = setField.bind(null, 'lapEvidence') as (v: typeof draft.lapEvidence) => void;
const setTelemetryRefs = (v: SetupTelemetryRefs | ((prev: SetupTelemetryRefs) => SetupTelemetryRefs)) => setField('telemetryRefs', v);
const setTirePressures = (v: typeof draft.tirePressures | ((prev: typeof draft.tirePressures) => typeof draft.tirePressures)) => setField('tirePressures', v);
const setTargetPressures = (v: typeof draft.targetPressures | ((prev: typeof draft.targetPressures) => typeof draft.targetPressures)) => setField('targetPressures', v);
const setAirTemp = (v: string) => setField('airTemp', v);
const setTrackTemp = (v: string) => setField('trackTemp', v);
const setHumidity = (v: string) => setField('humidity', v);
const setPressure = (v: string) => setField('pressure', v);
const setTireBrand = (v: string) => setField('tireBrand', v);
const setTireProductName = (v: string) => setField('tireProductName', v);
const setTireCompound = (v: string) => setField('tireCompound', v);
const setDistance = (v: string) => setField('distance', v);
const setFuel = (v: string) => setField('fuel', v);
const setFrontDamperCompression = (v: number | null) => setField('frontDamperCompression', v);
const setFrontDamperRebound = (v: number | null) => setField('frontDamperRebound', v);
const setRearDamperCompression = (v: number | null) => setField('rearDamperCompression', v);
const setRearDamperRebound = (v: number | null) => setField('rearDamperRebound', v);
const setFrontSpringRate = (v: string) => setField('frontSpringRate', v);
const setRearSpringRate = (v: string) => setField('rearSpringRate', v);
const setFrontRideHeight = (v: string) => setField('frontRideHeight', v);
const setRearRideHeight = (v: string) => setField('rearRideHeight', v);
const setFrontStabilizer = (v: string) => setField('frontStabilizer', v);
const setRearStabilizer = (v: string) => setField('rearStabilizer', v);
const setFrontCamber = (v: string) => setField('frontCamber', v);
const setRearCamber = (v: string) => setField('rearCamber', v);
const setFrontToe = (v: string) => setField('frontToe', v);
const setRearToe = (v: string) => setField('rearToe', v);
const setCaster = (v: string) => setField('caster', v);
const setVehicleAdjustment = (key: 'frontTireSize' | 'rearTireSize' | 'frontBrakePad' | 'rearBrakePad' | 'frontBrakeRotor' | 'rearBrakeRotor' | 'brakeBalance' | 'frontAero' | 'rearAero' | 'ecuMap' | 'boost', value: string) => setField(key, value);
const setDynamicAdjustment = (
  definition: (typeof selectedAdjustmentDefinitions)[number],
  value: (typeof adjustmentValues)[number]['value'],
) => setField('adjustmentValues', (current) => setAdjustmentValue(current, definition, value));
const setNotes = (v: string) => setField('notes', v);
const setKnowledge = (v: typeof draft.knowledge) => setField('knowledge', v);
const setCircuit = (v: string) => setField('circuit', v);
const setCarModel = (v: string) => setField('carModel', v);
const setSelectedVehicleId = (v: string | null) => setField('vehicleId', v);
const setSessionType = (v: typeof draft.sessionType) => setField('sessionType', v);
const handleTireSetSelect = (value: string | undefined) => {
  const selected = tireSets.find((set) => set.id === value);
  setField('tireSetId', selected?.id ?? '');
  setField('tireSetCode', selected?.code ?? '');
  if (!selected) return;
  setTireBrand(selected.manufacturer);
  setTireProductName(selected.productName);
  setTireCompound(selected.compound);
  setField('frontTireSize', selected.frontSize);
  setField('rearTireSize', selected.rearSize);
};
const onFeedbackChange = (key: keyof DrivingFeedback, value: number | null) =>
  setField('drivingFeedback', (prev) => ({ ...prev, [key]: value }));

const requestVehicleRegistration = (
  candidate: ReturnType<typeof splitCarModel>,
  inactiveVehicle: Vehicle | null,
): Promise<VehicleRegistrationChoice> => {
  setRegistrationYear(inactiveVehicle?.year ?? new Date().getFullYear());
  setVehicleRegistrationPrompt({ candidate, inactiveVehicle });
  return new Promise((resolve) => {
    vehicleRegistrationResolverRef.current = resolve;
  });
};

const settleVehicleRegistration = (choice: VehicleRegistrationChoice) => {
  vehicleRegistrationResolverRef.current?.(choice);
  vehicleRegistrationResolverRef.current = null;
  setVehicleRegistrationPrompt(null);
};

useEffect(() => () => {
  // 画面が閉じられた場合も保存処理の Promise を残さない。
  vehicleRegistrationResolverRef.current?.('cancel');
  vehicleRegistrationResolverRef.current = null;
}, []);

const [showLapTimeModal, setShowLapTimeModal] = useState(false);
const [pendingTelemetryResult, setPendingTelemetryResult] = useState<TelemetryImportResult | null>(null);
const [showTelemetryImport, setShowTelemetryImport] = useState(false);
const [compareCandidates, setCompareCandidates] = useState<ComparableTraceCandidate[]>([]);
const [showComparePrompt, setShowComparePrompt] = useState(false);
const [savedTraceId, setSavedTraceId] = useState<string | null>(null);
// ハイライトモーダル（新規保存成功後のみ表示）
const [highlightData, setHighlightData] = useState<{ highlight: SessionHighlight; setup: CarSetupType } | null>(null);

// ロガー取込結果をラップタイムへ添付（source='logger' + 証憑メタを保持）
const handleTelemetryAttach = (payload: LapAttachPayload, result: TelemetryImportResult) => {
  setDetailedLaps(payload.laps);
  setBestLap(payload.bestLap ?? '');
  setTotalLaps(payload.totalLaps > 0 ? String(payload.totalLaps) : '');
  setLapSource('logger');
  setLapEvidence(payload.evidence);
  setTelemetryRefs((prev) => ({
    ...prev,
    importStatus: 'attached',
  }));
  setPendingTelemetryResult(result);
  setShowTelemetryImport(false);
  void trackEvent('telemetry_attach_succeeded', {
    format: payload.evidence.format,
    circuit: result.track?.name,
  });
  message.success('ロガーのラップタイムを証憑つきで添付しました。保存時に走行ログも作成します');
};

// 証憑の整合性ルール: logger 由来のラップを手動編集する前に警告する。
// 編集を確定（LapTimeModal の保存）した時点で manual へ降格させ、
// 証憑が実ファイルと食い違う状態を作らない。
const confirmManualEditOfEvidence = (onOk: () => void) => {
  Modal.confirm({
    title: '手動編集すると証憑が外れます',
    content:
      'このラップタイムはロガーファイルから取り込まれた証憑つきデータです。手動で編集して保存すると「手動入力」扱いとなり、ロガー証憑は削除されます。',
    okText: '編集を続行',
    cancelText: 'キャンセル',
    okButtonProps: { danger: true },
    onOk,
  });
};

// 証憑を明示的に外す（ラップ値はそのまま手動入力扱いへ降格）
const handleDetachEvidence = () => {
  Modal.confirm({
    title: 'ロガー証憑を外しますか？',
    content:
      'ラップタイムの値は残りますが「手動入力」扱いとなり、ロガー由来の証憑情報（ファイル名・形式・取込日時）は削除されます。',
    okText: '証憑を外す',
    cancelText: 'キャンセル',
    okButtonProps: { danger: true },
    onOk: () => {
      setLapSource('manual');
      setLapEvidence(null);
      setPendingTelemetryResult(null);
      setTelemetryRefs((prev) => (prev.traceIds.length > 0 ? prev : emptyTelemetryRefs()));
      message.info('ロガー証憑を外しました（手動入力扱い）');
    },
  });
};
const dropdownRef = useRef<HTMLDivElement>(null);
const handleDropdownClick = (e: React.MouseEvent, inputValue: string, options: { value: string; label: string }[]) => {
e.stopPropagation();
const button = e.currentTarget as HTMLButtonElement;
const rect = button.getBoundingClientRect();
setDropdownState({
isOpen: true,
position: {
top: rect.bottom + window.scrollY,
left: rect.left + window.scrollX
},
currentInput: inputValue,
options: options
});
};
const calculatePressureDiff = (before: string, after: string): string => {
  const b = parseInt(before, 10);
  const a = parseInt(after, 10);
  if (isNaN(b) || isNaN(a)) return '';
  const diff = a - b;
  return diff >= 0 ? `+${diff}` : diff.toString();
};
const handleOptionSelect = (value: string) => {
const [position, timing] = dropdownState.currentInput.split('-');
setTirePressures(prev => {
const currentPos = prev[position as keyof typeof prev];
const newPos = {
...currentPos,
[timing]: value,
diff: timing === 'after'
? calculatePressureDiff(currentPos.before, value)
: calculatePressureDiff(value, currentPos.after)
};
return {
...prev,
[position]: newPos
};
});
setDropdownState(prev => ({ ...prev, isOpen: false }));
};
React.useEffect(() => {
const handleClickOutside = (event: MouseEvent) => {
if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
setDropdownState(prev => ({ ...prev, isOpen: false }));
}
};
document.addEventListener('mousedown', handleClickOutside);
return () => {
document.removeEventListener('mousedown', handleClickOutside);
};
}, []);

// 保存処理
const handleSave = async () => {
  if (!currentUser) {
    message.error('ログインが必要です');
    return;
  }

  // 連打・保存後の再送信による重複作成を防止する。savingRef は setState と違い
  // 同期的に更新されるため、同一ティック内の二度押しも確実に弾く。
  if (savingRef.current) return;
  savingRef.current = true;

  setIsSaving(true);
  try {
    let draftForSave = draft;

    // 自由入力された車種が車両管理に未登録なら、保存前にユーザーへ明示的に確認する。
    // 非アクティブ車両も検索対象に含め、削除済み車両を別ドキュメントとして再生成しない。
    if (!draft.vehicleId && draft.carModel.trim()) {
      const allVehicles = await getUserVehicles(currentUser.uid, true);
      const matchingVehicle = findVehicleByCarModel(allVehicles, draft.carModel);

      if (matchingVehicle?.isActive !== false && matchingVehicle?.id) {
        // 自由入力でも既存の有効車両と一致した場合は、その車両へ安全に紐付ける。
        draftForSave = { ...draftForSave, vehicleId: matchingVehicle.id };
        setSelectedVehicleId(matchingVehicle.id);
      } else {
        const candidate = splitCarModel(draft.carModel);
        const choice = await requestVehicleRegistration(
          candidate,
          matchingVehicle?.isActive === false ? matchingVehicle : null,
        );
        if (choice === 'cancel') return;

        if (choice === 'register') {
          let vehicleId: string;
          if (matchingVehicle?.id && matchingVehicle.isActive === false) {
            await updateVehicle(matchingVehicle.id, { isActive: true });
            vehicleId = matchingVehicle.id;
            message.success('削除済みの車両を復元しました');
          } else {
            // 確認中に別処理で同名車両が作成されていないか再確認して重複を避ける。
            const latestVehicles = await getUserVehicles(currentUser.uid, true);
            const latestMatch = findVehicleByCarModel(latestVehicles, candidate.name);
            if (latestMatch?.id) {
              if (latestMatch.isActive === false) {
                await updateVehicle(latestMatch.id, { isActive: true });
              }
              vehicleId = latestMatch.id;
            } else {
              vehicleId = await addVehicle({
                userId: currentUser.uid,
                make: candidate.make,
                model: candidate.model,
                year: registrationYear,
                isActive: true,
              });
            }
            message.success('車両管理にも登録しました');
          }
          draftForSave = { ...draftForSave, vehicleId };
          setSelectedVehicleId(vehicleId);
          setVehicles(await getUserVehicles(currentUser.uid));
        }
      }
    }

    // canonical な変換関数を通して保存ペイロードを生成（未入力は null、デモ初期値は保存しない）
    const setupData = draftToSetupInput(draftForSave, currentUser.uid);
    // 保存成功時に基準スナップショットを更新するための、保存された draft の写し。
    // 保存後にテレメトリ参照を追記する場合はこの写しも更新する。
    let savedDraft: SetupDraft = draftForSave;

    // 新規保存か更新かを判定（新規保存成功後は saved ID の URL へ遷移し、以後は更新経路になる）
    let savedSetupId = setupId;
    const isNew = computeIsNewSave({ setupId, isViewMode });
    if (!isNew) {
      // 編集モードから保存する場合は更新
      await updateSetup(setupId!, setupData);
      message.success('セットアップデータを更新しました');
      logger.log('Updated setup with ID:', setupId);
    } else {
      // 新規作成（セットアップ本体はここで1回だけ作成する）
      const newSetupId = await saveSetup(setupData);
      savedSetupId = newSetupId;
      message.success('セットアップデータを保存しました');
      logger.log('Saved setup with ID:', newSetupId);
    }

    // ベストラップ更新チェック＋ハイライト計算（同一サーキットの過去データと比較）
    // 過剰クエリを避けるため getUserSetups の結果をハイライト計算でも再利用する
    if (bestLap) {
      try {
        const pastSetups = await getUserSetups(currentUser.uid, 50);
        const sameCircuitPast = pastSetups.filter(
          (s) => s.circuit === circuit && s.id !== savedSetupId && s.lapTimeData?.bestLap,
        );
        if (sameCircuitPast.length > 0) {
          const toSeconds = (t: string): number | null => {
            const parts = t.split(':');
            if (parts.length === 2) return parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
            return parseFloat(t);
          };
          const pastBest = Math.min(...sameCircuitPast.map((s) => toSeconds(s.lapTimeData!.bestLap!)!));
          const currentBest = toSeconds(bestLap)!;
          const delta = pastBest - currentBest;
          if (delta > 0) {
            message.success(`ベストラップ更新（前回比 −${delta.toFixed(3)}s）`, 4);
          } else if (delta < 0) {
            message.info(`ベストラップまで +${Math.abs(delta).toFixed(3)}s`, 4);
          }
        }

        // ハイライトモーダルは新規保存のみ表示（更新・編集保存では出さない）
        if (isNew && savedSetupId) {
          const currentSetupFull: CarSetupType = {
            ...setupData,
            id: savedSetupId,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          // current を除く全過去セットアップを履歴として渡す
          const history = pastSetups.filter((s) => s.id !== savedSetupId);
          const highlight = computeSessionHighlight(currentSetupFull, history);
          if (highlight) {
            setHighlightData({ highlight, setup: currentSetupFull });
          }
        }
      } catch {
        // ベストラップ比較・ハイライト計算の失敗は保存フローに影響させない
      }
    }

    if (savedSetupId && pendingTelemetryResult && lapSource === 'logger') {
      // セットアップ本体の保存と走行ログ保存は別の成功単位として扱う。
      // 後段が失敗しても新規保存済みIDへ遷移し、再保存で重複セットアップを作らない。
      try {
        const trace = buildTelemetryTraceFromImport({
          ownerId: currentUser.uid,
          setupId: savedSetupId,
          setup: setupData,
          fileName: pendingTelemetryResult.fileName,
          fileSizeBytes: pendingTelemetryResult.fileSizeBytes,
          session: pendingTelemetryResult.session,
          detection: pendingTelemetryResult.detection,
          trackId: pendingTelemetryResult.track?.id ?? null,
          lineSource: pendingTelemetryResult.lineSource,
        });

        if (trace) {
          const traceId = await saveTelemetryTrace(trace);
          const nextTelemetry = mergeTraceRef(telemetryRefs, traceId);
          await updateSetup(savedSetupId, { telemetry: nextTelemetry });
          setTelemetryRefs(nextTelemetry);
          savedDraft = { ...savedDraft, telemetryRefs: nextTelemetry };
          setPendingTelemetryResult(null);
          message.success(
            trace.lap.valid
              ? '比較用テレメトリトレースを保存しました'
              : '単独確認用の走行ログを保存しました（比較には完全なNORMALラップが必要です）',
          );

          if (trace.lap.valid && trace.lap.type === 'NORMAL') {
            try {
              const traceWithId = { ...trace, id: traceId, createdAt: new Date(), updatedAt: new Date() } as import('./src/types/telemetryTrace').TelemetryTrace;
              const candidates = await getComparableTraceCandidates(traceWithId);
              if (candidates.length > 0) {
                setCompareCandidates(candidates);
                setSavedTraceId(traceId);
                setShowComparePrompt(true);
              }
            } catch (e) {
              logger.error('比較候補の取得に失敗しました:', e);
            }
          }
        } else {
          void trackEvent('telemetry_trace_save_failed', {
            format: pendingTelemetryResult.session.meta.format,
            circuit: pendingTelemetryResult.track?.name,
          });
          message.warning('セットアップは保存しましたが、走行ログを作成できませんでした。ラップを確認して再保存してください', 8);
        }
      } catch (telemetryError) {
        logger.error('セットアップ保存後の走行ログ保存に失敗しました:', telemetryError);
        void trackEvent('telemetry_trace_save_failed', {
          format: pendingTelemetryResult.session.meta.format,
          circuit: pendingTelemetryResult.track?.name,
        });
        void trackEvent('setup_save_failed', { stage: 'telemetry', reason: 'trace_save_failed' });
        message.warning('セットアップは保存済みです。走行ログのみ保存できなかったため、通信を確認してもう一度「保存」してください', 10);
      }
    }

    // 保存成功。基準スナップショットを更新して未保存状態を解消する。
    // これを navigate より前に同期実行することで、保存後の replace 遷移も
    // 離脱ガードにブロックされない（hasUnsavedChanges() が false を返す）。
    resetBaseline(savedDraft);

    // 新規保存が成功した後だけ、保存済みレコードの URL へ replace 遷移する。
    // 順序: (1)本体保存 → (2)ベストラップ比較・ハイライト → (3)テレメトリ保存 →
    // (4)比較候補表示 → (5)ここで遷移。本体保存より後にあるため、途中失敗時は
    // ここへ到達せず、setupId は未設定のまま（＝重複作成しない）。遷移後は
    // setupId が入るため、以後の保存は同一 ID の更新経路になる。
    if (isNew && savedSetupId) {
      navigate(buildSetupPath(savedSetupId), { replace: true });
    }
  } catch (error: any) {
    logger.error('Save error:', error);
    void trackEvent('setup_save_failed', { stage: 'setup', reason: error?.code ?? 'unknown' });
    // zodバリデーションエラーは項目名付きの読める日本語として表示
    const rawMsg: string = error?.message || 'エラーが発生しました';
    const errorMessage = error?.code === 'permission-denied'
      ? 'アクセス権限がありません。再度ログインしてください'
      : rawMsg.startsWith('入力値エラー:')
        ? rawMsg // setupService で整形済みの項目名付きメッセージをそのまま表示
        : `保存に失敗しました: ${rawMsg}`;
    message.error(errorMessage, 6); // 長めに表示（6秒）
  } finally {
    savingRef.current = false;
    setIsSaving(false);
  }
};

// 「直近セッションを複製」— 実行前プレビューを開く。
// ここでは最新1件を取得してプレビューを提示するだけで、draft はまだ書き換えない
// （ユーザーがモーダルで確認 → confirmPendingLoad で初めて複製を適用する）。
const openDuplicatePreview = async () => {
  if (!currentUser) {
    message.error('ログインが必要です');
    return;
  }

  setIsLoadingPrevious(true);
  try {
    // 最新1件のセットアップデータを取得
    const previousSetups = await getUserSetups(currentUser.uid, 1);

    if (previousSetups.length === 0) {
      message.warning('直近のセッションが見つかりません');
      return;
    }

    setPickerOpen(false);
    setPendingLoad({ kind: 'duplicate', source: previousSetups[0] });
  } catch (error: any) {
    logger.error('Load previous data error:', error);
    const errorMessage = error?.code === 'permission-denied'
      ? 'アクセス権限がありません。再度ログインしてください'
      : `直近セッションの取得に失敗しました: ${error?.message || 'エラーが発生しました'}`;
    message.error(errorMessage);
  } finally {
    setIsLoadingPrevious(false);
  }
};

// 「同じ車種の設定を引き継ぐ」— 実行前プレビューを開く。
// 引き継ぐ: タイヤ銘柄/コンパウンド・サスペンション・アライメント・ダンパー
// 引き継がない: 空気圧の実測値・天候・ラップタイム・走行距離/燃料（=セッション固有値）
const openInheritPreview = async () => {
  if (!currentUser) {
    message.error('ログインが必要です');
    return;
  }
  if (!carModel.trim()) {
    message.warning('先に車種を選択すると、その車種の前回セットアップを引き継げます');
    return;
  }

  setIsInheriting(true);
  try {
    const sameModel = await getSetupsByCarModel(currentUser.uid, carModel);
    if (sameModel.length === 0) {
      message.warning(`「${carModel}」の過去のセットアップが見つかりません`);
      return;
    }
    // date desc 取得済みなので先頭が最新
    setPickerOpen(false);
    setPendingLoad({ kind: 'inherit', source: sameModel[0] });
  } catch (error: unknown) {
    logger.error('Inherit setup error:', error);
    const err = error as { code?: string; message?: string } | undefined;
    const errorMessage = err?.code === 'permission-denied'
      ? 'アクセス権限がありません。再度ログインしてください'
      : `引き継ぎ元の取得に失敗しました: ${err?.message || 'エラーが発生しました'}`;
    message.error(errorMessage);
  } finally {
    setIsInheriting(false);
  }
};

// プレビュー確認後に実際の複製 / 引き継ぎを適用する。
// pathname を変えない draft 上書きは WP3 の未保存ガード対象外のため、
// ダーティな編集中データの上書き確認はこのプレビューモーダルで明示的に行う。
const confirmPendingLoad = () => {
  if (!pendingLoad) return;
  const { kind, source } = pendingLoad;
  const srcDate = source.date instanceof Date ? source.date : new Date(source.date);

  if (kind === 'duplicate') {
    // 新規セッションとして直近の記録を複製（コピーと同じ変換関数を通す）。
    // セッション日時は今、ラップ・証憑・テレメトリ・共有状態は初期化される。
    replaceDraft(copySetupToDraft(source));
    message.success(`直近セッション（${srcDate.toLocaleDateString('ja-JP')}）を複製しました`);
  } else {
    // セッション非依存の設定だけを現在の draft へ上書き（純粋関数を通す）。
    replaceDraft(inheritSetupSettings(draft, source));
    message.success(
      `${srcDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}のセットアップから引き継ぎました`,
    );
  }
  setPendingLoad(null);
};

// 複製元セレクタ: 確認モーダル内で「別のセッションを選ぶ」を押した際に候補一覧を取得する。
// duplicate は直近10件、inherit は同一車種の直近10件（既存の取得関数をそのまま再利用）。
const openSourcePicker = async () => {
  if (!currentUser || !pendingLoad) return;
  setPickerLoading(true);
  try {
    const list = pendingLoad.kind === 'inherit'
      ? await getSetupsByCarModel(currentUser.uid, carModel)
      : await getUserSetups(currentUser.uid, 10);
    setPickerList(list.slice(0, 10));
    setPickerOpen(true);
  } catch (error: any) {
    logger.error('Load source candidates error:', error);
    message.error('候補の取得に失敗しました');
  } finally {
    setPickerLoading(false);
  }
};

// 候補一覧から選択 → プレビューの対象を差し替えて確認画面へ戻る（適用ロジックは増やさない）
const selectPickerSource = (source: CarSetupType) => {
  setPendingLoad((prev) => (prev ? { ...prev, source } : prev));
  setPickerOpen(false);
};

// 詳細画面（閲覧モード）からの削除。成功後は履歴一覧へ遷移する。
const handleDeleteSetup = () => {
  if (!setupId) return;
  const shared = draft.visibility === 'shared';
  Modal.confirm({
    title: 'この走行データを削除しますか？',
    content: (
      <div>
        <p>この操作は取り消せません。</p>
        {shared && <p className="text-red-500">共有プールからも削除されます。</p>}
      </div>
    ),
    okText: '削除する',
    cancelText: 'キャンセル',
    okButtonProps: { danger: true },
    onOk: async () => {
      setIsDeleting(true);
      try {
        await deleteSetup(setupId);
        message.success('削除しました');
        navigate('/history');
      } catch (error) {
        logger.error('Delete setup error:', error);
        message.error('削除に失敗しました');
      } finally {
        setIsDeleting(false);
      }
    },
  });
};

// URLパラメータからセットアップデータを読み込む
useEffect(() => {
  const loadSetupData = async () => {
    if (!setupId) {
      setIsViewMode(false);
      return;
    }

    setLoadingSetup(true);
    setIsViewMode(true);
    
    try {
      const setupData = await getSetup(setupId);
      if (!setupData) {
        message.error('セットアップデータが見つかりません');
        window.location.href = '/history';
        return;
      }

      // 既存データ → draft へ一括変換（ラップ・証憑・テレメトリ・共有設定も復元）
      const nextDraft = setupToDraft(setupData);
      replaceDraft(nextDraft);
      // 読込直後の draft を基準スナップショットにする（この時点は未変更＝クリーン）
      resetBaseline(nextDraft);
      setPendingTelemetryResult(null);

    } catch (error: any) {
      logger.error('Error loading setup:', error);
      const errorMessage = error?.code === 'permission-denied' 
        ? 'アクセス権限がありません。再度ログインしてください' 
        : `セットアップデータの読み込みに失敗しました: ${error?.message || 'エラーが発生しました'}`;
      message.error(errorMessage);
    } finally {
      setLoadingSetup(false);
    }
  };

  loadSetupData();
}, [setupId, replaceDraft, resetBaseline]);

// URLパラメータでcopyが指定された場合の処理
useEffect(() => {
  const loadCopyData = async () => {
    if (!copyId) return;

    setLoadingSetup(true);
    
    try {
      const setupData = await getSetup(copyId);
      if (!setupData) {
        message.error('コピー元のデータが見つかりません');
        return;
      }

      // コピー元 → 新規 draft へ変換（日時=今、ラップ・証憑・テレメトリ・共有状態は初期化）
      const nextDraft = copySetupToDraft(setupData);
      replaceDraft(nextDraft);
      // コピー読込直後を基準スナップショットにする（この時点は未変更＝クリーン）
      resetBaseline(nextDraft);
      setPendingTelemetryResult(null);

      message.success('セットアップデータをコピーしました');
    } catch (error: any) {
      logger.error('Error loading copy data:', error);
      const errorMessage = error?.code === 'permission-denied' 
        ? 'アクセス権限がありません。再度ログインしてください' 
        : `データのコピーに失敗しました: ${error?.message || 'エラーが発生しました'}`;
      message.error(errorMessage);
    } finally {
      setLoadingSetup(false);
    }
  };

  loadCopyData();
}, [copyId, replaceDraft, resetBaseline]);

const handleRegisteredVehicleSelect = (vehicleId: string) => {
  if (vehicleId === '__manual__') {
    if (selectedVehicleId !== null) {
      setField('adjustmentValues', []);
      setField('tireSetId', '');
      setField('tireSetCode', '');
      setField('tireHeatCyclesAdded', '');
    }
    setSelectedVehicleId(null);
    setManualVehicleEntry(true);
    return;
  }

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId);
  setManualVehicleEntry(false);
  if (vehicleId !== selectedVehicleId) {
    setField('adjustmentValues', []);
    setField('tireSetId', '');
    setField('tireSetCode', '');
    setField('tireHeatCyclesAdded', '');
  }
  setSelectedVehicleId(vehicleId);
  if (selectedVehicle) {
    setCarModel(`${selectedVehicle.make} ${selectedVehicle.model}`);
  }
};

// 既存の未登録車種データを開いた場合は、その保存値を編集できるよう自由入力を復元する。
useEffect(() => {
  if ((setupId || copyId) && carModel.trim() && !selectedVehicleId) {
    setManualVehicleEntry(true);
  }
}, [setupId, copyId, carModel, selectedVehicleId]);

return (
<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
<Header 
  settingsModal={settingsModal}
  setSettingsModal={setSettingsModal}
  currentSettingView={currentSettingView}
  setCurrentSettingView={setCurrentSettingView}
/>
{/* メインコンテンツ */}
<main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
{/* セッション情報バー */}
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 sm:p-4 mb-6">
{/* フィールドグリッド */}
<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
  {/* 日時 */}
  <div className="col-span-2 sm:col-span-1">
    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('setup:dateTime')}</p>
    {isViewMode ? (
      <span className="block text-sm text-gray-800 dark:text-gray-200 font-medium py-1">
        {formatDateTime(sessionDate, locale)}
      </span>
    ) : (
      <input
        type="datetime-local"
        value={toLocalDatetimeInput(sessionDate)}
        onChange={(e) => setSessionDate(e.target.value ? new Date(e.target.value) : new Date())}
        className="w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm px-2 py-1.5 focus:outline-none focus:border-blue-400 dark:focus:border-blue-500"
      />
    )}
  </div>
  {/* サーキット */}
  <div>
    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
      {t('setup:circuit')} <span className="text-red-500">*</span>
    </p>
    <AutoComplete
      value={circuit}
      onChange={setCircuit}
      className="w-full"
      disabled={isViewMode}
      options={[
        { value: '鈴鹿サーキット' },
        { value: '富士スピードウェイ' },
        { value: 'ツインリンクもてぎ' },
        { value: '岡山国際サーキット' },
        { value: 'オートポリス' }
      ]}
    />
  </div>
  {/* 車両: 登録車両を選ぶ。未登録の場合だけ車種名を直接入力する。 */}
  <div className="col-span-2 sm:col-span-1 xl:col-span-2">
    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
      {t('setup:vehicle')} <span className="text-red-500">*</span>
    </p>
    <Select
      value={selectedVehicleId ?? (manualVehicleEntry ? '__manual__' : undefined)}
      onChange={handleRegisteredVehicleSelect}
      className="w-full"
      disabled={isViewMode}
      placeholder={t('setup:selectVehicle')}
      options={[
        ...vehicles
          .filter((vehicle) => vehicle.id)
          .map((vehicle) => ({
            value: vehicle.id as string,
            label: `${vehicle.make} ${vehicle.model}`,
          })),
        { value: '__manual__', label: t('setup:manualVehicle') },
      ]}
    />
    {manualVehicleEntry && !selectedVehicleId && (
      <AutoComplete
        value={carModel}
        onChange={setCarModel}
        className="mt-2 w-full"
        placeholder={t('setup:manualVehiclePlaceholder')}
        disabled={isViewMode}
        options={[...new Set(vehicles.map(v => `${v.make} ${v.model}`))].map(name => ({ value: name }))}
      />
    )}
  </div>
  {/* ドライバー名 */}
  <div>
    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('setup:driver')}</p>
    <AutoComplete
      value={driver}
      onChange={setDriver}
      placeholder={t('setup:driver')}
      className="w-full"
      disabled={isViewMode}
      options={driver ? [{ value: driver }] : []}
    />
  </div>
  {/* セッション種別 */}
  <div>
    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('setup:sessionType')}</p>
    <Select
      value={sessionType}
      onChange={setSessionType}
      className="w-full"
      disabled={isViewMode}
      options={[
        { value: 'practice', label: t('common:sessionType.practice') },
        { value: 'qualifying', label: t('common:sessionType.qualifying') },
        { value: 'race', label: t('common:sessionType.race') }
      ]}
    />
  </div>
</div>
{/* アクションボタン行 */}
<div className="mt-3 flex flex-wrap justify-end gap-2">
  {isViewMode ? (
    <>
      <button
        className="flex items-center bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 text-green-700 dark:text-green-300 px-3 sm:px-4 py-2 rounded-md cursor-pointer !rounded-button whitespace-nowrap text-sm"
        onClick={() => setIsViewMode(false)}
      >
        <i className="fas fa-edit mr-1 sm:mr-2"></i>
        編集
      </button>
      <button
        className="flex items-center bg-purple-100 dark:bg-purple-900 hover:bg-purple-200 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 px-3 sm:px-4 py-2 rounded-md cursor-pointer !rounded-button whitespace-nowrap text-sm"
        onClick={() => {
          if (setupId) navigate(buildCopyPath(setupId));
        }}
      >
        <i className="fas fa-copy mr-1 sm:mr-2"></i>
        <span className="hidden sm:inline">コピーして新規作成</span>
        <span className="sm:hidden">コピー</span>
      </button>
      <button
        className={`flex items-center bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 ml-1 pl-3 sm:pl-4 border-l border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-2 rounded-md cursor-pointer !rounded-button whitespace-nowrap text-sm ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={handleDeleteSetup}
        disabled={isDeleting}
      >
        <i className="fas fa-trash mr-1 sm:mr-2"></i>
        <span className="hidden sm:inline">削除</span>
        <span className="sm:hidden">削除</span>
      </button>
    </>
  ) : (
    <Tooltip title="同じ車種の前回記録から車両設定を選んで反映します。実測値やラップは変更しません。">
      <button
        onClick={openInheritPreview}
        disabled={isInheriting}
        className={`flex items-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 sm:px-4 py-2 rounded-md cursor-pointer !rounded-button whitespace-nowrap text-sm ${isInheriting ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isInheriting ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-bolt mr-2"></i>}
        <span className="hidden sm:inline">前回設定を引き継ぐ</span>
        <span className="sm:hidden">引き継ぐ</span>
        <i className="fas fa-info-circle ml-2 text-gray-400" aria-hidden="true"></i>
      </button>
    </Tooltip>
  )}
</div>
</div>
{/* データ表示セクション */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
{/* 環境データ */}
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
<div className="flex flex-wrap items-center gap-2 mb-4">
<i className="fas fa-temperature-high text-blue-500 dark:text-blue-400 mr-2"></i>
<h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">{t('setup:environment')}</h3>
<div className="ml-auto text-xs sm:text-sm text-gray-500 dark:text-gray-400">
{t('setup:airTemperature')}: {airTemp !== '' ? `${airTemp}°C` : '—'} &nbsp; {t('setup:shortTrackTemperature')}: {trackTemp !== '' ? `${trackTemp}°C` : '—'}
</div>
</div>
<div className="mb-4">
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('setup:weather')}</label>
<Select
value={weatherCondition}
onChange={setWeatherCondition}
className="w-full"
disabled={isViewMode}
options={WEATHER_CODES.map((value) => ({ value, label: t(`common:weather.${value}`) }))}
/>
</div>
<div className="grid grid-cols-2 gap-4">
<div>
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('setup:airTemperature')} (°C)</label>
<Input
value={airTemp}
onChange={(e) => setAirTemp(e.target.value)}
className="w-full"
disabled={isViewMode}
inputMode="decimal"
/>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('setup:trackTemperature')} (°C)</label>
<Input
value={trackTemp}
onChange={(e) => setTrackTemp(e.target.value)}
className="w-full"
disabled={isViewMode}
inputMode="decimal"
/>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('setup:humidity')} (%)</label>
<Input
value={humidity}
onChange={(e) => setHumidity(e.target.value)}
className="w-full"
disabled={isViewMode}
inputMode="decimal"
/>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">気圧 (hPa)</label>
<Input
value={pressure}
onChange={(e) => setPressure(e.target.value)}
className="w-full"
disabled={isViewMode}
inputMode="decimal"
/>
</div>
</div>
</div>
{/* タイヤ情報 */}
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
<div className="flex items-center mb-4">
<i className="fas fa-tire text-blue-500 dark:text-blue-400 mr-2"></i>
<h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">タイヤ情報</h3>
</div>
{(selectedVehicleSetupConfig?.tire?.tireSetManagementEnabled || tireSetId) && (
  <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900/60 dark:bg-blue-900/20">
    <label htmlFor="tire-set-select" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">使用タイヤセット</label>
    <Select
      id="tire-set-select"
      value={tireSetId || undefined}
      onChange={handleTireSetSelect}
      options={tireSetOptions}
      allowClear
      showSearch
      optionFilterProp="label"
      placeholder="登録済みセットを選択"
      className="w-full"
      disabled={isViewMode}
    />
    {selectedTireUsage && (
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
        <span>使用前 {selectedTireUsage.distanceKm.toLocaleString()} km</span>
        <span>{selectedTireUsage.laps.toLocaleString()} 周</span>
        <span>{selectedTireUsage.heatCycles.toLocaleString()} サイクル</span>
      </div>
    )}
    {!isViewMode && tireSetOptions.length === 0 && (
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">車両管理から最初のタイヤセットを登録してください。</div>
    )}
  </div>
)}
<div className="grid grid-cols-2 gap-4 mb-4">
<div>
<label htmlFor="tire-manufacturer" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">メーカー</label>
<AutoComplete
id="tire-manufacturer"
value={tireBrand}
onChange={setTireBrand}
className="w-full"
disabled={isViewMode}
options={tireManufacturerOptions}
placeholder="例: 横浜ゴム"
suffixIcon={<i className="fas fa-chevron-down text-gray-400 dark:text-gray-500"></i>}
onOpenChange={(open) => {
  if (open) {
    setTimeout(() => {
      const selectedItem = document.querySelector(`.ant-select-item[title="${tireBrand}"]`);
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'center' });
      }
    }, 10);
  }
}}
/>
</div>
<div>
<label htmlFor="tire-product-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">製品名</label>
<AutoComplete
id="tire-product-name"
value={tireProductName}
onChange={setTireProductName}
className="w-full"
disabled={isViewMode}
options={tireProductOptions}
placeholder="例: ADVAN A050"
/>
</div>
<div>
<label htmlFor="tire-compound" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">コンパウンド</label>
<AutoComplete
id="tire-compound"
value={tireCompound}
onChange={setTireCompound}
className="w-full"
disabled={isViewMode}
options={tireCompoundOptions}
placeholder="例: M"
suffixIcon={<i className="fas fa-chevron-down text-gray-400 dark:text-gray-500"></i>}
onOpenChange={(open) => {
  if (open) {
    setTimeout(() => {
      const selectedItem = document.querySelector(`.ant-select-item[title="${tireCompound}"]`);
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'center' });
      }
    }, 10);
  }
}}
/>
</div>
{tireSetId && (
  <div>
    <label htmlFor="tire-heat-cycles" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">今回のヒートサイクル加算</label>
    <InputNumber
      id="tire-heat-cycles"
      value={tireHeatCyclesAdded === '' ? null : Number(tireHeatCyclesAdded)}
      onChange={(value) => setField('tireHeatCyclesAdded', value === null ? '' : String(value))}
      min={0}
      max={100}
      precision={0}
      addonAfter="回"
      className="w-full"
      disabled={isViewMode}
    />
  </div>
)}
</div>
<div className="grid grid-cols-2 gap-4 mb-4">
<div>
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">フロントサイズ</label>
<AutoComplete
value={frontTireSize}
onChange={(value) => setField('frontTireSize', value)}
className="w-full"
disabled={isViewMode}
options={(selectedVehicleSetupConfig?.tire.frontSize ?? []).map((value) => ({ value }))}
placeholder="例: 245/40R18"
/>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">リアサイズ</label>
<AutoComplete
value={rearTireSize}
onChange={(value) => setField('rearTireSize', value)}
className="w-full"
disabled={isViewMode}
options={(selectedVehicleSetupConfig?.tire.rearSize ?? []).map((value) => ({ value }))}
placeholder="例: 275/35R18"
/>
</div>
</div>
<div className="mb-4">
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">走行距離 (km)</label>
{/* クリックで増減できる数値入力 */}
<div className="w-full">
  <StepNumber
    value={parseFloat(distance) || 0}
    onChange={(n) => setDistance(n === 0 && distance === '' ? '' : String(n))}
    min={0}
    max={10000}
    step={1}
    unit="km"
    size="middle"
    disabled={isViewMode}
  />
  </div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">燃料量 (L)</label>
<div className="w-full">
  <StepNumber
    value={parseFloat(fuel) || 0}
    onChange={(n) => setFuel(n === 0 && fuel === '' ? '' : String(n))}
    min={0}
    max={200}
    step={1}
    unit="L"
    size="middle"
    disabled={isViewMode}
  />
  </div>
</div>
</div>
{/* ラップタイム */}
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
<div className="flex items-center justify-between mb-4">
<div className="flex items-center">
<i className="fas fa-stopwatch text-blue-500 dark:text-blue-400 mr-2"></i>
<h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">ラップタイム</h3>
</div>
<div className="flex items-center gap-3">
{!isViewMode && (
  <button
    onClick={() => setShowTelemetryImport(true)}
    className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm cursor-pointer whitespace-nowrap !rounded-button"
  >
    <i className="fas fa-file-import mr-1"></i>
    ロガーから取込
  </button>
)}
{!isViewMode && (
  <button
    onClick={() => {
      // 証憑つき（logger）のラップを手動編集する場合は事前に警告する
      if (lapSource === 'logger') {
        confirmManualEditOfEvidence(() => setShowLapTimeModal(true));
      } else {
        setShowLapTimeModal(true);
      }
    }}
    className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm cursor-pointer whitespace-nowrap !rounded-button"
  >
    詳細入力
  </button>
)}
</div>
</div>
{/* ロガー証憑バッジ（manual 時は表示なし） */}
{lapSource === 'logger' && lapEvidence && (
  <div className="mb-4 space-y-2">
    <EvidenceBadge
      evidence={lapEvidence}
      onDetach={!isViewMode ? handleDetachEvidence : undefined}
    />
{setupId && !telemetryRefs.primaryTraceId && (
      <button
        type="button"
        onClick={() => setShowTelemetryImport(true)}
        className="inline-flex items-center gap-1.5 text-sm text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 whitespace-nowrap"
      >
        <i className="fas fa-rotate"></i>
        ロガーを再取込して走行ログを保存
      </button>
    )}
    {telemetryRefs.primaryTraceId && (
      <>
        <Link
          to={`/telemetry/debrief?trace=${telemetryRefs.primaryTraceId}`}
          className="ml-4 inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 whitespace-nowrap"
        >
          <i className="fas fa-clipboard-check"></i>
          デブリーフを見る
        </Link>
        <Link
          to={`/telemetry/compare?aTrace=${telemetryRefs.primaryTraceId}`}
          className="ml-4 inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 whitespace-nowrap"
        >
          <i className="fas fa-chart-area"></i>
          自己ベストと比較
        </Link>
      </>
    )}
  </div>
)}
<div className="mb-4">
<div className="space-y-3">
<div>
<label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">ベストラップ</label>
<Input
  value={bestLap}
  onChange={(e) => setBestLap(e.target.value)}
  placeholder="例: 1:58.423"
  className="w-full"
  disabled={isViewMode || lapSource === 'logger'}
/>
</div>
<div>
<label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">総周回数</label>
<Input
  value={totalLaps}
  onChange={(e) => setTotalLaps(e.target.value)}
  placeholder="例: 12"
  className="w-full"
  type="number"
  inputMode="numeric"
  disabled={isViewMode || lapSource === 'logger'}
/>
</div>
{lapSource === 'logger' && (
  <p className="text-xs text-gray-400 dark:text-gray-500">
    ロガー取込値のため直接編集できません。変更する場合は再取込するか、証憑を外してください。
  </p>
)}
</div>
</div>
</div>
</div>
{/* 設定タブセクション */}
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6">
{(() => {
  const tabItems = [
    {
      key: '1',
      label: usesDynamicSetup ? 'タイヤ・計測' : '基本設定',
      children: (
        <BasicInfoTab
          tirePressures={tirePressures}
          setTirePressures={setTirePressures}
          frontDamperCompression={frontDamperCompression}
          setFrontDamperCompression={setFrontDamperCompression}
          frontDamperRebound={frontDamperRebound}
          setFrontDamperRebound={setFrontDamperRebound}
          rearDamperCompression={rearDamperCompression}
          setRearDamperCompression={setRearDamperCompression}
          rearDamperRebound={rearDamperRebound}
          setRearDamperRebound={setRearDamperRebound}
          targetPressures={targetPressures}
          setTargetPressures={setTargetPressures}
          handleDropdownClick={handleDropdownClick}
          disabled={isViewMode}
          damperConstraints={usesDynamicSetup ? { visible: false } : suspensionConstraints.damper}
        />
      ),
    },
    ...(usesDynamicSetup ? [{
      key: '2',
      label: 'セッティング',
      children: (
        <DynamicSetupTab
          definitions={selectedAdjustmentDefinitions}
          values={displayedAdjustmentValues}
          onChange={setDynamicAdjustment}
          disabled={isViewMode}
        />
      ),
    }] : [{
      key: '2',
      label: 'サスペンション',
      children: (
        <>
          <SuspensionTab
            frontSpringRate={frontSpringRate}
            setFrontSpringRate={setFrontSpringRate}
            rearSpringRate={rearSpringRate}
            setRearSpringRate={setRearSpringRate}
            frontRideHeight={frontRideHeight}
            setFrontRideHeight={setFrontRideHeight}
            rearRideHeight={rearRideHeight}
            setRearRideHeight={setRearRideHeight}
            frontStabilizer={frontStabilizer}
            setFrontStabilizer={setFrontStabilizer}
            rearStabilizer={rearStabilizer}
            setRearStabilizer={setRearStabilizer}
            disabled={isViewMode}
            constraints={suspensionConstraints}
          />
          <div className="px-4 sm:px-6 pb-6">
            <AlignmentTab
              frontCamber={frontCamber}
              setFrontCamber={setFrontCamber}
              rearCamber={rearCamber}
              setRearCamber={setRearCamber}
              frontToe={frontToe}
              setFrontToe={setFrontToe}
              rearToe={rearToe}
              setRearToe={setRearToe}
              caster={caster}
              setCaster={setCaster}
              disabled={isViewMode}
              constraints={alignmentConstraints}
            />
          </div>
        </>
      ),
    }, {
      key: '3',
      label: '車両調整',
      children: (
        <VehicleAdjustmentsTab
          config={selectedVehicleSetupConfig}
          values={{ frontBrakePad, rearBrakePad, frontBrakeRotor, rearBrakeRotor, brakeBalance, frontAero, rearAero, ecuMap, boost }}
          onChange={setVehicleAdjustment}
          disabled={isViewMode}
        />
      ),
    }]),
    {
      key: '4',
      label: 'ドライバーフィードバック',
      children: (
        <DrivingTab
          notes={notes}
          setNotes={setNotes}
          knowledge={knowledge}
          setKnowledge={setKnowledge}
          feedback={drivingFeedback}
          onFeedbackChange={onFeedbackChange}
          disabled={isViewMode}
        />
      ),
    },
  ];
  return <Tabs defaultActiveKey="1" className="px-6 pt-4" items={tabItems} />;
})()}
</div>
{/* 固定アクション: 直近セッションの複製・保存（アイコン＋短いラベルで意味を明示） */}
{!isViewMode && (
  <div className="fixed bottom-6 right-4 sm:bottom-8 sm:right-8 z-50 flex items-center gap-3">
    <button
      onClick={openDuplicatePreview}
      disabled={isLoadingPrevious}
      className={`bg-blue-500 text-white px-4 py-3 rounded-full hover:bg-blue-600 cursor-pointer shadow-lg transition-all duration-200 hover:shadow-xl !rounded-button whitespace-nowrap flex items-center gap-2 ${isLoadingPrevious ? 'opacity-50 cursor-not-allowed' : ''}`}
      title="直近セッションの内容を新規記録として複製します（ラップ・証憑・共有状態はリセット）"
    >
      {isLoadingPrevious ? (
        <i className="fas fa-spinner fa-spin text-lg"></i>
      ) : (
        <ReloadOutlined style={{ fontSize: '18px' }} />
      )}
      <span className="text-sm font-medium">直近を複製</span>
    </button>
    <button
      onClick={handleSave}
      disabled={isSaving}
      className={`bg-gray-800 text-white px-4 py-3 rounded-full hover:bg-gray-700 cursor-pointer shadow-lg transition-all duration-200 hover:shadow-xl !rounded-button whitespace-nowrap flex items-center gap-2 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
      title="保存"
    >
      {isSaving ? (
        <i className="fas fa-spinner fa-spin text-lg"></i>
      ) : (
        <i className="fas fa-save text-lg"></i>
      )}
      <span className="text-sm font-medium">保存</span>
    </button>
  </div>
)}

{/* 未登録車種の保存確認。画面を開いただけでは車両を作成せず、ここで明示的に選択する。 */}
<Modal
  title={vehicleRegistrationPrompt?.inactiveVehicle ? '削除済みの車両が見つかりました' : '車両管理にも登録しますか？'}
  open={vehicleRegistrationPrompt !== null}
  closable={false}
  maskClosable={false}
  onCancel={() => settleVehicleRegistration('cancel')}
  footer={[
    <button
      key="cancel"
      type="button"
      onClick={() => settleVehicleRegistration('cancel')}
      className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300"
    >
      キャンセル
    </button>,
    <button
      key="without"
      type="button"
      onClick={() => settleVehicleRegistration('without')}
      className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200"
    >
      登録せず保存
    </button>,
    <button
      key="register"
      type="button"
      onClick={() => settleVehicleRegistration('register')}
      className="px-4 py-2 rounded-md bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
    >
      {vehicleRegistrationPrompt?.inactiveVehicle ? '復元して保存' : '登録して保存'}
    </button>,
  ]}
>
  {vehicleRegistrationPrompt && (
    <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
      <p>
        「{vehicleRegistrationPrompt.candidate.name}」は現在の登録車両にありません。
        {vehicleRegistrationPrompt.inactiveVehicle
          ? ' 以前削除した同名車両を復元して、このセットアップに紐付けられます。'
          : ' セットアップだけを保存するか、車両管理にも登録するか選択してください。'}
      </p>
      {!vehicleRegistrationPrompt.inactiveVehicle && (
        <div>
          <label className="block mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">登録する年式</label>
          <InputNumber
            value={registrationYear}
            onChange={(value) => setRegistrationYear(value ?? new Date().getFullYear())}
            min={1900}
            max={new Date().getFullYear() + 1}
            precision={0}
            className="w-full"
          />
        </div>
      )}
    </div>
  )}
</Modal>

{/* ラップタイムモーダル */}
<LapTimeModal
  visible={showLapTimeModal}
  onClose={() => setShowLapTimeModal(false)}
  onSave={(laps, bestLapTime, totalLapsCount) => {
    setDetailedLaps(laps);
    setBestLap(bestLapTime);
    setTotalLaps(totalLapsCount.toString());
    // 証憑の整合性ルール: 手動編集を確定したらロガー証憑を外し manual へ降格
    if (lapSource === 'logger') {
      setLapSource('manual');
      setLapEvidence(null);
      setPendingTelemetryResult(null);
      setTelemetryRefs((prev) => (prev.traceIds.length > 0 ? prev : emptyTelemetryRefs()));
      message.info('手動編集のため、ロガー証憑を外しました（手動入力扱い）');
    } else {
      message.success('ラップタイムが保存されました');
    }
  }}
  initialLaps={detailedLaps}
  evidenceActive={lapSource === 'logger'}
/>

{/* ファーストラップ・アルバム — セッションハイライトモーダル（新規保存後のみ） */}
{highlightData && (
  <SessionHighlightModal
    open={true}
    onClose={() => setHighlightData(null)}
    highlight={highlightData.highlight}
    savedSetup={highlightData.setup}
  />
)}

{/* 読込導線の実行前プレビュー（複製 / 引き継ぎ） */}
<Modal
  title={
    <span>
      {pendingLoad?.kind === 'inherit' ? (
        <>
          <i className="fas fa-bolt text-amber-500 mr-2"></i>
          同じ車種の設定を引き継ぐ
        </>
      ) : (
        <>
          <ReloadOutlined style={{ color: '#3b82f6' }} className="mr-2" />
          直近セッションを複製
        </>
      )}
    </span>
  }
  open={pendingLoad !== null}
  onCancel={() => { setPendingLoad(null); setPickerOpen(false); }}
  okText={pendingLoad?.kind === 'inherit' ? '引き継いで反映' : '複製して反映'}
  cancelText="キャンセル"
  onOk={confirmPendingLoad}
  okButtonProps={isDirty ? { danger: true } : undefined}
  footer={pickerOpen ? null : undefined}
>
  {pendingLoad && pickerOpen ? (
    <div className="space-y-2 pt-1">
      <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
        {pendingLoad.kind === 'inherit'
          ? `「${pendingLoad.source.carModel}」の過去セッションから選ぶ（最大10件）`
          : '直近のセッションから選ぶ（最大10件）'}
      </div>
      {pickerLoading ? (
        <div className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">読み込み中...</div>
      ) : pickerList.length === 0 ? (
        <div className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">候補が見つかりません</div>
      ) : (
        <ul className="space-y-1 max-h-72 overflow-y-auto">
          {pickerList.map((item) => {
            const d = item.date instanceof Date ? item.date : new Date(item.date);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => selectPickerSource(item)}
                  className="w-full text-left px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm flex items-center justify-between gap-2"
                >
                  <span className="text-gray-800 dark:text-gray-200">
                    {d.toLocaleDateString('ja-JP')} ・ {item.circuit || '（サーキット未設定）'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{item.carModel}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <button
        type="button"
        onClick={() => { setPendingLoad(null); setPickerOpen(false); navigate('/history'); }}
        className="text-sm text-blue-500 hover:text-blue-600 pt-1"
      >
        履歴一覧で探す
      </button>
    </div>
  ) : pendingLoad && (() => {
    const preview = pendingLoad.kind === 'inherit'
      ? buildInheritPreview(pendingLoad.source)
      : buildDuplicatePreview(pendingLoad.source);
    const targetItems = pendingLoad.kind === 'inherit'
      ? (preview as ReturnType<typeof buildInheritPreview>).inheritedItems
      : (preview as ReturnType<typeof buildDuplicatePreview>).copiedItems;
    const notAppliedTitle = pendingLoad.kind === 'inherit' ? '引き継がない項目（現在の入力を保持）' : '新規セッションとして初期化する項目';
    const notAppliedItems = pendingLoad.kind === 'inherit'
      ? (preview as ReturnType<typeof buildInheritPreview>).keptItems
      : (preview as ReturnType<typeof buildDuplicatePreview>).resetItems;
    return (
      <div className="space-y-4 pt-1">
        {/* コピー元の識別情報 */}
        <div className="rounded-lg bg-gray-50 dark:bg-gray-700/40 px-3 py-2.5 text-sm">
          <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
            <span className="text-gray-500 dark:text-gray-400">車種</span>
            <span className="font-medium text-gray-800 dark:text-gray-200">{preview.carModel}</span>
            <span className="text-gray-500 dark:text-gray-400">サーキット</span>
            <span className="font-medium text-gray-800 dark:text-gray-200">{preview.circuit}</span>
            <span className="text-gray-500 dark:text-gray-400">記録日時</span>
            <span className="font-medium text-gray-800 dark:text-gray-200">{preview.dateLabel}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={openSourcePicker}
          className="text-xs text-blue-500 hover:text-blue-600"
        >
          別のセッションを選ぶ
        </button>

        {/* 反映される対象項目（値の有無を明示） */}
        <div>
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
            {pendingLoad.kind === 'inherit' ? '引き継ぐ項目' : '複製する項目'}
          </div>
          <ul className="space-y-1">
            {targetItems.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-sm">
                {item.filled ? (
                  <i className="fas fa-check-circle text-green-500 text-xs"></i>
                ) : (
                  <i className="fas fa-minus-circle text-gray-300 dark:text-gray-600 text-xs"></i>
                )}
                <span className={item.filled ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}>
                  {item.label}
                  {!item.filled && <span className="ml-1 text-xs">（コピー元は未入力）</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* 反映されない項目 */}
        <div>
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">{notAppliedTitle}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{notAppliedItems.join(' / ')}</div>
        </div>

        {/* 編集中データの上書き警告 */}
        {isDirty && (
          <div className="rounded-lg border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
            <i className="fas fa-exclamation-triangle mr-1.5"></i>
            {pendingLoad.kind === 'inherit'
              ? '編集中の設定値が上書きされます。空気圧やラップなどセッション固有値は保持されます。'
              : '編集中の入力内容がすべて上書きされます。この操作は元に戻せません。'}
          </div>
        )}
      </div>
    );
  })()}
</Modal>

{/* ロガー取込モーダル */}
<Modal
  title={
    <span>
      <i className="fas fa-file-import text-blue-500 mr-2"></i>
      ロガーから取込
    </span>
  }
  open={showTelemetryImport}
  onCancel={() => setShowTelemetryImport(false)}
  footer={null}
  width={720}
>
  {/* 閉じるたびに取込状態を破棄する（条件レンダリングでアンマウント） */}
  {showTelemetryImport && (
    <div className="pt-2">
      <TelemetryImport onAttach={handleTelemetryAttach} />
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
        ここで取り込んだ走行ログは、セットアップ保存後にデブリーフと自己ベスト比較へつながります。
      </div>
    </div>
  )}
</Modal>
</main>
{/* フッター */}
{dropdownState.isOpen && (
<div
ref={dropdownRef}
className="fixed bg-white dark:bg-gray-800 shadow-lg rounded-md overflow-hidden z-50"
style={{
top: `${dropdownState.position.top}px`,
left: `${dropdownState.position.left}px`,
maxHeight: '200px',
overflowY: 'auto',
minWidth: '100px'
}}
>
{dropdownState.options.map((option) => (
<div
key={option.value}
className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm dark:text-gray-300"
onClick={() => handleOptionSelect(option.value)}
>
{option.label}
</div>
))}
</div>
)}

{/* P0-1: 比較候補プロンプトモーダル */}
<Modal
  title="📊 比較候補が見つかりました"
  open={showComparePrompt}
  onCancel={() => setShowComparePrompt(false)}
  footer={[
    <button key="later" className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => setShowComparePrompt(false)}>
      後で
    </button>,
    <button key="compare" className="px-4 py-2 rounded-md bg-blue-600 text-sm font-medium text-white hover:bg-blue-700" onClick={() => { if (savedTraceId) { const firstCandidateId = compareCandidates[0]?.trace.id; const url = firstCandidateId ? `/telemetry/compare?aTrace=${savedTraceId}&bTrace=${firstCandidateId}` : `/telemetry/compare?aTrace=${savedTraceId}`; navigate(url); } } }>
      比較を見る
    </button>,
  ]}
>
  <div className="space-y-2">
    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
      保存した走行ログと比較できる過去データが見つかりました。
    </p>
    {compareCandidates.map((c, i) => (
      <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-md px-3 py-2">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            c.kind === 'self_best' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
            c.kind === 'previous' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' :
            'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
          }`}>
            {c.label}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {c.trace.sessionDate.toLocaleDateString('ja-JP')}
          </span>
        </div>
        <span className={`font-mono text-sm font-bold ${c.deltaSeconds < 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
          {c.deltaSeconds < 0 ? '−' : '+'}{Math.abs(c.deltaSeconds).toFixed(3)}s
        </span>
      </div>
    ))}
  </div>
</Modal>

<footer className="bg-white dark:bg-gray-800 py-6 border-t border-gray-200 dark:border-gray-700">
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
<div className="text-center text-sm text-gray-500">
© 2025 VELOCITY LOGGER. All rights reserved.
</div>
</div>
</footer>
</div>
);
}
export default App
