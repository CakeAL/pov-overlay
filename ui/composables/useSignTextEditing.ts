import { computed, ref, watch, type Ref } from "vue";
import type { SignDesign } from "../domain/signs/model";
import {
  editedTextBox,
  type SignArtwork,
  type SignTextItem,
} from "../domain/signs/textLayout";
export function useSignTextEditing(
  design: Ref<SignDesign | null>,
  artwork: Ref<SignArtwork | null>,
) {
  const selectedKey = ref("");
  const selected = computed(
    () => artwork.value?.texts.find((t) => t.key === selectedKey.value) ?? null,
  );
  const ratio = computed(() =>
    design.value && artwork.value
      ? design.value.outputWidth / artwork.value.width
      : 1,
  );
  const position = computed(() =>
    selected.value
      ? {
          x: selected.value.bounds.x * ratio.value,
          y: selected.value.bounds.y * ratio.value,
          height: selected.value.bounds.height * ratio.value,
        }
      : null,
  );
  function select(key: string) {
    selectedKey.value = key;
  }
  function set(item: SignTextItem, x: number, y: number, scale: number) {
    if (!design.value || !artwork.value) return;
    const result = editedTextBox(
      item.base,
      { offsetX: x - item.base.x, offsetY: y - item.base.y, scale },
      artwork.value,
    );
    (design.value.textEdits ??= {})[item.key] = result.edit;
  }
  function update(field: "x" | "y" | "height", value: number | undefined) {
    const item = selected.value;
    if (
      !item ||
      !Number.isFinite(value) ||
      !design.value ||
      (field === "height" && value! <= 0)
    )
      return;
    const p = { ...position.value!, [field]: value! };
    set(
      item,
      p.x / ratio.value,
      p.y / ratio.value,
      p.height / ratio.value / item.base.height,
    );
  }
  function move(key: string, x: number, y: number, scale?: number) {
    const item = artwork.value?.texts.find((t) => t.key === key);
    if (item) set(item, x, y, scale ?? item.bounds.height / item.base.height);
  }
  function reset(all = false) {
    if (!design.value) return;
    if (all) design.value.textEdits = {};
    else if (design.value.textEdits)
      delete design.value.textEdits[selectedKey.value];
  }
  watch(
    () => artwork.value?.texts.map((t) => t.key).join(","),
    () => {
      if (selectedKey.value && !selected.value) selectedKey.value = "";
    },
  );
  return {
    selectedKey,
    selected,
    position,
    ratio,
    select,
    update,
    move,
    reset,
  };
}
