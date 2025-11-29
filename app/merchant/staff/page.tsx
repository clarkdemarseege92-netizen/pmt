// 文件: /app/merchant/staff/page.tsx
"use client";

import { useState, useEffect } from "react";
// 【修复 3】移除未使用的 HiPhone
import { HiUserGroup, HiPlus, HiTrash } from "react-icons/hi2";

type Staff = {
  id: string;
  created_at: string;
  user_id: string;
  profiles: {
    phone: string;
    email: string | null;
  };
};

export default function StaffPage() {
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
    if (!phone) return alert("请输入手机号");
    setAdding(true);
    try {
      const res = await fetch('/api/merchant/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.success) {
        alert("添加成功！");
        setPhone("");
        fetchStaff();
      } else {
        alert(data.message || "添加失败");
      }
    } catch { 
      // 【修复 4】移除未使用的 catch 参数 'e'
      alert("网络错误");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (staffId: string) => {
    if (!confirm("确定要移除该员工吗？")) return;
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
        <HiUserGroup className="text-primary" /> 员工管理
      </h1>

      {/* 添加员工卡片 */}
      <div className="card bg-base-100 shadow-md border border-base-200 mb-8">
        <div className="card-body">
          <h2 className="card-title text-lg">添加新员工</h2>
          <p className="text-sm text-base-content/60 mb-4">
            输入员工的注册手机号，将其添加到您的店铺。员工将获得扫码核销订单的权限。
          </p>
          <div className="flex gap-4 items-end">
            <div className="form-control flex-1 max-w-sm">
              <label className="label"><span className="label-text">员工手机号</span></label>
              <div className="input-group flex">
                <input 
                  type="tel" 
                  placeholder="例如: 0812345678" 
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
              {adding ? <span className="loading loading-spinner"></span> : <><HiPlus /> 添加</>}
            </button>
          </div>
        </div>
      </div>

      {/* 员工列表 */}
      <div className="bg-base-100 rounded-xl shadow-md border border-base-200 overflow-hidden">
        <div className="p-4 border-b border-base-200 bg-base-50">
            <h3 className="font-bold">员工列表 ({staffList.length})</h3>
        </div>
        
        {loading ? (
            <div className="p-8 text-center"><span className="loading loading-spinner"></span></div>
        ) : staffList.length === 0 ? (
            <div className="p-8 text-center text-base-content/50">暂无员工</div>
        ) : (
            <div className="divide-y divide-base-100">
                {staffList.map((staff) => (
                    <div key={staff.id} className="p-4 flex justify-between items-center hover:bg-base-50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="avatar placeholder">
                                <div className="bg-neutral text-neutral-content rounded-full w-10">
                                    <span>{staff.profiles?.phone?.slice(-2) || 'St'}</span>
                                </div>
                            </div>
                            <div>
                                <div className="font-bold flex items-center gap-2">
                                    {staff.profiles?.phone || "未知号码"}
                                </div>
                                <div className="text-xs text-base-content/60">
                                    加入时间: {new Date(staff.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                        <button 
                            className="btn btn-ghost btn-sm text-error tooltip" 
                            data-tip="移除"
                            onClick={() => handleDelete(staff.id)}
                        >
                            <HiTrash className="w-5 h-5" />
                        </button>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}