import { createServerSupabaseClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { FileText, ShoppingBag, PlusCircle } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();

  const [blogsResult, presellResult, recentResult] = await Promise.all([
    supabase
      .from('projects')
      .select('status', { count: 'exact' })
      .eq('type', 'blog'),
    supabase
      .from('projects')
      .select('status', { count: 'exact' })
      .eq('type', 'presell'),
    supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(5),
  ]);

  const blogs = blogsResult.data || [];
  const presells = presellResult.data || [];
  const recentProjects = recentResult.data || [];

  const blogStatusCounts = blogs.reduce(
    (acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const presellStatusCounts = presells.reduce(
    (acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your content projects
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Link
          href="/blogs/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          <PlusCircle className="h-4 w-4" />
          New Blog
        </Link>
        <Link
          href="/presell/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
        >
          <PlusCircle className="h-4 w-4" />
          New Presell Page
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Blogs</h2>
          </div>
          <p className="text-3xl font-bold">{blogs.length}</p>
          <div className="flex gap-3 mt-3 text-sm text-muted-foreground">
            {Object.entries(blogStatusCounts).map(([status, count]) => (
              <span key={status}>
                {count} {status}
              </span>
            ))}
            {blogs.length === 0 && <span>No blogs yet</span>}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Presell Pages</h2>
          </div>
          <p className="text-3xl font-bold">{presells.length}</p>
          <div className="flex gap-3 mt-3 text-sm text-muted-foreground">
            {Object.entries(presellStatusCounts).map(([status, count]) => (
              <span key={status}>
                {count} {status}
              </span>
            ))}
            {presells.length === 0 && <span>No presell pages yet</span>}
          </div>
        </div>
      </div>

      {/* Recent Projects */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Projects</h2>
        {recentProjects.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            <p>No projects yet. Create your first blog or presell page!</p>
          </div>
        ) : (
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 text-sm font-medium">Title</th>
                  <th className="text-left p-3 text-sm font-medium">Type</th>
                  <th className="text-left p-3 text-sm font-medium">Status</th>
                  <th className="text-left p-3 text-sm font-medium">
                    Language
                  </th>
                  <th className="text-left p-3 text-sm font-medium">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentProjects.map((project) => (
                  <tr key={project.id} className="border-b last:border-0">
                    <td className="p-3">
                      <Link
                        href={`/${project.type === 'blog' ? 'blogs' : 'presell'}/${project.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {project.title}
                      </Link>
                    </td>
                    <td className="p-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-secondary">
                        {project.type}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-muted">
                        {project.status}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {project.language?.toUpperCase()}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {new Date(project.updated_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
