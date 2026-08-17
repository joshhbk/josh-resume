import { z } from "zod";

const caseStudySchema = z.object({
  id: z.string(),
  title: z.string(),
  organization: z.string(),
  period: z.string(),
  summary: z.string(),
  context: z.string(),
  contributions: z.array(z.string()).min(1),
});

const experienceSchema = z.object({
  organization: z.string(),
  role: z.string(),
  period: z.string(),
});

export const portfolioSchema = z.object({
  person: z.object({
    name: z.string(),
    role: z.string(),
    location: z.string(),
    profiles: z
      .array(
        z.object({
          platform: z.enum(["github", "linkedin"]),
          label: z.string().min(1),
          identity: z.string().min(1),
          url: z.url(),
        }),
      )
      .min(1),
    contactMessage: z.string(),
  }),
  caseStudies: z.array(caseStudySchema).min(1),
  experience: z.array(experienceSchema).min(1),
});

export type Portfolio = z.infer<typeof portfolioSchema>;
export type CaseStudy = Portfolio["caseStudies"][number];
