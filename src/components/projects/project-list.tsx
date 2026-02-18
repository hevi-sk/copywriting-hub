'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Project, ProjectType } from '@/types';
import Link from 'next/link';
import { Trash2, PlusCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ProjectListProps {
  type: ProjectType;
}

export function ProjectList({ type }: ProjectListProps) {
  const supabase = createClient();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('type', type)
      .order('updated_at', { ascending: false });
    setProjects((data as Project[]) || []);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (!error) {
      setProjects(projects.filter((p) => p.id !== id));
      toast({ title: 'Deleted', description: 'Project removed.' });
    }
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    generating: 'bg-yellow-100 text-yellow-700',
    editing: 'bg-blue-100 text-blue-700',
    finalized: 'bg-green-100 text-green-700',
    translated: 'bg-purple-100 text-purple-700',
  };

  const basePath = type === 'blog' ? '/blogs' : '/presell';
  const label = type === 'blog' ? 'Blogs' : 'Presell Pages';

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My {label}</h1>
          <p className="text-muted-foreground mt-1">
            {projects.length} {label.toLowerCase()} total
          </p>
        </div>
        <Link
          href={`${basePath}/new`}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          <PlusCircle className="h-4 w-4" />
          New {type === 'blog' ? 'Blog' : 'Page'}
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">
          <p>
            No {label.toLowerCase()} yet. Create your first one!
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Title</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Language</th>
                <th className="text-left p-3 font-medium">Keywords</th>
                <th className="text-left p-3 font-medium">Updated</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr
                  key={project.id}
                  className="border-b last:border-0 hover:bg-muted/30"
                >
                  <td className="p-3">
                    <Link
                      href={`${basePath}/${project.id}`}
                      className="font-medium hover:underline"
                    >
                      {project.title}
                    </Link>
                    {project.topic && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {project.topic}
                      </p>
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${statusColors[project.status] || 'bg-muted'}`}
                    >
                      {project.status}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {project.language?.toUpperCase()}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {project.keywords?.slice(0, 3).map((kw, i) => (
                        <span
                          key={i}
                          className="text-xs px-1.5 py-0.5 rounded bg-muted"
                        >
                          {kw}
                        </span>
                      ))}
                      {(project.keywords?.length || 0) > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{project.keywords.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(project.updated_at).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
