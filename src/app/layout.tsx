import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppSidebar } from '@/components/layout/sidebar';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Copywriting Hub',
  description: 'AI-powered content generation for Hevisleep and StretchFit',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoggedIn = !!user;

  return (
    <html lang="en">
      <body className={inter.className}>
        {isLoggedIn ? (
          <div className="min-h-screen">
            <AppSidebar />
            <main className="lg:pl-64 min-h-screen">
              <div className="p-6 lg:p-8">{children}</div>
            </main>
          </div>
        ) : (
          children
        )}
        <Toaster />
      </body>
    </html>
  );
}
