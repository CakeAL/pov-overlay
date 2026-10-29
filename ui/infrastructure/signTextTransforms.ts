import {
  editedTextBox,
  type SignArtwork,
  type SignTextEdit,
} from "../domain/signs/textLayout";
export function applySignTextEdits(
  artwork: SignArtwork,
  edits: Record<string, SignTextEdit> = {},
): SignArtwork {
  if (!Object.keys(edits).length) return artwork;
  const doc = new DOMParser().parseFromString(artwork.source, "image/svg+xml");
  const groups = new Map(
    [...doc.querySelectorAll("[data-sign-key]")].map((node) => [
      node.getAttribute("data-sign-key")!,
      node,
    ]),
  );
  const texts = artwork.texts.map((item) => {
    const edit = edits[item.key];
    if (!edit) return item;
    const result = editedTextBox(item.base, edit, artwork),
      { scale, offsetX, offsetY } = result.edit;
    const { x, y } = item.local;
    groups
      .get(item.key)
      ?.setAttribute(
        "transform",
        `translate(${offsetX / item.frame.scale} ${offsetY / item.frame.scale}) translate(${x} ${y}) scale(${scale}) translate(${-x} ${-y})`,
      );
    return { ...item, bounds: result.bounds };
  });
  return {
    ...artwork,
    texts,
    source: new XMLSerializer().serializeToString(doc.documentElement),
  };
}
