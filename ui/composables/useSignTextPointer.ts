import { ref } from "vue";
import type { SignTextItem } from "../domain/signs/textLayout";
interface Frame {
  left: number;
  top: number;
  width: number;
  height: number;
}
export function useSignTextPointer() {
  const active = ref(false);
  let start: {
    key: string;
    resize: boolean;
    x: number;
    y: number;
    item: SignTextItem;
    frame: Frame;
    board: { width: number; height: number };
  } | null = null;
  function begin(
    item: SignTextItem,
    resize: boolean,
    x: number,
    y: number,
    frame: Frame,
    board: { width: number; height: number },
  ) {
    start = { key: item.key, resize, x, y, item, frame, board };
    active.value = true;
  }
  function move(x: number, y: number) {
    if (!start) return null;
    const { item, board, frame } = start;
    const dx = ((x - start.x) * board.width) / frame.width,
      dy = ((y - start.y) * board.height) / frame.height;
    const scale = start.resize
      ? Math.max(
          0.05,
          (item.bounds.width + dx) / item.base.width,
          (item.bounds.height + dy) / item.base.height,
        )
      : item.bounds.height / item.base.height;
    return {
      key: start.key,
      x: item.bounds.x + (start.resize ? 0 : dx),
      y: item.bounds.y + (start.resize ? 0 : dy),
      scale,
    };
  }
  function end() {
    start = null;
    active.value = false;
  }
  return { active, begin, move, end };
}
