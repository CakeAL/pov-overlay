import { inject, provide, type InjectionKey } from "vue";
import { createEditor, type Editor } from "./createEditor";

const editorKey: InjectionKey<Editor> = Symbol("pov-editor");
export function provideEditor(): Editor {
  const editor = createEditor();
  provide(editorKey, editor);
  return editor;
}
export function useEditorContext(): Editor {
  const editor = inject(editorKey);
  if (!editor)
    throw new Error(
      "Editor components must be rendered inside the editor provider.",
    );
  return editor;
}
