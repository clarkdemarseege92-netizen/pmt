"use client";

import { useRouter } from "next/navigation";
import { HiArrowRightOnRectangle } from "react-icons/hi2";
import { useState } from "react";

export default function AdminLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (!confirm("确定要退出登录吗？")) return;

    setLoading(true);

    try {
      const response = await fetch("/api/admin/logout", {
        method: "POST",
      });

      if (response.ok) {
        // 退出成功，跳转到管理员登录页
        router.push("/admin-login");
        router.refresh();
      } else {
        alert("退出登录失败，请重试");
        setLoading(false);
      }
    } catch (error) {
      console.error("Logout error:", error);
      alert("退出登录失败，请重试");
      setLoading(false);
    }
  };

  return (
    <button onClick={handleLogout} disabled={loading} className="w-full">
      <HiArrowRightOnRectangle className="w-4 h-4" />
      {loading ? "退出中..." : "退出登录"}
    </button>
  );
}
