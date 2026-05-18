import { mdTable } from './md-table.js';

export interface RunResult {
  status: string;
  unique_id?: string;
  execution_time?: number;
  message?: string | null;
  [k: string]: unknown;
}

export interface RunResultsJson {
  elapsed_time?: number;
  results?: RunResult[];
  args?: Record<string, unknown>;
  [k: string]: unknown;
}

export interface CiSummaryOpts {
  /** Substrings or full unique_ids of models that count as "ours" for the filtered breakdown. */
  our_models?: string[];
  /** Cap on `message` body shown in the errors table (chars). Default 200. */
  message_cap?: number;
}

/**
 * ci_summary filter: dbt `run_results.json` -> status counts + errors + (optional) our-models breakdown.
 *
 * Two-arg form: `[[ run_results | ci_summary(['model.proj.foo']) ]]`
 * Opts form:   `[[ run_results | ci_summary({our_models: [...], message_cap: 300}) ]]`
 */
export function ciSummary(
  runResults: RunResultsJson,
  ourModelsOrOpts: string[] | CiSummaryOpts = [],
): string {
  const opts: CiSummaryOpts = Array.isArray(ourModelsOrOpts)
    ? { our_models: ourModelsOrOpts }
    : ourModelsOrOpts;
  const ourModels = opts.our_models ?? [];
  const messageCap = opts.message_cap ?? 200;

  const results = runResults?.results ?? [];
  if (results.length === 0) return '_(no results)_';

  // Status counts
  const counts: Record<string, number> = {};
  for (const r of results) {
    counts[r.status] = (counts[r.status] ?? 0) + 1;
  }
  const statusRows = Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([status, count]) => ({ status, count }));
  const statusTable = mdTable(statusRows);

  // Errors (status "error" or "fail")
  const errors = results.filter((r) => r.status === 'error' || r.status === 'fail');
  let errorBlock = '';
  if (errors.length > 0) {
    const errorRows = errors.map((r) => ({
      unique_id: r.unique_id ?? '',
      status: r.status,
      message: String(r.message ?? '').slice(0, messageCap),
    }));
    errorBlock = `\n\n### Errors (${errors.length})\n\n${mdTable(errorRows)}`;
  }

  // Our-models breakdown
  let ourBlock = '';
  if (ourModels.length > 0) {
    const our = results.filter(
      (r) => r.unique_id && ourModels.some((m) => r.unique_id!.includes(m)),
    );
    if (our.length > 0) {
      const ourRows = our.map((r) => ({
        unique_id: r.unique_id ?? '',
        status: r.status,
        execution_time:
          typeof r.execution_time === 'number'
            ? Number(r.execution_time.toFixed(2))
            : '',
      }));
      ourBlock = `\n\n### Our Models (${our.length} of ${results.length})\n\n${mdTable(ourRows)}`;
    }
  }

  const elapsed =
    typeof runResults.elapsed_time === 'number'
      ? `\n\n**Total elapsed:** ${runResults.elapsed_time.toFixed(2)}s`
      : '';

  return `### Status\n\n${statusTable}${elapsed}${errorBlock}${ourBlock}`;
}
