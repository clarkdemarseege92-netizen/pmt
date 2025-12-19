'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useState } from 'react';

type LegalModalType = 'privacy' | 'terms' | 'cookies' | null;

export default function FooterClient() {
  const t = useTranslations('footer');
  const locale = useLocale();
  const currentYear = new Date().getFullYear();
  const [openModal, setOpenModal] = useState<LegalModalType>(null);

  return (
    <footer className="bg-base-200 text-base-content mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">

          {/* About Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-primary">{t('about.title')}</h3>
            <p className="text-sm text-base-content/70">
              {t('about.description')}
            </p>
            <p className="text-sm font-medium text-primary">
              {t('about.tagline')}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold">{t('quickLinks.title')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm text-base-content/70 hover:text-primary transition-colors">
                  {t('quickLinks.home')}
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-sm text-base-content/70 hover:text-primary transition-colors">
                  {t('quickLinks.categories')}
                </Link>
              </li>
              <li>
                <Link href="/merchant/onboarding" className="text-sm text-base-content/70 hover:text-primary transition-colors">
                  {t('quickLinks.merchants')}
                </Link>
              </li>
              <li>
                <a href="#" className="text-sm text-base-content/70 hover:text-primary transition-colors">
                  {t('quickLinks.support')}
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold">{t('legal.title')}</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => setOpenModal('privacy')}
                  className="text-sm text-base-content/70 hover:text-primary transition-colors text-left"
                >
                  {t('legal.privacy')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setOpenModal('terms')}
                  className="text-sm text-base-content/70 hover:text-primary transition-colors text-left"
                >
                  {t('legal.terms')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setOpenModal('cookies')}
                  className="text-sm text-base-content/70 hover:text-primary transition-colors text-left"
                >
                  {t('legal.cookies')}
                </button>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold">{t('social.title')}</h3>
            <div className="flex flex-col space-y-3">
              {/* Facebook */}
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-base-content/70 hover:text-primary transition-colors group"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>{t('social.facebook')}</span>
              </a>

              {/* LINE */}
              <a
                href="https://line.me"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-base-content/70 hover:text-primary transition-colors group"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                </svg>
                <span>{t('social.line')}</span>
              </a>

              {/* Instagram */}
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-base-content/70 hover:text-primary transition-colors group"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
                <span>{t('social.instagram')}</span>
              </a>

              {/* Twitter/X */}
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-base-content/70 hover:text-primary transition-colors group"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <span>{t('social.twitter')}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="divider my-0"></div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8">
          <p className="text-sm text-base-content/60">
            {t('copyright', { year: currentYear })}
          </p>
          <p className="text-sm text-base-content/60">
            {t('madeWith')}
          </p>
        </div>
      </div>

      {/* Legal Modals */}
      {openModal && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-4xl max-h-[80vh] overflow-y-auto">
            <button
              onClick={() => setOpenModal(null)}
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            >
              ✕
            </button>
            <h3 className="font-bold text-lg mb-4">
              {openModal === 'privacy' && getLegalTitle('privacy', locale)}
              {openModal === 'terms' && getLegalTitle('terms', locale)}
              {openModal === 'cookies' && getLegalTitle('cookies', locale)}
            </h3>
            <div className="prose prose-sm max-w-none">
              {openModal === 'privacy' && <PrivacyPolicy locale={locale} />}
              {openModal === 'terms' && <TermsOfService locale={locale} />}
              {openModal === 'cookies' && <CookiePolicy locale={locale} />}
            </div>
            <div className="modal-action">
              <button onClick={() => setOpenModal(null)} className="btn">
                {locale === 'zh' ? '关闭' : locale === 'th' ? 'ปิด' : 'Close'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setOpenModal(null)}></div>
        </dialog>
      )}
    </footer>
  );
}

// Helper function to get modal titles
function getLegalTitle(type: 'privacy' | 'terms' | 'cookies', locale: string): string {
  const titles = {
    privacy: {
      zh: '隐私政策',
      th: 'นโยบายความเป็นส่วนตัว',
      en: 'Privacy Policy'
    },
    terms: {
      zh: '服务条款',
      th: 'ข้อกำหนดการให้บริการ',
      en: 'Terms of Service'
    },
    cookies: {
      zh: 'Cookie 政策',
      th: 'นโยบายคุกกี้',
      en: 'Cookie Policy'
    }
  };

  return titles[type][locale as keyof typeof titles[typeof type]] || titles[type].en;
}

