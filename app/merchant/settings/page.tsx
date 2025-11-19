// 文件: /app/merchant/settings/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import Image from "next/image";
import { HiCheckCircle, HiXCircle } from "react-icons/hi2";

interface Merchant {
  merchant_id: string;
  owner_id: string;
  status: string;
  id_card_number?: string;
  // 银行账户字段已注释 (预留给未来升级)
  // bank_name?: string; 
  // bank_account_name?: string; 
  // bank_account_number?: string; 
  id_card_image_url?: string;
  // bank_book_image_url?: string; 
  promptpay_id?: string;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  
  // 手机验证状态
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpView, setOtpView] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // --- KYC 状态 ---
  const [merchant, setMerchant] = useState<Merchant | null>(null); 
  const [kycForm, setKycForm] = useState({
    idCardNumber: "",
    // bankName: "", // 银行信息已注释
    bankAccountName: "",
    // bankAccountNumber: "", // 银行信息已注释
    idCardImg: "",
    // bankBookImg: "", // 银行信息已注释
    promptpayId: ""
  });
  const [ocrLoading, setOcrLoading] = useState(false);
  const [saveKycLoading, setSaveKycLoading] = useState(false);

useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      // 注意: user.phone 已经是带 +66 的国际格式
      if (user?.phone) setPhone(user.phone); 

      // 获取商户信息
      if (user) {
        const { data: m } = await supabase
          .from('merchants')
          .select('*')
          .eq('owner_id', user.id)
          .single();
        
        if (m) {
          setMerchant(m as Merchant);
          setKycForm({
            idCardNumber: m.id_card_number || "",
            // bankName: m.bank_name || "", // 银行信息已注释
            bankAccountName: m.bank_account_name || "",
            // bankAccountNumber: m.bank_account_number || "", // 银行信息已注释
            idCardImg: m.id_card_image_url || "",
            // bankBookImg: m.bank_book_image_url || "", // 银行信息已注释
            promptpayId: m.promptpay_id || "" 
          });
        }
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSendOtp = async () => {
    setLoading(true);
    setMessage(null);
    let formattedPhone = phone.trim();
    // 确保本地输入格式（09x-xxx-xxxx）被转换为国际格式（+669x-xxx-xxxx）
    if (formattedPhone.startsWith('0')) {
      formattedPhone = `+66${formattedPhone.substring(1)}`;
    }
    setPhone(formattedPhone); // 更新状态以使用国际格式

    // 将手机号更新到用户元数据，并发送 OTP
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
      // 刷新用户信息，user.phone_confirmed_at 将更新
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    setLoading(false);
  };

// --- 处理 OCR 上传 ---
  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'id_card' | 'bank_book') => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setOcrLoading(true);

    try {
      // 1. 转 Base64 用于 OCR
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;

        // 2. 调用 OCR API
        const res = await fetch('/api/ocr', {
          method: 'POST',
          body: JSON.stringify({ imageBase64: base64, type }),
        });
        const data = await res.json();
    console.log("Frontend OCR Response Data:", data);
        // 3. 自动填入识别到的信息
        if (data.success) {
          let alertMessage = "已自动识别，请核对：";

          if (type === 'id_card') {
            if (data.extractedId) {
              setKycForm(prev => ({ ...prev, idCardNumber: data.extractedId }));
              alertMessage += "证件号码；";
            }
            // 提取姓名并更新 bankAccountName
            if (data.extractedName) {
              setKycForm(prev => ({ ...prev, bankAccountName: data.extractedName }));
              alertMessage += "账户名。";
            }
          } 
          /* 银行存折/银行卡 OCR 逻辑已注释
          else if (type === 'bank_book' && data.extractedId) {
            setKycForm(prev => ({ ...prev, bankAccountNumber: data.extractedId }));
            alertMessage += "银行账号。";
          }
          */
          
          if (alertMessage === "已自动识别，请核对：") {
             alert("图片上传成功，但未在图片中找到清晰的号码和姓名，请手动填写。");
          } else {
             alert(alertMessage);
          }
        }

        // 4. 上传图片到 Supabase Storage (用于存证)
        const fileExt = file.name.split('.').pop();
        const fileName = `kyc/${user?.id}/${type}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
            .from('products') 
            .upload(fileName, file);

        if (!uploadError) {
           const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName);
           if (type === 'id_card') setKycForm(prev => ({ ...prev, idCardImg: publicUrl }));
           // 银行卡图片 URL 设置已注释
           // if (type === 'bank_book') setKycForm(prev => ({ ...prev, bankBookImg: publicUrl }));
        }
      };
    } catch (error) {
      console.error(error);
      alert("识别或上传失败");
    } finally {
      setOcrLoading(false);
    }
  };

  // --- 保存 KYC 信息 ---
  const saveKycInfo = async () => {
    if (!merchant) return;
    setSaveKycLoading(true);
    
    const { error } = await supabase
      .from('merchants')
      .update({
        id_card_number: kycForm.idCardNumber,
        // 银行账户字段已注释
        // bank_name: kycForm.bankName,
        // bank_account_name: kycForm.bankAccountName,
        // bank_account_number: kycForm.bankAccountNumber,
        id_card_image_url: kycForm.idCardImg,
        // bank_book_image_url: kycForm.bankBookImg,
        promptpay_id: kycForm.promptpayId, 
      })
      .eq('merchant_id', merchant.merchant_id);

    if (error) {
      alert("保存失败: " + error.message);
    } else {
      alert("资料已保存！请等待平台审核通过后即可开始收款。");
      window.location.reload();
    }
    setSaveKycLoading(false);
  };
  
  // 检查 KYC 是否已填写必要字段 (只依赖身份证号)
  const isKycDataFilled = !!kycForm.idCardNumber;
  // 检查手机号是否已验证
  const isPhoneVerified = !!user?.phone_confirmed_at;

  if (loading) {
    return <span className="loading loading-spinner loading-lg"></span>;
  }

  if (!user) {
    return <p>无法加载用户信息。</p>;
  }

  return (
    <div className="w-full max-w-3xl p-8 space-y-6 bg-base-100 rounded-lg shadow-xl">
      <h1 className="text-3xl font-bold">账户设置</h1>
{/* 1. 认证状态卡片 */}
      <div className={`alert ${merchant?.status === 'approved' ? 'alert-success' : 'alert-warning'}`}>
        {merchant?.status === 'approved' ? <HiCheckCircle className="w-6 h-6"/> : <HiXCircle className="w-6 h-6"/>}
        <div>
          <h3 className="font-bold">当前状态: {merchant?.status === 'approved' ? '已认证 (可正常收款)' : '待认证 / 审核中'}</h3>
          <div className="text-xs">请完善以下信息以激活您的收款功能。</div>
        </div>
      </div>

      {/* 2. 身份验证 (KYC) */}
      <div className="collapse collapse-arrow bg-base-200">
        <input type="checkbox" defaultChecked /> 
        <div className="collapse-title text-xl font-medium">
          实名认证 (KYC)
        </div>
        <div className="collapse-content space-y-4">
           {/* 身份证部分 (保留) */}
           <div className="form-control">
              <label className="label"><span className="label-text font-bold">1. 身份证/护照</span></label>
              <div className="flex flex-col md:flex-row gap-4 items-start">
                {/* 图片预览与上传 */}
                <div className="flex-none w-full md:w-1/3">
                   <div className="relative aspect-video bg-base-100 rounded-lg border-2 border-dashed border-base-300 flex items-center justify-center overflow-hidden">
                      {kycForm.idCardImg ? (
                        <Image src={kycForm.idCardImg} alt="ID Card" fill className="object-cover" unoptimized />
                      ) : (
                        <span className="text-xs text-base-content/40">上传照片自动识别</span>
                      )}
                      {/* 注意: type="file" 上的 onChange 函数仍然允许上传 bank_book 类型，但在 handleOcrUpload 内部已被注释 */}
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" 
                        onChange={(e) => handleOcrUpload(e, 'id_card')} disabled={ocrLoading} />
                   </div>
                   {ocrLoading && <div className="text-center text-xs mt-1 animate-pulse">正在智能识别中...</div>}
                </div>
                {/* 输入框 */}
                <div className="flex-1 w-full space-y-3">
                   {/* 证件号码输入框 */}
                   <div>
                      <label className="label pt-0"><span className="label-text-alt">证件号码</span></label>
                      <input type="text" className="input input-bordered w-full" 
                         value={kycForm.idCardNumber}
                         onChange={(e) => setKycForm({...kycForm, idCardNumber: e.target.value})}
                         placeholder="自动识别或手动输入" 
                      />
                   </div>
                   {/* 证件姓名输入框 (保留，用于确认身份) */}
                   <div>
                      <label className="label pt-0"><span className="label-text-alt">证件姓名 (带称谓)</span></label>
                      <input type="text" className="input input-bordered w-full" 
                         value={kycForm.bankAccountName} // 仍然用这个字段存储实名
                         onChange={(e) => setKycForm({...kycForm, bankAccountName: e.target.value})}
                         placeholder="自动识别或手动输入 (必须与银行账户名一致)" 
                      />
                   </div>
                </div>
              </div>
           </div>

           {/* ---------------------------------------------------- */}
           {/* 银行账户部分已注释 (预留给未来升级) */}
           {/* ---------------------------------------------------- */}
           {/*
           <div className="divider"></div>
           <div className="form-control">
              <label className="label"><span className="label-text font-bold">2. 提现银行账户 (已禁用)</span></label>
              <p className="text-warning text-sm">银行账户认证功能已暂时禁用，请使用 PromptPay 收款。</p>
           </div>
           */}
           
        </div>
      </div>
      
      {/* 3. PromptPay 收款设置 (保留) */}
      <div className="collapse collapse-arrow bg-base-200">
        <input type="checkbox" defaultChecked /> 
        <div className="collapse-title text-xl font-medium">
          PromptPay 收款设置
        </div>
        <div className="collapse-content space-y-4">
            <p>1/手机号验证；2/身份证验证；3/设置您的PromptPay</p>
            {/* 检查 PromptPay 设置的前提条件 */}
            {!isPhoneVerified && <p className="text-error">错误：请先完成手机号验证。</p>}
            {!isKycDataFilled && <p className="text-error">错误：请先完成 KYC 中的证件号填写。</p>}

            {isPhoneVerified && isKycDataFilled ? (
                <>
                    <p className="text-sm text-base-content/70">
                        请选择一个已验证的 ID 作为客户付款的 PromptPay 收款账户 ID。
                    </p>
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-bold">PromptPay 收款 ID</span>
                        </label>
                        <select 
                            className="select select-bordered w-full" 
                            value={kycForm.promptpayId || ''}
                            onChange={(e) => setKycForm({...kycForm, promptpayId: e.target.value})}
                            required
                        >
                            <option value="" disabled>请选择一个 ID</option>
                            {/* 选项 1: 验证手机号 */}
                            {user?.phone && (
                               <option value={user.phone}>
                                  已验证手机号：{user.phone}
                               </option>
                            )}
                            {/* 选项 2: 身份证/护照号码 */}
                            {kycForm.idCardNumber && (
                               <option value={kycForm.idCardNumber}>
                                  已验证证件号：{kycForm.idCardNumber} (推荐)
                               </option>
                            )}
                        </select>
                         <label className="label">
                            <span className="label-text-alt text-warning">
                                * 这是客户扫码支付的唯一ID，必须与您的 PromptPay 绑定 ID 保持一致。
                            </span>
                        </label>
                    </div>
                </>
            ) : (
                <p className="text-warning">您需要满足上述条件后才能设置 PromptPay ID。</p>
            )}

        </div>
      </div>
      
      {/* 保存按钮 (保留在最下方，统一保存) */}
      <div className="flex justify-end pt-4">
        <button className="btn btn-primary" onClick={saveKycInfo} disabled={saveKycLoading}>
            {saveKycLoading ? "保存中..." : "保存认证信息"}
        </button>
      </div>
      
      {/* --- 邮箱信息 (保持不变) --- */}
      <div className="form-control">
        <label className="label"><span className="label-text">注册邮箱</span></label>
        <input
          type="email"
          className="input input-bordered"
          value={user?.email || ''}
          disabled
        />
        {user?.email_confirmed_at ? (
            <span className="text-success text-sm mt-1">已验证</span>
        ) : (
            <span className="text-warning text-sm mt-1">待验证（请检查您的收件箱）</span>
        )}
      </div>

      <div className="divider">手机号验证</div>
      
      {/* --- 手机号验证 (保持不变) --- */}
      {!otpView ? (
        <>
          <div className="form-control">
            <label className="label"><span className="label-text">手机号（用于账户恢复）</span></label>
            <input
              type="tel"
              placeholder="099-888-8888"
              // 转换格式：用户看到 099-888-8888，但内部使用 +6699-888-8888
              value={phone.startsWith('+66') ? phone.replace('+66', '0') : phone} 
              className="input input-bordered"
              onChange={(e) => setPhone(e.target.value)}
            />
             {user?.phone_confirmed_at ? (
                <span className="text-success text-sm mt-1">已验证: {user.phone}</span>
             ) : (
                <span className="text-warning text-sm mt-1">未验证。</span>
             )}
          </div>
          <button 
            className="btn btn-primary" 
            onClick={handleSendOtp} 
            disabled={loading}
          >
            {loading && <span className="loading loading-spinner"></span>}
            {user?.phone_confirmed_at ? '更新并重新验证手机号' : '发送验证码'} 
          </button>
        </>
      ) : (
        <>
          <p>已发送验证码至 {phone}</p>
          <div className="form-control">
            <label className="label"><span className="label-text">6位验证码</span></label>
            <input
              type="text"
              placeholder="123456"
              className="input input-bordered"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>
          <div className="flex gap-4">
             <button 
                className="btn btn-primary" 
                onClick={handleVerifyOtp} 
                disabled={loading}
              >
                {loading && <span className="loading loading-spinner"></span>}
                确认验证
              </button>
              <button 
                className="btn btn-ghost" 
                onClick={() => { setOtpView(false); setMessage(null); }}
              >
                返回
              </button>
          </div>
        </>
      )}

      {message && (
        <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'}`}>
          <span>{message.text}</span>
        </div>
      )}
    </div>
  );
}