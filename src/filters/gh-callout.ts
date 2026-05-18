export type CalloutType = 'TIP' | 'NOTE' | 'IMPORTANT' | 'WARNING' | 'CAUTION';

const VALID = new Set<CalloutType>(['TIP', 'NOTE', 'IMPORTANT', 'WARNING', 'CAUTION']);

/**
 * gh_callout filter: render GitHub-flavored callout block.
 *
 * @param type  TIP | NOTE | IMPORTANT | WARNING | CAUTION (case-insensitive).
 * @param text  Body text (may contain newlines; each line prefixed with `> `).
 *
 * Output shape:
 *   > [!TYPE]
 *   > line1
 *   > line2
 *
 * GOTCHA: GitHub does NOT render the styled callout treatment inside <details> blocks —
 * it appears as plain quoted text. Put callouts OUTSIDE <details>. See rules/callout-gotcha.md.
 */
export function ghCallout(type: string, text: string): string {
  const upper = type.toUpperCase() as CalloutType;
  if (!VALID.has(upper)) {
    throw new Error(
      `gh_callout: invalid type '${type}'. Must be one of: ${Array.from(VALID).join(', ')}`,
    );
  }
  const body = String(text)
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join('\n');
  return `> [!${upper}]\n${body}`;
}
