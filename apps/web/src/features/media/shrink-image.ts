/** The longest side a picture in a post is kept at. Enough to fill a wide screen; small enough to load quickly. */
const MAX_SIDE = 1600;

/**
 * Makes a still picture small enough to send: scaled down so its longest side
 * is at most 1,600 pixels, and saved as WebP. Nothing is cut off. An animated
 * GIF is returned untouched, because redrawing it would keep only its first
 * frame. Rejects if the browser cannot open the file as a picture.
 */
export async function shrinkImage(file: File): Promise<Blob> {
  if (file.type === 'image/gif') return file;
  const url = URL.createObjectURL(file);
  try {
    const picture = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('That picture could not be opened.'));
      element.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(picture.naturalWidth, picture.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(picture.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(picture.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('That picture could not be opened.');
    context.imageSmoothingQuality = 'high';
    context.drawImage(picture, 0, 0, canvas.width, canvas.height);
    // WebP keeps transparency and is small. A browser that cannot write it gives PNG instead, which is also accepted.
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.86));
    if (!blob) throw new Error('That picture could not be opened.');
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}
