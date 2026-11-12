import Link from "next/link";
import { AuthorAvatar } from "@/components/author-avatar";
import { RemoteImage } from "@/components/remote-image";
import { SiteImage } from "@/components/discover/site-image";
import { displayHost } from "@/lib/discover/host";
import { sectionInfo, type Feature } from "@/lib/features";
import { formatDate, projectHref, readingMinutes } from "@/lib/projects";

function Cover({ feature, sizes, priority, className }: { feature: Feature; sizes: string; priority?: boolean; className: string }) {
  // Falls back to the creator's own sharing image, then to their site's (or the story's) name.
  const site = feature.subject?.url ?? feature.demo_url;
  return feature.cover_url ? (
    <RemoteImage src={feature.cover_url} sizes={sizes} priority={priority} className={`object-cover ${className}`} />
  ) : (
    <SiteImage
      src={feature.subject?.image_url ?? null}
      host={site ? displayHost(site) : (feature.subject?.name ?? feature.title)}
      sizes={sizes}
      priority={priority}
      className={className}
    />
  );
}

function Kicker({ feature }: { feature: Feature }) {
  return (
    <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-muted uppercase">
      {feature.editors_pick && <span className="rounded-full bg-brand px-2 py-0.5 text-brand-ink">Editor&apos;s pick</span>}
      {sectionInfo(feature.feature_section).label}
    </p>
  );
}

function Creator({ feature }: { feature: Feature }) {
  const s = feature.subject;
  // A story about no one in particular just has the date line.
  if (!s) return null;
  const name = s.member?.full_name || s.name;
  return (
    <p className="flex items-center gap-2 text-sm text-muted">
      <AuthorAvatar name={name} url={s.member?.avatar_url ?? null} size={22} />
      <span className="truncate">
        About <span className="text-foreground">{name}</span>
        {s.role && <> · {s.role}</>}
      </span>
    </p>
  );
}

/** The lead story: the newest Editor's pick (or newest feature), large. */
export function FeatureHero({ feature, priority }: { feature: Feature; priority?: boolean }) {
  const href = projectHref(feature.author.username, feature.slug);
  return (
    <Link href={href} className="group grid overflow-hidden rounded-2xl border border-line md:grid-cols-[3fr_2fr]">
      <div className="overflow-hidden">
        <Cover
          feature={feature}
          sizes="(max-width: 768px) 100vw, 680px"
          priority={priority}
          className="aspect-[16/10] h-full w-full transition-transform duration-500 group-hover:scale-[1.02]"
        />
      </div>
      <div className="flex flex-col gap-3 p-6 sm:p-8">
        <Kicker feature={feature} />
        <h3 className="font-serif text-2xl leading-tight font-bold group-hover:underline sm:text-3xl">{feature.title}</h3>
        {feature.summary && <p className="line-clamp-4 text-muted">{feature.summary}</p>}
        <div className="mt-auto pt-3">
          <Creator feature={feature} />
          <p className="mt-2 text-xs text-muted">
            {formatDate(feature.published_at)} · {readingMinutes(feature.body_md)} min read
          </p>
        </div>
      </div>
    </Link>
  );
}

export function FeatureCard({ feature }: { feature: Feature }) {
  const href = projectHref(feature.author.username, feature.slug);
  return (
    <Link href={href} className="group block">
      <div className="overflow-hidden rounded-2xl border border-line">
        <Cover
          feature={feature}
          sizes="(max-width: 640px) 100vw, 400px"
          className="aspect-[16/10] w-full transition-transform duration-500 group-hover:scale-[1.02]"
        />
      </div>
      <div className="mt-3 space-y-2">
        <Kicker feature={feature} />
        <h3 className="text-lg leading-snug font-bold group-hover:underline">{feature.title}</h3>
        <Creator feature={feature} />
      </div>
    </Link>
  );
}
