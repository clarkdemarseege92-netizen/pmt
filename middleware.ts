// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';

// 创建 next-intl 中间件
const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  console.log('🔵 MIDDLEWARE START:', {
    pathname,
    locale: request.nextUrl.locale,
    search: request.nextUrl.search,
  });

  // 【重要】排除特定路径，让它们直接访问而不经过 i18n 重定向
  const skipPaths = [
    '/auth/callback',      // OAuth 回调
    '/admin-login',        // 管理员登录页
    '/api/',               // API 路由（虽然 matcher 已排除，但保险起见）
  ];

  if (skipPaths.some(path => pathname.startsWith(path))) {
    console.log('⚡ MIDDLEWARE: Skipping path:', pathname);
    return NextResponse.next();
  }

  // 【新增】处理根路径的语言检测
  if (pathname === '/') {
    // 从 Accept-Language 头获取浏览器首选语言
    const acceptLanguage = request.headers.get('accept-language');
    let detectedLocale = routing.defaultLocale;

    if (acceptLanguage) {
      // 解析 Accept-Language 头 (例如: "zh-CN,zh;q=0.9,en;q=0.8")
      const languages = acceptLanguage
        .split(',')
        .map(lang => lang.split(';')[0].trim().toLowerCase());

      // 查找匹配的语言
      for (const lang of languages) {
        if (lang.startsWith('zh')) {
          detectedLocale = 'zh';
          break;
        } else if (lang.startsWith('en')) {
          detectedLocale = 'en';
          break;
        } else if (lang.startsWith('th')) {
          detectedLocale = 'th';
          break;
        }
      }
    }

    console.log('🌐 ROOT PATH - Detected locale:', detectedLocale, 'from:', acceptLanguage);

    // 重定向到检测到的语言
    const url = request.nextUrl.clone();
    url.pathname = `/${detectedLocale}`;
    return NextResponse.redirect(url);
  }

  // 1. 处理其他路径的 i18n 路由
  const intlResponse = intlMiddleware(request);

  console.log('🟢 INTL MIDDLEWARE RESULT:', {
    status: intlResponse.status,
    redirectTo: intlResponse.headers.get('location'),
  });

  // 2. 然后处理 Supabase 认证
  // 如果 intl 中间件返回了重定向，直接返回
  if (intlResponse.status === 307 || intlResponse.status === 308) {
    console.log('↪️ MIDDLEWARE: Redirecting via intl middleware');
    return intlResponse;
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options) {
          // 如果请求中的 cookie 发生了变化，需要更新
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // 刷新 session（如果过期会自动刷新）
  const { data: { user } } = await supabase.auth.getUser()

  // 【关键修复】添加缓存控制头，防止 Vercel 边缘缓存
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  response.headers.set('CDN-Cache-Control', 'no-store')
  response.headers.set('Vercel-CDN-Cache-Control', 'no-store')

  // 添加认证状态到响应头（用于调试）
  if (user) {
    response.headers.set('X-User-Authenticated', 'true')
    response.headers.set('X-User-ID', user.id)
  } else {
    response.headers.set('X-User-Authenticated', 'false')
  }

  return response
}

export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了：
     * - api (API 路由)
     * - _next/static (静态文件)
     * - _next/image (图片优化文件)
     * - favicon.ico (网站图标)
     * - public 文件夹中的文件（如图片）
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
