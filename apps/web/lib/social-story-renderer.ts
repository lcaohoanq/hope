import {
  calculateCoverCrop,
  getSocialStoryDisplayValues,
  SOCIAL_STORY_HEIGHT,
  SOCIAL_STORY_WIDTH,
  type SocialStoryInput,
  type SocialStoryTemplateId,
  wrapSocialStoryText,
} from "@/lib/social-story";

const SANS_FONT = '"Arial", "Helvetica Neue", sans-serif';
const SERIF_FONT = 'Georgia, "Times New Roman", serif';

export function renderSocialStory(
  canvas: HTMLCanvasElement,
  input: SocialStoryInput,
  image: HTMLImageElement,
  template: SocialStoryTemplateId,
) {
  canvas.width = SOCIAL_STORY_WIDTH;
  canvas.height = SOCIAL_STORY_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable.");

  context.save();
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  if (template === "photo-first") {
    renderPhotoFirst(context, input, image);
  } else if (template === "bold-stat") {
    renderBoldStat(context, input, image);
  } else {
    renderEditorial(context, input, image);
  }

  context.restore();
}

export function socialStoryCanvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Unable to encode story PNG."));
      }, "image/png");
    } catch (error) {
      reject(error);
    }
  });
}

export function loadSocialStoryImage(src: string) {
  const candidates = getSocialStoryImageCandidates(src);

  return new Promise<HTMLImageElement>((resolve, reject) => {
    let candidateIndex = 0;

    const tryNextCandidate = () => {
      const candidate = candidates[candidateIndex];
      if (!candidate) {
        reject(new Error("Unable to load workout image."));
        return;
      }

      candidateIndex += 1;
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = tryNextCandidate;
      image.src = candidate;
    };

    tryNextCandidate();
  });
}

function getSocialStoryImageCandidates(src: string) {
  if (src.startsWith("/uploads/")) return [src, `/api${src}`];
  return [src];
}

function renderPhotoFirst(
  context: CanvasRenderingContext2D,
  input: SocialStoryInput,
  image: HTMLImageElement,
) {
  const values = getSocialStoryDisplayValues(input);
  drawCoverImage(context, image, 0, 0, SOCIAL_STORY_WIDTH, SOCIAL_STORY_HEIGHT);

  const topShade = context.createLinearGradient(0, 0, 0, 480);
  topShade.addColorStop(0, "rgba(7, 15, 12, 0.74)");
  topShade.addColorStop(1, "rgba(7, 15, 12, 0)");
  context.fillStyle = topShade;
  context.fillRect(0, 0, SOCIAL_STORY_WIDTH, 500);

  const bottomShade = context.createLinearGradient(0, 760, 0, SOCIAL_STORY_HEIGHT);
  bottomShade.addColorStop(0, "rgba(4, 10, 7, 0)");
  bottomShade.addColorStop(0.56, "rgba(4, 10, 7, 0.72)");
  bottomShade.addColorStop(1, "rgba(4, 10, 7, 0.96)");
  context.fillStyle = bottomShade;
  context.fillRect(0, 700, SOCIAL_STORY_WIDTH, SOCIAL_STORY_HEIGHT - 700);

  drawHopeBrand(context, 76, 104, "#ffffff", "#56d364");

  context.font = `600 30px ${SANS_FONT}`;
  context.textAlign = "right";
  context.fillStyle = "rgba(255,255,255,0.92)";
  context.fillText(values.date.toUpperCase(), SOCIAL_STORY_WIDTH - 76, 115);

  context.textAlign = "left";
  context.fillStyle = "#56d364";
  context.font = `700 32px ${SANS_FONT}`;
  context.fillText(values.duration.toUpperCase(), 76, 1390);

  if (values.caption) {
    context.fillStyle = "rgba(255,255,255,0.84)";
    context.font = `500 34px ${SANS_FONT}`;
    const captionLines = wrapWithContext(context, values.caption, 880, 2);
    drawLines(context, captionLines, 76, 1255, 48);
  }

  context.fillStyle = "#ffffff";
  context.font = `700 100px ${SANS_FONT}`;
  const activityLines = wrapWithContext(context, values.activity, 920, 2);
  drawLines(context, activityLines, 76, 1492, 108);

  const activityBottom = 1492 + Math.max(0, activityLines.length - 1) * 108;
  context.fillStyle = "rgba(255,255,255,0.34)";
  context.fillRect(76, activityBottom + 58, 928, 2);

  context.fillStyle = "#ffffff";
  context.font = `600 35px ${SANS_FONT}`;
  context.fillText(fitSingleLine(context, values.displayName, 928), 76, activityBottom + 130);
  context.fillStyle = "rgba(255,255,255,0.72)";
  context.font = `500 29px ${SANS_FONT}`;
  context.fillText(fitSingleLine(context, values.username, 928), 76, activityBottom + 178);
}

