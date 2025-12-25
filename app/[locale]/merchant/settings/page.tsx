// 文件: /app/[locale]/merchant/settings/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import Image from "next/image";
import { HiCheckCircle, HiXCircle, HiBuildingStorefront, HiIdentification } from "react-icons/hi2";
import { FaFacebook, FaLine, FaInstagram, FaTiktok } from "react-icons/fa";
import { useTranslations } from 'next-intl';

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
  bank_account_name?: string;
  id_card_image_url?: string;
  promptpay_id?: string;
  address?: string;
  google_maps_link?: string;
  contact_phone?: string;
  description?: string;
  logo_url?: string;
  bank_name?: string;
  bank_account_number?: string;
  social_links?: {
    facebook?: string;
    line?: string;
    instagram?: string;
    tiktok?: string;
  };
}

export default function SettingsPage() {
  const t = useTranslations('merchantSettings');

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // 手机验证状态
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpView, setOtpView] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // --- 状态管理 ---
  const [merchant, setMerchant] = useState<Merchant | null>(null);

  // 表单状态
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

    // KYC & 支付信息（必填）
    idCardNumber: "",
    bankAccountName: "",
    idCardImg: "",
    promptpayId: "",

    // 银行信息（可选，用于提现）
    bankName: "",
    bankAccountNumber: ""
  });

  const [ocrLoading, setOcrLoading] = useState(false);
  const [saveKycLoading, setSaveKycLoading] = useState(false);
  const [saveShopLoading, setSaveShopLoading] = useState(false);

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

          // 安全解析 social_links
          let parsedSocialLinks = {
            facebook: "",
            line: "",
            instagram: "",
            tiktok: ""
          };

          if (m.social_links) {
            try {
              // 如果是字符串，尝试解析
              if (typeof m.social_links === 'string') {
                parsedSocialLinks = JSON.parse(m.social_links);
              } else if (typeof m.social_links === 'object') {
                // 如果已经是对象，直接使用
                parsedSocialLinks = m.social_links;
              }
            } catch (error) {
              console.error('Failed to parse social_links:', error);
              // 使用默认值
            }
          }

          setForm({
            shopName: m.shop_name || "",
            address: m.address || "",
            googleMapsLink: m.google_maps_link || "",
            contactPhone: m.contact_phone || "",
            description: m.description || "",
            logoUrl: m.logo_url || "",
            socialLinks: parsedSocialLinks,
            idCardNumber: m.id_card_number || "",
            bankAccountName: m.bank_account_name || "",
            idCardImg: m.id_card_image_url || "",
            promptpayId: m.promptpay_id || "",
            bankName: m.bank_name || "",
            bankAccountNumber: m.bank_account_number || ""
          });
        }
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // --- OTP 逻辑 ---
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
      setMessage({ type: 'error', text: `${t('phoneUpdateFailed')}: ${updateError.message}` });
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });

    if (error) {
      setMessage({ type: 'error', text: `${t('otpSendFailed')}: ${error.message}` });
    } else {
      setOtpView(true);
      setMessage({ type: 'success', text: t('otpSent') });
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
      setMessage({ type: 'error', text: `${t('verifyFailed')}: ${error.message}` });
    } else {
      setMessage({ type: 'success', text: t('phoneVerified') });
      setOtpView(false);
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    setLoading(false);
  };

  // --- 处理 OCR 上传 ---
  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'id_card') => {
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
          alert(t('ocrSuccess'));
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
      alert(t('ocrError'));
    } finally {
      setOcrLoading(false);
    }
  };

  // --- 仅保存店铺信息 ---
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
      setMessage({ type: 'error', text: `${t('saveShopFailed')}: ${error.message}` });
    } else {
      setMessage({ type: 'success', text: t('shopInfoUpdated') });
    }
    setSaveShopLoading(false);
  };

  // --- 仅保存 KYC/支付信息 ---
  const saveKycInfo = async () => {
    if (!merchant) return;

    // 验证必填项
    if (!form.idCardNumber || !form.bankAccountName || !form.promptpayId) {
      setMessage({ type: 'error', text: t('kyc.requiredFieldsMissing') });
      return;
    }

    // 如果填写了银行信息，验证账户名称必须与身份证姓名一致
    if (form.bankName || form.bankAccountNumber) {
      if (!form.bankName || !form.bankAccountNumber) {
        setMessage({ type: 'error', text: t('bank.bothFieldsRequired') });
        return;
      }
      // 注意：这里暂不验证姓名一致性，因为可能有格式差异，由后台人工审核
    }

    setSaveKycLoading(true);

    const { error } = await supabase
      .from('merchants')
      .update({
        id_card_number: form.idCardNumber,
        bank_account_name: form.bankAccountName,
        id_card_image_url: form.idCardImg,
        promptpay_id: form.promptpayId,
        bank_name: form.bankName || null,
        bank_account_number: form.bankAccountNumber || null,
      })
      .eq('merchant_id', merchant.merchant_id);

    if (error) {
      setMessage({ type: 'error', text: `${t('saveKycFailed')}: ${error.message}` });
    } else {
      setMessage({ type: 'success', text: t('kycSubmitted') });
      // 刷新数据
      const { data: updatedMerchant } = await supabase
        .from('merchants')
        .select('*')
        .eq('merchant_id', merchant.merchant_id)
        .single();

      if (updatedMerchant) {
        setMerchant(updatedMerchant as Merchant);
      }
    }
    setSaveKycLoading(false);
  };

  const isKycDataFilled = !!form.idCardNumber;
  const isPhoneVerified = !!user?.phone_confirmed_at;

  // Logo 上传函数
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
      setMessage({ type: 'success', text: t('logoUploaded') });

    } catch (error) {
      console.error('Logo upload error:', error);
      setMessage({ type: 'error', text: t('logoUploadFailed') });
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
  if (!user) return <p>{t('noUserInfo')}</p>;

  return (
    <div className="w-full max-w-3xl p-8 space-y-8 bg-base-100 rounded-lg shadow-xl">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <div className={`badge ${merchant?.status === 'approved' ? 'badge-success' : 'badge-warning'} gap-2 p-3`}>
          {merchant?.status === 'approved' ? <HiCheckCircle /> : <HiXCircle />}
          {merchant?.status === 'approved' ? t('verified') : t('notVerified')}
        </div>
      </div>

      {/* 全局消息提示 */}
      {message && (
        <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'} shadow-lg`}>
          <span>{message.text}</span>
          <button className="btn btn-sm btn-ghost" onClick={() => setMessage(null)}>✕</button>
        </div>
      )}

      {/* 店铺展示信息 */}
      <section className="card bg-base-200 shadow-sm border border-base-300">
        <div className="card-body p-6">
          <h2 className="card-title flex items-center gap-2 text-primary">
            <HiBuildingStorefront /> {t('shopInfo.title')}
          </h2>
          <p className="text-xs opacity-60 mb-4">{t('shopInfo.subtitle')}</p>

          <div className="grid gap-4">
            {/* Logo 上传 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold">{t('shopInfo.logo')}</span>
                <span className="label-text-alt text-xs text-base-content/50">{t('shopInfo.logoHint')}</span>
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
                      <span className="text-xs text-base-content/40 text-center px-2">{t('shopInfo.clickUpload')}</span>
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
                    {form.logoUrl ? t('shopInfo.logoUploaded') : t('shopInfo.uploadLogoDesc')}
                  </p>
                  {form.logoUrl && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs mt-2"
                      onClick={() => setForm(prev => ({ ...prev, logoUrl: "" }))}
                    >
                      {t('shopInfo.removeLogo')}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text font-bold">{t('shopInfo.name')}</span></label>
              <input
                type="text"
                className="input input-bordered"
                value={form.shopName}
                onChange={(e) => setForm({...form, shopName: e.target.value})}
                placeholder={t('shopInfo.namePlaceholder')}
              />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text font-bold">{t('shopInfo.address')}</span></label>
              <textarea
                className="textarea textarea-bordered h-20"
                value={form.address}
                onChange={(e) => setForm({...form, address: e.target.value})}
                placeholder={t('shopInfo.addressPlaceholder')}
              ></textarea>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold">{t('shopInfo.description')}</span>
                <span className="label-text-alt text-xs text-base-content/50">{t('shopInfo.descriptionHint')}</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-24"
                value={form.description}
                onChange={(e) => setForm({...form, description: e.target.value})}
                placeholder={t('shopInfo.descriptionPlaceholder')}
                maxLength={200}
              ></textarea>
              <div className="text-right text-xs opacity-50 mt-1">
                {form.description.length}/200
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">{t('shopInfo.googleMaps')}</span>
                  <span className="label-text-alt text-xs text-base-content/50">{t('shopInfo.googleMapsHint')}</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  placeholder="https://maps.app.goo.gl/..."
                  value={form.googleMapsLink}
                  onChange={(e) => setForm({...form, googleMapsLink: e.target.value})}
                />
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text font-bold">{t('shopInfo.phone')}</span></label>
                <input
                  type="tel"
                  className="input input-bordered"
                  value={form.contactPhone}
                  onChange={(e) => setForm({...form, contactPhone: e.target.value})}
                  placeholder="08X-XXX-XXXX"
                />
              </div>
            </div>

            {/* 社交媒体链接 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold">{t('shopInfo.socialMedia')}</span>
                <span className="label-text-alt text-xs text-base-content/50">{t('shopInfo.socialMediaHint')}</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <FaFacebook className="w-4 h-4 text-blue-600" />
                  <input
                    type="text"
                    className="input input-bordered input-sm flex-1"
                    placeholder="https://facebook.com/..."
                    value={form.socialLinks.facebook || ""}
                    onChange={(e) => handleSocialLinkChange('facebook', e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <FaLine className="w-4 h-4 text-green-600" />
                  <input
                    type="text"
                    className="input input-bordered input-sm flex-1"
                    placeholder={t('shopInfo.lineIdPlaceholder')}
                    value={form.socialLinks.line || ""}
                    onChange={(e) => handleSocialLinkChange('line', e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <FaInstagram className="w-4 h-4 text-pink-600" />
                  <input
                    type="text"
                    className="input input-bordered input-sm flex-1"
                    placeholder="https://instagram.com/..."
                    value={form.socialLinks.instagram || ""}
                    onChange={(e) => handleSocialLinkChange('instagram', e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <FaTiktok className="w-4 h-4 text-black" />
                  <input
                    type="text"
                    className="input input-bordered input-sm flex-1"
                    placeholder="https://tiktok.com/..."
                    value={form.socialLinks.tiktok || ""}
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
                {saveShopLoading ? <span className="loading loading-spinner"></span> : t('shopInfo.updateButton')}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="divider"></div>

      {/* 实名认证与收款 */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-secondary">
          <HiIdentification /> {t('kyc.title')}
        </h2>

        {/* KYC 折叠面板 */}
        <div className="collapse collapse-arrow bg-base-200 border border-base-300">
          <input type="checkbox" />
          <div className="collapse-title text-lg font-medium">
            {t('kyc.verification')}
          </div>
          <div className="collapse-content space-y-4 pt-4">
            <div className="form-control">
              <label className="label"><span className="label-text font-bold">{t('kyc.idCard')}</span></label>
              <div className="flex flex-col md:flex-row gap-4 items-start">
                <div className="flex-none w-full md:w-1/3">
                  <div className="relative aspect-video bg-base-100 rounded-lg border-2 border-dashed border-base-300 flex items-center justify-center overflow-hidden">
                    {form.idCardImg ? (
                      <Image src={form.idCardImg} alt="ID Card" fill className="object-cover" unoptimized />
                    ) : (
                      <span className="text-xs text-base-content/40">{t('kyc.clickUpload')}</span>
                    )}
                    <input
                      type="file"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      accept="image/*"
                      onChange={(e) => handleOcrUpload(e, 'id_card')}
                      disabled={ocrLoading}
                    />
                  </div>
                  {ocrLoading && <div className="text-center text-xs mt-1 animate-pulse text-primary">{t('kyc.recognizing')}</div>}
                </div>
                <div className="flex-1 w-full space-y-3">
                  <div>
                    <label className="label pt-0"><span className="label-text-alt">{t('kyc.idNumber')}</span></label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={form.idCardNumber}
                      onChange={(e) => setForm({...form, idCardNumber: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="label pt-0"><span className="label-text-alt">{t('kyc.idName')}</span></label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
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
            {t('payment.title')}
          </div>
          <div className="collapse-content space-y-4 pt-4">
            {!isPhoneVerified && <p className="text-error text-sm">⚠️ {t('payment.phoneRequired')}</p>}
            {!isKycDataFilled && <p className="text-error text-sm">⚠️ {t('payment.kycRequired')}</p>}

            <div className="form-control">
              <label className="label"><span className="label-text font-bold">{t('payment.promptpayId')}</span></label>
              <select
                className="select select-bordered w-full"
                value={form.promptpayId || ''}
                onChange={(e) => setForm({...form, promptpayId: e.target.value})}
                disabled={!isPhoneVerified || !isKycDataFilled}
              >
                <option value="" disabled>{t('payment.pleaseSelect')}</option>
                {user?.phone && <option value={user.phone}>{t('payment.phoneNumber')}: {user.phone}</option>}
                {form.idCardNumber && <option value={form.idCardNumber}>{t('payment.idNumber')}: {form.idCardNumber}</option>}
              </select>
            </div>
          </div>
        </div>

        {/* 银行信息折叠面板（可选，用于提现） */}
        <div className="collapse collapse-arrow bg-base-200 border border-base-300">
          <input type="checkbox" />
          <div className="collapse-title text-lg font-medium flex items-center gap-2">
            {t('bank.title')}
            <span className="badge badge-sm badge-ghost">{t('bank.optional')}</span>
          </div>
          <div className="collapse-content space-y-4 pt-4">
            <div className="alert alert-info text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <div className="font-bold">{t('bank.infoTitle')}</div>
                <div className="text-xs">{t('bank.infoDesc')}</div>
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold">{t('bank.bankName')}</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder={t('bank.bankNamePlaceholder')}
                value={form.bankName}
                onChange={(e) => setForm({...form, bankName: e.target.value})}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold">{t('bank.accountNumber')}</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder={t('bank.accountNumberPlaceholder')}
                value={form.bankAccountNumber}
                onChange={(e) => setForm({...form, bankAccountNumber: e.target.value})}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold">{t('bank.accountName')}</span>
                <span className="label-text-alt text-xs text-warning">{t('bank.mustMatchIdName')}</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full bg-base-300"
                value={form.bankAccountName}
                disabled
                readOnly
              />
              <label className="label">
                <span className="label-text-alt text-xs opacity-70">{t('bank.accountNameHint')}</span>
              </label>
            </div>
          </div>
        </div>

        {/* KYC 专属保存按钮 */}
        <div className="flex justify-end">
          <button className="btn btn-secondary" onClick={saveKycInfo} disabled={saveKycLoading}>
            {saveKycLoading ? t('kyc.submitting') : t('kyc.submitButton')}
          </button>
        </div>
      </section>

      {/* 底部：账号安全 */}
      <div className="divider text-xs opacity-50">{t('security.title')}</div>
      <div className="bg-base-50 p-4 rounded-lg text-sm space-y-4">
        <div className="flex justify-between items-center">
          <span className="opacity-70">{t('security.email')}</span>
          <span className="font-mono">{user?.email}</span>
        </div>

        <div className="form-control">
          <label className="label pt-0"><span className="label-text opacity-70">{t('security.phone')}</span></label>
          {!otpView ? (
            <div className="flex gap-2">
              <input
                type="tel"
                value={phone.startsWith('+66') ? phone.replace('+66', '0') : phone}
                className="input input-bordered input-sm flex-1"
                onChange={(e) => setPhone(e.target.value)}
              />
              <button className="btn btn-outline btn-sm" onClick={handleSendOtp} disabled={loading}>
                {user?.phone_confirmed_at ? t('security.change') : t('security.verify')}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={t('security.otpPlaceholder')}
                className="input input-bordered input-sm flex-1"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <button className="btn btn-primary btn-sm" onClick={handleVerifyOtp} disabled={loading}>
                {t('security.confirm')}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setOtpView(false)}>{t('security.cancel')}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
