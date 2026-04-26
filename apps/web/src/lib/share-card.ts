import { toPng } from "html-to-image";

async function nodeToPng(node: HTMLElement): Promise<string> {
  // Wait for any in-progress images to settle so the canvas snapshot is complete.
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
