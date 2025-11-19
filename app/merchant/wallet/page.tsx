// 文件: /app/merchant/wallet/page.tsx
"use client";

import { useState, useEffect, useCallback, ChangeEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { HiWallet, HiArrowUp, HiArrowDown, HiCheckCircle, HiXCircle } from "react-icons/hi2"; 
import QRCode from 'react-qr-code';
import { PostgrestError } from '@supabase/supabase-js'; 

// --- 原始类型定义 ---
interface Transaction {
  id: number;
  type: 'top_up' | 'commission' | 'withdraw' | 'bonus'; 
  amount: number;
  balance_after: number; // 交易后余额
  description: string;
  created_at: string;
  status?: string; // 新增状态字段
}

// --- 联表查询的嵌套类型 ---
interface FetchedMerchant {
    merchant_id: string;
    shop_name: string;
    status: string;
    is_suspended: boolean;
    merchant_transactions: Transaction[]; 
}

// 联表查询结果的最终类型 (Profile Data)
interface FetchedProfileData {
    id: string;
    merchants: FetchedMerchant[]; 
}

interface MerchantInfo {
  merchant_id: string;
  shop_name: string;
  platform_balance: number; 
  is_suspended: boolean;
  status: string;
  merchant_transactions: Transaction[]; 
}

// --- 充值流程状态类型 ---
type RechargeStep = 'input' | 'payment' | 'verifying' | 'result';
interface CurrentTransaction {
  transactionId: string;
  promptpayPayload: string;
  amount: number;
}
interface Message {
    type: 'success' | 'error' | 'info';
    text: string;
}

// 辅助函数：格式化日期
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('th-TH', { 
    dateStyle: 'short', 
    timeStyle: 'short' 
  });
};

// 辅助函数：获取交易类型图标
const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
        case 'top_up':
        case 'bonus':
            return <HiArrowUp className="w-5 h-5 text-success" />;
        case 'commission':
        case 'withdraw':
            return <HiArrowDown className="w-5 h-5 text-error" />;
        default:
            return <HiWallet className="w-5 h-5" />;
    }
};


