export const rawPortfolio = {
  person: {
    name: "Joshua Hughes",
    role: "Staff Front-End Engineer",
    location: "Toronto, Ontario",
    email: "joshuah@tcd.ie",
    summary:
      "I’m a front-end engineer with more than 12 years of experience. I work mainly with React and TypeScript, building product features and improving large existing codebases.",
    siteIntroduction:
      "This site documents selected projects from my recent roles and the frontend architecture, design-system and tooling work behind them.",
    contactMessage: "For questions about the work on this site, contact me by email.",
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
        "Working on React architecture, build tooling and a new modular frontend platform.",
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
  capabilities: [
    {
      title: "Frontend architecture",
      description:
        "Structuring React applications, setting module boundaries and planning changes to existing systems.",
    },
    {
      title: "Design systems",
      description:
        "Building reusable components and keeping the implementation aligned with product design.",
    },
    {
      title: "Build and test tooling",
      description:
        "Improving build times, test setup, type safety, generated API clients and CI checks.",
    },
    {
      title: "Working across teams",
      description:
        "Writing code, reviewing technical designs, documenting decisions and helping teams plan migrations.",
    },
  ],
  principles: [
    "Make large changes in stages so product work can continue.",
    "Write down important technical decisions and check them in CI where possible.",
    "Use static types and runtime validation where each is useful.",
    "Treat accessibility and interface quality as part of the engineering work.",
  ],
};
