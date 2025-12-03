// 文件: app/api/nearby-coupons/route.ts
// 获取附近优惠券的 API

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { calculateDistance } from '@/lib/distance';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latitude = parseFloat(searchParams.get('latitude') || '0');
    const longitude = parseFloat(searchParams.get('longitude') || '0');
    const radius = parseFloat(searchParams.get('radius') || '10'); // 默认10公里
    const limit = parseInt(searchParams.get('limit') || '20'); // 默认返回20个

    // 参数验证
    if (!latitude || !longitude) {
      return NextResponse.json(
        { success: false, message: '缺少位置参数' },
        { status: 400 }
      );
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { success: false, message: '位置参数无效' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // 查询优惠券及其关联的商户信息（包括位置）
    const { data: coupons, error } = await supabase
      .from('coupons')
      .select(`
        coupon_id,
        name,
        image_urls,
        selling_price,
        original_value,
        stock_quantity,
        merchant_id,
        merchants!inner (
          merchant_id,
          business_name,
          latitude,
          longitude,
          address
        )
      `)
      .eq('is_active', true)
      .gt('stock_quantity', 0)
      .not('merchants.latitude', 'is', null)
      .not('merchants.longitude', 'is', null);

    if (error) {
      console.error('查询优惠券错误:', error);
      return NextResponse.json(
        { success: false, message: '查询失败' },
        { status: 500 }
      );
    }

    if (!coupons || coupons.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: '暂无可用的优惠券',
      });
    }

    // 计算每个优惠券商户与用户的距离
    const couponsWithDistance = coupons
      .map((coupon: any) => {
        const merchant = coupon.merchants;

        // 计算距离
        const distance = calculateDistance(
          latitude,
          longitude,
          merchant.latitude,
          merchant.longitude
        );

        return {
          coupon_id: coupon.coupon_id,
          name: coupon.name,
          image_urls: coupon.image_urls,
          selling_price: coupon.selling_price,
          original_value: coupon.original_value,
          stock_quantity: coupon.stock_quantity,
          merchant: {
            merchant_id: merchant.merchant_id,
            business_name: merchant.business_name,
            address: merchant.address,
            latitude: merchant.latitude,
            longitude: merchant.longitude,
          },
          distance, // 距离（公里）
        };
      })
      .filter((coupon) => coupon.distance <= radius) // 过滤距离
      .sort((a, b) => a.distance - b.distance) // 按距离排序
      .slice(0, limit); // 限制返回数量

    return NextResponse.json({
      success: true,
      data: couponsWithDistance,
      total: couponsWithDistance.length,
      userLocation: { latitude, longitude },
      radius,
    });

  } catch (error) {
    console.error('附近优惠券 API 错误:', error);
    return NextResponse.json(
      { success: false, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}
