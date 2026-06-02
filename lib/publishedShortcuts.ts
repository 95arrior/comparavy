import { getPublishedGuides } from "@/lib/guides";
import { toDiscoveryItem } from "@/lib/shortcutDiscovery";

export function getPublishedShortcutDiscoveryItems() {
  return getPublishedGuides().map(toDiscoveryItem);
}
