export const rawPortfolio = {
  person: {
    name: "Joshua Hughes",
    role: "Staff Front-End Engineer",
    location: "Toronto, Ontario",
    email: "joshuah@tcd.ie",
    summary:
      "I’m a software engineer with more than 12 years of experience building products and improving large existing codebases. I work on systems that need to evolve while teams continue shipping new work.",
    contactMessage: "You can reach me by email.",
  },
  caseStudies: [
    {
      id: "frontend-modernization",
      number: "01",
      title: "Frontend platform modernization",
      organization: "Arteria AI",
      period: "2025—present",
      summary:
        "Modernized an existing React frontend and built a modular replacement platform used by three applications.",
      context:
        "The product was spread across five repositories and two Git submodules. Related workflows lived on separate pages, shared code needed manual rebuilds, and the build and test setup had become slow.",
      decisions: [
        "Combined the legacy repositories into one workspace so teams could improve the current product while the new platform was being built.",
        "Built the new platform from product-focused modules that could run in the web app or another host, including Microsoft Word.",
        "Added strict TypeScript, generated API clients, runtime validation, architecture documentation and CI checks.",
      ],
      technologies: ["React", "TypeScript", "Rspack", "SWC", "TanStack Query", "Orval", "Zod"],
    },
    {
      id: "design-system",
      number: "02",
      title: "Design system and TypeScript adoption",
      organization: "Quartermaster",
      period: "2023—2025",
      summary:
        "Built the company’s first design system and helped move important product flows to TypeScript.",
      context:
        "Teams working on two web products were building similar interface patterns separately. Components in Figma did not always map cleanly to the code used in production.",
      decisions: [
        "Built and documented more than 30 reusable React components in Storybook.",
        "Worked with product designers to keep component names and properties aligned between Figma and production code.",
        "Moved the most heavily used product flows to TypeScript first and used Sentry data to choose where to focus reliability work.",
      ],
      technologies: ["React", "TypeScript", "Storybook", "Figma", "React Native", "Sentry"],
    },
    {
      id: "timely-product",
      number: "03",
      title: "Product work and TypeScript migration",
      organization: "Memory",
      period: "2018—2023",
      summary:
        "Built the Tasks and Planning features while helping migrate a large frontend from JavaScript and Flow to TypeScript.",
      context:
        "Timely’s roughly 300,000-line frontend covered time tracking, calendars, tasks and resource planning. The team needed to replace JavaScript and Flow without pausing product development.",
      decisions: [
        "Led the frontend work for the Tasks and Planning features.",
        "Migrated application code in stages so the team could continue releasing product changes.",
        "Replaced Moment.js with Luxon to reduce bundle size and fix performance and maintenance problems in date-heavy parts of the app.",
      ],
      technologies: ["React", "TypeScript", "Flow", "Luxon", "Jest"],
    },
  ],
  experience: [
    {
      organization: "Arteria AI",
      role: "Staff Front-End Engineer",
      period: "2025—present",
      description:
        "Working on product architecture, build tooling and a modular platform used across applications.",
    },
    {
      organization: "Quartermaster",
      role: "Senior Front-End Engineer",
      period: "2023—2025",
      description:
        "Built a shared design system and worked on React, React Native and TypeScript product code.",
    },
    {
      organization: "Memory",
      role: "Senior Front-End Engineer",
      period: "2018—2023",
      description:
        "Built features for Timely and helped migrate its frontend to TypeScript and Luxon.",
    },
    {
      organization: "Sportdec",
      role: "Front-End Engineer",
      period: "2016—2018",
      description:
        "Web and mobile products for live sports scores, statistics, news and prediction games.",
    },
  ],
};
