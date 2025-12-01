// app/api/categories/route.ts
// 公开API：获取激活的分类列表（用于商户和客户）

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // 获取所有激活的分类，按排序顺序
    const { data, error } = await supabase
      .from('categories')
      .select('category_id, name, parent_id, icon_url, sort_order')
      .eq('is_active', true)
      .order('parent_id', { ascending: true, nullsFirst: true })
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }

    // 组织成树形结构
    const primaryCategories = data.filter(cat => !cat.parent_id);
    const result = primaryCategories.map(primary => ({
      ...primary,
      subcategories: data.filter(cat => cat.parent_id === primary.category_id)
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
