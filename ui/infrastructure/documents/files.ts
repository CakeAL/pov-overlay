import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { native } from "../media";
export async function readNativeDocument(): Promise<string | null> {
  const path = await open({
    multiple: false,
    filters: [{ name: "POV JSON", extensions: ["json"] }],
  });
  return typeof path === "string"
    ? invoke<string>("read_document", { path })
    : null;
}
export async function saveDocument(
  name: string,
  content: string,
  kind: "preset" | "project",
): Promise<boolean> {
  if (content.length > 100 * 1024 * 1024)
    throw new Error("工程不能超过 100 MB。");
  if (native) {
    await invoke("save_library_document", { kind, id: name, content });
  } else {
    const url = URL.createObjectURL(
        new Blob([content], { type: "application/json" }),
      ),
      link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return true;
}

export interface LibraryEntry { id: string; name: string; modifiedMs: number }
export const listLibrary = (kind: 'project' | 'preset') => invoke<LibraryEntry[]>('list_library_documents', { kind });
export const readLibrary = (kind: 'project' | 'preset', id: string) => invoke<string>('read_library_document', { kind, id });
