import { useSignTextEditing } from "./useSignTextEditing";
import { applySignTextEdits } from "../infrastructure/signTextTransforms";
import type { SignArtwork } from "../domain/signs/textLayout";
import { SIGN_EXAMPLES } from "../domain/signs/examples";
import { computed, ref, watch } from "vue";
import {
  newSignDesign,
  validateSign,
  signCategory,
  type SignDesign,
  type SignTemplate,
  type SignCategory,
} from "../domain/signs/model";
import { renderSign } from "../domain/signs/render";
import { outlineSignArtwork } from "../infrastructure/signFonts";
import { saveSvg } from "../infrastructure/saveSvg";
import type { Playback } from "./usePlayback";
import type { EditorMessages } from "./useMessages";
export function useSignMaker(playback: Playback, messages: EditorMessages) {
  const pageOpen = ref(false),
    busy = ref(false),
    loading = ref(false),
    baseArtwork = ref<SignArtwork | null>(null),
    error = ref(""),
    category = ref<SignCategory>("names");
  const items = ref<{ id: string; design: SignDesign }[]>(
      SIGN_EXAMPLES.map((e) => ({
        id: crypto.randomUUID(),
        design: {
          ...JSON.parse(JSON.stringify(e.design)),
          destinations: e.design.destinations.map((row) => ({
            ...row,
            id: crypto.randomUUID(),
          })),
        } as SignDesign,
      })),
    ),
    selectedId = ref(items.value[0]?.id ?? ""),
    zoom = ref(100);
  const visibleItems = computed(() =>
    items.value.filter(
      (i) => signCategory(i.design.template) === category.value,
    ),
  );
  const design = computed(
    () => items.value.find((i) => i.id === selectedId.value)?.design ?? null,
  );
  const preview = computed(() => {
    try {
      return design.value ? renderSign(design.value) : null;
    } catch {
      return null;
    }
  });
  const artwork = computed(() =>
    baseArtwork.value
      ? applySignTextEdits(baseArtwork.value, design.value?.textEdits)
      : null,
  );
  const source = computed(() => artwork.value?.source ?? "");
  const textEditing = useSignTextEditing(design, artwork);
  watch(selectedId, () => {
    baseArtwork.value = null;
    textEditing.select("");
  });
  const validation = computed(() => {
    try {
      if (design.value) validateSign(design.value);
      return "";
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  });
  watch(category, () => {
    selectedId.value = visibleItems.value[0]?.id ?? "";
  });
  let revision = 0;
  watch([() => preview.value?.source, pageOpen, selectedId], async () => {
    const current = ++revision;
    if (!pageOpen.value) return;
    error.value = "";
    loading.value = true;
    try {
      if (!preview.value) {
        if (design.value) throw new Error(validation.value || "请检查输入。");
        return;
      }
      const value = await outlineSignArtwork(preview.value.source);
      if (current === revision) baseArtwork.value = value;
    } catch (e) {
      if (current === revision) {
        baseArtwork.value = null;
        error.value = e instanceof Error ? e.message : String(e);
      }
    } finally {
      if (current === revision) loading.value = false;
    }
  });
  function add(template: string) {
    if (items.value.length >= 100) {
      messages.report(new Error("最多制作 100 个标牌。"));
      return;
    }
    const design = newSignDesign(template as SignTemplate),
      id = crypto.randomUUID();
    design.destinations.forEach((row) => (row.id = crypto.randomUUID()));
    items.value.push({ id, design });
    selectedId.value = id;
  }
  function remove(id: string) {
    items.value = items.value.filter((i) => i.id !== id);
    if (id === selectedId.value)
      selectedId.value = visibleItems.value[0]?.id ?? "";
  }
  function move(id: string, delta: number) {
    const index = items.value.findIndex((i) => i.id === id),
      target = visibleItems.value.findIndex((i) => i.id === id) + delta;
    if (index < 0 || target < 0 || target >= visibleItems.value.length) return;
    const other = items.value.findIndex(
      (i) => i.id === visibleItems.value[target]!.id,
    );
    [items.value[index], items.value[other]] = [
      items.value[other]!,
      items.value[index]!,
    ];
  }
  function open() {
    playback.playing.value = false;
    playback.video.value?.pause();
    pageOpen.value = true;
  }
  async function download() {
    if (!source.value || validation.value || busy.value) return;
    busy.value = true;
    try {
      if (await saveSvg(source.value, preview.value!.label))
        messages.notice.value = "SVG 已导出。";
    } catch (e) {
      messages.report(e);
    } finally {
      busy.value = false;
    }
  }
  return {
    pageOpen,
    busy,
    loading,
    source,
    artwork,
    textEditing,
    error,
    category,
    items,
    visibleItems,
    selectedId,
    design,
    zoom,
    preview,
    validation,
    open,
    download,
    add,
    remove,
    move,
  };
}