// Privacy Policy Component
function PrivacyPolicy({ locale }: { locale: string }) {
  if (locale === 'zh') {
    return (
      <>
        <p className="font-semibold">最后更新日期：2025年12月20日</p>

        <h4 className="font-bold mt-4">1. 信息收集</h4>
        <p>本平台收集以下类型的信息：</p>
        <ul>
          <li>账户信息（姓名、电子邮件、电话号码）</li>
          <li>交易信息（订单历史、支付详情）</li>
          <li>设备信息（IP地址、浏览器类型、操作系统）</li>
          <li>位置信息（用于附近优惠推荐）</li>
        </ul>

        <h4 className="font-bold mt-4">2. 信息使用</h4>
        <p>我们使用收集的信息用于：</p>
        <ul>
          <li>提供和改进本平台服务</li>
          <li>处理交易和发送订单确认</li>
          <li>发送营销通讯（您可以选择退出）</li>
          <li>分析用户行为以改善用户体验</li>
          <li>防止欺诈和维护安全</li>
        </ul>

        <h4 className="font-bold mt-4">3. 信息共享</h4>
        <p>本平台不会出售您的个人信息。我们仅在以下情况下共享信息：</p>
        <ul>
          <li>与您选择的商户（用于订单履行）</li>
          <li>与服务提供商（支付处理、数据分析）</li>
          <li>遵守法律要求或法律程序</li>
          <li>保护本平台的权利和安全</li>
        </ul>

        <h4 className="font-bold mt-4">4. 数据安全</h4>
        <p>本平台采用行业标准的安全措施来保护您的信息，包括加密、访问控制和定期安全审计。</p>

        <h4 className="font-bold mt-4">5. 您的权利</h4>
        <p>您有权：</p>
        <ul>
          <li>访问和更新您的个人信息</li>
          <li>请求删除您的账户和数据</li>
          <li>选择退出营销通讯</li>
          <li>反对某些数据处理活动</li>
        </ul>

        <h4 className="font-bold mt-4">6. Cookies</h4>
        <p>本平台使用 cookies 来改善您的体验。详情请参阅我们的 Cookie 政策。</p>

        <h4 className="font-bold mt-4">7. 联系我们</h4>
        <p>如有隐私相关问题，请通过本平台联系页面与我们联系。</p>
      </>
    );
  } else if (locale === 'th') {
    return (
      <>
        <p className="font-semibold">อัปเดตล่าสุด: 20 ธันวาคม 2568</p>

        <h4 className="font-bold mt-4">1. การเก็บรวบรวมข้อมูล</h4>
        <p>แพลตฟอร์มนี้เก็บรวบรวมข้อมูลประเภทต่อไปนี้:</p>
        <ul>
          <li>ข้อมูลบัญชี (ชื่อ อีเมล หมายเลขโทรศัพท์)</li>
          <li>ข้อมูลการทำธุรกรรม (ประวัติการสั่งซื้อ รายละเอียดการชำระเงิน)</li>
          <li>ข้อมูลอุปกรณ์ (IP address ประเภทเบราว์เซอร์ ระบบปฏิบัติการ)</li>
          <li>ข้อมูลตำแหน่ง (สำหรับแนะนำโปรโมชันใกล้เคียง)</li>
        </ul>

        <h4 className="font-bold mt-4">2. การใช้ข้อมูล</h4>
        <p>เราใช้ข้อมูลที่เก็บรวบรวมเพื่อ:</p>
        <ul>
          <li>ให้บริการและปรับปรุงแพลตฟอร์มนี้</li>
          <li>ดำเนินการธุรกรรมและส่งการยืนยันคำสั่งซื้อ</li>
          <li>ส่งข่าวสารทางการตลาด (คุณสามารถยกเลิกได้)</li>
          <li>วิเคราะห์พฤติกรรมผู้ใช้เพื่อปรับปรุงประสบการณ์</li>
          <li>ป้องกันการฉ้อโกงและรักษาความปลอดภัย</li>
        </ul>

        <h4 className="font-bold mt-4">3. การแบ่งปันข้อมูล</h4>
        <p>แพลตฟอร์มนี้จะไม่ขายข้อมูลส่วนบุคคลของคุณ เราแบ่งปันข้อมูลเฉพาะในกรณีต่อไปนี้:</p>
        <ul>
          <li>กับร้านค้าที่คุณเลือก (เพื่อการดำเนินการสั่งซื้อ)</li>
          <li>กับผู้ให้บริการ (การประมวลผลการชำระเงิน การวิเคราะห์ข้อมูล)</li>
          <li>เพื่อปฏิบัติตามกฎหมายหรือกระบวนการทางกฎหมาย</li>
          <li>เพื่อปกป้องสิทธิและความปลอดภัยของแพลตฟอร์มนี้</li>
        </ul>

        <h4 className="font-bold mt-4">4. ความปลอดภัยของข้อมูล</h4>
        <p>แพลตฟอร์มนี้ใช้มาตรการรักษาความปลอดภัยมาตรฐานอุตสาหกรรมเพื่อปกป้องข้อมูลของคุณ รวมถึงการเข้ารหัส การควบคุมการเข้าถึง และการตรวจสอบความปลอดภัยเป็นประจำ</p>

        <h4 className="font-bold mt-4">5. สิทธิของคุณ</h4>
        <p>คุณมีสิทธิ:</p>
        <ul>
          <li>เข้าถึงและอัปเดตข้อมูลส่วนบุคคลของคุณ</li>
          <li>ขอลบบัญชีและข้อมูลของคุณ</li>
          <li>ยกเลิกการรับข่าวสารทางการตลาด</li>
          <li>คัดค้านกิจกรรมการประมวลผลข้อมูลบางอย่าง</li>
        </ul>

        <h4 className="font-bold mt-4">6. คุกกี้</h4>
        <p>แพลตฟอร์มนี้ใช้คุกกี้เพื่อปรับปรุงประสบการณ์ของคุณ โปรดดูนโยบายคุกกี้ของเราสำหรับรายละเอียด</p>

        <h4 className="font-bold mt-4">7. ติดต่อเรา</h4>
        <p>หากมีคำถามเกี่ยวกับความเป็นส่วนตัว โปรดติดต่อเราผ่านหน้าติดต่อของแพลตฟอร์มนี้</p>
      </>
    );
  } else {
    return (
      <>
        <p className="font-semibold">Last Updated: December 20, 2025</p>

        <h4 className="font-bold mt-4">1. Information Collection</h4>
        <p>This Platform collects the following types of information:</p>
        <ul>
          <li>Account information (name, email, phone number)</li>
          <li>Transaction information (order history, payment details)</li>
          <li>Device information (IP address, browser type, operating system)</li>
          <li>Location information (for nearby deals recommendations)</li>
        </ul>

        <h4 className="font-bold mt-4">2. Information Use</h4>
        <p>We use collected information to:</p>
        <ul>
          <li>Provide and improve this Platform's services</li>
          <li>Process transactions and send order confirmations</li>
          <li>Send marketing communications (you can opt-out)</li>
          <li>Analyze user behavior to improve user experience</li>
          <li>Prevent fraud and maintain security</li>
        </ul>

        <h4 className="font-bold mt-4">3. Information Sharing</h4>
        <p>This Platform does not sell your personal information. We only share information:</p>
        <ul>
          <li>With merchants you choose (for order fulfillment)</li>
          <li>With service providers (payment processing, data analytics)</li>
          <li>To comply with legal requirements or legal processes</li>
          <li>To protect this Platform's rights and safety</li>
        </ul>

        <h4 className="font-bold mt-4">4. Data Security</h4>
        <p>This Platform employs industry-standard security measures to protect your information, including encryption, access controls, and regular security audits.</p>

        <h4 className="font-bold mt-4">5. Your Rights</h4>
        <p>You have the right to:</p>
        <ul>
          <li>Access and update your personal information</li>
          <li>Request deletion of your account and data</li>
          <li>Opt-out of marketing communications</li>
          <li>Object to certain data processing activities</li>
        </ul>

        <h4 className="font-bold mt-4">6. Cookies</h4>
        <p>This Platform uses cookies to improve your experience. Please see our Cookie Policy for details.</p>

        <h4 className="font-bold mt-4">7. Contact Us</h4>
        <p>For privacy-related questions, please contact us through this Platform's contact page.</p>
      </>
    );
  }
}

