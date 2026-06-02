import { permanentRedirect } from "next/navigation";

export default function ShortcutsRedirectPage() {
  permanentRedirect("/kits");
}
