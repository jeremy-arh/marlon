import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from './service';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          supabaseResponse.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          supabaseResponse.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Use service client for super admin checks (bypasses RLS)
  const serviceClient = createServiceClient();

  // Protected routes - only allow super_admin
  const isProtectedPath = request.nextUrl.pathname.startsWith('/admin');
  const isSetupPath = request.nextUrl.pathname.startsWith('/setup');
  const isAuthPath = request.nextUrl.pathname.startsWith('/login');
  const isDebugPath = request.nextUrl.pathname.startsWith('/debug');

  // Allow debug page
  if (isDebugPath) {
    return supabaseResponse;
  }

  // Handle setup page access
  if (isSetupPath) {
    // If user is logged in, check if they're super admin
    if (user) {
      const { data: userRole } = await serviceClient
        .from('user_roles')
        .select('is_super_admin')
        .eq('user_id', user.id)
        .eq('is_super_admin', true)
        .maybeSingle();

      if (userRole) {
        const url = request.nextUrl.clone();
        url.pathname = '/admin/dashboard';
        return NextResponse.redirect(url);
      }
    }
    
    // Check if super admin already exists (using service client to bypass RLS)
    const { data: superAdminExists } = await serviceClient
      .from('user_roles')
      .select('id')
      .eq('is_super_admin', true)
      .limit(1)
      .maybeSingle();

    // If super admin exists, redirect to login
    if (superAdminExists) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    // No super admin exists, allow access to setup
    return supabaseResponse;
  }

  // Auth routes redirect if already logged in
  if (isAuthPath && user) {
    // Verify user is super admin using service client
    const { data: userRole } = await serviceClient
      .from('user_roles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .eq('is_super_admin', true)
      .maybeSingle();

    if (userRole) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/dashboard';
      return NextResponse.redirect(url);
    }
  }

  // Protected routes handling
  if (isProtectedPath) {
    // User not logged in
    if (!user) {
      // Check if super admin exists using service client
      const { data: superAdminExists } = await serviceClient
        .from('user_roles')
        .select('id')
        .eq('is_super_admin', true)
        .limit(1)
        .maybeSingle();

      // If no super admin exists, redirect to setup
      if (!superAdminExists) {
        const url = request.nextUrl.clone();
        url.pathname = '/setup';
        return NextResponse.redirect(url);
      }

      // Super admin exists but user not logged in, redirect to login
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    // User is logged in - check if super admin using service client
    const { data: userRole } = await serviceClient
      .from('user_roles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .eq('is_super_admin', true)
      .maybeSingle();

    if (!userRole) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'Access denied. Super admin access required.');
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
