export const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
export const dateText = (value: number | null | undefined) =>
  value == null
    ? "—"
    : new Date(value).toLocaleString("zh-CN", { hour12: false });
