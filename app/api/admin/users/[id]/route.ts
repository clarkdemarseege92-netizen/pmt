// 文件: /app/api/admin/users/[id]/route.ts
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { NextRequest, NextResponse } from "next/server";

// 更新用户信息
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Next.js 15: params 是 Promise，需要 await
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  // 验证管理员权限
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  // 获取请求体
  const body = await request.json();
  const { role, is_active } = body;

  // 构建更新数据
  const updateData: { role?: string; is_active?: boolean } = {};
  if (role !== undefined) updateData.role = role;
  if (is_active !== undefined) updateData.is_active = is_active;

  // 更新用户
  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// 删除用户
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Next.js 15: params 是 Promise，需要 await
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  // 验证管理员权限
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  // 防止管理员删除自己
  if (id === user.id) {
    return NextResponse.json({ error: "不能删除自己的账号" }, { status: 400 });
  }

  // 删除用户 profile
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
