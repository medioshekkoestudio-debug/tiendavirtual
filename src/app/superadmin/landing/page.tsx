import { getLandingContent } from "@/lib/landing";
import { LandingEditor } from "./editor";

export default async function LandingEditorPage() {
  const content = await getLandingContent();
  return <LandingEditor initial={content} />;
}
