import { escapeXml, type LocationAddress } from "./location";
import {
  roadIdentity,
  roadBadgeKey,
  type RoadBadge,
  type RoadInfoOptions,
} from "./roadIdentity";
import type { Widget } from "./types";
export const ROAD_INFO_SOURCE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 100"><text x="0" y="64" font-size="40" fill="{$Color}">{$Road}</text></svg>';
export const roadInfoHeight = (widget: Widget) =>
  Math.max(100, (widget.typography?.fontSize ?? 40) * 2.5);
export function roadInfoSvg(
  widget: Widget,
  address: LocationAddress | null | undefined,
  badge: RoadBadge | null | undefined,
) {
  const options: RoadInfoOptions = widget.svg?.roadInfo ?? {},
    identity = roadIdentity(address, options);
  const visibleBadge =
    identity && badge && roadBadgeKey(identity) === roadBadgeKey(badge)
      ? badge
      : null;
  const raw = address?.road || "—",
    name = identity?.name ?? raw;
  const caption = options.showEnglish !== false ? identity?.english : undefined;
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
  const nameSize = widget.typography?.fontSize ?? 40;
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
      caption ? estimate(caption, nameSize * 0.55) : 0,
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
        ? canvasHeight / 2 + nameSize * 0.05
        : canvasHeight / 2 + nameSize * 0.35,
      nameSize,
    ) +
    (caption
      ? line(caption, canvasHeight / 2 + nameSize * 0.77, nameSize * 0.55)
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
