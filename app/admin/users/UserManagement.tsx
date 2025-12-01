// 文件: /app/admin/users/UserManagement.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import {
  HiMagnifyingGlass,
  HiUserCircle,
  HiShieldCheck,
  HiBuildingStorefront,
  HiCheckCircle,
  HiXCircle,
  HiPencil,
  HiTrash,
} from "react-icons/hi2";

// 定义用户类型
type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: 'user' | 'merchant' | 'admin';
  is_active: boolean;
  created_at: string;
};

interface UserManagementProps {
  initialUsers: UserProfile[];
}

export default function UserManagement({ initialUsers }: UserManagementProps) {
  const [users, setUsers] = useState<UserProfile[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // 搜索和过滤
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm);

    const matchesRole = filterRole === "all" || user.role === filterRole;

    return matchesSearch && matchesRole;
  });

  // 角色显示
  const getRoleBadge = (role: string) => {
    const badges = {
      admin: { text: "管理员", color: "badge-error", icon: <HiShieldCheck className="w-4 h-4" /> },
      merchant: { text: "商户", color: "badge-warning", icon: <HiBuildingStorefront className="w-4 h-4" /> },
      user: { text: "普通用户", color: "badge-info", icon: <HiUserCircle className="w-4 h-4" /> },
    };
    const badge = badges[role as keyof typeof badges] || badges.user;

    return (
      <div className={`badge ${badge.color} gap-2`}>
        {badge.icon}
        {badge.text}
      </div>
    );
  };

  // 更新用户角色
  const handleUpdateRole = async (userId: string, newRole: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "更新失败");
      }

      const updatedUser = await response.json();
      setUsers(users.map(u => u.id === userId ? updatedUser : u));
      alert("角色更新成功");
    } catch (error) {
      console.error("Error updating role:", error);
      alert(error instanceof Error ? error.message : "更新角色失败");
    } finally {
      setLoading(false);
    }
  };

  // 切换用户状态
  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "更新失败");
      }

      const updatedUser = await response.json();
      setUsers(users.map(u => u.id === userId ? updatedUser : u));
      alert(`用户已${!currentStatus ? '启用' : '禁用'}`);
    } catch (error) {
      console.error("Error toggling status:", error);
      alert(error instanceof Error ? error.message : "操作失败");
    } finally {
      setLoading(false);
    }
  };

  // 删除用户
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`确定要删除用户 "${userName}" 吗？此操作不可恢复！`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "删除失败");
      }

      setUsers(users.filter(u => u.id !== userId));
      alert("用户删除成功");
    } catch (error) {
      console.error("Error deleting user:", error);
      alert(error instanceof Error ? error.message : "删除用户失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">用户管理</h1>
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">总用户数</div>
            <div className="stat-value text-primary">{users.length}</div>
          </div>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="card bg-base-100 shadow-lg mb-6">
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-4">
            {/* 搜索框 */}
            <div className="form-control flex-1">
              <div className="input-group">
                <span>
                  <HiMagnifyingGlass className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  placeholder="搜索用户（邮箱、姓名、手机号）"
                  className="input input-bordered w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* 角色筛选 */}
            <select
              className="select select-bordered w-full md:w-48"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="all">所有角色</option>
              <option value="user">普通用户</option>
              <option value="merchant">商户</option>
              <option value="admin">管理员</option>
            </select>
          </div>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>用户</th>
                  <th>联系方式</th>
                  <th>角色</th>
                  <th>状态</th>
                  <th>注册时间</th>
                  <th className="text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-base-content/60">
                      暂无用户数据
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      {/* 用户信息 */}
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="avatar">
                            <div className="w-12 h-12 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                              {user.avatar_url ? (
                                <Image
                                  src={user.avatar_url}
                                  alt={user.full_name || "User"}
                                  width={48}
                                  height={48}
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-neutral text-neutral-content">
                                  <HiUserCircle className="w-8 h-8" />
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="font-bold">
                              {user.full_name || "未设置"}
                            </div>
                            <div className="text-sm opacity-50">
                              ID: {user.id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 联系方式 */}
                      <td>
                        <div className="text-sm">
                          <div>{user.email || "-"}</div>
                          <div className="text-base-content/60">
                            {user.phone || "-"}
                          </div>
                        </div>
                      </td>

                      {/* 角色 */}
                      <td>
                        <select
                          className="select select-bordered select-sm"
                          value={user.role}
                          onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                          disabled={loading}
                        >
                          <option value="user">普通用户</option>
                          <option value="merchant">商户</option>
                          <option value="admin">管理员</option>
                        </select>
                      </td>

                      {/* 状态 */}
                      <td>
                        <button
                          className={`btn btn-sm gap-2 ${
                            user.is_active ? "btn-success" : "btn-error"
                          }`}
                          onClick={() => handleToggleStatus(user.id, user.is_active)}
                          disabled={loading}
                        >
                          {user.is_active ? (
                            <>
                              <HiCheckCircle className="w-4 h-4" />
                              正常
                            </>
                          ) : (
                            <>
                              <HiXCircle className="w-4 h-4" />
                              禁用
                            </>
                          )}
                        </button>
                      </td>

                      {/* 注册时间 */}
                      <td>
                        <div className="text-sm">
                          {new Date(user.created_at).toLocaleDateString('zh-CN')}
                        </div>
                      </td>

                      {/* 操作 */}
                      <td>
                        <div className="flex gap-2 justify-center">
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setEditingUser(user)}
                            title="查看详情"
                          >
                            <HiPencil className="w-4 h-4" />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm text-error"
                            onClick={() =>
                              handleDeleteUser(user.id, user.full_name || user.email || "该用户")
                            }
                            disabled={loading}
                            title="删除用户"
                          >
                            <HiTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 用户详情模态框 */}
      {editingUser && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">用户详情</h3>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="avatar">
                  <div className="w-20 h-20 rounded-full">
                    {editingUser.avatar_url ? (
                      <Image
                        src={editingUser.avatar_url}
                        alt={editingUser.full_name || "User"}
                        width={80}
                        height={80}
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-neutral text-neutral-content">
                        <HiUserCircle className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xl font-bold">{editingUser.full_name || "未设置"}</div>
                  {getRoleBadge(editingUser.role)}
                </div>
              </div>

              <div className="divider"></div>

              <div className="grid gap-3">
                <div>
                  <div className="text-sm text-base-content/60">用户 ID</div>
                  <div className="font-mono text-sm">{editingUser.id}</div>
                </div>
                <div>
                  <div className="text-sm text-base-content/60">邮箱</div>
                  <div>{editingUser.email || "-"}</div>
                </div>
                <div>
                  <div className="text-sm text-base-content/60">手机号</div>
                  <div>{editingUser.phone || "-"}</div>
                </div>
                <div>
                  <div className="text-sm text-base-content/60">注册时间</div>
                  <div>{new Date(editingUser.created_at).toLocaleString('zh-CN')}</div>
                </div>
                <div>
                  <div className="text-sm text-base-content/60">账户状态</div>
                  <div className={editingUser.is_active ? "text-success" : "text-error"}>
                    {editingUser.is_active ? "正常" : "已禁用"}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-action">
              <button
                className="btn"
                onClick={() => setEditingUser(null)}
              >
                关闭
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setEditingUser(null)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