export default function WalletPage() {
  // 修复: 确保 loading 被使用
  const [loading, setLoading] = useState(true); 
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  
  // 充值模态框状态
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<string>("1000");

  // --- 充值流程所需状态 ---
  const [rechargeStep, setRechargeStep] = useState<RechargeStep>('input');
  const [currentTransaction, setCurrentTransaction] = useState<CurrentTransaction | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<Message | null>(null); 

  // 1. 获取数据 (联表查询，一次性获取余额和流水)
  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        setLoading(false);
        return;
    }

    try {
        const { data: profileData, error } = await supabase
            .from('profiles')
            .select(`
                id, 
                merchants (
                    merchant_id, 
                    shop_name, 
                    status, 
                    is_suspended,
                    merchant_transactions (id, type, amount, balance_after, description, created_at, status) 
                )
            `)
            .eq('id', user.id)
            .single() as { data: FetchedProfileData | null, error: PostgrestError | null }; 
        
        if (error) throw error; 

        // 结构化数据
        if (profileData && profileData.merchants && profileData.merchants.length > 0) {
            const merchantDetails = profileData.merchants[0];
            
            const fetchedTransactions: Transaction[] = merchantDetails.merchant_transactions || [];
            
            // 2. 根据最新交易计算当前余额
            // 过滤掉未完成的充值请求 (status != 'completed')，以免影响余额显示
            const completedTransactions = fetchedTransactions.filter(t => t.status === 'completed' || !t.status); // 兼容旧数据无 status 的情况
            const sortedTransactions = completedTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
            // 当前余额是最新一条交易记录的 balance_after，如果没有记录则为 0
            const currentBalance = sortedTransactions.length > 0 ? sortedTransactions[0].balance_after : 0;
            
            setMerchant({
                merchant_id: merchantDetails.merchant_id,
                shop_name: merchantDetails.shop_name,
                platform_balance: currentBalance, 
                is_suspended: merchantDetails.is_suspended,
                status: merchantDetails.status,
                merchant_transactions: fetchedTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
            });
        } else if (profileData && profileData.merchants && profileData.merchants.length === 0) {
             setMerchant(prev => ({
                ...(prev || {}),
                merchant_id: '',
                shop_name: 'N/A',
                platform_balance: 0,
                is_suspended: true,
                status: 'unregistered',
                merchant_transactions: [],
             } as MerchantInfo));
        }

    } catch (e: unknown) { 
        const postgrestError = e as PostgrestError;
        const errorMessage = (postgrestError.message || postgrestError.code) ? `Supabase Error: ${postgrestError.message} (Code: ${postgrestError.code})` : 'Unknown error during data fetch.';
        console.error('Error fetching merchant data:', errorMessage);
        
        if (postgrestError.code === '42501') { 
            setMessage({ type: 'error', text: '权限不足 (RLS 错误)。' });
        } else {
            setMessage({ type: 'error', text: '无法加载商户数据。' });
        }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- 充值流程函数 ---
  
  const handleTopUpSubmit = async () => {
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount < 500) {
      setMessage({ type: 'error', text: '充值金额无效，最低 500 泰铢。' });
      return;
    }
    
    setIsProcessing(true);
    setMessage(null);

    try {
      const response = await fetch('/api/merchant/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();

      if (data.success) {
        setCurrentTransaction({
          transactionId: data.transactionId,
          promptpayPayload: data.promptpayPayload,
          amount: data.paymentAmount,
        });
        setRechargeStep('payment'); 
      } else {
        setMessage({ type: 'error', text: data.message || '发起充值请求失败。' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '网络错误，请稍后再试。' });
      console.error('Recharge Initiation Error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSlipFile(e.target.files[0]);
    } else {
      setSlipFile(null);
    }
  };

  const handleVerifySlip = async () => {
    if (!slipFile || !currentTransaction) {
      setMessage({ type: 'error', text: '请上传支付凭证图片。' });
      return;
    }

    setRechargeStep('verifying');
    setIsProcessing(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('transactionId', currentTransaction.transactionId);
    formData.append('file', slipFile);

    try {
      const response = await fetch('/api/merchant/verify-recharge', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      setRechargeStep('result');

      if (data.success) {
        setMessage({ type: 'success', text: '充值成功！您的余额已更新。' });
        fetchData(); 
      } else {
        setMessage({ type: 'error', text: data.message || '凭证验证失败，请重新尝试。' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '网络错误，无法连接到验证服务。' });
      console.error('Slip Verification Error:', error);
      setRechargeStep('result');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const resetModal = () => {
      setIsTopUpModalOpen(false);
      setRechargeStep('input');
      setCurrentTransaction(null);
      setSlipFile(null);
      setIsProcessing(false);
      setMessage(null);
      setTopUpAmount("1000");
  };

  // 修复: 在加载时显示 loading spinner，解决 loading 未使用的警告
  if (loading) {
    return (
        <div className="flex justify-center items-center h-96">
            <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <HiWallet className="w-8 h-8" /> 钱包与财务
      </h1>

      {/* --- 1. 余额卡片 --- */}
      <div className="card w-full bg-primary text-primary-content shadow-xl mb-8">
        <div className="card-body">
          <h2 className="card-title text-2xl opacity-80">当前平台余额</h2>
          <p className="text-5xl font-extrabold my-2">
            ฿{merchant?.platform_balance.toFixed(2) || '0.00'}
          </p>
          <div className="card-actions justify-end">
            <button className="btn btn-warning" onClick={() => setMessage({ type: 'info', text: '提现功能正在开发中。' })}>
                申请提现
            </button>
            <button className="btn btn-success" onClick={() => setIsTopUpModalOpen(true)}>
              <HiArrowUp className="w-5 h-5" /> 充值
            </button>
          </div>
        </div>
      </div>
      
      {/* 状态提示 */}
      {message && (
        <div role="alert" className={`alert mb-4 ${message.type === 'error' ? 'alert-error' : message.type === 'success' ? 'alert-success' : 'alert-info'}`}>
          {message.type === 'success' && <HiCheckCircle className="w-6 h-6" />}
          {message.type === 'error' && <HiXCircle className="w-6 h-6" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* --- 2. 交易记录 --- */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-xl mb-4">交易流水</h2>
          
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th className="w-1/4">日期与时间</th>
                  <th className="w-1/4">类型与描述</th>
                  <th className="w-1/4 text-right">金额</th>
                  <th className="w-1/4 text-right">交易后余额</th>
                </tr>
              </thead>
              <tbody>
                {merchant?.merchant_transactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-base-content/60">暂无交易记录</td>
                  </tr>
                ) : (
                  merchant?.merchant_transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{formatDate(tx.created_at)}</td>
                      <td>
                        {/* 显示状态标签 */}
                        <div className="flex flex-col items-start">
                            <span className="badge badge-outline">{tx.type}</span>
                            {tx.status === 'pending' && <span className="badge badge-warning badge-xs mt-1">审核中</span>}
                        </div>
                        <p className="text-sm text-base-content/70 mt-1">{tx.description}</p>
                      </td>
                      <td className={`text-right font-semibold flex items-center justify-end gap-2`}>
                        {getTransactionIcon(tx.type)}
                        {tx.amount > 0 ? `+฿${tx.amount.toFixed(2)}` : `-฿${Math.abs(tx.amount).toFixed(2)}`}
                      </td>
                      <td className="text-right">
                          {tx.balance_after !== null ? `฿${tx.balance_after.toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- 3. 充值模态框 (Modal) --- */}
      {isTopUpModalOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box w-11/12 max-w-lg">
            
            <h3 className="font-bold text-xl mb-4 text-center">商户充值 - PromptPay</h3>
            
            {/* 步骤 1: 金额输入 */}
            {rechargeStep === 'input' && (
              <>
                <p className="py-4 text-base-content/80">请指定您希望充值的金额（最低 500 泰铢）。</p>
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
                    disabled={isProcessing}
                  />
                </div>
                
                <div className="modal-action mt-6">
                  <button className="btn btn-ghost" onClick={resetModal} disabled={isProcessing}>取消</button>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleTopUpSubmit}
                    disabled={isProcessing || parseFloat(topUpAmount) < 500}
                  >
                    {isProcessing && <span className="loading loading-spinner"></span>}
                    确认充值并获取收款码
                  </button>
                </div>
              </>
            )}

            {/* 步骤 2: 支付与上传凭证 */}
            {rechargeStep === 'payment' && currentTransaction && (
              <div className='flex flex-col items-center text-center'>
                <p className='text-lg font-bold mb-4 text-primary'>
                    待支付金额: ฿{currentTransaction.amount.toFixed(2)}
                </p>
                
                {/* QR Code Display */}
                <div className="p-4 bg-white rounded-lg shadow-lg mb-6">
                    <QRCode 
                        value={currentTransaction.promptpayPayload} 
                        size={256}
                        level="M"
                    />
                </div>
                <p className='text-sm text-base-content/70 mb-8'>
                    请使用手机银行App扫描上方二维码完成转账，然后上传支付凭证。
                </p>

                <h4 className='font-semibold mb-3 w-full border-t pt-4'>--- 上传支付凭证 (Slip) 进行验证 ---</h4>

                <div className="form-control w-full max-w-xs">
                    <input 
                       type="file" 
                       accept="image/*"
                       className="file-input file-input-bordered w-full"
                       onChange={handleFileChange}
                       disabled={isProcessing}
                    />
                    {slipFile && (
                        <p className='text-xs text-success mt-2 truncate'>已选择文件: {slipFile.name}</p>
                    )}
                    {!slipFile && (
                         <p className='text-xs text-base-content/70 mt-2'>支持 JPG, PNG 格式。</p>
                    )}
                </div>

                <div className="modal-action w-full mt-6 justify-center sm:justify-end">
                  <button 
                    className="btn btn-ghost" 
                    onClick={() => setRechargeStep('input')}
                    disabled={isProcessing}
                  >
                    返回修改金额
                  </button>
                  <button 
                    className="btn btn-success" 
                    onClick={handleVerifySlip}
                    disabled={isProcessing || !slipFile}
                  >
                    {isProcessing && <span className="loading loading-spinner"></span>}
                    {isProcessing ? '验证中...' : '上传并验证支付'}
                  </button>
                </div>
              </div>
            )}
            
            {/* 步骤 3 & 4: 验证中/结果显示 */}
            {(rechargeStep === 'verifying' || rechargeStep === 'result') && (
              <div className='flex flex-col items-center text-center py-8'>
                
                {/* 验证中状态 */}
                {rechargeStep === 'verifying' && (
                    <div role="status" className="flex flex-col items-center">
                        <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
                        <p className='text-lg font-semibold'>正在连接 Slip2Go 进行验证...</p>
                        <p className='text-sm text-base-content/70 mt-2'>请稍候，通常需要 5-10 秒。</p>
                    </div>
                )}
                
                {/* 结果状态 */}
                {rechargeStep === 'result' && message && (
                    <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'} w-full`}>
                        {message.type === 'success' ? <HiCheckCircle className="w-6 h-6" /> : <HiXCircle className="w-6 h-6" />}
                        <span>{message.text}</span>
                    </div>
                )}
                
                <div className="modal-action w-full mt-6 justify-center">
                  {/* 成功后关闭，失败后可以重新尝试或关闭 */}
                  {message?.type === 'error' && (
                       <button className="btn btn-warning" onClick={() => setRechargeStep('payment')}>重新上传凭证</button>
                  )}
                  <button className="btn" onClick={resetModal}>
                    {message?.type === 'success' ? '完成' : '关闭'}
                  </button>
                </div>
              </div>
            )}
            
            {/* 关闭按钮 */}
            <form method="dialog">
              <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={resetModal}>✕</button>
            </form>
          </div>
        </dialog>
      )}
    </div>
  );
}