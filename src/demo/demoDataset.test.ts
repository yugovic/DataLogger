import { describe, expect, it } from 'vitest';
import { buildDemoDataset } from './demoDataset';
import { carSetupSchema } from '../schemas/setupSchema';
import { telemetryTraceSchema } from '../schemas/telemetryTraceSchema';
import { tireSetInputSchema } from '../schemas/tireSetSchema';
import { vehicleProfileSchema } from '../schemas/vehicleProfileSchema';
import { adjustmentDefinitionErrors } from '../lib/setupAdjustments';

const dataset = buildDemoDataset();
const FAKE_UID = 'demo-uid';

describe('デモデータセット', () => {
  it('本番の保存前バリデーションを全件通過する（走行記録）', () => {
    for (const setup of dataset.setups) {
      const result = carSetupSchema.safeParse({ ...setup.data, userId: FAKE_UID });
      expect(result.success, `${setup.id}: ${JSON.stringify(result.error?.issues)}`).toBe(true);
    }
  });

  it('本番の保存前バリデーションを全件通過する（テレメトリ・タイヤセット・車両プロフィール）', () => {
    for (const trace of dataset.telemetryTraces) {
      const result = telemetryTraceSchema.safeParse({ ...trace.data, ownerId: FAKE_UID });
      expect(result.success, `${trace.id}: ${JSON.stringify(result.error?.issues)}`).toBe(true);
    }

    for (const tireSet of dataset.tireSets) {
      const result = tireSetInputSchema.safeParse({ ...tireSet.data, userId: FAKE_UID });
      expect(result.success, `${tireSet.id}: ${JSON.stringify(result.error?.issues)}`).toBe(true);
    }

    for (const vehicle of dataset.vehicles) {
      expect(vehicleProfileSchema.safeParse(vehicle.data.profile).success, vehicle.id).toBe(true);
      expect(adjustmentDefinitionErrors(vehicle.data.setupConfig?.adjustmentDefinitions), vehicle.id).toEqual([]);
    }
  });

  it('参照が全て解決する（車両・タイヤセット・トレース）', () => {
    const vehicleIds = new Set(dataset.vehicles.map((v) => v.id));
    const tireSetIds = new Set(dataset.tireSets.map((t) => t.id));
    const setupIds = new Set(dataset.setups.map((s) => s.id));
    const traceIds = new Set(dataset.telemetryTraces.map((t) => t.id));

    for (const setup of dataset.setups) {
      if (setup.data.vehicleId) {
        expect(vehicleIds.has(setup.data.vehicleId), `${setup.id} の vehicleId`).toBe(true);
        const vehicle = dataset.vehicles.find((v) => v.id === setup.data.vehicleId)!;
        expect(vehicle.owner, `${setup.id} の車両オーナー`).toBe(setup.owner);
        expect(setup.data.carModel).toBe(`${vehicle.data.make} ${vehicle.data.model}`);
      }
      if (setup.data.tireInfo.tireSetId) {
        expect(tireSetIds.has(setup.data.tireInfo.tireSetId), `${setup.id} の tireSetId`).toBe(true);
      }
      for (const traceId of setup.data.telemetry?.traceIds ?? []) {
        expect(traceIds.has(traceId), `${setup.id} の traceId`).toBe(true);
      }
    }

    for (const trace of dataset.telemetryTraces) {
      expect(setupIds.has(trace.data.setupId), `${trace.id} の setupId`).toBe(true);
      const setup = dataset.setups.find((s) => s.id === trace.data.setupId)!;
      expect(trace.owner).toBe(setup.owner);
      expect(trace.data.circuit).toBe(setup.data.circuit);
      expect(trace.data.sessionDate.getTime()).toBe(setup.data.date.getTime());
    }

    // 共有権利証明は「本人所有かつ shared」なセットアップを指す必要がある
    for (const entitlement of dataset.entitlements) {
      const setup = dataset.setups.find((s) => s.id === entitlement.setupId)!;
      expect(setup.owner).toBe(entitlement.owner);
      expect(setup.data.visibility).toBe('shared');
    }
  });

  it('公開共有リンクが Firestore ルールの形式要件を満たす', () => {
    for (const share of dataset.publicShares) {
      expect(share.id).toMatch(/^[A-Za-z0-9]{12,}$/);
      expect(Object.keys(share.summary).sort()).toEqual([
        'bestLap',
        'carModel',
        'circuit',
        'hasLoggerEvidence',
        'sessionDate',
        'vehicleProfileSnapshot',
      ]);
      const setup = dataset.setups.find((s) => s.id === share.setupId)!;
      expect(setup.owner).toBe(share.owner);
    }
  });

  it('偽データを作らない（未入力は null のまま・記録の粗いセッションを含む）', () => {
    // 温間圧を測っていないセッションが存在する（全項目を埋め尽くさない）
    const sparse = dataset.setups.filter((s) => s.data.tireSettings.fl.after === null);
    expect(sparse.length).toBeGreaterThan(0);

    // ドライバー評価が未入力のセッションが存在する
    const noFeedback = dataset.setups.filter((s) => !s.data.drivingFeedback);
    expect(noFeedback.length).toBeGreaterThan(0);

    // 評価を入れたセッションでも、触っていない項目は null のまま残っている
    const partiallyRated = dataset.setups.filter((s) =>
      s.data.drivingFeedback && Object.values(s.data.drivingFeedback).some((v) => v === null),
    );
    expect(partiallyRated.length).toBeGreaterThan(0);

    // 欠損の 0 変換をしていない（内圧・気象に 0 は現れない）
    for (const setup of dataset.setups) {
      for (const corner of Object.values(setup.data.tireSettings)) {
        expect(corner.before === null || corner.before > 0, setup.id).toBe(true);
        expect(corner.after === null || corner.after > 0, setup.id).toBe(true);
      }
      expect(setup.data.weather.humidity === null || setup.data.weather.humidity > 0, setup.id).toBe(true);
    }
  });

  it('匿名共有の記録はデータ層にドライバー名を持たない', () => {
    for (const setup of dataset.setups) {
      if (setup.data.anonymized) expect(setup.data.driver, setup.id).toBeNull();
    }
  });

  it('全ユーザーが共有記録を1件以上持つ（Give-to-Get の相互性を満たす）', () => {
    for (const account of dataset.accounts) {
      const shared = dataset.setups.filter((s) => s.owner === account.key && s.data.visibility === 'shared');
      expect(shared.length, `${account.key} の共有記録`).toBeGreaterThan(0);
    }
  });

  it('画面が空にならない量と広がりを持つ', () => {
    expect(dataset.setups.length).toBeGreaterThanOrEqual(10);
    expect(new Set(dataset.setups.map((s) => s.data.circuit)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(dataset.setups.map((s) => s.data.carModel)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(dataset.setups.map((s) => s.data.sessionType)).size).toBe(3);
    expect(dataset.telemetryTraces.length).toBeGreaterThanOrEqual(3);

    // 天候の内訳が1種類に偏らない（ダッシュボードの円グラフ確認用）
    expect(new Set(dataset.setups.map((s) => s.data.weather.condition)).size).toBeGreaterThanOrEqual(3);

    // 同一車種×同一コースの比較候補が成立する（テレメトリ比較画面の確認用）
    const suzukaOwnerTraces = dataset.telemetryTraces.filter(
      (t) => t.owner === 'owner' && t.data.trackId === 'suzuka-full' && t.data.lap.valid,
    );
    expect(suzukaOwnerTraces.length).toBeGreaterThanOrEqual(2);
  });

  it('走行ログが現実的な範囲に収まり、Firestore の1MB制限に収まる', () => {
    for (const trace of dataset.telemetryTraces) {
      const { channels, lap, summary, path } = trace.data;

      // 鈴鹿1周として妥当なラップタイム
      expect(lap.timeSeconds, trace.id).toBeGreaterThan(100);
      expect(lap.timeSeconds, trace.id).toBeLessThan(200);
      expect(lap.type, trace.id).toBe('NORMAL');
      expect(lap.valid, trace.id).toBe(true);

      // チャンネルの長さが揃い、距離が単調増加
      const length = channels.distanceM.length;
      expect(channels.elapsedS.length).toBe(length);
      expect(channels.speedKmh.length).toBe(length);
      expect(path?.xM.length).toBe(length);
      expect(path?.yM.length).toBe(length);
      for (let i = 1; i < length; i++) {
        expect(channels.distanceM[i], `${trace.id} の距離グリッド`).toBeGreaterThan(channels.distanceM[i - 1]);
      }

      // 1周の距離が鈴鹿フルコース相当
      expect(channels.distanceM[length - 1]).toBeGreaterThan(5000);
      expect(channels.distanceM[length - 1]).toBeLessThan(6500);

      // 速度域が現実的
      expect(summary.topSpeedKmh!).toBeGreaterThan(150);
      expect(summary.topSpeedKmh!).toBeLessThan(300);
      expect(summary.minCornerSpeedKmh!).toBeGreaterThan(30);

      // 実測チャンネルが無いことを明示している（捏造しない）
      expect(trace.data.qualityFlags.missingOperationChannels).toBe(true);
      expect(channels.throttlePct).toBeUndefined();
      expect(channels.brakePct).toBeUndefined();

      const bytes = JSON.stringify(trace.data).length;
      expect(bytes, `${trace.id} のドキュメントサイズ`).toBeLessThan(900_000);
    }
  });

  it('何度組み立てても同じ内容になる（再投入で差分が出ない）', () => {
    const again = buildDemoDataset();
    expect(JSON.stringify(again)).toBe(JSON.stringify(dataset));
  });
});
