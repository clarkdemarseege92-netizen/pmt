// 文件: /app/merchant/settings/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import Image from "next/image";
import { HiCheckCircle, HiXCircle, HiBuildingStorefront, HiIdentification } from "react-icons/hi2";
import { FaFacebook, FaLine, FaInstagram, FaTiktok } from "react-icons/fa";
// 定义后端 OCR API 的返回结构
interface OcrResponse {
  success: boolean;
  extractedId?: string | null;
  extractedName?: string | null;
  text?: string;
  error?: string;
}

interface Merchant {
  merchant_id: string;
  owner_id: string;
  status: string;
  shop_name?: string;
  id_card_number?: string;
  bank_account_name?: string; // 存储“证件姓名”
  id_card_image_url?: string;
  promptpay_id?: string;
  address?: string;
  google_maps_link?: string;
  contact_phone?: string;
  description?: string;
  logo_url?: string; 
  social_links?: { 
    facebook?: string;
    line?: string;
    instagram?: string;
    tiktok?: string;
  };
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  
  // 手机验证状态
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpView, setOtpView] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // --- 状态管理 ---
  const [merchant, setMerchant] = useState<Merchant | null>(null); 
  
  // 我们使用同一个大对象管理表单，但在提交时区分字段
  const [form, setForm] = useState({
    // 店铺信息
    shopName: "",
    address: "",
    googleMapsLink: "",
    contactPhone: "",
    description: "",
    logoUrl: "", 
    socialLinks: {
    facebook: "",
    line: "",
    instagram: "",
    tiktok: ""
  },
    
    // KYC & 支付信息
    idCardNumber: "",
    bankAccountName: "", 
    idCardImg: "",
    promptpayId: ""
  });

  const [ocrLoading, setOcrLoading] = useState(false);
  const [saveKycLoading, setSaveKycLoading] = useState(false); // KYC 保存状态
  const [saveShopLoading, setSaveShopLoading] = useState(false); // 店铺信息保存状态

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user?.phone) setPhone(user.phone); 

      if (user) {
        const { data: m } = await supabase
          .from('merchants')
          .select('*')
          .eq('owner_id', user.id)
          .single();
        
        if (m) {
          setMerchant(m as Merchant);
          setForm({
            // 店铺信息
            shopName: m.shop_name || "",
            address: m.address || "",
            googleMapsLink: m.google_maps_link || "",
            contactPhone: m.contact_phone || "",
            description: m.description || "", 
            logoUrl: m.logo_url || "", 
            socialLinks: m.social_links || { 
          facebook: "",
          line: "",
          instagram: "",
          tiktok: ""
             },
            
            // KYC 信息
            idCardNumber: m.id_card_number || "",
            bankAccountName: m.bank_account_name || "",
            idCardImg: m.id_card_image_url || "",
            promptpayId: m.promptpay_id || ""
          });
        }
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // --- OTP 逻辑 (保持不变) ---
  const handleSendOtp = async () => {
    setLoading(true);
    setMessage(null);
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = `+66${formattedPhone.substring(1)}`;
    }
    setPhone(formattedPhone);

    const { error: updateError } = await supabase.auth.updateUser({ 
      phone: formattedPhone 
    });

    if (updateError) {
       setMessage({ type: 'error', text: `更新手机号失败: ${updateError.message}` });
       setLoading(false);
       return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });

    if (error) {
      setMessage({ type: 'error', text: `OTP 发送失败: ${error.message}` });
    } else {
      setOtpView(true);
      setMessage({ type: 'success', text: '验证码已发送！' });
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setMessage(null);
    
    const { error } = await supabase.auth.verifyOtp({
      phone: phone, 
      token: otp,
      type: "sms",
    });

    if (error) {
      setMessage({ type: 'error', text: `验证失败: ${error.message}` });
    } else {
      setMessage({ type: 'success', text: '手机号验证成功！' });
      setOtpView(false);
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    setLoading(false);
  };

  // --- 处理 OCR 上传 (保持不变) ---
  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'id_card' | 'bank_book') => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setOcrLoading(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64 = reader.result as string;

        const res = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, type }),
        });
        
        const data = (await res.json()) as OcrResponse;

        if (data.success) {
          setForm(prev => {
             const newState = { ...prev };
             if (type === 'id_card') {
                if (data.extractedId) newState.idCardNumber = data.extractedId;
                if (data.extractedName) newState.bankAccountName = data.extractedName;
             }
             return newState;
          });
          alert("识别成功！请核对信息。");
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `kyc/${user?.id}/${type}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
            .from('products') 
            .upload(fileName, file);

        if (!uploadError) {
           const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName);
           if (type === 'id_card') setForm(prev => ({ ...prev, idCardImg: publicUrl }));
        }
      };
    } catch (error) {
      console.error(error);
      alert("识别或上传服务异常，请稍后重试");
    } finally {
      setOcrLoading(false);
    }
  };

  // --- 【新功能】仅保存店铺信息 ---
  const saveShopInfo = async () => {
    if (!merchant) return;
    setSaveShopLoading(true);

    const { error } = await supabase
      .from('merchants')
      .update({
        shop_name: form.shopName,
        address: form.address,
        google_maps_link: form.googleMapsLink,
        contact_phone: form.contactPhone,
        description: form.description,
        logo_url: form.logoUrl, 
        social_links: form.socialLinks 
      })
      .eq('merchant_id', merchant.merchant_id);

    if (error) {
      setMessage({ type: 'error', text: `保存店铺信息失败: ${error.message}` });
    } else {
      setMessage({ type: 'success', text: '店铺展示信息更新成功！' });
    }
    setSaveShopLoading(false);
  };

  // --- 仅保存 KYC/支付信息 ---
  const saveKycInfo = async () => {
    if (!merchant) return;
    setSaveKycLoading(true);
    
    const { error } = await supabase
      .from('merchants')
      .update({
        id_card_number: form.idCardNumber,
        bank_account_name: form.bankAccountName,
        id_card_image_url: form.idCardImg,
        promptpay_id: form.promptpayId, 
      })
      .eq('merchant_id', merchant.merchant_id);

    if (error) {
      alert("保存认证信息失败: " + error.message);
    } else {
      alert("认证资料已提交！请等待审核。");
      window.location.reload();
    }
    setSaveKycLoading(false);
  };
  
  const isKycDataFilled = !!form.idCardNumber;
  const isPhoneVerified = !!user?.phone_confirmed_at;
// 添加 logo 上传函数
const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  if (!e.target.files?.[0] || !user) return;
  const file = e.target.files[0];
  
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `logos/${user.id}/logo_${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('products')
      .getPublicUrl(fileName);
    
    setForm(prev => ({ ...prev, logoUrl: publicUrl }));
    setMessage({ type: 'success', text: 'Logo 上传成功！记得点击"更新店铺信息"保存更改。' });
    
  } catch (error) {
    console.error('Logo upload error:', error);
    setMessage({ type: 'error', text: 'Logo 上传失败，请重试' });
  }
};