function renderBoldStat(
  context: CanvasRenderingContext2D,
  input: SocialStoryInput,
  image: HTMLImageElement,
) {
  const values = getSocialStoryDisplayValues(input);
  drawCoverImage(context, image, 0, 0, SOCIAL_STORY_WIDTH, SOCIAL_STORY_HEIGHT);
  context.fillStyle = "rgba(3, 19, 10, 0.66)";
  context.fillRect(0, 0, SOCIAL_STORY_WIDTH, SOCIAL_STORY_HEIGHT);

  const glow = context.createRadialGradient(880, 380, 20, 830, 420, 800);
  glow.addColorStop(0, "rgba(86, 211, 100, 0.56)");
  glow.addColorStop(1, "rgba(25, 108, 46, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, SOCIAL_STORY_WIDTH, SOCIAL_STORY_HEIGHT);

  drawHopeBrand(context, 76, 104, "#ffffff", "#b6ff7c");
  context.fillStyle = "rgba(255,255,255,0.86)";
  context.textAlign = "right";
  context.font = `600 30px ${SANS_FONT}`;
  context.fillText(values.date.toUpperCase(), SOCIAL_STORY_WIDTH - 76, 115);

  context.textAlign = "left";
  context.fillStyle = "rgba(255,255,255,0.7)";
  context.font = `700 32px ${SANS_FONT}`;
  context.fillText(input.language === "vi" ? "HÔM NAY" : "TODAY", 76, 530);

  context.fillStyle = "#ffffff";
  context.font = `800 340px ${SANS_FONT}`;
  context.fillText(values.durationValue, 60, 890);
  const numberWidth = context.measureText(values.durationValue).width;
  context.fillStyle = "#b6ff7c";
  context.font = `800 34px ${SANS_FONT}`;
  context.fillText(values.durationUnit, Math.min(780, 76 + numberWidth), 860);

  context.fillStyle = "#ffffff";
  context.font = `800 84px ${SANS_FONT}`;
  const activityLines = wrapWithContext(context, values.activity.toUpperCase(), 920, 2);
  drawLines(context, activityLines, 76, 1080, 94);

  if (values.caption) {
    context.fillStyle = "rgba(255,255,255,0.82)";
    context.font = `500 34px ${SANS_FONT}`;
    const captionLines = wrapWithContext(context, values.caption, 880, 2);
    drawLines(context, captionLines, 76, 1350, 50);
  }

  context.fillStyle = "rgba(255,255,255,0.28)";
  context.fillRect(76, 1660, 928, 2);
  context.fillStyle = "#ffffff";
  context.font = `600 36px ${SANS_FONT}`;
  context.fillText(fitSingleLine(context, values.displayName, 928), 76, 1740);
  context.fillStyle = "rgba(255,255,255,0.7)";
  context.font = `500 29px ${SANS_FONT}`;
  context.fillText(fitSingleLine(context, values.username, 928), 76, 1790);
}

function renderEditorial(
  context: CanvasRenderingContext2D,
  input: SocialStoryInput,
  image: HTMLImageElement,
) {
  const values = getSocialStoryDisplayValues(input);
  context.fillStyle = "#f3efe4";
  context.fillRect(0, 0, SOCIAL_STORY_WIDTH, SOCIAL_STORY_HEIGHT);

  drawHopeBrand(context, 64, 92, "#18231b", "#2ea043");
  context.textAlign = "right";
  context.fillStyle = "#536057";
  context.font = `600 27px ${SANS_FONT}`;
  context.fillText(values.date.toUpperCase(), SOCIAL_STORY_WIDTH - 64, 103);

  context.save();
  roundedRect(context, 64, 176, 952, 938, 12);
  context.clip();
  drawCoverImage(context, image, 64, 176, 952, 938);
  context.restore();

  context.fillStyle = "#2ea043";
  context.fillRect(64, 1172, 94, 8);
  context.fillStyle = "#18231b";
  context.textAlign = "left";
  context.font = `700 76px ${SERIF_FONT}`;
  const activityLines = wrapWithContext(context, values.activity, 952, 2);
  drawLines(context, activityLines, 64, 1285, 86);

  const activityBottom = 1285 + Math.max(0, activityLines.length - 1) * 86;
  context.fillStyle = "#536057";
  context.font = `700 28px ${SANS_FONT}`;
  context.fillText(values.duration.toUpperCase(), 64, activityBottom + 72);

  if (values.caption) {
    context.fillStyle = "#344039";
    context.font = `400 32px ${SERIF_FONT}`;
    const captionLines = wrapWithContext(context, values.caption, 880, 3);
    drawLines(context, captionLines, 64, activityBottom + 152, 48);
  }

  context.fillStyle = "#c9c5bb";
  context.fillRect(64, 1738, 952, 2);
  context.fillStyle = "#18231b";
  context.font = `600 32px ${SANS_FONT}`;
  context.fillText(fitSingleLine(context, values.displayName, 430), 64, 1810);
  context.textAlign = "right";
  context.fillStyle = "#667168";
  context.font = `500 27px ${SANS_FONT}`;
  context.fillText(fitSingleLine(context, values.username, 430), SOCIAL_STORY_WIDTH - 64, 1810);
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const crop = calculateCoverCrop(sourceWidth, sourceHeight, width, height);
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, x, y, width, height);
}

function drawHopeBrand(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  textColor: string,
  markColor: string,
) {
  context.textAlign = "left";
  context.fillStyle = markColor;
  context.beginPath();
  context.arc(x + 13, y - 12, 13, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = textColor;
  context.font = `800 42px ${SANS_FONT}`;
  context.fillText("HOPE", x + 42, y);
}

function wrapWithContext(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
) {
  return wrapSocialStoryText(text, maxWidth, maxLines, (value) => context.measureText(value).width);
}

function fitSingleLine(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  return (
    wrapSocialStoryText(text, maxWidth, 1, (value) => context.measureText(value).width)[0] ?? ""
  );
}

function drawLines(
  context: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
) {
  lines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}
