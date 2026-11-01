/**
 * Turns a profile photo into a cut-out (transparent background, trimmed to the person), like the
 * classic template's original portrait. Runs entirely in the browser with MODNet (Apache-2.0) via
 * transformers.js, so it costs nothing and the photo isn't sent anywhere. Browser-only.
 */

// Inference size: big enough for clean edges, small enough to be quick on a laptop.
const MAX_INPUT = 1024;
// Final cut-out height cap, to keep stored files small.
const MAX_OUTPUT_HEIGHT = 900;
// Alpha below this counts as background when trimming (MODNet leaves faint haze at the edges).
const ALPHA_FLOOR = 24;

type Segmenter = (input: unknown) => Promise<{ data: Uint8ClampedArray; width: number; height: number; channels: number; toCanvas(): HTMLCanvasElement | OffscreenCanvas }>;

let segmenterPromise: Promise<Segmenter> | null = null;

/** Downloads the model once per page (the browser caches it for next time, ~25 MB). */
function getSegmenter() {
  segmenterPromise ??= import("@huggingface/transformers").then(
    async ({ pipeline }) => (await pipeline("background-removal", "Xenova/modnet")) as unknown as Segmenter,
  );
  segmenterPromise.catch(() => {
    segmenterPromise = null; // let a later attempt retry after a network error
  });
  return segmenterPromise;
}

/** Decodes the file and scales it down so the longest side is at most `max` px. */
async function loadScaled(file: File, max: number) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

/** The smallest box containing every visible pixel, or null if the cut-out is empty. */
function visibleBounds(data: Uint8ClampedArray, width: number, height: number) {
  let top = height, left = width, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > ALPHA_FLOOR) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        bottom = y;
      }
    }
  }
  return right < 0 ? null : { left, top, width: right - left + 1, height: bottom - top + 1 };
}

/**
 * Returns a transparent PNG of just the person. Throws if the model can't load
 * or finds no one in the photo; callers should fall back to the original image.
 */
export async function makeCutout(file: File): Promise<Blob> {
  const [segment, input] = await Promise.all([getSegmenter(), loadScaled(file, MAX_INPUT)]);
  const { RawImage } = await import("@huggingface/transformers");
  const result = await segment(await RawImage.read(input));
  if (result.channels !== 4) throw new Error("Unexpected cut-out format.");

  const box = visibleBounds(result.data, result.width, result.height);
  // Almost nothing kept means the model didn't find a person; don't return an empty image.
  if (!box || box.width * box.height < result.width * result.height * 0.03) throw new Error("No person found in the photo.");

  const scale = Math.min(1, MAX_OUTPUT_HEIGHT / box.height);
  const out = document.createElement("canvas");
  out.width = Math.round(box.width * scale);
  out.height = Math.round(box.height * scale);
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(result.toCanvas() as CanvasImageSource, box.left, box.top, box.width, box.height, 0, 0, out.width, out.height);

  return new Promise((resolve, reject) =>
    out.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't encode the cut-out."))), "image/png"),
  );
}
