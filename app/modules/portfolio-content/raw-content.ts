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
        "Three applications now share a modular platform that can run on the web or inside Microsoft Word.",
      context:
        "The product was spread across five repositories and two Git submodules. Related workflows lived on separate pages, shared code needed manual rebuilds, and the build and test setup had become slow.",
      contributions: [
        "Combined the existing repositories into one workspace so the current product and its replacement could be developed together.",
        "Organized the replacement around product modules that remain independent of their host application.",
        "Reworked the build and test tooling and added strict TypeScript, generated API clients, runtime validation and CI checks.",
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
