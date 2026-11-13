import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ProjectEditor } from "@/components/project-editor";
import { deleteProject } from "@/lib/project-actions";
import { isAdmin } from "@/lib/discover/portfolios";
import { getAboutChoice } from "@/lib/features";
import { getCurrentUser } from "@/lib/profiles";
import { getProject } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit story", robots: { index: false } };

export default function EditProjectPage({ params }: PageProps<"/[username]/[slug]/edit">) {
  return (
    <main>
      <Suspense>
        <EditProject params={params} />
      </Suspense>
    </main>
  );
}

async function EditProject({ params }: Pick<PageProps<"/[username]/[slug]/edit">, "params">) {
  const { username, slug } = await params;
  const supabase = await createClient();
  const { userId } = await getCurrentUser(supabase);
  if (!userId) redirect(`/login?next=/${username}/${slug}/edit`);

  const project = await getProject(supabase, username, slug);
  if (!project || project.author_id !== userId) notFound();
  const editorial = (await isAdmin(supabase)) ? { initialAbout: await getAboutChoice(supabase, project), notifyByDefault: false } : undefined;

  return (
    <>
      <ProjectEditor userId={userId} project={project} editorial={editorial} />
      <form action={deleteProject} className="mx-auto max-w-3xl border-t border-line px-4 py-8">
        <input type="hidden" name="id" value={project.id} />
        <button className="text-sm text-danger hover:underline">Delete this story</button>
      </form>
    </>
  );
}
