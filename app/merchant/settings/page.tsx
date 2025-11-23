// 文件: /app/merchant/settings/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import Image from "next/image";
import { HiCheckCircle, HiXCircle } from "react-icons/hi2";

// 定义后端 OCR API 的返回结构，避免 'any'
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
  id_card_number?: string;
  // 银行账户字段 (已注释，预留给未来升级)
  // bank_name?: string; 
  bank_account_name?: string; // 注意：此字段目前被复用于存储“证件姓名”
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
    bankAccountName: "", // 这里存储“证件姓名”
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
      if (user?.phone) setPhone(user.phone); 

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
            // bankName: m.bank_name || "",
            // 注意：因为我们在 Merchant 接口里保留了 bank_account_name 用于姓名，这里需要断言或确保数据存在
            bankAccountName: m.bank_account_name || "",
            // bankAccountNumber: m.bank_account_number || "",
            idCardImg: m.id_card_image_url || "",
            // bankBookImg: m.bank_book_image_url || "",
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, type }),
        });
        
        const data = (await res.json()) as OcrResponse;
        console.log("前端 OCR 响应:", data);

        // 3. 自动填入识别到的信息
        if (data.success) {
          const updatedFields: string[] = [];

          setKycForm(prev => {
             const newState = { ...prev };
             
             if (type === 'id_card') {
                if (data.extractedId) {
                   newState.idCardNumber = data.extractedId;
                   updatedFields.push("证件号码");
                }
                if (data.extractedName) {
                   // 将识别到的名字填入 bankAccountName (界面显示的"证件姓名")
                   newState.bankAccountName = data.extractedName;
                   updatedFields.push("姓名");
                }
             }
             /* 银行存折/银行卡 OCR 逻辑已注释 (保留逻辑以便未来恢复)
             else if (type === 'bank_book' && data.extractedId) {
                // newState.bankAccountNumber = data.extractedId;
                // updatedFields.push("银行账号");
             }
             */
             return newState;
          });

          if (updatedFields.length > 0) {
             alert(`已自动识别并填充：${updatedFields.join("、")}。请务必核对信息是否准确。`);
          } else {
             alert("图片上传成功，但未识别到清晰的文字信息，请手动填写。");
          }
        }

        // 4. 上传图片到 Supabase Storage
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
      alert("识别或上传服务异常，请稍后重试");
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
        bank_account_name: kycForm.bankAccountName, // 保存姓名
        // 银行账户字段已注释
        // bank_name: kycForm.bankName,
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
  
  const isKycDataFilled = !!kycForm.idCardNumber;
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
           {/* 身份证部分 */}
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
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" 
                        accept="image/*"
                        onChange={(e) => handleOcrUpload(e, 'id_card')} disabled={ocrLoading} />
                   </div>
                   {ocrLoading && <div className="text-center text-xs mt-1 animate-pulse text-primary">正在智能识别中...</div>}
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
              
               <div className="flex flex-col md:flex-row gap-4 items-start mt-4">
                  <div className="flex-none w-full md:w-1/3">
                     <div className="relative aspect-video bg-base-100 rounded-lg border-2 border-dashed border-base-300 flex items-center justify-center overflow-hidden">
                        {kycForm.bankBookImg ? (
                          <Image src={kycForm.bankBookImg} alt="Bank Book" fill className="object-cover" unoptimized />
                        ) : (
                          <span className="text-xs text-base-content/40">上传存折照片</span>
                        )}
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" 
                          onChange={(e) => handleOcrUpload(e, 'bank_book')} disabled={ocrLoading} />
                     </div>
                  </div>
                  <div className="flex-1 w-full space-y-3">
                     <input type="text" className="input input-bordered w-full" 
                         value={kycForm.bankName}
                         onChange={(e) => setKycForm({...kycForm, bankName: e.target.value})}
                         placeholder="银行名称" 
                      />
                      <input type="text" className="input input-bordered w-full" 
                         value={kycForm.bankAccountNumber}
                         onChange={(e) => setKycForm({...kycForm, bankAccountNumber: e.target.value})}
                         placeholder="银行账号" 
                      />
                  </div>
               </div>
           </div>
           */}
           
        </div>
      </div>
      
      {/* 3. PromptPay 收款设置 */}
      <div className="collapse collapse-arrow bg-base-200">
        <input type="checkbox" defaultChecked /> 
        <div className="collapse-title text-xl font-medium">
          PromptPay 收款设置
        </div>
        <div className="collapse-content space-y-4">
            <p className="text-sm opacity-70 mb-2">完成认证后，请设置一个用作收款的 ID。</p>
            {!isPhoneVerified && <p className="text-error text-sm">⚠️ 请先完成手机号验证。</p>}
            {!isKycDataFilled && <p className="text-error text-sm">⚠️ 请先完成 KYC 中的证件号填写。</p>}

            {isPhoneVerified && isKycDataFilled ? (
                <div className="form-control">
                    <label className="label">
                        <span className="label-text font-bold">选择 PromptPay ID</span>
                    </label>
                    <select 
                        className="select select-bordered w-full" 
                        value={kycForm.promptpayId || ''}
                        onChange={(e) => setKycForm({...kycForm, promptpayId: e.target.value})}
                    >
                        <option value="" disabled>请选择...</option>
                        {user?.phone && (
                           <option value={user.phone}>
                              手机号：{user.phone}
                           </option>
                        )}
                        {kycForm.idCardNumber && (
                           <option value={kycForm.idCardNumber}>
                              证件号：{kycForm.idCardNumber} (推荐)
                           </option>
                        )}
                    </select>
                </div>
            ) : (
                <button className="btn btn-disabled w-full">请先完成上述验证步骤</button>
            )}
        </div>
      </div>
      
      {/* 保存按钮 */}
      <div className="flex justify-end pt-4">
        <button className="btn btn-primary" onClick={saveKycInfo} disabled={saveKycLoading}>
            {saveKycLoading ? "保存中..." : "保存认证信息"}
        </button>
      </div>
      
      {/* 邮箱信息 */}
      <div className="divider text-xs opacity-50">账户安全</div>
      <div className="form-control">
        <label className="label"><span className="label-text">注册邮箱</span></label>
        <div className="flex justify-between items-center px-1">
             <span>{user?.email}</span>
             {user?.email_confirmed_at ? (
                <span className="badge badge-success badge-sm">已验证</span>
             ) : (
                <span className="badge badge-warning badge-sm">待验证</span>
             )}
        </div>
      </div>

      {/* 手机号验证 */}
      <div className="form-control mt-4">
            <label className="label"><span className="label-text">手机号</span></label>
            {!otpView ? (
                <div className="flex gap-2">
                    <input
                      type="tel"
                      placeholder="099-888-8888"
                      value={phone.startsWith('+66') ? phone.replace('+66', '0') : phone} 
                      className="input input-bordered flex-1"
                      onChange={(e) => setPhone(e.target.value)}
                    />
                    <button className="btn btn-outline" onClick={handleSendOtp} disabled={loading}>
                        {user?.phone_confirmed_at ? '更换' : '验证'}
                    </button>
                </div>
            ) : (
                <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="输入验证码"
                      className="input input-bordered flex-1"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                    <button className="btn btn-primary" onClick={handleVerifyOtp} disabled={loading}>
                        确认
                    </button>
                    <button className="btn btn-ghost" onClick={() => setOtpView(false)}>取消</button>
                </div>
            )}
            {user?.phone_confirmed_at && !otpView && <div className="text-success text-xs mt-1 ml-1">已验证</div>}
      </div>

      {message && (
        <div className={`toast toast-end`}>
            <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'}`}>
                <span>{message.text}</span>
            </div>
        </div>
      )}
    </div>
  );
}