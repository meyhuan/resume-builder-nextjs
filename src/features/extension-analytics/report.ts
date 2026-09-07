interface MetricEvent { properties: unknown }
export interface FillMetrics {
  domain: string; version: string; runs: number; successfulRuns: number; partialRuns: number; failedRuns: number;
  filled: number; existing: number; failed: number; unmatched: number; missing: number;
  datePrecisionMissing: number; repeatersFailed: number; averageDurationMs: number;
  writableSuccessRate: number | null;
}
// Existing values are not successful writes. Missing profile data is a separate cause.
export function summarizeFillEvents(events: MetricEvent[]): FillMetrics[] {
  const groups = new Map<string, FillMetrics & {durationSum:number; durationRuns:number}>();
  for (const event of events) {
    const p = (event.properties && typeof event.properties === "object" && !Array.isArray(event.properties) ? event.properties : {}) as Record<string, unknown>;
    const domain = typeof p.sourceDomain === "string" ? p.sourceDomain : "未知站点";
    const version = typeof p.extensionVersion === "string" ? p.extensionVersion : "未知版本";
    const key = JSON.stringify([domain, version]);
    const row = groups.get(key) || {domain,version,runs:0,successfulRuns:0,partialRuns:0,failedRuns:0,filled:0,existing:0,failed:0,unmatched:0,missing:0,datePrecisionMissing:0,repeatersFailed:0,averageDurationMs:0,writableSuccessRate:null,durationSum:0,durationRuns:0};
    const count = (name:string) => typeof p[name] === "number" && Number.isFinite(p[name]) && p[name] >= 0 ? p[name] as number : 0;
    row.runs++;
    if (p.status === "success") row.successfulRuns++;
    else if (p.status === "partial") row.partialRuns++;
    else row.failedRuns++;
    row.filled+=count("filledCount"); row.existing+=count("alreadyFilledCount"); row.failed+=count("failedCount");
    row.unmatched+=count("unmatchedCount"); row.missing+=count("missingProfileCount");
    row.datePrecisionMissing+=count("controlDatePrecisionMissingCount"); row.repeatersFailed+=count("repeaterFailureCount");
    if (typeof p.durationMs === "number" && Number.isFinite(p.durationMs) && p.durationMs >= 0) {row.durationSum+=p.durationMs;row.durationRuns++;}
    groups.set(key,row);
  }
  return [...groups.values()].map(({durationSum,durationRuns,...row})=>({...row,
    averageDurationMs:durationRuns ? Math.round(durationSum/durationRuns) : 0,
    writableSuccessRate:row.filled+row.failed>0 ? row.filled/(row.filled+row.failed) : null,
  })).sort((a,b)=>b.runs-a.runs);
}
