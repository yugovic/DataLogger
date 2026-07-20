import type { CarSetup } from '../types/setup';
import type { TireSet, TireSetUsageSummary } from '../types/tire';

/** 走行記録を原本として集計するため、編集・削除・複製で二重加算しない。 */
export function calculateTireSetUsage(tireSet: TireSet, setups: CarSetup[]): TireSetUsageSummary {
  return setups
    .filter((setup) => setup.tireInfo.tireSetId === tireSet.id)
    .reduce<TireSetUsageSummary>((summary, setup) => ({
      distanceKm: summary.distanceKm + (setup.sessionInfo.distance ?? 0),
      laps: summary.laps + (setup.lapTimeData?.totalLaps ?? setup.lapTimeData?.laps?.length ?? 0),
      heatCycles: summary.heatCycles + (setup.tireUsage?.heatCyclesAdded ?? 0),
      sessionCount: summary.sessionCount + 1,
    }), {
      distanceKm: tireSet.initialDistanceKm,
      laps: tireSet.initialLaps,
      heatCycles: tireSet.initialHeatCycles,
      sessionCount: 0,
    });
}
