// app/api/auth/debug/route.ts
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      user: user ? {
        id: user.id,
        email: user.email,
        role: user.role,
      } : null,
      hasSession: !!session,
      sessionExpiry: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      error: error?.message,
      cookies: allCookies.map(c => ({
        name: c.name,
        hasValue: !!c.value,
        isAuthCookie: c.name.startsWith('sb-') || c.name.includes('auth'),
      })),
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 });
  }
}
