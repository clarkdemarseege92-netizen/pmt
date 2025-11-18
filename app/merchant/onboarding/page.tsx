// 文件: /app/merchant/onboarding/page.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    shopName: "",
    address: "",
    phone: "",
  });

  const handleSubmit = async () => {
    if (!formData.shopName || !formData.address || !formData.phone) {
      setError("请填写所有必填项");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("未登录");

      // 1. 插入商家记录，并立即获取返回数据（我们需要 merchant_id）
      const { data: newMerchant, error: insertError } = await supabase
        .from("merchants")
        .insert({
          owner_id: user.id,
          shop_name: formData.shopName,
          address: formData.address,
          shop_phone: formData.phone,
          status: 'pending', // 默认为待审核
          // platform_balance 默认为 2000 (由数据库设置)
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. 【新增步骤】写入“赠送体验金”的流水记录
      // 这样商户在“我的钱包”里就能看到第一笔钱是哪来的
      const { error: transError } = await supabase.from("merchant_transactions").insert({
        merchant_id: newMerchant.merchant_id,
        type: 'bonus',
        amount: 2000,
        balance_after: 2000,
        description: '欢迎加入！新商户体验金'
      });

      if (transError) {
        // 即使流水写入失败，也不阻断开店流程，只是打印错误
        console.error("赠送金流水写入失败:", transError);
      }

      // 3. 调用 RPC 升级用户角色
      const { error: rpcError } = await supabase.rpc('set_role_to_merchant', { 
        user_uuid: user.id 
      });

      if (rpcError) {
         console.error("角色升级失败:", rpcError);
      }

      // 4. 成功！跳转
      window.location.href = "/merchant/dashboard"; 

    } catch (err: unknown) {
      let errorMessage = "提交失败，请重试";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "object" && err !== null && "message" in err) {
         errorMessage = (err as { message: string }).message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div className="card w-full max-w-lg bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl justify-center mb-2">开设您的店铺</h2>
          <p className="text-center text-base-content/60 mb-2">
            填写以下信息，立即开启您的商家之旅。
          </p>
          <div className="alert alert-success py-2 mb-4 text-sm">
             🎁 新商户限时福利：注册即送 <strong>฿2,000</strong> 平台体验金！
          </div>

          {error && <div className="alert alert-error text-sm mb-4">{error}</div>}

          <div className="form-control w-full">
            <label className="label"><span className="label-text">店铺名称 *</span></label>
            <input 
              type="text" 
              className="input input-bordered w-full" 
              placeholder="例如：PMT 咖啡馆"
              value={formData.shopName}
              onChange={(e) => setFormData({...formData, shopName: e.target.value})}
            />
          </div>

          <div className="form-control w-full mt-4">
            <label className="label"><span className="label-text">联系电话 *</span></label>
            <input 
              type="tel" 
              className="input input-bordered w-full" 
              placeholder="用于客户联系您"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>

          <div className="form-control w-full mt-4">
            <label className="label"><span className="label-text">详细地址 *</span></label>
            <textarea 
              className="textarea textarea-bordered h-24" 
              placeholder="请输入店铺的实际经营地址"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
            ></textarea>
          </div>

          <div className="card-actions justify-end mt-8">
            <button 
              className="btn btn-primary w-full" 
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner"></span> : "确认开店"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}