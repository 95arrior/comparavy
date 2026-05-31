import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "What Are You Trying to Finish?",
  description:
    "Answer what you are trying to finish and get a practical AI tool shortlist for the workflow.",
  openGraph: {
    title: "What are you trying to finish? | AteFlo",
    description:
      "Answer what you are trying to finish and get a practical AI tool shortlist for the workflow.",
  },
  twitter: {
    card: "summary",
    title: "What are you trying to finish? | AteFlo",
    description:
      "Answer what you are trying to finish and get a practical AI tool shortlist for the workflow.",
  },
};

export default function FinderLayout({ children }: { readonly children: ReactNode }) {
  return children;
}