// Terms of Service Component
function TermsOfService({ locale }: { locale: string }) {
  if (locale === 'zh') {
    return (
      <>
        <p className="font-semibold">生效日期：2025年12月20日</p>

        <h4 className="font-bold mt-4">1. 接受条款</h4>
        <p>使用本平台即表示您同意这些服务条款。如果您不同意，请不要使用本平台。</p>

        <h4 className="font-bold mt-4">2. 服务描述</h4>
        <p>本平台是一个连接消费者和商户的优惠券平台，提供优惠券浏览、购买和兑换服务。</p>

        <h4 className="font-bold mt-4">3. 用户账户</h4>
        <ul>
          <li>您必须提供准确和完整的注册信息</li>
          <li>您有责任维护账户的保密性</li>
          <li>您对账户下的所有活动负责</li>
          <li>本平台保留拒绝服务或终止账户的权利</li>
        </ul>

        <h4 className="font-bold mt-4">4. 购买和支付</h4>
        <ul>
          <li>所有购买均以泰铢(฿)计价</li>
          <li>支付通过 PromptPay 处理</li>
          <li>优惠券一经购买不可退款，除非商户或本平台取消</li>
          <li>价格可能随时变动恕不另行通知</li>
        </ul>

        <h4 className="font-bold mt-4">5. 优惠券兑换</h4>
        <ul>
          <li>优惠券必须在有效期内使用</li>
          <li>每张优惠券只能使用一次</li>
          <li>优惠券不可转让</li>
          <li>商户保留拒绝过期或无效优惠券的权利</li>
        </ul>

        <h4 className="font-bold mt-4">6. 商户责任</h4>
        <p>本平台是商户和消费者之间的中介。商户对其产品、服务和优惠券履行负全部责任。</p>

        <h4 className="font-bold mt-4">7. 禁止行为</h4>
        <p>您不得：</p>
        <ul>
          <li>违反任何法律或法规</li>
          <li>侵犯他人的权利</li>
          <li>上传恶意软件或有害内容</li>
          <li>从事欺诈或欺骗行为</li>
          <li>干扰本平台的正常运行</li>
        </ul>

        <h4 className="font-bold mt-4">8. 知识产权</h4>
        <p>本平台的所有内容、商标和知识产权归本平台或其授权方所有。</p>

        <h4 className="font-bold mt-4">9. 免责声明</h4>
        <p>本平台按"原样"提供服务，不提供任何明示或暗示的保证。</p>

        <h4 className="font-bold mt-4">10. 责任限制</h4>
        <p>本平台对任何间接、偶然或后果性损害不承担责任。</p>

        <h4 className="font-bold mt-4">11. 条款变更</h4>
        <p>本平台保留随时修改这些条款的权利。继续使用即表示接受修改后的条款。</p>

        <h4 className="font-bold mt-4">12. 适用法律</h4>
        <p>这些条款受泰国法律管辖。</p>
      </>
    );
  } else if (locale === 'th') {
    return (
      <>
        <p className="font-semibold">มีผลบังคับใช้: 20 ธันวาคม 2568</p>

        <h4 className="font-bold mt-4">1. การยอมรับข้อกำหนด</h4>
        <p>การใช้แพลตฟอร์มนี้แสดงว่าคุณยอมรับข้อกำหนดการให้บริการเหล่านี้ หากคุณไม่เห็นด้วย โปรดอย่าใช้แพลตฟอร์มนี้</p>

        <h4 className="font-bold mt-4">2. คำอธิบายบริการ</h4>
        <p>แพลตฟอร์มนี้เป็นแพลตฟอร์มคูปองที่เชื่อมต่อผู้บริโภคและร้านค้า โดยให้บริการเรียกดู ซื้อ และแลกคูปอง</p>

        <h4 className="font-bold mt-4">3. บัญชีผู้ใช้</h4>
        <ul>
          <li>คุณต้องให้ข้อมูลการลงทะเบียนที่ถูกต้องและครบถ้วน</li>
          <li>คุณมีความรับผิดชอบในการรักษาความลับของบัญชี</li>
          <li>คุณรับผิดชอบต่อกิจกรรมทั้งหมดภายใต้บัญชีของคุณ</li>
          <li>แพลตฟอร์มนี้ขอสงวนสิทธิ์ในการปฏิเสธบริการหรือยกเลิกบัญชี</li>
        </ul>

        <h4 className="font-bold mt-4">4. การซื้อและการชำระเงิน</h4>
        <ul>
          <li>การซื้อทั้งหมดเป็นราคาเป็นบาท (฿)</li>
          <li>การชำระเงินดำเนินการผ่าน PromptPay</li>
          <li>คูปองที่ซื้อแล้วไม่สามารถคืนเงินได้ เว้นแต่ร้านค้าหรือแพลตฟอร์มนี้ยกเลิก</li>
          <li>ราคาอาจเปลี่ยนแปลงได้ตลอดเวลาโดยไม่ต้องแจ้งให้ทราบล่วงหน้า</li>
        </ul>

        <h4 className="font-bold mt-4">5. การแลกคูปอง</h4>
        <ul>
          <li>คูปองต้องใช้ภายในระยะเวลาที่กำหนด</li>
          <li>แต่ละคูปองสามารถใช้ได้เพียงครั้งเดียว</li>
          <li>คูปองไม่สามารถโอนได้</li>
          <li>ร้านค้าขอสงวนสิทธิ์ในการปฏิเสธคูปองที่หมดอายุหรือไม่ถูกต้อง</li>
        </ul>

        <h4 className="font-bold mt-4">6. ความรับผิดชอบของร้านค้า</h4>
        <p>แพลตฟอร์มนี้เป็นตัวกลางระหว่างร้านค้าและผู้บริโภค ร้านค้ามีความรับผิดชอบเต็มที่ต่อผลิตภัณฑ์ บริการ และการปฏิบัติตามคูปอง</p>

        <h4 className="font-bold mt-4">7. พฤติกรรมที่ห้าม</h4>
        <p>คุณต้องไม่:</p>
        <ul>
          <li>ละเมิดกฎหมายหรือกฎระเบียบใดๆ</li>
          <li>ละเมิดสิทธิของผู้อื่น</li>
          <li>อัปโหลดมัลแวร์หรือเนื้อหาที่เป็นอันตราย</li>
          <li>มีส่วนร่วมในการฉ้อโกงหรือการหลอกลวง</li>
          <li>รบกวนการทำงานปกติของแพลตฟอร์มนี้</li>
        </ul>

        <h4 className="font-bold mt-4">8. ทรัพย์สินทางปัญญา</h4>
        <p>เนื้อหา เครื่องหมายการค้า และทรัพย์สินทางปัญญาทั้งหมดของแพลตฟอร์มนี้เป็นของแพลตฟอร์มนี้หรือผู้ให้อนุญาต</p>

        <h4 className="font-bold mt-4">9. ข้อจำกัดความรับผิด</h4>
        <p>แพลตฟอร์มนี้ให้บริการ "ตามสภาพ" โดยไม่มีการรับประกันใดๆ ไม่ว่าโดยชัดแจ้งหรือโดยนัย</p>

        <h4 className="font-bold mt-4">10. การจำกัดความรับผิดชอบ</h4>
        <p>แพลตฟอร์มนี้จะไม่รับผิดชอบต่อความเสียหายทางอ้อม โดยบังเอิญ หรือที่เป็นผลสืบเนื่องใดๆ</p>

        <h4 className="font-bold mt-4">11. การเปลี่ยนแปลงข้อกำหนด</h4>
        <p>แพลตฟอร์มนี้ขอสงวนสิทธิ์ในการแก้ไขข้อกำหนดเหล่านี้ได้ตลอดเวลา การใช้งานต่อไปแสดงถึงการยอมรับข้อกำหนดที่แก้ไข</p>

        <h4 className="font-bold mt-4">12. กฎหมายที่ใช้บังคับ</h4>
        <p>ข้อกำหนดเหล่านี้อยู่ภายใต้กฎหมายของประเทศไทย</p>
      </>
    );
  } else {
    return (
      <>
        <p className="font-semibold">Effective Date: December 20, 2025</p>

        <h4 className="font-bold mt-4">1. Acceptance of Terms</h4>
        <p>By using this Platform, you agree to these Terms of Service. If you do not agree, please do not use this Platform.</p>

        <h4 className="font-bold mt-4">2. Service Description</h4>
        <p>This Platform is a coupon platform connecting consumers and merchants, providing coupon browsing, purchasing, and redemption services.</p>

        <h4 className="font-bold mt-4">3. User Accounts</h4>
        <ul>
          <li>You must provide accurate and complete registration information</li>
          <li>You are responsible for maintaining account confidentiality</li>
          <li>You are responsible for all activities under your account</li>
          <li>This Platform reserves the right to refuse service or terminate accounts</li>
        </ul>

        <h4 className="font-bold mt-4">4. Purchases and Payments</h4>
        <ul>
          <li>All purchases are priced in Thai Baht (฿)</li>
          <li>Payments are processed through PromptPay</li>
          <li>Coupons are non-refundable once purchased, unless canceled by merchant or this Platform</li>
          <li>Prices are subject to change without notice</li>
        </ul>

        <h4 className="font-bold mt-4">5. Coupon Redemption</h4>
        <ul>
          <li>Coupons must be used within the validity period</li>
          <li>Each coupon can only be used once</li>
          <li>Coupons are non-transferable</li>
          <li>Merchants reserve the right to refuse expired or invalid coupons</li>
        </ul>

        <h4 className="font-bold mt-4">6. Merchant Responsibility</h4>
        <p>This Platform is an intermediary between merchants and consumers. Merchants are fully responsible for their products, services, and coupon fulfillment.</p>

        <h4 className="font-bold mt-4">7. Prohibited Conduct</h4>
        <p>You must not:</p>
        <ul>
          <li>Violate any laws or regulations</li>
          <li>Infringe on others' rights</li>
          <li>Upload malware or harmful content</li>
          <li>Engage in fraud or deception</li>
          <li>Interfere with this Platform's normal operation</li>
        </ul>

        <h4 className="font-bold mt-4">8. Intellectual Property</h4>
        <p>All content, trademarks, and intellectual property of this Platform belong to this Platform or its licensors.</p>

        <h4 className="font-bold mt-4">9. Disclaimer</h4>
        <p>This Platform provides services "as is" without any express or implied warranties.</p>

        <h4 className="font-bold mt-4">10. Limitation of Liability</h4>
        <p>This Platform is not liable for any indirect, incidental, or consequential damages.</p>

        <h4 className="font-bold mt-4">11. Changes to Terms</h4>
        <p>This Platform reserves the right to modify these terms at any time. Continued use indicates acceptance of modified terms.</p>

        <h4 className="font-bold mt-4">12. Governing Law</h4>
        <p>These terms are governed by the laws of Thailand.</p>
      </>
    );
  }
}

