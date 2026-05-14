import QRCode from "qrcode";

export const SAANA_QR_LOGO_PATH =
  "/brand/logos/saanaos-cloche-circuit-icon.svg";

const SAANA_NAVY = "#071E41";
const SAANA_BACKGROUND = "#FFFFFF";
const ALLOWED_LOGO_PATHS = new Set([SAANA_QR_LOGO_PATH]);

type BrandLogoOption = "saanaos";

export type BrandedQrOptions = {
  input: string;
  size: number;
  branded?: boolean;
  brandLogo?: BrandLogoOption;
  logoPath?: string;
  darkColor?: string;
  lightColor?: string;
  margin?: number;
};

type BrandedQrResult = {
  branded: boolean;
};

function getAllowedLogoPath(options: BrandedQrOptions) {
  if (options.brandLogo === "saanaos") {
    return SAANA_QR_LOGO_PATH;
  }

  if (options.logoPath && ALLOWED_LOGO_PATHS.has(options.logoPath)) {
    return options.logoPath;
  }

  return null;
}

function loadLogo(path: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("QR logo could not be loaded."));
    image.src = path;
  });
}

function drawRoundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

async function overlayLogo(canvas: HTMLCanvasElement, logoPath: string) {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("QR canvas context is unavailable.");
  }

  const logo = await loadLogo(logoPath);
  const qrWidth = canvas.width;
  const logoSize = Math.round(qrWidth * 0.18);
  const padding = Math.round(qrWidth * 0.035);
  const backingSize = logoSize + padding * 2;
  const backingX = Math.round((qrWidth - backingSize) / 2);
  const backingY = Math.round((qrWidth - backingSize) / 2);
  const logoX = backingX + padding;
  const logoY = backingY + padding;

  context.save();
  drawRoundRect(
    context,
    backingX,
    backingY,
    backingSize,
    backingSize,
    Math.round(qrWidth * 0.025)
  );
  context.fillStyle = SAANA_BACKGROUND;
  context.fill();
  context.drawImage(logo, logoX, logoY, logoSize, logoSize);
  context.restore();
}

export async function drawBrandedQrToCanvas(
  canvas: HTMLCanvasElement,
  options: BrandedQrOptions
): Promise<BrandedQrResult> {
  const dark = options.darkColor || SAANA_NAVY;
  const light = options.lightColor || SAANA_BACKGROUND;

  await QRCode.toCanvas(canvas, options.input, {
    errorCorrectionLevel: "H",
    margin: options.margin ?? 2,
    width: options.size,
    color: {
      dark,
      light,
    },
  });

  const logoPath = options.branded === false ? null : getAllowedLogoPath(options);
  if (!logoPath) {
    return { branded: false };
  }

  try {
    await overlayLogo(canvas, logoPath);
    return { branded: true };
  } catch {
    return { branded: false };
  }
}

function trustedUrlText(input: string) {
  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, "");
    return `Only order from: ${host}${url.pathname}`;
  } catch {
    return `Only order from: ${input}`;
  }
}

export function getTrustedQrUrlText(input: string) {
  return trustedUrlText(input);
}

export async function createBrandedQrDataUrl(
  options: BrandedQrOptions & {
    includeTrustedUrlText?: boolean;
    mimeType?: string;
  }
) {
  const qrCanvas = document.createElement("canvas");
  await drawBrandedQrToCanvas(qrCanvas, options);

  if (!options.includeTrustedUrlText) {
    return qrCanvas.toDataURL(options.mimeType || "image/png");
  }

  const text = trustedUrlText(options.input);
  const textHeight = Math.round(options.size * 0.16);
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = options.size;
  outputCanvas.height = options.size + textHeight;

  const context = outputCanvas.getContext("2d");
  if (!context) {
    return qrCanvas.toDataURL(options.mimeType || "image/png");
  }

  context.fillStyle = SAANA_BACKGROUND;
  context.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
  context.drawImage(qrCanvas, 0, 0);
  context.fillStyle = SAANA_NAVY;
  context.font = `700 ${Math.round(options.size * 0.032)}px Arial, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, options.size / 2, options.size + textHeight / 2);

  return outputCanvas.toDataURL(options.mimeType || "image/png");
}
