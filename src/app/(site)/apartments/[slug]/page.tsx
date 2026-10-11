export const dynamic = "force-dynamic";

import { ProjectDetail } from "@/components/projects/project-detail";
import { getProject, recordProjectView } from "@/services/projects.service";
import { notFound } from "next/navigation";
import { after } from "next/server";

interface ProjectDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { slug } = await params;
  const res = await getProject(slug);
  if (!res.success) notFound();

  // Count this view *after* the response is sent, so the view-count write never
  // adds latency to the page render. Errors are swallowed — a failed analytics
  // ping must not surface to the visitor.
  after(() => {
    void recordProjectView(slug).catch(() => {});
  });

  return <ProjectDetail project={res.data} />;
}