// Cookie Policy Component
function CookiePolicy({ locale }: { locale: string }) {
  if (locale === 'zh') {
    return (
      <>
        <p className="font-semibold">最后更新日期：2025年12月20日</p>

        <h4 className="font-bold mt-4">什么是 Cookies？</h4>
        <p>Cookies 是网站在您访问时存储在您设备上的小型文本文件。它们帮助网站记住您的偏好和改善您的体验。</p>

        <h4 className="font-bold mt-4">本平台如何使用 Cookies</h4>
        <p>本平台使用以下类型的 cookies：</p>

        <h5 className="font-semibold mt-3">1. 必要 Cookies</h5>
        <p>这些 cookies 对于网站运行是必不可少的，包括：</p>
        <ul>
          <li>会话管理 cookies</li>
          <li>身份验证 cookies</li>
          <li>安全 cookies</li>
        </ul>

        <h5 className="font-semibold mt-3">2. 功能 Cookies</h5>
        <p>这些 cookies 记住您的选择，例如：</p>
        <ul>
          <li>语言偏好</li>
          <li>位置设置</li>
          <li>最近浏览的项目</li>
        </ul>

        <h5 className="font-semibold mt-3">3. 分析 Cookies</h5>
        <p>这些 cookies 帮助我们了解用户如何与本平台互动：</p>
        <ul>
          <li>页面访问统计</li>
          <li>用户行为分析</li>
          <li>性能监控</li>
        </ul>

        <h5 className="font-semibold mt-3">4. 营销 Cookies</h5>
        <p>这些 cookies 用于：</p>
        <ul>
          <li>跟踪广告效果</li>
          <li>个性化广告内容</li>
          <li>社交媒体集成</li>
        </ul>

        <h4 className="font-bold mt-4">第三方 Cookies</h4>
        <p>本平台可能使用来自以下第三方服务的 cookies：</p>
        <ul>
          <li>Google Analytics（网站分析）</li>
          <li>Facebook Pixel（广告跟踪）</li>
          <li>支付处理器（交易安全）</li>
        </ul>

        <h4 className="font-bold mt-4">管理 Cookies</h4>
        <p>您可以通过以下方式控制 cookies：</p>
        <ul>
          <li>浏览器设置：大多数浏览器允许您阻止或删除 cookies</li>
          <li>退出工具：使用第三方提供的退出工具</li>
          <li>隐私模式：使用浏览器的隐私/无痕模式</li>
        </ul>

        <p className="mt-4">
          <strong>注意：</strong>禁用必要 cookies 可能影响本平台的功能。
        </p>

        <h4 className="font-bold mt-4">Cookie 数据保留</h4>
        <p>不同类型的 cookies 有不同的保留期限：</p>
        <ul>
          <li>会话 cookies：浏览器关闭时删除</li>
          <li>持久 cookies：根据设定的到期日期（通常为 1-24 个月）</li>
        </ul>

        <h4 className="font-bold mt-4">更新此政策</h4>
        <p>本平台可能会不时更新此 Cookie 政策。我们建议定期查看此页面。</p>

        <h4 className="font-bold mt-4">联系我们</h4>
        <p>如有关于 cookies 的问题，请通过本平台联系页面与我们联系。</p>
      </>
    );
  } else if (locale === 'th') {
    return (
      <>
        <p className="font-semibold">อัปเดตล่าสุด: 20 ธันวาคม 2568</p>

        <h4 className="font-bold mt-4">คุกกี้คืออะไร?</h4>
        <p>คุกกี้เป็นไฟล์ข้อความขนาดเล็กที่เว็บไซต์จัดเก็บบนอุปกรณ์ของคุณเมื่อคุณเยี่ยมชม ช่วยให้เว็บไซต์จดจำความชอบของคุณและปรับปรุงประสบการณ์ของคุณ</p>

        <h4 className="font-bold mt-4">แพลตฟอร์มนี้ใช้คุกกี้อย่างไร</h4>
        <p>แพลตฟอร์มนี้ใช้คุกกี้ประเภทต่อไปนี้:</p>

        <h5 className="font-semibold mt-3">1. คุกกี้ที่จำเป็น</h5>
        <p>คุกกี้เหล่านี้จำเป็นสำหรับการทำงานของเว็บไซต์ รวมถึง:</p>
        <ul>
          <li>คุกกี้การจัดการเซสชัน</li>
          <li>คุกกี้การยืนยันตัวตน</li>
          <li>คุกกี้ความปลอดภัย</li>
        </ul>

        <h5 className="font-semibold mt-3">2. คุกกี้การทำงาน</h5>
        <p>คุกกี้เหล่านี้จดจำตัวเลือกของคุณ เช่น:</p>
        <ul>
          <li>ความชอบภาษา</li>
          <li>การตั้งค่าตำแหน่ง</li>
          <li>รายการที่เพิ่งดูล่าสุด</li>
        </ul>

        <h5 className="font-semibold mt-3">3. คุกกี้การวิเคราะห์</h5>
        <p>คุกกี้เหล่านี้ช่วยให้เราเข้าใจว่าผู้ใช้โต้ตอบกับแพลตฟอร์มนี้อย่างไร:</p>
        <ul>
          <li>สถิติการเข้าชมหน้า</li>
          <li>การวิเคราะห์พฤติกรรมผู้ใช้</li>
          <li>การติดตามประสิทธิภาพ</li>
        </ul>

        <h5 className="font-semibold mt-3">4. คุกกี้การตลาด</h5>
        <p>คุกกี้เหล่านี้ใช้เพื่อ:</p>
        <ul>
          <li>ติดตามประสิทธิภาพโฆษณา</li>
          <li>ปรับแต่งเนื้อหาโฆษณา</li>
          <li>การผสานรวมโซเชียลมีเดีย</li>
        </ul>

        <h4 className="font-bold mt-4">คุกกี้ของบุคคลที่สาม</h4>
        <p>แพลตฟอร์มนี้อาจใช้คุกกี้จากบริการของบุคคลที่สามต่อไปนี้:</p>
        <ul>
          <li>Google Analytics (การวิเคราะห์เว็บไซต์)</li>
          <li>Facebook Pixel (การติดตามโฆษณา)</li>
          <li>ผู้ประมวลผลการชำระเงิน (ความปลอดภัยของธุรกรรม)</li>
        </ul>

        <h4 className="font-bold mt-4">การจัดการคุกกี้</h4>
        <p>คุณสามารถควบคุมคุกกี้ได้โดย:</p>
        <ul>
          <li>การตั้งค่าเบราว์เซอร์: เบราว์เซอร์ส่วนใหญ่ช่วยให้คุณบล็อกหรือลบคุกกี้</li>
          <li>เครื่องมือยกเลิก: ใช้เครื่องมือยกเลิกที่บุคคลที่สามจัดหาให้</li>
          <li>โหมดส่วนตัว: ใช้โหมดส่วนตัว/ไม่ระบุตัวตนของเบราว์เซอร์</li>
        </ul>

        <p className="mt-4">
          <strong>หมายเหตุ:</strong> การปิดใช้งานคุกกี้ที่จำเป็นอาจส่งผลต่อการทำงานของแพลตฟอร์มนี้
        </p>

        <h4 className="font-bold mt-4">การเก็บรักษาข้อมูลคุกกี้</h4>
        <p>คุกกี้ประเภทต่างๆ มีระยะเวลาเก็บรักษาที่แตกต่างกัน:</p>
        <ul>
          <li>คุกกี้เซสชัน: ลบเมื่อปิดเบราว์เซอร์</li>
          <li>คุกกี้ถาวร: ตามวันที่หมดอายุที่ตั้งไว้ (โดยปกติ 1-24 เดือน)</li>
        </ul>

        <h4 className="font-bold mt-4">การอัปเดตนโยบายนี้</h4>
        <p>แพลตฟอร์มนี้อาจอัปเดตนโยบายคุกกี้นี้เป็นครั้งคราว เราแนะนำให้ตรวจสอบหน้านี้เป็นประจำ</p>

        <h4 className="font-bold mt-4">ติดต่อเรา</h4>
        <p>หากมีคำถามเกี่ยวกับคุกกี้ โปรดติดต่อเราผ่านหน้าติดต่อของแพลตฟอร์มนี้</p>
      </>
    );
  } else {
    return (
      <>
        <p className="font-semibold">Last Updated: December 20, 2025</p>

        <h4 className="font-bold mt-4">What are Cookies?</h4>
        <p>Cookies are small text files that a website stores on your device when you visit. They help websites remember your preferences and improve your experience.</p>

        <h4 className="font-bold mt-4">How This Platform Uses Cookies</h4>
        <p>This Platform uses the following types of cookies:</p>

        <h5 className="font-semibold mt-3">1. Essential Cookies</h5>
        <p>These cookies are necessary for the website to function, including:</p>
        <ul>
          <li>Session management cookies</li>
          <li>Authentication cookies</li>
          <li>Security cookies</li>
        </ul>

        <h5 className="font-semibold mt-3">2. Functional Cookies</h5>
        <p>These cookies remember your choices, such as:</p>
        <ul>
          <li>Language preferences</li>
          <li>Location settings</li>
          <li>Recently viewed items</li>
        </ul>

        <h5 className="font-semibold mt-3">3. Analytics Cookies</h5>
        <p>These cookies help us understand how users interact with this Platform:</p>
        <ul>
          <li>Page visit statistics</li>
          <li>User behavior analysis</li>
          <li>Performance monitoring</li>
        </ul>

        <h5 className="font-semibold mt-3">4. Marketing Cookies</h5>
        <p>These cookies are used to:</p>
        <ul>
          <li>Track advertising effectiveness</li>
          <li>Personalize ad content</li>
          <li>Social media integration</li>
        </ul>

        <h4 className="font-bold mt-4">Third-Party Cookies</h4>
        <p>This Platform may use cookies from the following third-party services:</p>
        <ul>
          <li>Google Analytics (website analytics)</li>
          <li>Facebook Pixel (advertising tracking)</li>
          <li>Payment processors (transaction security)</li>
        </ul>

        <h4 className="font-bold mt-4">Managing Cookies</h4>
        <p>You can control cookies by:</p>
        <ul>
          <li>Browser settings: Most browsers allow you to block or delete cookies</li>
          <li>Opt-out tools: Use opt-out tools provided by third parties</li>
          <li>Privacy mode: Use your browser's private/incognito mode</li>
        </ul>

        <p className="mt-4">
          <strong>Note:</strong> Disabling essential cookies may affect this Platform's functionality.
        </p>

        <h4 className="font-bold mt-4">Cookie Data Retention</h4>
        <p>Different types of cookies have different retention periods:</p>
        <ul>
          <li>Session cookies: Deleted when browser closes</li>
          <li>Persistent cookies: According to set expiration date (typically 1-24 months)</li>
        </ul>

        <h4 className="font-bold mt-4">Updates to This Policy</h4>
        <p>This Platform may update this Cookie Policy from time to time. We recommend reviewing this page periodically.</p>

        <h4 className="font-bold mt-4">Contact Us</h4>
        <p>For questions about cookies, please contact us through this Platform's contact page.</p>
      </>
    );
  }
}
