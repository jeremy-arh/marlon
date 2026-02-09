import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Routes API - ne pas rediriger, laisser les API routes gérer leur propre authentification
  const isApiRoute = pathname.startsWith('/api/');
  if (isApiRoute) {
    return supabaseResponse;
  }

  // Routes publiques autorisées pour les utilisateurs non connectés
  const publicPaths = [
    '/catalog',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/accept-invitation',
    '/complete-invitation',
    '/auth/callback',
  ];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // Routes d'authentification (sauf reset-password qui peut nécessiter une session temporaire)
  const authPaths = ['/login', '/register', '/forgot-password'];
  const isAuthPath = authPaths.some((path) => pathname.startsWith(path));

  // Routes protégées nécessitant une authentification
  const protectedPaths = [
    '/orders',
    '/account',
    '/cart',
    '/checkout',
    '/employees',
    '/equipments',
    '/support',
  ];
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));

  // Routes réservées aux administrateurs uniquement
  const adminOnlyPaths = [
    '/orders',
    '/employees',
    '/catalog',
    '/cart',
    '/checkout',
  ];
  const isAdminOnlyPath = adminOnlyPaths.some((path) => pathname.startsWith(path));

  // Routes accessibles aux employés
  const employeePaths = ['/equipments', '/support'];
  const isEmployeePath = employeePaths.some((path) => pathname.startsWith(path));

  // Rediriger les utilisateurs non connectés vers login s'ils tentent d'accéder à une route protégée
  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Vérifier le rôle pour les routes admin-only
  if (user && isAdminOnlyPath) {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const userRole = roleData?.role;

    // Si l'utilisateur est un employé et tente d'accéder à une route admin-only
    if (userRole === 'employee') {
      const url = request.nextUrl.clone();
      url.pathname = '/equipments'; // Rediriger vers les équipements
      return NextResponse.redirect(url);
    }
  }

  // Rediriger les utilisateurs connectés depuis les pages d'authentification vers la bonne page
  if (isAuthPath && user) {
    // Vérifier le rôle pour rediriger vers la bonne page
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const url = request.nextUrl.clone();
    if (roleData?.role === 'employee') {
      url.pathname = '/equipments';
    } else {
      url.pathname = '/catalog';
    }
    return NextResponse.redirect(url);
  }

  // Si l'utilisateur n'est pas connecté et tente d'accéder à une route non publique, rediriger vers login
  if (!isPublicPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return supabaseResponse;
}
