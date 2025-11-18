// 文件: /app/merchant/dashboard/page.tsx
"use client"; // 这个页面现在必须是客户端组件

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; // 客户端 Supabase
import { User } from '@supabase/supabase-js';

// 【修复 1】在这里定义 Merchant 类型 (基于我们的数据库 schema)
// (我们稍后会用 Supabase CLI 自动生成这个，但现在手动定义)
type Merchant = {
  merchant_id: string; // uuid
  owner_id: string; // uuid
  shop_name: string;
  address: string;
  shop_phone: string;
  status: 'pending' | 'approved' | 'rejected';
  logo_url?: string;
  cover_image_urls?: string[];
social_links?: Record<string, string>; // jsonb
  created_at?: string;
};
// ----------------------------------------------------
// 1. 欢迎/入驻表单组件 (之前是 /register 页面)
// ----------------------------------------------------
const OnboardingForm = ({ user }: { user: User }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 表单状态
  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [shopPhone, setShopPhone] = useState("");

  const handleSubmitApplication = async () => {
    setLoading(true);
    setError(null);

    const { error: insertError } = await supabase.from("merchants").insert({
      owner_id: user.id,
      shop_name: shopName,
      address: address,
      shop_phone: shopPhone,
      status: 'pending' // 状态设为 'pending' (试用中/待审核)
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      // 成功! 刷新页面，useEffect 将检测到新状态并显示仪表板
      window.location.reload(); 
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-2xl p-8 space-y-4 bg-base-100 rounded-lg shadow-xl">
      <h1 className="text-3xl font-bold text-center">欢迎来到您的控制台！</h1>
      <p className="text-center text-base-content/70">
        只差最后一步。请创建您的店铺资料，即可开始创建优惠券。
      </p>

      <div className="form-control">
        <label className="label"><span className="label-text">店铺名称*</span></label>
        <input
          type="text"
          placeholder="例如：PMT 餐饮有限公司"
          className="input input-bordered"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
        />
      </div>
      <div className="form-control">
        <label className="label"><span className="label-text">店铺地址*</span></label>
        <textarea
          className="textarea textarea-bordered h-24"
          placeholder="请输入您的主要营业地址"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        ></textarea>
      </div>
      <div className="form-control">
        <label className="label"><span className="label-text">店铺联系电话*</span></label>
        <input
          type="tel"
          placeholder="例如：038-123-456"
          className="input input-bordered"
          value={shopPhone}
          onChange={(e) => setShopPhone(e.target.value)}
        />
      </div>
      {error && (<div className="alert alert-error"><span>{error}</span></div>)}
      <div className="form-control pt-4">
        <button 
          className="btn btn-primary" 
          onClick={handleSubmitApplication} 
          disabled={loading}
        >
          {loading && <span className="loading loading-spinner"></span>}
          创建店铺并开始使用
        </button>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 2. 真正的仪表板统计组件
// ----------------------------------------------------
const StatsDashboard = ({ merchant }: { merchant: Merchant }) => {
  return (
    <div className="w-full">
      <h1 className="text-3xl font-bold mb-4">仪表板 (Dashboard)</h1>
      {/* (如果试用中/待审核，可以显示一个提示) */}
      {merchant.status === 'pending' && (
         <div className="alert alert-warning mb-4">
            <span>您的店铺正在 30 天试用期，同时我们的团队将对您的资料进行审核。</span>
         </div>
      )}

      <div className="stats shadow w-full">
        <div className="stat">
          <div className="stat-title">今日销售额</div>
          <div className="stat-value">฿ 0</div>
        </div>
        <div className="stat">
          <div className="stat-title">今日核销</div>
          <div className="stat-value">0 单</div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 3. 主页面：决定显示哪个组件
// ----------------------------------------------------
export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);

  useEffect(() => {
    const checkMerchantStatus = async () => {
      // 1. 获取用户
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // (虽然 layout 已经检查过了，但客户端再次检查是好习惯)
        setLoading(false);
        return; 
      }
      setUser(user);

      // 2. 检查商家记录
      const { data } = await supabase
        .from('merchants')
        .select('*') // 获取所有数据
        .eq('owner_id', user.id)
        .maybeSingle(); // 使用 maybeSingle

      setMerchant(data);
      setLoading(false);
    };

    checkMerchantStatus();
  }, []);

  // 渲染加载中...
  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // 渲染决策
  if (merchant) {
    // 案例 B: 商家记录已存在
    return <StatsDashboard merchant={merchant} />;
  } else {
    // 案例 A: 商家记录不存在
    return <OnboardingForm user={user} />;
  }
}