"use client";
/* eslint-disable @next/next/no-img-element -- user-supplied images come from arbitrary hosts */

import { useEffect, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { toolIconUrls } from "@/lib/cv/tool-icons";
import { FONT_OPTIONS } from "@/lib/themes";
import type { TemplateProps } from "./types";
import s from "./classic.module.css";

type Tab = "info" | "projects";

/** A tool's logo: tries each candidate (devicon, then Simple Icons) and falls back to a dot. */
function ToolIcon({ name }: { name: string }) {
  const urls = toolIconUrls(name);
  const [index, setIndex] = useState(0);
  if (index >= urls.length) return <span className={s.toolDot} />;
  return <img src={urls[index]} alt="" className={s.toolIcon} onError={() => setIndex((i) => i + 1)} />;
}

export function ClassicTemplate({ profile, cv, theme, projects }: TemplateProps) {
  const [tab, setTab] = useState<Tab>("info");

  // A printed or PDF CV should show the information tab, whichever tab is open.
  useEffect(() => {
    const showInfo = () => flushSync(() => setTab("info"));
    window.addEventListener("beforeprint", showInfo);
    return () => window.removeEventListener("beforeprint", showInfo);
  }, []);

  const style = {
    "--cv-accent": theme.accent,
    "--cv-ink": theme.ink,
    "--cv-paper": theme.paper,
    "--cv-font": FONT_OPTIONS[theme.font].cssVar,
  } as CSSProperties;

  const name = profile.fullName || profile.username;
  const links = [
    cv.links.email && { href: `mailto:${cv.links.email}`, label: cv.links.email },
    cv.links.phone && { href: `tel:${cv.links.phone}`, label: cv.links.phone },
    cv.links.linkedin && { href: cv.links.linkedin, label: "LinkedIn" },
    cv.links.github && { href: cv.links.github, label: "GitHub" },
    cv.links.website && { href: cv.links.website, label: "Website" },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <div className={s.root} style={style}>
      <div className={s.content}>
        <section className={`${s.section} ${s.container}`}>
          <div className={s.profile}>
            <div className={s.imageFrame}>
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={name} className={s.avatar} />
              ) : (
                <div className={s.avatarFallback} aria-hidden>
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className={s.profileData}>
              <h3 className={s.greeting}>Hello I&apos;m</h3>
              <h1 className={s.name}>{name}</h1>
              {profile.headline && <p className={s.headline}>{profile.headline}</p>}
              {profile.openToWork && (
                <div className={s.badgeRow}>
                  <span className={s.badge}>Open to work</span>
                </div>
              )}

              <div className={s.buttons} role="tablist">
                {(["info", "projects"] as const).map((t) => (
                  <button
                    key={t}
                    role="tab"
                    aria-selected={tab === t}
                    className={tab === t ? s.buttonActive : s.button}
                    onClick={() => setTab(t)}
                  >
                    {t === "info" ? "Information" : `Projects${projects.length ? ` (${projects.length})` : ""}`}
                  </button>
                ))}
              </div>

              <h2 className={s.sectionTitle}>Profile</h2>
              <p className={s.description}>{cv.summary || <span className={s.empty}>No summary yet.</span>}</p>
            </div>
          </div>
        </section>

        {tab === "info" ? (
          <div key="info" className={`${s.panel} ${s.group}`}>
            <div className={s.left}>
              <section className={`${s.section} ${s.container}`}>
                <h2 className={s.sectionTitle}>Skills</h2>
                {cv.skills.length ? (
                  <ul className={s.bullets}>
                    {cv.skills.map((skill) => (
                      <li key={skill}>{skill}</li>
                    ))}
                  </ul>
                ) : (
                  <p className={s.empty}>No skills listed.</p>
                )}
              </section>

              {cv.tools.length > 0 && (
                <section className={`${s.section} ${s.container}`}>
                  <h2 className={s.sectionTitle}>Tools &amp; Technologies</h2>
                  <ul className={s.tools}>
                    {cv.tools.map((tool) => (
                      <li key={tool} className={s.tool}>
                        <ToolIcon name={tool} />
                        <span className={s.toolName}>{tool}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <div>
              <section className={`${s.section} ${s.container}`}>
                <h2 className={s.sectionTitle}>Experience</h2>
                {cv.experience.length ? (
                  <div className={s.experience}>
                    {cv.experience.map((job, i) => (
                      <article key={`${job.company}-${i}`}>
                        <div className={s.expTitles}>
                          <p>
                            {job.location}
                            {job.location && job.period && " / "}
                            <br />
                            {job.period}
                          </p>
                          <h3>
                            {job.role} / {job.company}
                          </h3>
                        </div>
                        {job.highlights.length > 0 && (
                          <ul className={`${s.bullets} ${s.expHighlights}`}>
                            {job.highlights.map((h, j) => (
                              <li key={j}>{h}</li>
                            ))}
                          </ul>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className={s.empty}>No experience listed.</p>
                )}
              </section>

              {cv.education.length > 0 && (
                <section className={`${s.section} ${s.container}`}>
                  <h2 className={s.sectionTitle}>Education &amp; Certifications</h2>
                  <ul className={s.education}>
                    {cv.education.map((edu, i) => (
                      <li key={`${edu.title}-${i}`} className={s.eduItem}>
                        <p>{edu.meta}</p>
                        <h3>{edu.title}</h3>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>
        ) : (
          <section key="projects" className={`${s.panel} ${s.section} ${s.container}`}>
            <h2 className={s.sectionTitle}>Projects</h2>
            {projects.length ? (
              <div className={s.projectGrid}>
                {projects.map((p) => (
                  <article key={p.href}>
                    <Link href={p.href} className={s.projectImageLink}>
                      {p.coverUrl && <img src={p.coverUrl} alt="" className={s.projectImage} />}
                    </Link>
                    <h3 className={s.projectName}>
                      <Link href={p.href}>{p.title}</Link>
                    </h3>
                    {p.summary && <p>{p.summary}</p>}
                    {(p.demoUrl || p.repoUrl) && (
                      <div className={s.projectLinks}>
                        {p.demoUrl && (
                          <a href={p.demoUrl} target="_blank" rel="noopener noreferrer">
                            Live demo ↗
                          </a>
                        )}
                        {p.repoUrl && (
                          <a href={p.repoUrl} target="_blank" rel="noopener noreferrer">
                            Code ↗
                          </a>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className={s.empty}>No projects posted yet.</p>
            )}
          </section>
        )}

        {links.length > 0 && (
          <footer className={`${s.footer} ${s.container}`}>
            {links.map((l) => (
              <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className={s.footerLink}>
                {l.label}
              </a>
            ))}
          </footer>
        )}
      </div>
    </div>
  );
}
