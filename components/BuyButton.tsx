// 文件: /components/BuyButton.tsx
"use client";

import { useState } from "react";
// 修复 1: 删除未使用的 useRouter
// import { useRouter } from "next/navigation";

export default function BuyButton({ couponId }: { couponId: string }) {
  const [loading, setLoading] = useState(false);
  // 修复 1: 删除未使用的 router
  // const router = useRouter();

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // 调用支付 API
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ couponId }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "支付初始化失败");

      // 跳转支付链接 (Stripe 或 Mock URL)
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No URL returned", data);
      }

    // 修复 2: 使用 unknown 替代 any，并进行类型检查
    } catch (error: unknown) {
      console.error("Checkout Error:", error);
      let message = "支付发起失败，请重试";
      if (error instanceof Error) {
        message += ": " + error.message;
      }
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      className="btn btn-primary flex-1 max-w-xs text-lg shadow-lg shadow-primary/30"
      onClick={handleCheckout}
      disabled={loading}
    >
      {loading ? <span className="loading loading-spinner"></span> : "立即购买"}
    </button>
  );
}