"use client";

import { useState, useEffect, useCallback, ChangeEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { HiWallet, HiArrowUp, HiArrowDown, HiCheckCircle, HiXCircle, HiTrash, HiQrCode, HiClock } from "react-icons/hi2"; 
import QRCode from 'react-qr-code';
import { PostgrestError } from '@supabase/supabase-js'; 

// --- 类型定义 ---
interface Transaction {
  id: number; 
  type: 'top_up' | 'commission' | 'withdraw' | 'bonus'; 
  amount: number;
  balance_after: number; 
  description: string;
  created_at: string;
  status?: string; 
}

interface FetchedMerchantData {
    merchant_id: string;
    shop_name: string;
    status: string;
    is_suspended: boolean;
    merchant_transactions: Transaction[]; 
}

interface MerchantInfo {
  merchant_id: string;
  shop_name: string;
  platform_balance: number; 
  is_suspended: boolean;
  status: string;
  merchant_transactions: Transaction[]; 
}

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

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('th-TH', { 
    dateStyle: 'short', 
    timeStyle: 'short' 
  });
};

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

// 辅助：获取友好的类型名称
const getTypeName = (type: Transaction['type']) => {
    const map: Record<string, string> = {
        top_up: '充值',
        commission: '佣金扣除',
        withdraw: '提现',
        bonus: '奖励'
    };
    return map[type] || type;
};

