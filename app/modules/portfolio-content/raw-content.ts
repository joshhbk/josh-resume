export const rawPortfolio = {
  person: {
    name: "Joshua Hughes",
    role: "Staff Front-End Engineer",
    location: "Toronto, Ontario",
    email: "joshuah@tcd.ie",
    contactMessage: "You can reach me by email.",
  },
  caseStudies: [
    {
      id: "frontend-modernization",
      title: "Frontend platform modernization",
      organization: "Arteria AI",
      period: "2025—present",
      summary:
        "I’m helping replace a mature frontend with a shared platform that supports several product experiences.",
      context:
        "Related workflows, shared code and delivery tooling had evolved separately, making the frontend harder to change consistently. Build and test feedback had also slowed.",
      contributions: [
        "Brought related frontend work into a shared development environment so the existing product and its replacement could evolve together.",
        "Structured the new platform around reusable product modules that can support different environments.",
        "Improved build and test tooling, type safety, API integration and automated checks.",
      ],
    },
    {
      id: "design-system",
      title: "Design system and TypeScript adoption",
      organization: "Quartermaster",
      period: "2023—2025",
      summary:
        "Design and engineering gained a shared component language that could be used across products.",
      context:
        "Similar interface patterns had evolved separately across products, and the design library did not always map cleanly to production code.",
      contributions: [
        "Built and documented reusable components for web and mobile product work.",
        "Worked with designers to align component structure and terminology between design and code.",
        "Moved established product areas to TypeScript and used production data to prioritize reliability improvements.",
      ],
    },
    {
      id: "timely-product",
      title: "Product work and TypeScript migration",
      organization: "Memory",
      period: "2018—2023",
      summary: "Maintained feature delivery while helping modernize a large, established frontend.",
      context:
        "The application covered several connected product areas and combined newer code with older typing and date-handling approaches. A wholesale rewrite was not practical.",
      contributions: [
        "Led frontend delivery for new planning and task-management features.",
        "Migrated legacy code toward TypeScript incrementally so regular releases could continue.",
        "Replaced a legacy date library to reduce bundle size and improve reliability in date-heavy workflows.",
      ],
    },
  ],
  experience: [
    {
      organization: "Arteria AI",
      role: "Staff Front-End Engineer",
      period: "2025—present",
    },
    {
      organization: "Quartermaster",
      role: "Senior Front-End Engineer",
      period: "2023—2025",
    },
    {
      organization: "Memory",
      role: "Senior Front-End Engineer",
      period: "2018—2023",
    },
    {
      organization: "Sportdec",
      role: "Front-End Engineer",
      period: "2016—2018",
    },
  ],
};
