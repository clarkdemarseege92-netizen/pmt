// 文件: /app/[locale]/merchant/staff/page.tsx (Client Component)
"use client";

import { useState, useEffect } from "react";
import { HiUserGroup, HiPlus, HiTrash } from "react-icons/hi2";
import { useTranslations } from 'next-intl';

type Staff = {
  id: string;
  created_at: string;
  user_id: string;
  profiles: {
    phone: string;
    email: string | null;
    avatar_url: string | null;
    full_name: string | null;
  };
};

export default function StaffPage() {
  const t = useTranslations('merchantStaff');

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    const res = await fetch('/api/merchant/staff');
    const json = await res.json();
    if (json.success) {
      setStaffList(json.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleAdd = async () => {
    if (!phone) return alert(t('pleaseEnterPhone'));
    setAdding(true);
    try {
      const res = await fetch('/api/merchant/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.success) {
        alert(t('addSuccess'));
        setPhone("");
        fetchStaff();
      } else {
        alert(data.message || t('addFailed'));
      }
    } catch {
      alert(t('networkError'));
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (staffId: string) => {
    if (!confirm(t('confirmRemove'))) return;
    const res = await fetch('/api/merchant/staff', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId }),
    });
    const data = await res.json();
    if (data.success) {
        fetchStaff();
    } else {
        alert(data.message);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <HiUserGroup className="text-primary" /> {t('title')}
      </h1>

      {/* 添加员工卡片 */}
      <div className="card bg-base-100 shadow-md border border-base-200 mb-8">
        <div className="card-body">
          <h2 className="card-title text-lg">{t('addNewStaff')}</h2>
          <p className="text-sm text-base-content/60 mb-4">
            {t('addStaffDescription')}
          </p>
          <div className="flex gap-4 items-end">
            <div className="form-control flex-1 max-w-sm">
              <label className="label"><span className="label-text">{t('staffPhone')}</span></label>
              <div className="input-group flex">
                <input
                  type="tel"
                  placeholder={t('phonePlaceholder')}
                  className="input input-bordered w-full"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleAdd}
              disabled={adding || !phone}
            >
              {adding ? <span className="loading loading-spinner"></span> : <><HiPlus /> {t('addButton')}</>}
            </button>
          </div>
        </div>
      </div>

      {/* 员工列表 */}
      <div className="bg-base-100 rounded-xl shadow-md border border-base-200 overflow-hidden">
        <div className="p-4 border-b border-base-200 bg-base-50">
            <h3 className="font-bold">{t('staffList')} ({staffList.length})</h3>
        </div>

        {loading ? (
            <div className="p-8 text-center"><span className="loading loading-spinner"></span></div>
        ) : staffList.length === 0 ? (
            <div className="p-8 text-center text-base-content/50">{t('noStaff')}</div>
        ) : (
            <div className="divide-y divide-base-100">
                {staffList.map((staff, index) => {
                    // 格式化手机号显示：将 66xxxxxxxxx 转换为 0xxxxxxxxx
                    const formatPhoneDisplay = (phone: string | undefined) => {
                        if (!phone) return null;
                        if (phone.startsWith('66')) {
                            return '0' + phone.substring(2);
                        }
                        return phone;
                    };
                    const displayPhone = formatPhoneDisplay(staff.profiles?.phone);
                    const staffNumber = index + 1;

                    return (
                        <div key={staff.id} className="p-4 flex justify-between items-center hover:bg-base-50 transition-colors">
                            <div className="flex items-center gap-4">
                                {staff.profiles?.avatar_url ? (
                                    <div className="avatar">
                                        <div className="w-10 rounded-full">
                                            <img src={staff.profiles.avatar_url} alt={`Staff ${staffNumber}`} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="avatar placeholder">
                                        <div className="bg-primary text-primary-content rounded-full w-10">
                                            <span>{staffNumber}</span>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <div className="font-bold flex items-center gap-2">
                                        {t('staffLabel', { number: staffNumber })}
                                    </div>
                                    <div className="text-sm text-base-content/70">
                                        {displayPhone || t('unknownNumber')}
                                    </div>
                                    <div className="text-xs text-base-content/50">
                                        {t('joinedAt')}: {new Date(staff.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                            <button
                                className="btn btn-ghost btn-sm text-error tooltip"
                                data-tip={t('removeTooltip')}
                                onClick={() => handleDelete(staff.id)}
                            >
                                <HiTrash className="w-5 h-5" />
                            </button>
                        </div>
                    );
                })}
            </div>
        )}
      </div>
    </div>
  );
}
