import type { Metadata } from "next";
import { StaySurveyPageClient } from "@/components/survey/StaySurveyPageClient";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return {
    title: "Guest satisfaction survey · Casa Boho Coyoacán",
    description: "Short guest feedback survey after your stay.",
  };
}

export default function StaySurveyPage({
  params,
}: {
  params: { publicId: string };
}) {
  let publicId = params.publicId ?? "";
  try {
    publicId = decodeURIComponent(publicId);
  } catch {
    /* use raw */
  }
  publicId = publicId.trim();

  return <StaySurveyPageClient publicId={publicId} />;
}
