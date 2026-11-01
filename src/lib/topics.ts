/**
 * The topic directory behind "Explore topics". Every topic is a project tag (its slug), so a
 * topic page is just /tags/<slug>. Covers tech roles, stacks and frameworks, and work outside
 * tech, since the site is for anyone who builds things.
 */

export type TopicGroup = { name: string; topics: string[] };
export type TopicCategory = { name: string; groups: TopicGroup[] };

export const TOPIC_CATEGORIES: TopicCategory[] = [
  {
    name: "Software Development",
    groups: [
      {
        name: "Roles",
        topics: ["Frontend Development", "Backend Development", "Full-Stack Development", "Mobile Development", "Game Development", "Embedded Systems", "Software Testing", "Open Source"],
      },
      {
        name: "Languages",
        topics: ["JavaScript", "TypeScript", "Python", "Java", "Go", "Rust", "C++", "C#", "Kotlin", "Swift", "PHP", "Ruby", "Dart", "SQL"],
      },
      {
        name: "Frameworks",
        topics: ["React", "Next.js", "Vue", "Angular", "Svelte", "Node.js", "Express", "Django", "FastAPI", "Flask", "Spring Boot", "Laravel", "Rails", ".NET", "Flutter", "React Native", "Tailwind CSS"],
      },
    ],
  },
  {
    name: "AI & Data",
    groups: [
      {
        name: "Artificial Intelligence",
        topics: ["Machine Learning", "Deep Learning", "LLMs", "RAG", "AI Agents", "Computer Vision", "NLP", "Prompt Engineering", "MLOps"],
      },
      {
        name: "Data",
        topics: ["Data Science", "Data Engineering", "Data Analysis", "Data Visualization", "Business Intelligence", "Statistics", "Analytics"],
      },
      {
        name: "Tools",
        topics: ["Pandas", "NumPy", "PyTorch", "TensorFlow", "scikit-learn", "LangChain", "LangGraph", "Spark", "Airflow", "Tableau", "Power BI", "Excel", "Jupyter"],
      },
    ],
  },
  {
    name: "Cloud & Security",
    groups: [
      {
        name: "Roles",
        topics: ["DevOps", "Site Reliability", "Cloud Architecture", "Platform Engineering", "Systems Administration"],
      },
      {
        name: "Platforms & Tools",
        topics: ["AWS", "Azure", "Google Cloud", "Supabase", "Firebase", "Vercel", "Docker", "Kubernetes", "Terraform", "CI/CD", "Linux", "Git"],
      },
      {
        name: "Databases",
        topics: ["PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Database Design"],
      },
      {
        name: "Security",
        topics: ["Cybersecurity", "Penetration Testing", "Cloud Security", "Networking", "Identity and Access", "Blockchain"],
      },
    ],
  },
  {
    name: "Design & Product",
    groups: [
      {
        name: "Design",
        topics: ["UI Design", "UX Design", "Product Design", "Graphic Design", "Branding", "Motion Design", "3D Design", "Accessibility"],
      },
      {
        name: "Tools",
        topics: ["Figma", "Adobe", "Blender", "Webflow", "Framer", "Canva"],
      },
      {
        name: "Product",
        topics: ["Product Management", "Product Strategy", "User Research", "Roadmapping", "Growth", "No-Code"],
      },
    ],
  },
  {
    name: "Business & Marketing",
    groups: [
      {
        name: "Business",
        topics: ["Entrepreneurship", "Startups", "Freelancing", "Small Business", "Operations", "Strategy", "Consulting", "Automation"],
      },
      {
        name: "Marketing",
        topics: ["Digital Marketing", "Content Marketing", "SEO", "Social Media", "Copywriting", "Email Marketing", "Brand Strategy"],
      },
      {
        name: "Sales & Customers",
        topics: ["Sales", "Business Development", "Customer Success", "Account Management", "E-commerce"],
      },
    ],
  },
  {
    name: "Finance, People & Law",
    groups: [
      {
        name: "Finance",
        topics: ["Accounting", "Financial Analysis", "Investing", "Banking", "Fintech", "Auditing", "Tax"],
      },
      {
        name: "People & Projects",
        topics: ["Human Resources", "Recruiting", "People Operations", "Project Management", "Agile", "Leadership"],
      },
      {
        name: "Law & Compliance",
        topics: ["Corporate Law", "Compliance", "Contracts", "Intellectual Property", "Data Privacy"],
      },
    ],
  },
  {
    name: "Engineering & Science",
    groups: [
      {
        name: "Engineering",
        topics: ["Mechanical Engineering", "Electrical Engineering", "Civil Engineering", "Chemical Engineering", "Petroleum Engineering", "Robotics", "Renewable Energy", "IoT"],
      },
      {
        name: "Science",
        topics: ["Biotechnology", "Biology", "Chemistry", "Physics", "Environmental Science", "Research"],
      },
      {
        name: "Supply Chain",
        topics: ["Procurement", "Supply Chain", "Logistics", "Manufacturing", "Quality Control", "Inventory Management"],
      },
    ],
  },
  {
    name: "Health & Education",
    groups: [
      {
        name: "Healthcare",
        topics: ["Medicine", "Nursing", "Public Health", "Pharmacy", "Health Tech", "Mental Health"],
      },
      {
        name: "Education",
        topics: ["Teaching", "EdTech", "Curriculum Design", "Tutoring", "Online Courses"],
      },
      {
        name: "Social Impact",
        topics: ["Nonprofits", "Community Building", "Sustainability", "Volunteering"],
      },
    ],
  },
  {
    name: "Creative & Media",
    groups: [
      {
        name: "Writing",
        topics: ["Technical Writing", "Content Writing", "Journalism", "Blogging", "Documentation"],
      },
      {
        name: "Media",
        topics: ["Photography", "Video Production", "Podcasting", "Music Production", "Animation"],
      },
      {
        name: "Creators",
        topics: ["Content Creation", "YouTube", "Newsletters", "Community Management"],
      },
    ],
  },
];

/** The tag a topic maps to: "Next.js" → "next.js", "CI/CD" → "ci-cd", "C++" → "c++". Matches project tag rules. */
export function topicSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[\s/]+/g, "-")
    .replace(/[^a-z0-9+#.-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
}

export type Topic = { name: string; slug: string; category: string; group: string };

export const ALL_TOPICS: Topic[] = TOPIC_CATEGORIES.flatMap((c) =>
  c.groups.flatMap((g) => g.topics.map((name) => ({ name, slug: topicSlug(name), category: c.name, group: g.name }))),
);

const BY_SLUG = new Map(ALL_TOPICS.map((t) => [t.slug, t]));

/** Display name for a tag if it is a known topic ("next.js" → "Next.js"). */
export function topicName(slug: string) {
  return BY_SLUG.get(slug)?.name ?? null;
}

/** Topics whose name or slug contains the query, best matches (prefix) first. */
export function matchTopics(query: string, limit = 8) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ALL_TOPICS.filter((t) => t.name.toLowerCase().includes(q) || t.slug.includes(q))
    .sort((a, b) => Number(b.name.toLowerCase().startsWith(q)) - Number(a.name.toLowerCase().startsWith(q)) || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function categorySlug(name: string) {
  return topicSlug(name);
}
