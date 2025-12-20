// components/ShopShareSection.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { useTranslations, useLocale } from 'next-intl';
import {
  HiShare,
  HiLink,
  HiQrCode,
  HiArrowDownTray,
  HiCheck,
  HiDocumentDuplicate,
  HiPencil,
  HiXMark
} from 'react-icons/hi2';
import {
  FaFacebook,
  FaLine,
  FaTwitter,
  FaWhatsapp
} from 'react-icons/fa';
import {
  getMerchantSlug,
  updateMerchantSlug,
  clearMerchantSlug,
  checkSlugAvailability
} from '@/app/actions/merchant-slug';
import { validateSlugFormat } from '@/app/utils/slug-validation';

interface ShopShareSectionProps {
  merchantId: string;
}

export default function ShopShareSection({ merchantId }: ShopShareSectionProps) {
  const t = useTranslations('merchantDesign.share');
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [customSlug, setCustomSlug] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  // 获取商户 slug
  useEffect(() => {
    async function fetchSlug() {
      const result = await getMerchantSlug(merchantId);
      if (result.success) {
        setSlug(result.slug || null);
        setCustomSlug(result.customSlug || '');
        setInputValue(result.customSlug || '');
      }
      setLoading(false);
    }
    fetchSlug();
  }, [merchantId]);

  // 生成店铺 URL（使用 slug）
  const shopUrl = typeof window !== 'undefined' && slug
    ? `${window.location.origin}/${locale}/shop/${slug}`
    : '';

  // 检查 slug 可用性
  const checkAvailability = async (value: string) => {
    if (!value || value.length < 3) {
      setAvailabilityMessage(null);
      return;
    }

    const result = await checkSlugAvailability(value, merchantId);
    if (result.available) {
      setAvailabilityMessage(t('slugAvailable'));
    } else {
      setAvailabilityMessage(t('slugTaken', { suggestion: result.suggestion || '' }));
    }
  };

  // 处理输入变化
  const handleInputChange = (value: string) => {
    setInputValue(value);
    setError(null);
    setAvailabilityMessage(null);

    // 实时验证
    const validationError = validateSlugFormat(value);
    if (validationError && value.length > 0) {
      setError(validationError);
    } else if (value.length >= 3) {
      // 延迟检查可用性
      const timer = setTimeout(() => checkAvailability(value), 500);
      return () => clearTimeout(timer);
    }
  };

  // 保存 slug
  const handleSave = async () => {
    if (!inputValue.trim()) {
      setError(t('slugRequired'));
      return;
    }

    const validationError = validateSlugFormat(inputValue);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    const result = await updateMerchantSlug(merchantId, inputValue);

    if (result.success) {
      setSlug(result.slug || null);
      setCustomSlug(inputValue);
      setIsEditing(false);
      setError(null);
    } else {
      setError(result.error || t('saveFailed'));
    }

    setSaving(false);
  };

  // 清除 slug
  const handleClear = async () => {
    if (!confirm(t('confirmClear'))) return;

    setSaving(true);
    const result = await clearMerchantSlug(merchantId);

    if (result.success) {
      setSlug(null);
      setCustomSlug('');
      setInputValue('');
      setIsEditing(false);
    }

    setSaving(false);
  };

  // 复制链接
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shopUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert(t('copyFailed'));
    }
  };

  // 下载二维码（增强版）
  const handleDownloadQR = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const qrSize = 800;
    const padding = 60;
    const headerHeight = 120;
    const footerHeight = 100;

    canvas.width = qrSize + (padding * 2);
    canvas.height = qrSize + (padding * 2) + headerHeight + footerHeight;

    // 渐变背景
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // KUMMAK 标题
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('KUMMAK', canvas.width / 2, 70);

    // 副标题
    ctx.font = '28px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    const subtitle = locale === 'zh' ? '优惠平台'
      : locale === 'th' ? 'แพลตฟอร์มคูปอง'
      : 'Coupon Platform';
    ctx.fillText(subtitle, canvas.width / 2, 110);

    // 白色圆角卡片
    const qrContainerY = headerHeight + padding / 2;
    const qrContainerSize = qrSize + padding;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 10;

    const cornerRadius = 20;
    ctx.beginPath();
    ctx.moveTo(padding / 2 + cornerRadius, qrContainerY);
    ctx.arcTo(canvas.width - padding / 2, qrContainerY, canvas.width - padding / 2, qrContainerY + cornerRadius, cornerRadius);
    ctx.arcTo(canvas.width - padding / 2, qrContainerY + qrContainerSize, canvas.width - padding / 2 - cornerRadius, qrContainerY + qrContainerSize, cornerRadius);
    ctx.arcTo(padding / 2, qrContainerY + qrContainerSize, padding / 2, qrContainerY + qrContainerSize - cornerRadius, cornerRadius);
    ctx.arcTo(padding / 2, qrContainerY, padding / 2 + cornerRadius, qrContainerY, cornerRadius);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // QR码
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const qrX = padding;
      const qrY = headerHeight + padding;
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
      URL.revokeObjectURL(url);

      const footerY = headerHeight + padding + qrSize + padding + 50;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px sans-serif';
      const scanText = locale === 'zh' ? '扫码访问店铺'
        : locale === 'th' ? 'สแกนเพื่อเข้าร้าน'
        : 'Scan to Visit Shop';
      ctx.fillText(scanText, canvas.width / 2, footerY);

      if (slug) {
        ctx.font = '24px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(`/${slug}`, canvas.width / 2, footerY + 40);
      }

      canvas.toBlob((blob) => {
        if (!blob) return;
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `kummak-shop-${slug || 'qrcode'}.png`;
        link.click();
        URL.revokeObjectURL(downloadUrl);
      });
    };

    img.src = url;
  };

  // 社交分享
  const handleShare = (platform: string) => {
    const text = t('shareText');
    let shareUrl = '';

    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shopUrl)}`;
        break;
      case 'line':
        shareUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shopUrl)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shopUrl)}&text=${encodeURIComponent(text)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + shopUrl)}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex items-center justify-center py-8">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        </div>
      </div>
    );
  }

  // 如果没有 slug，显示设置界面
  if (!slug && !isEditing) {
    return (
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-lg mb-4">
            <HiShare className="text-primary" /> {t('title')}
          </h2>
          <div className="text-center py-8">
            <p className="text-base-content/70 mb-4">{t('noSlugMessage')}</p>
            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-primary gap-2"
            >
              <HiPencil className="w-5 h-5" />
              {t('setupSlug')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 编辑模式
  if (isEditing) {
    return (
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-lg mb-4">
            <HiShare className="text-primary" /> {t(slug ? 'editSlug' : 'setupSlug')}
          </h2>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-bold">{t('customSlug')}</span>
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="my-coffee-shop"
              className={`input input-bordered ${error ? 'input-error' : ''}`}
              maxLength={50}
            />
            <label className="label">
              <span className="label-text-alt text-base-content/60">
                {t('slugHint')}
              </span>
              <span className="label-text-alt">
                {inputValue.length}/50
              </span>
            </label>
            {error && (
              <div className="alert alert-error mt-2">
                <span className="text-sm">{error}</span>
              </div>
            )}
            {availabilityMessage && !error && (
              <div className={`alert ${availabilityMessage.includes(t('slugAvailable')) ? 'alert-success' : 'alert-warning'} mt-2`}>
                <span className="text-sm">{availabilityMessage}</span>
              </div>
            )}
          </div>

          <div className="card-actions justify-end mt-4">
            <button
              onClick={() => {
                setIsEditing(false);
                setInputValue(customSlug);
                setError(null);
              }}
              className="btn btn-ghost"
            >
              <HiXMark className="w-5 h-5" />
              {t('cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !!error || !inputValue.trim()}
              className="btn btn-primary"
            >
              {saving ? (
                <span className="loading loading-spinner"></span>
              ) : (
                <HiCheck className="w-5 h-5" />
              )}
              {t('save')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 显示分享界面
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <div className="flex items-center justify-between mb-4">
          <h2 className="card-title text-lg">
            <HiShare className="text-primary" /> {t('title')}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-ghost btn-sm gap-2"
            >
              <HiPencil className="w-4 h-4" />
              {t('edit')}
            </button>
            <button
              onClick={handleClear}
              className="btn btn-ghost btn-sm text-error gap-2"
            >
              <HiXMark className="w-4 h-4" />
              {t('remove')}
            </button>
          </div>
        </div>

        <p className="text-sm text-base-content/70 mb-4">
          {t('description')}
        </p>

        {/* 店铺链接 */}
        <div className="form-control mb-6">
          <label className="label">
            <span className="label-text font-bold flex items-center gap-2">
              <HiLink /> {t('shopLink')}
            </span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={shopUrl}
              readOnly
              className="input input-bordered flex-1 text-sm"
            />
            <button
              onClick={handleCopyLink}
              className={`btn ${copied ? 'btn-success' : 'btn-primary'}`}
            >
              {copied ? (
                <>
                  <HiCheck className="w-5 h-5" />
                  {t('copied')}
                </>
              ) : (
                <>
                  <HiDocumentDuplicate className="w-5 h-5" />
                  {t('copy')}
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-success mt-2 flex items-center gap-1">
            <HiCheck className="w-3 h-3" />
            {t('friendlyUrl')}: /{slug}
          </p>
        </div>

        {/* 二维码 */}
        <div className="form-control mb-6">
          <label className="label">
            <span className="label-text font-bold flex items-center gap-2">
              <HiQrCode /> {t('qrCode')}
            </span>
          </label>
          <div className="flex flex-col items-center gap-4 p-6 bg-base-200 rounded-xl">
            <div ref={qrRef} className="bg-white p-4 rounded-lg shadow-md">
              <QRCode value={shopUrl} size={200} level="H" className="w-full h-auto" />
            </div>
            <button onClick={handleDownloadQR} className="btn btn-primary gap-2">
              <HiArrowDownTray className="w-5 h-5" />
              {t('downloadQR')}
            </button>
            <p className="text-xs text-base-content/60 text-center max-w-xs">
              {t('qrHint')}
            </p>
          </div>
        </div>

        {/* 社交媒体 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-bold">{t('shareToSocial')}</span>
          </label>
          <div className="flex flex-wrap gap-3 justify-center">
            <button onClick={() => handleShare('facebook')} className="btn btn-circle btn-lg bg-[#1877F2] hover:bg-[#166FE5] text-white border-0" title="Facebook">
              <FaFacebook className="w-6 h-6" />
            </button>
            <button onClick={() => handleShare('line')} className="btn btn-circle btn-lg bg-[#00B900] hover:bg-[#00A300] text-white border-0" title="LINE">
              <FaLine className="w-6 h-6" />
            </button>
            <button onClick={() => handleShare('twitter')} className="btn btn-circle btn-lg bg-[#1DA1F2] hover:bg-[#1A91DA] text-white border-0" title="Twitter">
              <FaTwitter className="w-6 h-6" />
            </button>
            <button onClick={() => handleShare('whatsapp')} className="btn btn-circle btn-lg bg-[#25D366] hover:bg-[#22C55E] text-white border-0" title="WhatsApp">
              <FaWhatsapp className="w-6 h-6" />
            </button>
          </div>
          <p className="text-xs text-base-content/60 text-center mt-3">
            {t('socialHint')}
          </p>
        </div>
      </div>
    </div>
  );
}
