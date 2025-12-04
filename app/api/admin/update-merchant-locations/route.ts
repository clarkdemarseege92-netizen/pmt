// 文件: app/api/admin/update-merchant-locations/route.ts
// 批量更新商户位置信息的管理员 API

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { extractCoordinatesFromGoogleMaps, isValidCoordinates } from '@/lib/googleMaps';

export async function POST(request: Request) {
  try {
    // 1. 验证管理员权限
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }

    // 检查是否是管理员（你可以根据实际情况调整）
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: '需要管理员权限' },
        { status: 403 }
      );
    }

    // 2. 使用 Service Role Key 初始化 Admin 客户端
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, message: '服务器配置错误' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 3. 获取所有有 Google Maps 链接但没有经纬度的商户
    const { data: merchants, error: fetchError } = await supabaseAdmin
      .from('merchants')
      .select('merchant_id, google_maps_link, latitude, longitude')
      .not('google_maps_link', 'is', null)
      .or('latitude.is.null,longitude.is.null');

    if (fetchError) {
      console.error('查询商户错误:', fetchError);
      return NextResponse.json(
        { success: false, message: '查询商户失败' },
        { status: 500 }
      );
    }

    if (!merchants || merchants.length === 0) {
      return NextResponse.json({
        success: true,
        message: '所有商户都已有位置信息',
        updated: 0,
        failed: 0,
      });
    }

    console.log(`找到 ${merchants.length} 个需要更新位置的商户`);

    // 4. 批量处理商户位置
    const results = {
      updated: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const merchant of merchants) {
      try {
        console.log(`处理商户: ${merchant.merchant_id}`);

        // 从 Google Maps 链接提取坐标
        const coordinates = await extractCoordinatesFromGoogleMaps(
          merchant.google_maps_link
        );

        if (!coordinates) {
          console.warn(`无法提取坐标: ${merchant.merchant_id}`);
          results.failed++;
          results.errors.push(
            `${merchant.merchant_id}: 无法从链接提取坐标`
          );
          continue;
        }

        // 验证坐标有效性
        if (!isValidCoordinates(coordinates.latitude, coordinates.longitude)) {
          console.warn(`坐标无效: ${merchant.merchant_id}`);
          results.failed++;
          results.errors.push(
            `${merchant.merchant_id}: 坐标无效 (${coordinates.latitude}, ${coordinates.longitude})`
          );
          continue;
        }

        // 更新商户位置
        const { error: updateError } = await supabaseAdmin
          .from('merchants')
          .update({
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
          })
          .eq('merchant_id', merchant.merchant_id);

        if (updateError) {
          console.error(`更新商户 ${merchant.merchant_id} 失败:`, updateError);
          results.failed++;
          results.errors.push(
            `${merchant.merchant_id}: 更新失败 - ${updateError.message}`
          );
        } else {
          console.log(
            `✅ 更新成功: ${merchant.merchant_id} -> (${coordinates.latitude}, ${coordinates.longitude})`
          );
          results.updated++;
        }
      } catch (error) {
        console.error(`处理商户 ${merchant.merchant_id} 异常:`, error);
        results.failed++;
        results.errors.push(
          `${merchant.merchant_id}: 处理异常 - ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `更新完成：成功 ${results.updated} 个，失败 ${results.failed} 个`,
      updated: results.updated,
      failed: results.failed,
      errors: results.errors,
      total: merchants.length,
    });

  } catch (error) {
    console.error('批量更新商户位置错误:', error);
    return NextResponse.json(
      {
        success: false,
        message: '服务器内部错误',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
