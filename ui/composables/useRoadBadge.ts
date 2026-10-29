import { computed, ref, watch, onBeforeUnmount, type Ref } from "vue";
import type { Widget } from "../domain/types";
import type { LocationAddress } from "../domain/location";
import {
  roadIdentity,
  roadBadgeKey,
  type RoadBadge,
} from "../domain/roadIdentity";
import { roadBadgeFor } from "../infrastructure/roadBadges";
export function useRoadBadge(
  widget: Ref<Widget>,
  address: Ref<LocationAddress | null>,
  report: (reason: unknown) => void,
) {
  const badge = ref<RoadBadge | null>(null);
  let revision = 0;
  const identity = computed(() =>
    widget.value.visible && widget.value.scale > 0 && widget.value.svg?.roadInfo
      ? roadIdentity(address.value, widget.value.svg.roadInfo)
      : null,
  );
  watch(
    () => (identity.value ? roadBadgeKey(identity.value) : ""),
    async () => {
      const current = ++revision;
      badge.value = null;
      if (!identity.value) return;
      try {
        const value = await roadBadgeFor(identity.value);
        if (current === revision) badge.value = value;
      } catch (reason) {
        if (current === revision) report(reason);
      }
    },
    { immediate: true },
  );
  onBeforeUnmount(() => revision++);
  return badge;
}
