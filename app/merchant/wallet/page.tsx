// 文件: /app/merchant/wallet/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { HiWallet, HiBellAlert, HiArrowUp, HiArrowDown } from "react-icons/hi2";

// --- 类型定义 ---
interface Transaction {
  id: number;
  type: 'bonus' | 'top_up' | 'commission';
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
}

interface MerchantInfo {
  merchant_id: string;
  shop_name: string;
  platform_balance: number;
  is_suspended: boolean;
  status: string;
  merchant_transactions: Transaction[]; // 嵌套交易流水
}

// 辅助函数：格式化日期
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('th-TH', { 
    dateStyle: 'short', 
    timeStyle: 'short' 
  });
};

export default function WalletPage() {
  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  
  // 充值模态框状态
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<string>("1000");

  // 1. 获取数据 (联表查询，一次性获取余额和流水)
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: mData, error } = await supabase
        .from('merchants')
        .select(`
          merchant_id, 
          shop_name, 
          platform_balance, 
          is_suspended, 
          status, 
          merchant_transactions (*)
        `)
        .eq('owner_id', user.id)
        .single();
        
      if (error) console.error("Error fetching merchant wallet data:", error);

      // PostgREST 返回的嵌套数组需要手动排序
      if (mData?.merchant_transactions) {
         mData.merchant_transactions.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
         );
      }
      
      setMerchant(mData as MerchantInfo);
      setLoading(false);
    };
    fetchData();
  }, []);

  // 辅助函数：确定图标和颜色
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'top_up':
      case 'bonus':
        return <HiArrowUp className="text-success" />;
      case 'commission':
        return <HiArrowDown className="text-error" />;
      default:
        return null;
    }
  };

// 2. 处理充值请求 (连接到 /api/topup-checkout)
const handleTopUpSubmit = async () => {
  const amount = parseFloat(topUpAmount);
  if (amount < 500 || isNaN(amount)) {
      alert("最低充值金额为 500 泰铢。");
      return;
  }
  if (!merchant?.merchant_id) {
      alert("错误：无法获取商家ID。");
      return;
  }
  
  setLoading(true);

  try {
     const res = await fetch("/api/topup-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
           merchantId: merchant.merchant_id, // 传递商家ID
           amount: amount 
        }),
     });
     
     const data = await res.json();

     if (!res.ok) throw new Error(data.error || "充值初始化失败");

     // 跳转到支付页面 (Stripe 或 Mock URL)
     if (data.url) {
        window.location.href = data.url;
     }

  } catch (error: unknown) {
     console.error("TopUp Checkout Error:", error);
     let alertMessage = "发起充值失败，请重试";
     let extractedMessage = ""; // 用于存储提取到的具体错误信息

     // 1. 安全提取错误信息
     if (error instanceof Error) {
        extractedMessage = error.message;
     } else if (typeof error === 'object' && error !== null && 'message' in error) {
        // 提取来自 API 响应的错误信息
        extractedMessage = (error as { message: string }).message; 
     }
     
     // 2. 拼接最终提示信息
     if (extractedMessage) {
        alertMessage += ": " + extractedMessage;
     }

     alert(alertMessage);
  } finally {
     setLoading(false);
  }
};

  if (loading) return <div className="p-10 text-center"><span className="loading loading-spinner loading-lg"></span></div>;
  if (!merchant) return <div className="p-10 text-center text-error">未找到商家账户信息。</div>;

  const isBelowThreshold = merchant.platform_balance < 500;
  const cardClass = isBelowThreshold ? 'bg-error text-error-content' : 'bg-success text-success-content';

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">我的钱包 ({merchant.shop_name})</h1>

      {/* --- 1. 余额概览卡片 --- */}
      <div className={`card shadow-lg ${cardClass}`}>
        <div className="card-body p-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm opacity-80 flex items-center gap-2">
                <HiWallet className="w-5 h-5"/> 平台余额 (THB)
              </p>
              <h2 className="card-title text-5xl mt-2">
                ฿{merchant.platform_balance.toFixed(2)}
              </h2>
            </div>
            
            <button 
              className={`btn ${isBelowThreshold ? 'btn-outline text-error-content' : 'btn-success'}`}
              onClick={() => setIsTopUpModalOpen(true)}
            >
              充值 / Top Up
            </button>
          </div>

          {/* 状态警告 */}
          {merchant.is_suspended && (
             <div className="mt-4 flex items-center gap-2 font-bold bg-error-content/20 p-2 rounded-lg">
                <HiBellAlert className="w-6 h-6 text-error"/>
                <span>服务已暂停：余额低于警戒线 (฿500)。请立即充值！</span>
             </div>
          )}
          {!merchant.is_suspended && isBelowThreshold && (
             <div className="mt-4 flex items-center gap-2 font-bold bg-warning-content/20 text-warning p-2 rounded-lg">
                <HiBellAlert className="w-6 h-6"/>
                <span>警告：余额低于 ฿500。请尽快充值以避免服务暂停。</span>
             </div>
          )}
        </div>
      </div>

      {/* --- 2. 交易流水历史 --- */}
      <div className="bg-base-100 p-6 rounded-lg shadow-md space-y-4">
        <h2 className="text-xl font-bold border-b pb-2">交易历史记录</h2>
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>日期</th>
                <th>类型</th>
                <th>说明</th>
                <th className="text-right">金额 (฿)</th>
                <th className="text-right">交易后余额</th>
              </tr>
            </thead>
            <tbody>
              {merchant.merchant_transactions.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-4">暂无交易记录。</td></tr>
              ) : (
                merchant.merchant_transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{formatDate(tx.created_at)}</td>
                    <td>
                      <span className={`badge ${tx.type === 'commission' ? 'badge-error' : 'badge-success'}`}>
                        {tx.type.toUpperCase()}
                      </span>
                    </td>
                    <td>{tx.description}</td>
                    <td className={`text-right font-bold ${tx.amount > 0 ? 'text-success' : 'text-error'} flex items-center justify-end gap-2`}>
                    {getTransactionIcon(tx.type)}
                    {tx.amount > 0 ? `+฿${tx.amount.toFixed(2)}` : `-฿${Math.abs(tx.amount).toFixed(2)}`}
                    </td>
                    <td className="text-right">฿{tx.balance_after.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- 3. 充值模态框 (Modal) --- */}
      {isTopUpModalOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">发起充值请求</h3>
            <p className="py-4">请指定您希望充值的金额（最低 500 泰铢）。</p>
            
            <div className="form-control">
                <label className="label">
                   <span className="label-text">充值金额 (฿)</span>
                </label>
                <input 
                   type="number" 
                   className="input input-bordered input-lg" 
                   value={topUpAmount}
                   min={500}
                   onChange={(e) => setTopUpAmount(e.target.value)}
                />
            </div>
            <div className="modal-action">
              <button className="btn" onClick={() => setIsTopUpModalOpen(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleTopUpSubmit}>
                 确认充值
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}