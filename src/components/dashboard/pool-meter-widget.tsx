"use client";

import type { AgBaseRegistry, AgBaseWidgetDefinition, AgDefaultWidgetDefinition, AgWidgetDataFormat, AgWidgetFieldReference, AgWidgetParams } from "ag-studio";
import { AgIncompleteDataMappingOverlay, AgNoDataOverlay } from "ag-studio-react";
import { use } from "react";

// A custom AG Studio widget: how much of a matching pool is used, drawn like
// the pool bars on Bono's Campaigns page (Studio draws its title). It sums two fields (used and pool)
// through Studio's own data engine, so page filters and cross-filters apply.

export type PoolMeterDef = {
  type: "pool-meter";
  dataMapping: { used: AgWidgetFieldReference[]; pool: AgWidgetFieldReference[] };
  format?: AgWidgetDataFormat<Record<string, never>>;
};

export interface BonoRegistry extends AgBaseRegistry {
  widgets: readonly (AgDefaultWidgetDefinition | AgBaseWidgetDefinition<"pool-meter", PoolMeterDef>)[];
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function PoolMeterWidget({ widgetApi, dataMapping }: AgWidgetParams<PoolMeterDef>) {
  const used = dataMapping.used?.at(0);
  const pool = dataMapping.pool?.at(0);
  if (!used || !pool) return <AgIncompleteDataMappingOverlay />;

  const response = use(widgetApi.getData({ fields: [used, pool] }));
  const row = response.results.rows.at(0);
  const usedValue = Number(row?.[used.key] ?? 0);
  const poolValue = Number(row?.[pool.key] ?? 0);
  if (!row || poolValue <= 0) return <AgNoDataOverlay />;

  const percent = Math.min(100, Math.round((usedValue / poolValue) * 100));
  return (
    <div className="flex h-full flex-col justify-center gap-3 p-4 text-zinc-900 dark:text-zinc-100">
      <p className="text-3xl font-bold">
        {percent}% <span className="text-base font-normal text-zinc-600 dark:text-zinc-400">used</span>
      </p>
      <div
        role="progressbar"
        aria-label="Matching pool used"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
      >
        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {usd.format(usedValue)} matched of {usd.format(poolValue)} · {usd.format(Math.max(0, poolValue - usedValue))} left
      </p>
    </div>
  );
}
