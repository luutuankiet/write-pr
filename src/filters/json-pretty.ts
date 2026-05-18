export interface JsonPrettyOpts {
  indent?: number;
  fold?: boolean;
  summary?: string;
}

/**
 * json_pretty filter: any JSON-serializable value -> fenced ```json block; optional <details> fold.
 *
 * @param data      Any JSON-serializable value.
 * @param opts.indent   JSON.stringify indent. Default 2.
 * @param opts.fold     Wrap the block in <details><summary>JSON</summary> ... </details>. Default false.
 * @param opts.summary  Override the <summary> label when fold=true. Default 'JSON'.
 */
export function jsonPretty(data: unknown, opts: JsonPrettyOpts = {}): string {
  const indent = opts.indent ?? 2;
  const fold = opts.fold ?? false;
  const summary = opts.summary ?? 'JSON';
  const json = JSON.stringify(data, null, indent);
  const block = '```json\n' + json + '\n```';
  if (!fold) return block;
  return `<details><summary>${summary}</summary>\n\n${block}\n\n</details>`;
}
