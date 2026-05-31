import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Find the Right AI Shortcut",
  description:
    "Answer what you are trying to finish and get a practical AI tool shortlist for the workflow.",
  openGraph: {
    title: "Find the Right AI Shortcut | AteFlo",
    description:
      "Answer what you are trying to finish and get a practical AI tool shortlist for the workflow.",
  },
  twitter: {
    card: "summary",
    title: "Find the Right AI Shortcut | AteFlo",
    description:
      "Answer what you are trying to finish and get a practical AI tool shortlist for the workflow.",
  },
};

export default function FinderLayout({ children }: { readonly children: ReactNode }) {
  return children;
}
