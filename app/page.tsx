import type { Metadata } from "next";
import HomeStorefront from "@/components/home/HomeStorefront";

const HOME_TITLE = "AteFlo | AI Workflow Kits for Real Work";
const HOME_DESCRIPTION =
  "AteFlo helps you build AI workflow kits with structured prompts, examples, checklists, and action plans for real work.";

export const metadata: Metadata = {
  title: {
    absolute: HOME_TITLE,
  },
  description: HOME_DESCRIPTION,
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
  twitter: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
};

export const revalidate = 0;

export default function Home() {
  return <HomeStorefront />;
}
