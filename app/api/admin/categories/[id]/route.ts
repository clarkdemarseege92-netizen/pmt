// app/api/admin/categories/[id]/route.ts
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

// PUT: 更新分类
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { isAdmin, error, supabase } = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, icon_url, is_active, sort_order } = body;

    // 构建更新对象（只更新提供的字段）
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (icon_url !== undefined) updates.icon_url = icon_url;
    if (is_active !== undefined) updates.is_active = is_active;
    if (sort_order !== undefined) updates.sort_order = sort_order;

    // 验证必填字段
    if (updates.name !== undefined && !updates.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // 更新分类
    const { data, error: updateError } = await supabase!
      .from('categories')
      .update(updates)
      .eq('category_id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating category:', updateError);
      return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('PUT /api/admin/categories/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: 删除分类
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { isAdmin, error, supabase } = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    const { id } = await params;

    // 检查是否有子分类
    const { data: children } = await supabase!
      .from('categories')
      .select('category_id')
      .eq('parent_id', id);

    if (children && children.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with subcategories' },
        { status: 400 }
      );
    }

    // 删除分类
    const { error: deleteError } = await supabase!
      .from('categories')
      .delete()
      .eq('category_id', id);

    if (deleteError) {
      console.error('Error deleting category:', deleteError);
      return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/categories/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
