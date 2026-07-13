const CAPTION_PILL_INPUT_MAX_LENGTH = 120;

export function appendCaptionPill(caption: string, pill: string) {
  const trimmedCaption = caption.trim();

  if (hasCaptionPill(trimmedCaption, pill)) {
    return trimmedCaption;
  }

  const nextCaption = trimmedCaption ? `${trimmedCaption} ${pill}` : pill;

  return nextCaption.slice(0, CAPTION_PILL_INPUT_MAX_LENGTH);
}

export function hasCaptionPill(caption: string, pill: string) {
  return caption.toLocaleLowerCase().includes(pill.toLocaleLowerCase());
}
