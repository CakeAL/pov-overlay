import { escapeXml, type LocationAddress } from "./location";
import {
  roadIdentity,
  roadEnglishName,
  roadBadgeKey,
  type RoadBadge,
  type RoadInfoOptions,
} from "./roadIdentity";
import type { Widget } from "./types";
export const ROAD_INFO_SOURCE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 100"><text x="0" y="64" font-size="40" fill="{$Color}">{$Road}</text></svg>';
export const ROAD_BADGE_SOURCE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><rect x="4" y="4" width="192" height="92" rx="10" fill="#319543"/><text x="100" y="62" text-anchor="middle" font-size="30" fill="white">道路编号</text></svg>';
export const roadInfoHeight = (widget: Widget) =>
  Math.max(
    100,
    (widget.svg?.roadInfo?.nameFontSize ?? widget.typography?.fontSize ?? 40) *
      1.5 +
      (widget.svg?.roadInfo?.englishFontSize ??
        (widget.svg?.roadInfo?.nameFontSize ??
          widget.typography?.fontSize ??
          40) * 0.55) *
        1.5,
  );
export function roadInfoSvg(
  widget: Widget,
  address: LocationAddress | null | undefined,
  badge: RoadBadge | null | undefined,
) {
  const options: RoadInfoOptions = widget.svg?.roadInfo ?? {},
    identity = roadIdentity(address, options);
  const visibleBadge =
    options.mode !== "name" &&
    identity &&
    badge &&
    roadBadgeKey(identity) === roadBadgeKey(badge)
      ? badge
      : null;
  if (options.mode === "badge") {
    if (!visibleBadge)
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"></svg>';
    return visibleBadge.source.replace(
      /<svg\b([^>]*)>/,
      (_, attrs: string) =>
        `<svg${attrs.replace(/\s(?:width|height)="[^"]*"/g, "")} width="100%" height="100%" preserveAspectRatio="xMinYMid">`,
    );
  }
  const raw = address?.road || "—",
    name = identity?.name ?? raw;
  const caption =
    options.showEnglish !== false
      ? (identity?.english ?? roadEnglishName(raw))
      : undefined;
  const canvasHeight = roadInfoHeight(widget);
  const height = Math.max(
    20,
    Math.min(160, canvasHeight - 12, (widget.typography?.fontSize ?? 40) * 2.2),
  );
  const badgeWidth = visibleBadge
    ? (height * visibleBadge.width) / visibleBadge.height
    : 0;
  const gap = visibleBadge ? 18 : 0,
    after = options.badgePosition === "after";
  const nameSize = options.nameFontSize ?? widget.typography?.fontSize ?? 40;
  const englishSize = options.englishFontSize ?? nameSize * 0.55;
  const estimate = (text: string, size: number) =>
    [...text].reduce(
      (n, char) => n + (/[^\x00-\xff]/.test(char) ? size : size * 0.6),
      0,
    );
  const available = 720 - badgeWidth - gap;
  const textWidth = Math.min(
    available,
    Math.max(
      estimate(name, nameSize),
      caption ? estimate(caption, englishSize) : 0,
    ),
  );
  const nameX = visibleBadge && !after ? badgeWidth + gap : 0;
  const color = /^#[0-9a-f]{6}$/i.test(widget.color) ? widget.color : "#ffffff";
  const line = (text: string, y: number, size: number) =>
    `<text x="${nameX}" y="${y}" font-size="${size}"${estimate(text, size) > available ? ` textLength="${available}" lengthAdjust="spacingAndGlyphs"` : ""}>${escapeXml(text)}</text>`;
  let body =
    line(
      name,
      caption
        ? (canvasHeight - nameSize - englishSize - 8) / 2 + nameSize
        : canvasHeight / 2 + nameSize * 0.35,
      nameSize,
    ) +
    (caption
      ? line(
          caption,
          (canvasHeight - nameSize - englishSize - 8) / 2 +
            nameSize +
            8 +
            englishSize,
          englishSize,
        )
      : "");
  if (visibleBadge) {
    const x = after ? textWidth + gap : 0,
      y = (canvasHeight - height) / 2;
    body += visibleBadge.source.replace(
      /<svg\b([^>]*)>/,
      (_, attrs: string) =>
        `<svg${attrs.replace(/\s(?:width|height)="[^"]*"/g, "")} x="${x}" y="${y}" width="${badgeWidth}" height="${height}">`,
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 ${canvasHeight}" fill="${color}" font-family="sans-serif">${body}</svg>`;
}
