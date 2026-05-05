import { toPng } from "html-to-image";

/**
 * Fetch a remote image and return a data URL. Used to swap cross-origin
 * `<img src>` values in the share card before snapshotting — html-to-image
 * taints the canvas when images come from origins without CORS headers
 * (e.g. Perfect Corp's S3 result URLs), which makes toPng throw.
 */
async function urlToDataUrl(url: string): Promise<string> {
  if (!url || url.startsWith("data:")) return url;
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`fetch image failed (${res.status}): ${url}`);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function inlineImages(node: HTMLElement): Promise<void> {
  const imgs = Array.from(node.querySelectorAll("img"));
  await Promise.all(imgs.map(async (img) => {
    const src = img.getAttribute("src");
    if (!src || src.startsWith("data:")) return;
    try {
      const dataUrl = await urlToDataUrl(src);
      img.setAttribute("src", dataUrl);
      // Wait until the browser has decoded the new src so the snapshot includes it.
      await img.decode().catch(() => undefined);
    } catch (err) {
      console.warn("[share-card] failed to inline image, leaving as-is:", src, err);
    }
  }));
}

async function nodeToPng(node: HTMLElement): Promise<string> {
  await inlineImages(node);
  // Belt-and-braces: wait for any still-loading <img> to settle.
  const imgs = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise<void>((res) => { img.onload = img.onerror = () => res(); }),
    ),
  );
  return toPng(node, {
    pixelRatio: 2,
    backgroundColor: "#0a0a0f",
    skipFonts: false,
    cacheBust: true,
  });
}

export async function exportCard(node: HTMLElement, fileName = "glow-forecast.png"): Promise<Blob> {
  const dataUrl = await nodeToPng(node);
  const res = await fetch(dataUrl);
  const blob = await res.blob();

  // Trigger download.
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();

  return blob;
}

export async function shareCard(node: HTMLElement): Promise<boolean> {
  const dataUrl = await nodeToPng(node);
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const file = new File([blob], "glow-forecast.png", { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: "My Glow Forecast",
        text: "I just saw my future skin and styled my next look — try it: ",
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
