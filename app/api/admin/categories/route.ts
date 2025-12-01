// app/api/admin/categories/route.ts
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { NextRequest, NextResponse } from "next/server";

// 验证管理员权限
async function verifyAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { isAdmin: false, error: 'Unauthorized' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { isAdmin: false, error: 'Forbidden' };
  }

  return { isAdmin: true, supabase };
}

// POST: 创建新分类
export async function POST(request: NextRequest) {
  try {
    const { isAdmin, error, supabase } = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    const body = await request.json();
    const { name, parent_id, description, icon_url, is_active, sort_order } = body;

    // 验证必填字段
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // 插入新分类
    const { data, error: insertError } = await supabase!
      .from('categories')
      .insert({
        name,
        parent_id: parent_id || null,
        description: description || null,
        icon_url: icon_url || null,
        is_active: is_active !== undefined ? is_active : true,
        sort_order: sort_order || 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating category:', insertError);
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: 获取所有分类
export async function GET() {
  try {
    const { isAdmin, error, supabase } = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    const { data, error: fetchError } = await supabase!
      .from('categories')
      .select('*')
      .order('parent_id', { ascending: true, nullsFirst: true })
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (fetchError) {
      console.error('Error fetching categories:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/admin/categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