// 社交媒体链接输入处理函数
const handleSocialLinkChange = (platform: keyof typeof form.socialLinks, value: string) => {
  setForm(prev => ({
    ...prev,
    socialLinks: {
      ...prev.socialLinks,
      [platform]: value
    }
  }));
};

  if (loading) return <span className="loading loading-spinner loading-lg"></span>;
  if (!user) return <p>无法加载用户信息。</p>;

  return (
    <div className="w-full max-w-3xl p-8 space-y-8 bg-base-100 rounded-lg shadow-xl">
      <div className="flex justify-between items-center border-b pb-4">
         <h1 className="text-3xl font-bold">账户设置</h1>
         {/* 认证状态微章 */}
         <div className={`badge ${merchant?.status === 'approved' ? 'badge-success' : 'badge-warning'} gap-2 p-3`}>
            {merchant?.status === 'approved' ? <HiCheckCircle /> : <HiXCircle />}
            {merchant?.status === 'approved' ? '已认证商家' : '未认证/审核中'}
         </div>
      </div>

      {/* 全局消息提示 */}
      {message && (
        <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'} shadow-lg`}>
            <span>{message.text}</span>
            <button className="btn btn-sm btn-ghost" onClick={() => setMessage(null)}>✕</button>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 1. 店铺展示信息 (独立模块，独立保存) */}
      {/* ======================================================================= */}
      <section className="card bg-base-200 shadow-sm border border-base-300">
        <div className="card-body p-6">
           <h2 className="card-title flex items-center gap-2 text-primary">
              <HiBuildingStorefront /> 店铺信息展示
           </h2>
           <p className="text-xs opacity-60 mb-4">这些信息将直接展示在您的店铺主页，方便顾客找到您。</p>

           <div className="grid gap-4">
              {/* Logo 上传 */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-bold">店铺 Logo</span>
          <span className="label-text-alt text-xs text-base-content/50">建议尺寸: 200x200px</span>
        </label>
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <div className="flex-none">
            <div className="relative w-24 h-24 bg-base-100 rounded-lg border-2 border-dashed border-base-300 flex items-center justify-center overflow-hidden">
              {form.logoUrl ? (
                <Image 
                  src={form.logoUrl} 
                  alt="Shop Logo" 
                  fill 
                  className="object-cover rounded-lg"
                  unoptimized 
                />
              ) : (
                <span className="text-xs text-base-content/40 text-center px-2">点击上传 Logo</span>
              )}
              <input 
                type="file" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                accept="image/*"
                onChange={handleLogoUpload} 
              />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm opacity-70">
              {form.logoUrl 
                ? "Logo 已上传，点击图片可重新上传" 
                : "上传店铺 Logo，将在店铺页面显示"
              }
            </p>
            {form.logoUrl && (
              <button 
                type="button"
                className="btn btn-ghost btn-xs mt-2"
                onClick={() => setForm(prev => ({ ...prev, logoUrl: "" }))}
              >
                移除 Logo
              </button>
            )}
          </div>
        </div>
      </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-bold">店铺名称</span></label>
                <input type="text" className="input input-bordered" 
                   value={form.shopName}
                   onChange={(e) => setForm({...form, shopName: e.target.value})} 
                   placeholder="例如: PMT SHOP"
                />
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text font-bold">店铺地址 (文字)</span></label>
                <textarea className="textarea textarea-bordered h-20" 
                   value={form.address}
                   onChange={(e) => setForm({...form, address: e.target.value})} 
                   placeholder="例如: 曼谷素坤逸路 12 巷 30 号..."
                ></textarea>
              </div>
      <div className="form-control">
        <label className="label">
          <span className="label-text font-bold">店铺描述</span>
          <span className="label-text-alt text-xs text-base-content/50">简要介绍您的店铺</span>
        </label>
        <textarea className="textarea textarea-bordered h-24" 
          value={form.description}
          onChange={(e) => setForm({...form, description: e.target.value})} 
          placeholder="例如: Thai Food"
          maxLength={200}
        ></textarea>
        <div className="text-right text-xs opacity-50 mt-1">
          {form.description.length}/200
        </div>
      </div>
              <div className="grid md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                        <span className="label-text font-bold">Google Maps 链接</span>
                        <span className="label-text-alt text-xs text-base-content/50">地图分享链接</span>
                    </label>
                    <input type="text" className="input input-bordered" 
                       placeholder="https://maps.app.goo.gl/..."
                       value={form.googleMapsLink}
                       onChange={(e) => setForm({...form, googleMapsLink: e.target.value})} 
                    />
                  </div>

                  <div className="form-control">
                    <label className="label"><span className="label-text font-bold">对外客服电话</span></label>
                    <input type="tel" className="input input-bordered" 
                       value={form.contactPhone}
                       onChange={(e) => setForm({...form, contactPhone: e.target.value})} 
                       placeholder="08X-XXX-XXXX"
                    />
                  </div>
              </div>
           </div>
{/* 社交媒体链接 */}
<div className="form-control">
  <label className="label">
    <span className="label-text font-bold">社交媒体链接</span>
    <span className="label-text-alt text-xs text-base-content/50">让顾客通过更多渠道联系您</span>
  </label>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    <div className="flex items-center gap-2">
      <FaFacebook className="w-4 h-4 text-blue-600" />
      <input 
        type="text" 
        className="input input-bordered input-sm flex-1" 
        placeholder="https://facebook.com/..."
        value={form.socialLinks.facebook || ""} // 确保有默认值
        onChange={(e) => handleSocialLinkChange('facebook', e.target.value)}
      />
    </div>
    <div className="flex items-center gap-2">
      <FaLine className="w-4 h-4 text-green-600" />
      <input 
        type="text" 
        className="input input-bordered input-sm flex-1" 
        placeholder="Line ID 或链接"
        value={form.socialLinks.line || ""} // 确保有默认值
        onChange={(e) => handleSocialLinkChange('line', e.target.value)}
      />
    </div>
    <div className="flex items-center gap-2">
      <FaInstagram className="w-4 h-4 text-pink-600" />
      <input 
        type="text" 
        className="input input-bordered input-sm flex-1" 
        placeholder="https://instagram.com/..."
        value={form.socialLinks.instagram || ""} // 确保有默认值
        onChange={(e) => handleSocialLinkChange('instagram', e.target.value)}
      />
    </div>
    <div className="flex items-center gap-2">
      <FaTiktok className="w-4 h-4 text-black" />
      <input 
        type="text" 
        className="input input-bordered input-sm flex-1" 
        placeholder="https://tiktok.com/..."
        value={form.socialLinks.tiktok || ""} // 确保有默认值
        onChange={(e) => handleSocialLinkChange('tiktok', e.target.value)}
      />
    </div>
  </div>
</div>

           <div className="card-actions justify-end mt-4">
              <button 
                className="btn btn-primary w-full md:w-auto" 
                onClick={saveShopInfo} 
                disabled={saveShopLoading}
              >
                  {saveShopLoading ? <span className="loading loading-spinner"></span> : "更新店铺信息"}
              </button>
           </div>
        </div>
      </section>

      <div className="divider"></div>

      {/* ======================================================================= */}
      {/* 2. 实名认证与收款 (独立模块，独立保存) */}
      {/* ======================================================================= */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-secondary">
           <HiIdentification /> 认证与收款设置
        </h2>
        
        {/* KYC 折叠面板 */}
        <div className="collapse collapse-arrow bg-base-200 border border-base-300">
            <input type="checkbox" /> 
            <div className="collapse-title text-lg font-medium">
              实名认证 (KYC)
            </div>
            <div className="collapse-content space-y-4 pt-4">
               {/* 身份证上传部分 (代码保持不变) */}
               <div className="form-control">
                  <label className="label"><span className="label-text font-bold">身份证/护照照片</span></label>
                  <div className="flex flex-col md:flex-row gap-4 items-start">
                    <div className="flex-none w-full md:w-1/3">
                       <div className="relative aspect-video bg-base-100 rounded-lg border-2 border-dashed border-base-300 flex items-center justify-center overflow-hidden">
                          {form.idCardImg ? (
                            <Image src={form.idCardImg} alt="ID Card" fill className="object-cover" unoptimized />
                          ) : (
                            <span className="text-xs text-base-content/40">点击上传</span>
                          )}
                          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" 
                            accept="image/*"
                            onChange={(e) => handleOcrUpload(e, 'id_card')} disabled={ocrLoading} />
                       </div>
                       {ocrLoading && <div className="text-center text-xs mt-1 animate-pulse text-primary">识别中...</div>}
                    </div>
                    <div className="flex-1 w-full space-y-3">
                       <div>
                          <label className="label pt-0"><span className="label-text-alt">证件号码</span></label>
                          <input type="text" className="input input-bordered w-full" 
                             value={form.idCardNumber}
                             onChange={(e) => setForm({...form, idCardNumber: e.target.value})}
                          />
                       </div>
                       <div>
                          <label className="label pt-0"><span className="label-text-alt">证件姓名</span></label>
                          <input type="text" className="input input-bordered w-full" 
                             value={form.bankAccountName}
                             onChange={(e) => setForm({...form, bankAccountName: e.target.value})}
                          />
                       </div>
                    </div>
                  </div>
               </div>
            </div>
        </div>

        {/* PromptPay 折叠面板 */}
        <div className="collapse collapse-arrow bg-base-200 border border-base-300">
            <input type="checkbox" /> 
            <div className="collapse-title text-lg font-medium">
              收款方式 (PromptPay)
            </div>
            <div className="collapse-content space-y-4 pt-4">
                {!isPhoneVerified && <p className="text-error text-sm">⚠️ 请先完成下方手机号验证。</p>}
                {!isKycDataFilled && <p className="text-error text-sm">⚠️ 请先完成 KYC 证件填写。</p>}

                <div className="form-control">
                    <label className="label"><span className="label-text font-bold">PromptPay ID</span></label>
                    <select 
                        className="select select-bordered w-full" 
                        value={form.promptpayId || ''}
                        onChange={(e) => setForm({...form, promptpayId: e.target.value})}
                        disabled={!isPhoneVerified || !isKycDataFilled}
                    >
                        <option value="" disabled>请选择...</option>
                        {user?.phone && <option value={user.phone}>手机号：{user.phone}</option>}
                        {form.idCardNumber && <option value={form.idCardNumber}>证件号：{form.idCardNumber}</option>}
                    </select>
                </div>
            </div>
        </div>
        
        {/* KYC 专属保存按钮 */}
        <div className="flex justify-end">
            <button className="btn btn-secondary" onClick={saveKycInfo} disabled={saveKycLoading}>
                {saveKycLoading ? "提交中..." : "提交认证资料"}
            </button>
        </div>
      </section>

      {/* 底部：账号安全 (邮箱与手机) */}
      <div className="divider text-xs opacity-50">账号安全</div>
      <div className="bg-base-50 p-4 rounded-lg text-sm space-y-4">
          <div className="flex justify-between items-center">
             <span className="opacity-70">注册邮箱</span>
             <span className="font-mono">{user?.email}</span>
          </div>
          
          <div className="form-control">
              <label className="label pt-0"><span className="label-text opacity-70">绑定手机</span></label>
              {!otpView ? (
                  <div className="flex gap-2">
                      <input
                        type="tel"
                        value={phone.startsWith('+66') ? phone.replace('+66', '0') : phone} 
                        className="input input-bordered input-sm flex-1"
                        onChange={(e) => setPhone(e.target.value)}
                      />
                      <button className="btn btn-outline btn-sm" onClick={handleSendOtp} disabled={loading}>
                          {user?.phone_confirmed_at ? '更换' : '验证'}
                      </button>
                  </div>
              ) : (
                  <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="验证码"
                        className="input input-bordered input-sm flex-1"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                      />
                      <button className="btn btn-primary btn-sm" onClick={handleVerifyOtp} disabled={loading}>
                          确认
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setOtpView(false)}>取消</button>
                  </div>
              )}
          </div>
      </div>

    </div>
  );
}