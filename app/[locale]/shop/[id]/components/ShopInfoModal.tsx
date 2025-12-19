// app/[locale]/shop/[id]/components/ShopInfoModal.tsx
'use client';

import { useState } from 'react';
import { HiInformationCircle, HiXMark, HiMapPin, HiPhone, HiClock } from 'react-icons/hi2';
import { FaFacebook, FaLine, FaInstagram, FaTiktok } from 'react-icons/fa';
import { useTranslations } from 'next-intl';

type SocialLinks = {
  facebook?: string;
  line?: string;
  instagram?: string;
  tiktok?: string;
};

type ShopInfoModalProps = {
  merchant: {
    address?: string;
    google_maps_link?: string;
    contact_phone?: string;
    social_links?: SocialLinks;
  };
  announcementText?: string;
  themeColor: string;
};

export default function ShopInfoModal({ merchant, announcementText, themeColor }: ShopInfoModalProps) {
  const t = useTranslations('shop');
  const [isOpen, setIsOpen] = useState(false);

  const hasSocialLinks = merchant.social_links && Object.values(merchant.social_links).some(link => link);
  const hasContactInfo = merchant.address || merchant.contact_phone;
  const hasAnyInfo = hasSocialLinks || hasContactInfo || announcementText;

  // 如果没有任何信息，不显示按钮
  if (!hasAnyInfo) {
    return null;
  }

  return (
    <>
      {/* 信息按钮 */}
      <button
        onClick={() => setIsOpen(true)}
        className="btn btn-circle btn-ghost btn-sm"
        style={{ color: themeColor }}
        title={t('shopInfo')}
      >
        <HiInformationCircle className="w-12 h-12" />
      </button>

      {/* 模态框 */}
      {isOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            {/* 标题 */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <HiInformationCircle className="w-6 h-6" style={{ color: themeColor }} />
                {t('shopInfo')}
              </h3>
              <button
                className="btn btn-sm btn-circle btn-ghost"
                onClick={() => setIsOpen(false)}
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* 店铺公告 */}
              {announcementText && (
                <div className="alert alert-warning">
                  <HiClock className="w-5 h-5 shrink-0" />
                  <span className="text-sm">{announcementText}</span>
                </div>
              )}

              {/* 联系方式 */}
              {hasContactInfo && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-base">{t('contactInfo')}</h4>

                  {/* 地址 */}
                  {merchant.address && (
                    <div className="flex items-start gap-3">
                      <HiMapPin className="w-5 h-5 shrink-0 mt-0.5" style={{ color: themeColor }} />
                      <div className="flex-1">
                        {merchant.google_maps_link ? (
                          <a
                            href={merchant.google_maps_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                            style={{ color: themeColor }}
                          >
                            {merchant.address}
                          </a>
                        ) : (
                          <span>{merchant.address}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 电话 */}
                  {merchant.contact_phone && (
                    <div className="flex items-center gap-3">
                      <HiPhone className="w-5 h-5 shrink-0" style={{ color: themeColor }} />
                      <a
                        href={`tel:${merchant.contact_phone}`}
                        className="hover:underline"
                        style={{ color: themeColor }}
                      >
                        {merchant.contact_phone}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* 社交媒体 */}
              {hasSocialLinks && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-base">{t('socialMedia')}</h4>
                  <div className="flex justify-center gap-4">
                    {merchant.social_links?.facebook && (
                      <a
                        href={merchant.social_links.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-circle btn-outline btn-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                        title="Facebook"
                      >
                        <FaFacebook className="w-6 h-6 text-blue-600" />
                      </a>
                    )}
                    {merchant.social_links?.line && (
                      <a
                        href={
                          merchant.social_links.line.startsWith('http')
                            ? merchant.social_links.line
                            : `https://line.me/ti/p/~${merchant.social_links.line}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-circle btn-outline btn-lg hover:bg-green-50 hover:border-green-300 transition-colors"
                        title="Line"
                      >
                        <FaLine className="w-6 h-6 text-green-600" />
                      </a>
                    )}
                    {merchant.social_links?.instagram && (
                      <a
                        href={merchant.social_links.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-circle btn-outline btn-lg hover:bg-pink-50 hover:border-pink-300 transition-colors"
                        title="Instagram"
                      >
                        <FaInstagram className="w-6 h-6 text-pink-600" />
                      </a>
                    )}
                    {merchant.social_links?.tiktok && (
                      <a
                        href={merchant.social_links.tiktok}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-circle btn-outline btn-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                        title="TikTok"
                      >
                        <FaTiktok className="w-6 h-6 text-black" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 关闭按钮 */}
            <div className="modal-action">
              <button
                className="btn"
                onClick={() => setIsOpen(false)}
                style={{ backgroundColor: themeColor, color: 'white', borderColor: themeColor }}
              >
                {t('close')}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setIsOpen(false)}></div>
        </div>
      )}
    </>
  );
}
