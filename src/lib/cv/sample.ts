import type { CV } from "./schema";
import type { ProfileView } from "@/lib/profiles";

/** Demo data (from the founder's original portfolio) used by /preview and empty states. */
export const sampleProfile: ProfileView = {
  username: "godson",
  fullName: "Odele Godson",
  headline: "AI Engineer · Full-Stack Engineer · Data Scientist",
  location: "Lagos, Nigeria",
  avatarUrl: null,
  openToWork: true,
};

export const sampleCV: CV = {
  summary:
    "AI Engineer and Full-Stack Engineer with a background in Data Science, focused on turning real-world problems into software people actually use. I build AI-powered and agentic systems, APIs, databases and automated workflows that streamline business operations and improve decision-making, using AI where it genuinely adds value.",
  skills: [
    "Agentic AI (LangChain, LangGraph, MCP)",
    "RAG Pipelines & Prompt Engineering",
    "LLM Fine-tuning (LoRA, QLoRA)",
    "Machine Learning (Scikit-Learn, TensorFlow)",
    "APIs & Backend (FastAPI, Flask, Node.js)",
    "Full-Stack Web Development (React, Next.js, Tailwind CSS)",
    "Workflow Automation (n8n, Webhooks)",
    "Data Analysis, SQL & Visualization (Pandas, Tableau)",
  ],
  tools: ["Python", "TensorFlow", "FastAPI", "PostgreSQL", "Supabase", "Docker", "Node.js", "TypeScript", "React", "Next.js", "Tailwind CSS", "Git"],
  experience: [
    {
      role: "AI & Software Engineer",
      company: "Special Piping and Materials",
      location: "Warri",
      period: "2026 - Present",
      highlights: [
        "Built LLM-powered agentic systems (GPT, Gemini) that automate email sorting into databases and material delivery confirmations.",
        "Built data pipelines and Tableau dashboards with Python and SQL to support shareholder decision-making.",
      ],
    },
    {
      role: "AI Engineer & Founder",
      company: "BlueLink",
      location: "Lagos",
      period: "2026 - Present",
      highlights: [
        "Designed conversational workflows for service discovery and business registration.",
        "Built backend logic for user states and validation, integrating AI via RAG and MCP.",
      ],
    },
    {
      role: "AI Engineer & Data Scientist",
      company: "Freelance",
      location: "Hybrid",
      period: "2022 - 2026",
      highlights: [
        "Built RAG pipelines, Telegram bots and multi-step agents (LangGraph, CrewAI) on GPT-4, LLaMA and Gemini.",
        "Shipped ML and LLM systems to production with FastAPI and Docker.",
      ],
    },
  ],
  education: [
    { title: "B.Sc. Biotechnology - University of Benin", meta: "2019 - 2023", url: "" },
    // A linked certificate, to show what that looks like on the sample CV.
    { title: "CS50's Introduction to AI with Python", meta: "Harvard Online", url: "https://cs50.harvard.edu/ai/" },
    { title: "Machine Learning Specialization - Stanford / Coursera", meta: "2023", url: "" },
  ],
  links: { github: "https://github.com/HiddenOG" },
};
