// 文件: /components/ProfileEditModal.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { HiCamera, HiXMark, HiDevicePhoneMobile, HiEnvelope } from "react-icons/hi2";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { UserProfile } from "@/app/client/profile/ProfilePageClient"; // 复用接口

interface ProfileEditModalProps {
  user: User;
  profile: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProfileEditModal({ user, profile, isOpen, onClose, onSuccess }: ProfileEditModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'main' | 'phone_change'>('main');
  
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  const [newPhone, setNewPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFullName(profile?.full_name || "");
      setAvatarUrl(profile?.avatar_url || "");
      setView('main');
      setNewPhone("");
      setOtp("");
      setOtpSent(false);
      setPhoneError("");
    }
  }, [isOpen, profile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarUrl(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      let finalAvatarUrl = avatarUrl;

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        // 修正：使用 'client' 存储桶
        const { error: uploadError } = await supabase.storage
          .from('client') // 使用新的存储桶
          .upload(fileName, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('client')
          .getPublicUrl(fileName);
          
        finalAvatarUrl = publicUrl;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          avatar_url: finalAvatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      onSuccess();
      onClose();
    } catch (error: unknown) {
      let message = "保存失败";
      if (error instanceof Error) message = error.message;
      else if (typeof error === 'object' && error !== null && 'message' in error) message = String((error as {message: unknown}).message);
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!newPhone) return setPhoneError("请输入新手机号");
    setLoading(true);
    setPhoneError("");
    
    try {
      let formattedPhone = newPhone.trim();
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+66' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+66' + formattedPhone;
      }

      const { error } = await supabase.auth.updateUser({ phone: formattedPhone });
      
      if (error) throw error;
      
      setOtpSent(true);
      setNewPhone(formattedPhone);
      alert("验证码已发送！");
    } catch (error: unknown) {
      let message = "发送失败";
      if (error instanceof Error) message = error.message;
      setPhoneError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!otp) return setPhoneError("请输入验证码");
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: newPhone,
        token: otp,
        type: 'phone_change'
      });

      if (error) throw error;

      alert("手机号修改成功！");
      
      await supabase.from('profiles').update({ phone: newPhone }).eq('id', user.id);
      
      setView('main');
      router.refresh();
    } catch (error: unknown) {
      let message = "验证失败";
      if (error instanceof Error) message = error.message;
      setPhoneError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    // 使用 style 设置 zIndex，避免 Tailwind 警告
    <div className="modal modal-open" style={{ zIndex: 9999 }}>
      <div className="modal-box relative">
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
          <HiXMark className="w-5 h-5" />
        </button>

        {view === 'main' && (
          <>
            <h3 className="font-bold text-lg mb-6">编辑个人资料</h3>
            
            <div className="flex flex-col items-center mb-6">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-base-200 relative">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="Avatar" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-neutral text-neutral-content flex items-center justify-center text-3xl font-bold">
                      {user.email?.[0]?.toUpperCase() || user.phone?.slice(-2)}
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <HiCamera className="w-8 h-8 text-white" />
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
              />
              <span className="text-xs text-base-content/60 mt-2">点击更换头像</span>
            </div>

            <div className="space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text">昵称</span></label>
                <input 
                  type="text" 
                  className="input input-bordered" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="设置一个好听的名字"
                />
              </div>

              <div className="bg-base-200/50 p-4 rounded-lg space-y-3 mt-4">
                <h4 className="text-sm font-bold opacity-70">账号绑定</h4>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <HiDevicePhoneMobile className="w-5 h-5 opacity-60" />
                    <span className="text-sm">{user.phone || "未绑定手机"}</span>
                  </div>
                  <button 
                    className="btn btn-xs btn-outline"
                    onClick={() => setView('phone_change')}
                  >
                    {user.phone ? '变更' : '绑定'}
                  </button>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <HiEnvelope className="w-5 h-5 opacity-60" />
                    <span className="text-sm truncate max-w-[150px]">{user.email || "未绑定邮箱"}</span>
                  </div>
                  <button className="btn btn-xs btn-disabled">变更</button>
                </div>
              </div>
            </div>

            <div className="modal-action">
              <button className="btn" onClick={onClose}>取消</button>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveProfile} 
                disabled={loading}
              >
                {loading ? "保存中..." : "保存修改"}
              </button>
            </div>
          </>
        )}

        {view === 'phone_change' && (
          <>
            <h3 className="font-bold text-lg mb-4">绑定/变更手机号</h3>
            <p className="text-sm text-base-content/60 mb-4">验证通过后，您可以使用新手机号接收验证码登录。</p>
            
            <div className="space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text">新手机号码</span></label>
                <div className="flex gap-2">
                  <input 
                    type="tel" 
                    className="input input-bordered flex-1" 
                    placeholder="0812345678"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    disabled={otpSent}
                  />
                  <button 
                    className="btn btn-neutral" 
                    onClick={handleSendOtp}
                    disabled={loading || otpSent || !newPhone}
                  >
                    {loading ? "..." : "获取验证码"}
                  </button>
                </div>
              </div>

              {otpSent && (
                <div className="form-control">
                  <label className="label"><span className="label-text">短信验证码</span></label>
                  <input 
                    type="text" 
                    className="input input-bordered tracking-widest text-center text-lg font-bold" 
                    placeholder="------"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </div>
              )}

              {phoneError && <p className="text-error text-sm">{phoneError}</p>}
            </div>

            <div className="modal-action">
              <button className="btn" onClick={() => setView('main')} disabled={loading}>返回</button>
              <button 
                className="btn btn-primary" 
                onClick={handleVerifyPhone}
                disabled={!otpSent || !otp || loading}
              >
                {loading ? "验证中..." : "确认变更"}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}