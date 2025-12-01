// 文件: /app/debug-auth/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function DebugAuthPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    addLog('🔵 开始调试');
    addLog(`🔵 Supabase URL: ${supabaseUrl}`);
    addLog(`🔵 Supabase Key: ${supabaseKey ? '已设置 (' + supabaseKey.substring(0, 20) + '...)' : '未设置'}`);

    // 检查 cookies
    const cookies = document.cookie.split(';').map(c => c.trim());
    const authCookies = cookies.filter(c =>
      c.startsWith('sb-') ||
      c.includes('access') ||
      c.includes('refresh') ||
      c.includes('auth')
    );
    addLog(`🔵 Auth Cookies 数量: ${authCookies.length}`);
    authCookies.forEach((cookie, i) => {
      const [name] = cookie.split('=');
      addLog(`🔵 Cookie ${i + 1}: ${name}`);
    });

    const supabase = createBrowserClient(supabaseUrl, supabaseKey);

    const testAuth = async () => {
      try {
        addLog('🔵 Step 1: 调用 getUser()');
        const { data: userData, error: userError } = await supabase.auth.getUser();

        addLog(`🔵 Step 2: getUser() 完成`);
        addLog(`🔵 User: ${JSON.stringify(userData)}`);
        addLog(`🔵 Error: ${JSON.stringify(userError)}`);

        if (userError) {
          setError(`GetUser Error: ${userError.message}`);
          addLog(`🔴 GetUser 错误: ${userError.message}`);
          return;
        }

        if (!userData.user) {
          addLog('🟡 未登录');
          setError('未登录 - 请先登录');
          return;
        }

        setUser(userData.user);
        addLog(`🟢 用户已登录: ${userData.user.id}`);
        addLog(`🟢 Email: ${userData.user.email}`);

        // 测试 Session
        addLog('🔵 Step 3: 调用 getSession()');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        addLog(`🔵 Session: ${JSON.stringify(sessionData)}`);
        addLog(`🔵 Session Error: ${JSON.stringify(sessionError)}`);

        // 测试 Profile 查询
        addLog('🔵 Step 4: 查询 profiles 表');
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userData.user.id)
          .maybeSingle();

        addLog(`🔵 Step 5: profiles 查询完成`);
        addLog(`🔵 Profile Data: ${JSON.stringify(profileData)}`);
        addLog(`🔵 Profile Error: ${JSON.stringify(profileError)}`);

        if (profileError) {
          setError(`Profile Error: ${profileError.message}`);
          addLog(`🔴 Profile 查询错误: ${profileError.message}`);
          return;
        }

        setProfile(profileData);
        addLog(`🟢 Profile 获取成功`);

      } catch (err: any) {
        addLog(`🔴 异常: ${err.message}`);
        addLog(`🔴 Stack: ${err.stack}`);
        setError(`Exception: ${err.message}`);
      }
    };

    testAuth();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Auth 调试页面</h1>

        {error && (
          <div className="alert alert-error mb-6">
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 用户信息 */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">用户信息</h2>
              {user ? (
                <pre className="bg-base-200 p-4 rounded overflow-auto text-xs">
                  {JSON.stringify(user, null, 2)}
                </pre>
              ) : (
                <p className="text-gray-500">未登录或加载中...</p>
              )}
            </div>
          </div>

          {/* Profile 信息 */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Profile 信息</h2>
              {profile ? (
                <pre className="bg-base-200 p-4 rounded overflow-auto text-xs">
                  {JSON.stringify(profile, null, 2)}
                </pre>
              ) : (
                <p className="text-gray-500">无 Profile 数据</p>
              )}
            </div>
          </div>
        </div>

        {/* 日志 */}
        <div className="card bg-base-100 shadow-xl mt-6">
          <div className="card-body">
            <h2 className="card-title">调试日志</h2>
            <div className="bg-black text-green-400 p-4 rounded font-mono text-xs overflow-auto max-h-96">
              {logs.map((log, i) => (
                <div key={i} className="mb-1">{log}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <a href="/login" className="btn btn-primary">
            返回登录页
          </a>
        </div>
      </div>
    </div>
  );
}
