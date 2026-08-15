import { z } from "zod";

const caseStudySchema = z.object({
  id: z.string(),
  number: z.string(),
  title: z.string(),
  organization: z.string(),
  period: z.string(),
  summary: z.string(),
  context: z.string(),
  decisions: z.array(z.string()).min(1),
  technologies: z.array(z.string()).min(1),
});

const experienceSchema = z.object({
  organization: z.string(),
  role: z.string(),
  period: z.string(),
  description: z.string(),
});

export const portfolioSchema = z.object({
  person: z.object({
    name: z.string(),
    role: z.string(),
    location: z.string(),
    email: z.email(),
    summary: z.string(),
    contactMessage: z.string(),
  }),
  caseStudies: z.array(caseStudySchema).min(1),
  experience: z.array(experienceSchema).min(1),
});

export type Portfolio = z.infer<typeof portfolioSchema>;
export type CaseStudy = Portfolio["caseStudies"][number];
