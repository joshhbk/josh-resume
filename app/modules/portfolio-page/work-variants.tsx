import type { ComponentType } from "react";

import type { Portfolio } from "../portfolio-content/model";
import {
  FieldGuidePrompt,
  FieldGuideWork,
  PaperTheatrePrompt,
  PaperTheatreWork,
} from "./work-variants-guide-theatre";
import {
  LiftCityPrompt,
  LiftCityWork,
  StreetcarPrompt,
  StreetcarWork,
} from "./work-variants-lift-transit";
import { PostcardsPrompt, PostcardsWork } from "./work-variants-postcards";
import type { WorkVariant } from "./work-variant-options";

const variants = {
  lift: { Prompt: LiftCityPrompt, Work: LiftCityWork },
  transit: { Prompt: StreetcarPrompt, Work: StreetcarWork },
  guide: { Prompt: FieldGuidePrompt, Work: FieldGuideWork },
  theatre: { Prompt: PaperTheatrePrompt, Work: PaperTheatreWork },
  postcards: { Prompt: PostcardsPrompt, Work: PostcardsWork },
} satisfies Record<
  WorkVariant,
  { Prompt: ComponentType; Work: ComponentType<{ studies: Portfolio["caseStudies"] }> }
>;

export function WorkPrompt({ variant }: { variant: WorkVariant }) {
  const Prompt = variants[variant].Prompt;
  return <Prompt />;
}

export function WorkSection({
  variant,
  studies,
}: {
  variant: WorkVariant;
  studies: Portfolio["caseStudies"];
}) {
  const Work = variants[variant].Work;
  return <Work studies={studies} />;
}
