const MAX_INPUT_LENGTH = 2_000;

// Phrases that signal prompt injection attempts
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/gi,
  /forget\s+(everything|all|the\s+above)/gi,
  /you\s+are\s+now\s+(a|an)\s+/gi,
  /system\s*:\s*/gi,
  /\[INST\]|\[\/INST\]/g,
  /<\|im_start\|>|<\|im_end\|>/g,
];

/**
 * Sanitizes a user-supplied string before interpolating it into a prompt.
 * - Trims and limits length to prevent token inflation.
 * - Strips null bytes and control characters.
 * - Detects and neutralizes common prompt injection patterns.
 */
export function sanitizePromptInput(input: unknown, maxLength = MAX_INPUT_LENGTH): string {
  if (typeof input !== 'string') return '';

  let sanitized = input
    .replace(/\0/g, '')                        // null bytes
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, '') // control chars (keep \t \n \r)
    .trim()
    .slice(0, maxLength);

  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[redacted]');
  }

  return sanitized;
}
