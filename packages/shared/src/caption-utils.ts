const CAPTION_PILL_INPUT_MAX_LENGTH = 120;

/**
 * Append a caption pill if not already present, capped at max length.
 *
 * @param caption - Current caption text.
 * @param pill - Pill string to append.
 * @returns Updated caption.
 */
export function appendCaptionPill(caption: string, pill: string) {
  const trimmedCaption = caption.trim();

  if (hasCaptionPill(trimmedCaption, pill)) {
    return trimmedCaption;
  }

  const nextCaption = trimmedCaption ? `${trimmedCaption} ${pill}` : pill;

  return nextCaption.slice(0, CAPTION_PILL_INPUT_MAX_LENGTH);
}

/**
 * Whether `caption` already contains `pill` (case-insensitive).
 *
 * @param caption - Caption text.
 * @param pill - Pill string.
 * @returns `true` if present.
 */
export function hasCaptionPill(caption: string, pill: string) {
  return caption.toLocaleLowerCase().includes(pill.toLocaleLowerCase());
}