export default function WalletPage() {
  const [loading, setLoading] = useState(true); 
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  
  // Modal State
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<string>("1000");

  const [rechargeStep, setRechargeStep] = useState<RechargeStep>('input');
  const [currentTransaction, setCurrentTransaction] = useState<CurrentTransaction | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<Message | null>(null); 

  // 操作加载状态
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        setLoading(false);
        return;
    }

    try {
        const { data, error } = await supabase
            .from('merchants')
            .select(`
                merchant_id, 
                shop_name, 
                status, 
                is_suspended,
                merchant_transactions (
                    id, type, amount, balance_after, description, created_at, status
                )
            `)
            .eq('owner_id', user.id)
            .single(); 

        if (error) throw error;

        const merchantData = data as unknown as FetchedMerchantData;

        if (merchantData) {
            const fetchedTransactions: Transaction[] = merchantData.merchant_transactions || [];
            
            // 1. 排序：最新的在前
            const sortedTransactions = [...fetchedTransactions].sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            // 2. 筛选有效交易计算余额
            const validTransactions = sortedTransactions.filter(t => t.status === 'completed' || !t.status);
            
            const currentBalance = validTransactions.length > 0 && validTransactions[0].balance_after !== null
                ? validTransactions[0].balance_after 
                : 0;
            
            setMerchant({
                merchant_id: merchantData.merchant_id,
                shop_name: merchantData.shop_name,
                platform_balance: currentBalance, 
                is_suspended: merchantData.is_suspended,
                status: merchantData.status,
                merchant_transactions: sortedTransactions,
            });
        } else {
             setMerchant({
                merchant_id: '',
                shop_name: '未注册商户',
                platform_balance: 0,
                is_suspended: true,
                status: 'unregistered',
                merchant_transactions: [],
             });
        }

    } catch (e: unknown) { 
        const postgrestError = e as PostgrestError;
        console.error('Fetch Error:', postgrestError);
        setMessage({ type: 'error', text: '数据加载失败，请刷新重试。' });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- 恢复支付 ---
  const handleResumeTransaction = async (tx: Transaction) => {
    setActionLoadingId(tx.id);
    setMessage(null);

    try {
        const response = await fetch('/api/merchant/transaction/resume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactionId: tx.id }),
        });
        const data = await response.json();

        if (data.success) {
            setCurrentTransaction({
                transactionId: String(tx.id),
                promptpayPayload: data.promptpayPayload,
                amount: data.amount
            });
            setRechargeStep('payment');
            setIsTopUpModalOpen(true);
        } else {
            setMessage({ type: 'error', text: data.message || '无法恢复订单' });
        }
    } catch (error) {
        console.error("Resume Error", error);
        setMessage({ type: 'error', text: '网络错误' });
    } finally {
        setActionLoadingId(null);
    }
  };

  // --- 取消订单 ---
  const handleCancelTransaction = async (txId: number) => {
    if (!confirm('确定要取消这笔充值申请吗？')) return;

    setActionLoadingId(txId);
    try {
        const response = await fetch('/api/merchant/transaction/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactionId: txId }),
        });
        const data = await response.json();

        if (data.success) {
            setMessage({ type: 'success', text: '订单已取消' });
            fetchData(); 
        } else {
            setMessage({ type: 'error', text: data.message || '取消失败' });
        }
    } catch (error) {
        console.error("Cancel Error", error);
        setMessage({ type: 'error', text: '网络错误' });
    } finally {
        setActionLoadingId(null);
    }
  };

  // --- 充值逻辑 ---
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
      console.error('Recharge Initiation Error:', error);
      setMessage({ type: 'error', text: '网络错误，请稍后再试。' });
    } finally {
      setIsProcessing(false);
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
        console.error('Verification Error:', error);
        setMessage({ type: 'error', text: '网络错误，无法连接到验证服务。' });
        setRechargeStep('result');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) setSlipFile(e.target.files[0]);
    else setSlipFile(null);
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

  if (loading) {
    return <div className="flex justify-center items-center h-96"><span className="loading loading-spinner loading-lg text-primary"></span></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 flex items-center gap-3">
        <HiWallet className="w-8 h-8 text-primary" /> 钱包与财务
      </h1>

      {/* 1. 余额卡片 */}
      <div className="card w-full bg-linear-to-r from-primary to-primary-focus text-primary-content shadow-lg mb-8">
        <div className="card-body p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
                <h2 className="text-lg opacity-80 font-medium">当前平台余额</h2>
                <p className="text-4xl md:text-5xl font-extrabold my-2 tracking-tight">
                    ฿{merchant?.platform_balance.toFixed(2) || '0.00'}
                </p>
            </div>
            <div className="flex gap-3 mt-4 md:mt-0 w-full md:w-auto">
                <button 
                    className="btn btn-warning flex-1 md:flex-none shadow-md border-none bg-yellow-400 hover:bg-yellow-500 text-yellow-900" 
                    onClick={() => setMessage({ type: 'info', text: '提现功能正在开发中。' })}
                >
                    提现
                </button>
                <button 
                    className="btn btn-secondary flex-1 md:flex-none shadow-md" 
                    onClick={() => { resetModal(); setIsTopUpModalOpen(true); }}
                >
                    <HiArrowUp className="w-5 h-5" /> 充值
                </button>
            </div>
          </div>
        </div>
      </div>
      
      {message && (
        <div role="alert" className={`alert mb-6 shadow-sm ${message.type === 'error' ? 'alert-error' : message.type === 'success' ? 'alert-success' : 'alert-info'}`}>
          {message.type === 'success' ? <HiCheckCircle className="w-6 h-6" /> : <HiXCircle className="w-6 h-6" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* 2. 交易记录 (使用 Div 布局替代 Table) */}
      <div className="bg-base-100 rounded-xl shadow-lg border border-base-200 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-base-200 bg-base-50 flex justify-between items-center">
            <h2 className="text-lg font-bold flex items-center gap-2">
                <HiClock className="w-5 h-5 text-base-content/70"/> 
                交易流水
            </h2>
        </div>

        {/* 表头 (仅在桌面端显示) */}
        <div className="hidden md:grid grid-cols-12 gap-4 p-4 text-sm font-bold text-base-content/60 border-b border-base-100 bg-base-50/50">
            <div className="col-span-2">日期</div>
            <div className="col-span-4">类型与描述</div>
            <div className="col-span-2 text-right">金额</div>
            <div className="col-span-2 text-right">余额</div>
            <div className="col-span-2 text-center">操作</div>
        </div>

        {/* 列表内容 */}
        <div className="divide-y divide-base-100">
          {merchant?.merchant_transactions && merchant.merchant_transactions.length > 0 ? (
            merchant.merchant_transactions.map((tx) => (
              <div key={tx.id} className="group hover:bg-base-50 transition-colors duration-200">
                  
                  {/* --- 桌面端布局 (MD及以上) --- */}
                  <div className="hidden md:grid grid-cols-12 gap-4 p-4 items-center">
                      <div className="col-span-2 text-sm">{formatDate(tx.created_at)}</div>
                      <div className="col-span-4">
                          <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{getTypeName(tx.type)}</span>
                              {tx.status === 'pending' && <span className="badge badge-warning badge-xs">审核中</span>}
                              {tx.status === 'failed' && <span className="badge badge-error badge-xs">已失效</span>}
                              {tx.status === 'completed' && <span className="badge badge-success badge-xs">成功</span>}
                          </div>
                          <p className="text-xs text-base-content/50 truncate pr-2">{tx.description}</p>
                      </div>
                      <div className={`col-span-2 text-right font-bold flex justify-end items-center gap-1 ${tx.amount > 0 ? 'text-success' : 'text-error'}`}>
                          {tx.amount > 0 ? '+' : '-'}{Math.abs(tx.amount).toFixed(2)}
                      </div>
                      <div className="col-span-2 text-right text-sm text-base-content/70">
                          {tx.balance_after !== null && tx.balance_after !== undefined ? `฿${tx.balance_after.toFixed(2)}` : '-'}
                      </div>
                      <div className="col-span-2 flex justify-center gap-2">
                          {tx.type === 'top_up' && tx.status === 'pending' ? (
                             <>
                                 <button 
                                    className="btn btn-sm btn-circle btn-ghost text-success tooltip tooltip-left" 
                                    data-tip="支付"
                                    onClick={() => handleResumeTransaction(tx)}
                                    disabled={actionLoadingId === tx.id}
                                 >
                                    {actionLoadingId === tx.id ? <span className="loading loading-spinner loading-xs"></span> : <HiQrCode className="w-5 h-5" />}
                                 </button>
                                 <button 
                                    className="btn btn-sm btn-circle btn-ghost text-error tooltip tooltip-left" 
                                    data-tip="取消"
                                    onClick={() => handleCancelTransaction(tx.id)}
                                    disabled={actionLoadingId === tx.id}
                                 >
                                    <HiTrash className="w-5 h-5"/>
                                 </button>
                             </>
                         ) : <span className="text-base-content/20">-</span>}
                      </div>
                  </div>

                  {/* --- 移动端布局 (MD以下) --- */}
                  <div className="md:hidden p-4 flex flex-col gap-3">
                      {/* 第一行：日期与金额 */}
                      <div className="flex justify-between items-start">
                          <span className="text-xs text-base-content/60">{formatDate(tx.created_at)}</span>
                          <span className={`font-bold text-lg ${tx.amount > 0 ? 'text-success' : 'text-error'}`}>
                             {tx.amount > 0 ? '+' : '-'}{Math.abs(tx.amount).toFixed(2)}
                          </span>
                      </div>
                      
                      {/* 第二行：类型图标、状态、操作 */}
                      <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                              <div className={`p-2 rounded-full bg-base-200 ${tx.amount > 0 ? 'text-success' : 'text-error'}`}>
                                  {getTransactionIcon(tx.type)}
                              </div>
                              <div className="flex flex-col">
                                  <span className="font-medium text-sm">{getTypeName(tx.type)}</span>
                                  <div className="flex gap-2 mt-0.5">
                                      {tx.status === 'pending' && <span className="badge badge-warning badge-xs">审核中</span>}
                                      {tx.status === 'failed' && <span className="badge badge-error badge-xs">已失效</span>}
                                      {tx.status === 'completed' && <span className="badge badge-success badge-xs">成功</span>}
                                  </div>
                              </div>
                          </div>
                          
                          {/* 移动端操作按钮 */}
                          {tx.type === 'top_up' && tx.status === 'pending' && (
                              <div className="flex gap-2">
                                  <button 
                                      className="btn btn-sm btn-outline btn-success px-3"
                                      onClick={() => handleResumeTransaction(tx)}
                                      disabled={actionLoadingId === tx.id}
                                  >
                                      {actionLoadingId === tx.id ? <span className="loading loading-spinner loading-xs"></span> : '支付'}
                                  </button>
                                  <button 
                                      className="btn btn-sm btn-outline btn-error px-3"
                                      onClick={() => handleCancelTransaction(tx.id)}
                                      disabled={actionLoadingId === tx.id}
                                  >
                                      取消
                                  </button>
                              </div>
                          )}
                      </div>

                      {/* 第三行：描述与余额 */}
                      <div className="flex justify-between items-end pt-2 border-t border-base-100 mt-1">
                          <p className="text-xs text-base-content/50 truncate max-w-[60%]">{tx.description}</p>
                          <div className="text-xs text-base-content/70">
                              余额: <span className="font-semibold text-base-content">{tx.balance_after !== null ? `฿${tx.balance_after.toFixed(2)}` : '-'}</span>
                          </div>
                      </div>
                  </div>

              </div>
            ))
          ) : (
             <div className="p-8 text-center text-base-content/50 flex flex-col items-center">
                <HiWallet className="w-12 h-12 mb-2 opacity-20" />
                <p>暂无交易记录</p>
             </div>
          )}
        </div>
      </div>

      {/* 3. 充值 Modal (保持不变) */}
      {isTopUpModalOpen && (
        <dialog className="modal modal-open items-center sm:items-center">
          <div className="modal-box w-11/12 max-w-md p-0 overflow-hidden bg-base-100">
            {/* Header */}
            <div className="bg-primary text-primary-content p-4 text-center relative">
                 <h3 className="font-bold text-lg">商户充值</h3>
                 <p className="text-xs opacity-80 mt-1">PromptPay 扫码支付</p>
                 <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 text-white" onClick={resetModal}>✕</button>
            </div>
            
            <div className="p-6">
                {rechargeStep === 'input' && (
                <>
                    <p className="text-sm text-center mb-6 text-base-content/70">最低充值金额为 500 泰铢</p>
                    <div className="form-control mb-6">
                    <label className="label"><span className="label-text font-semibold">充值金额 (฿)</span></label>
                    <div className="relative">
                        <input 
                            type="number" 
                            className="input input-bordered w-full text-lg font-bold pl-8" 
                            value={topUpAmount}
                            min={500}
                            onChange={(e) => setTopUpAmount(e.target.value)}
                            disabled={isProcessing}
                        />
                        <span className="absolute left-3 top-3 text-base-content/50 font-bold">฿</span>
                    </div>
                    </div>
                    <button className="btn btn-primary w-full text-lg" onClick={handleTopUpSubmit} disabled={isProcessing || parseFloat(topUpAmount) < 500}>
                        {isProcessing && <span className="loading loading-spinner"></span>} 
                        确认充值
                    </button>
                </>
                )}

                {rechargeStep === 'payment' && currentTransaction && (
                <div className='flex flex-col items-center text-center'>
                    <div className="text-sm mb-4">请支付 <span className='text-xl font-bold text-primary mx-1'>฿{currentTransaction.amount.toFixed(2)}</span></div>
                    <div className="p-3 bg-white border-2 border-primary/20 rounded-xl shadow-inner mb-4">
                        <QRCode value={currentTransaction.promptpayPayload} size={200} level="M" />
                    </div>
                    <p className='text-xs text-base-content/60 mb-6 px-4'>
                        请使用银行 APP 扫描上方二维码，转账成功后截图并上传凭证。
                    </p>
                    <div className="form-control w-full">
                        <input type="file" accept="image/*" className="file-input file-input-bordered file-input-primary w-full text-sm" onChange={handleFileChange} disabled={isProcessing} />
                        {slipFile && <p className='text-xs text-success mt-2 text-left'>已选: {slipFile.name}</p>}
                    </div>
                    <div className="flex gap-3 w-full mt-6">
                        <button className="btn btn-outline flex-1" onClick={() => setRechargeStep('input')} disabled={isProcessing}>返回</button>
                        <button className="btn btn-success flex-1 text-white" onClick={handleVerifySlip} disabled={isProcessing || !slipFile}>
                            {isProcessing ? '验证中...' : '上传验证'}
                        </button>
                    </div>
                </div>
                )}
                
                {(rechargeStep === 'verifying' || rechargeStep === 'result') && (
                <div className='flex flex-col items-center text-center py-4'>
                    {rechargeStep === 'verifying' && (
                        <>
                            <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
                            <p className="font-medium">正在验证支付凭证...</p>
                            <p className="text-xs text-base-content/60 mt-1">请稍候，这通常需要几秒钟。</p>
                        </>
                    )}
                    {rechargeStep === 'result' && message && (
                        <div className={`flex flex-col items-center gap-3 w-full ${message.type === 'success' ? 'text-success' : 'text-error'}`}>
                            {message.type === 'success' ? <HiCheckCircle className="w-16 h-16" /> : <HiXCircle className="w-16 h-16" />}
                            <span className="text-lg font-bold">{message.type === 'success' ? '充值成功' : '验证失败'}</span>
                            <p className="text-sm text-base-content/80">{message.text}</p>
                        </div>
                    )}
                    <div className="w-full mt-8">
                        {message?.type === 'error' ? (
                            <button className="btn btn-warning w-full" onClick={() => setRechargeStep('payment')}>重新上传</button>
                        ) : (
                            <button className="btn btn-primary w-full" onClick={resetModal} disabled={rechargeStep === 'verifying'}>关闭</button>
                        )}
                    </div>
                </div>
                )}
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}