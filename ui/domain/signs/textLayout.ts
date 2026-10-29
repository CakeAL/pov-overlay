export interface TextBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface SignTextEdit {
  offsetX: number;
  offsetY: number;
  scale: number;
}
export interface SignTextItem {
  key: string;
  label: string;
  base: TextBox;
  bounds: TextBox;
  frame: { x: number; y: number; scale: number };
  local: TextBox;
}
export interface SignArtwork {
  source: string;
  texts: SignTextItem[];
  width: number;
  height: number;
}
export function editedTextBox(
  base: TextBox,
  edit: Partial<SignTextEdit> | undefined,
  board: { width: number; height: number },
) {
  const rawScale = edit?.scale ?? 1,
    dx = edit?.offsetX ?? 0,
    dy = edit?.offsetY ?? 0;
  if (![rawScale, dx, dy].every(Number.isFinite) || rawScale <= 0)
    throw new Error("文字位置或大小无效。");
  const maximum = Math.min(
    8,
    board.width / base.width,
    board.height / base.height,
  );
  const scale = Math.max(Math.min(0.05, maximum), Math.min(maximum, rawScale));
  const width = base.width * scale,
    height = base.height * scale;
  const x = Math.max(0, Math.min(board.width - width, base.x + dx));
  const y = Math.max(0, Math.min(board.height - height, base.y + dy));
  return {
    bounds: { x, y, width, height },
    edit: { offsetX: x - base.x, offsetY: y - base.y, scale },
  };
}
