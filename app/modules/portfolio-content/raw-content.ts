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
        "Two web products began sharing the same documented component library, with matching language in Figma and production code.",
      context:
        "The product teams maintained separate versions of similar interface patterns, and Figma components did not reliably correspond to the components in production.",
      contributions: [
        "Built and documented more than 30 reusable React components in Storybook.",
        "Agreed component names and properties with product designers so the design and code libraries stayed aligned.",
        "Moved the most heavily used product flows to TypeScript first and used Sentry data to prioritize reliability work.",
      ],
    },
    {
      id: "timely-product",
      title: "Product work and TypeScript migration",
      organization: "Memory",
      period: "2018—2023",
      summary:
        "Timely’s frontend changed type systems and date libraries while new product work continued.",
      context:
        "The roughly 300,000-line application covered time tracking, calendars, tasks and resource planning. A wholesale rewrite was not practical.",
      contributions: [
        "Led frontend delivery for the Tasks and Planning features from early product work through release.",
        "Migrated JavaScript and Flow code in stages so releases could continue throughout the transition.",
        "Replaced Moment.js with Luxon to reduce bundle size and fix performance and maintenance problems in date-heavy parts of the app.",
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
