// 文件: /app/[locale]/merchant/wallet/page.tsx (Client Component)
"use client";

import { useState, useEffect, useCallback, ChangeEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { HiWallet, HiArrowUp, HiArrowDown, HiCheckCircle, HiXCircle, HiTrash, HiQrCode, HiClock, HiBanknotes, HiArrowPath } from "react-icons/hi2";
import QRCode from 'react-qr-code';
import { PostgrestError } from '@supabase/supabase-js';
import { useTranslations } from 'next-intl';

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
    bank_name: string | null;
    bank_account_number: string | null;
    bank_account_name: string | null;
    merchant_transactions: Transaction[];
}

interface MerchantInfo {
  merchant_id: string;
  shop_name: string;
  platform_balance: number;
  is_suspended: boolean;
  status: string;
  merchant_transactions: Transaction[];
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
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

interface WithdrawalRecord {
  id: string;
  amount: number;
  fee: number;
  net_amount: number;
  bank_name: string;
  bank_account: string;
  account_name: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requested_at: string;
  processed_at: string | null;
  rejection_reason: string | null;
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

export default function WalletPage() {
  const t = useTranslations('merchantWallet');

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

  // 提现相关状态
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
  });
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showWithdrawHistory, setShowWithdrawHistory] = useState(false);

  // 辅助：获取友好的类型名称
  const getTypeName = useCallback((type: Transaction['type']) => {
      const map: Record<string, string> = {
          top_up: t('transactionTypes.top_up'),
          commission: t('transactionTypes.commission'),
          withdraw: t('transactionTypes.withdraw'),
          bonus: t('transactionTypes.bonus')
      };
      return map[type] || type;
  }, [t]);

  // 辅助：翻译交易描述（处理套餐名称的国际化）
  const translateDescription = useCallback((description: string): string => {
    if (!description) return '-';

    // 匹配 "Subscription payment: <plan_name>" 格式
    const subscriptionPaymentMatch = description.match(/^Subscription payment:\s*(.+)$/i);
    if (subscriptionPaymentMatch) {
      const planName = subscriptionPaymentMatch[1].trim();
      // 尝试匹配各语言的套餐名称并转换为key
      const planKeyMap: Record<string, string> = {
        // 中文名称映射
        '试用版': 'trial', '基础版': 'basic', '标准版': 'standard',
        '专业版': 'professional', '企业版': 'enterprise',
        // 英文名称映射
        'Trial': 'trial', 'Basic': 'basic', 'Standard': 'standard',
        'Professional': 'professional', 'Enterprise': 'enterprise',
        // 泰语名称映射
        'ทดลองใช้': 'trial', 'พื้นฐาน': 'basic', 'มาตรฐาน': 'standard',
        'มืออาชีพ': 'professional', 'องค์กร': 'enterprise',
        // plan code 映射
        'trial': 'trial', 'basic': 'basic', 'standard': 'standard',
        'professional': 'professional', 'enterprise': 'enterprise',
      };
      const planKey = planKeyMap[planName] || 'basic';
      const localizedPlanName = t(`descriptions.planNames.${planKey}`);
      return `${t('descriptions.subscriptionPayment')}: ${localizedPlanName}`;
    }

    // 匹配 "Subscription reactivation: <plan_name>" 格式
    const reactivationMatch = description.match(/^Subscription reactivation:\s*(.+)$/i);
    if (reactivationMatch) {
      const planName = reactivationMatch[1].trim();
      const planKeyMap: Record<string, string> = {
        '试用版': 'trial', '基础版': 'basic', '标准版': 'standard',
        '专业版': 'professional', '企业版': 'enterprise',
        'Trial': 'trial', 'Basic': 'basic', 'Standard': 'standard',
        'Professional': 'professional', 'Enterprise': 'enterprise',
        'ทดลองใช้': 'trial', 'พื้นฐาน': 'basic', 'มาตรฐาน': 'standard',
        'มืออาชีพ': 'professional', 'องค์กร': 'enterprise',
        'trial': 'trial', 'basic': 'basic', 'standard': 'standard',
        'professional': 'professional', 'enterprise': 'enterprise',
      };
      const planKey = planKeyMap[planName] || 'basic';
      const localizedPlanName = t(`descriptions.planNames.${planKey}`);
      return `${t('descriptions.subscriptionReactivation')}: ${localizedPlanName}`;
    }

    // 匹配 "Withdrawal refund (rejected): ฿xxx" 格式
    const refundMatch = description.match(/^Withdrawal refund \(rejected\):\s*(.+)$/i);
    if (refundMatch) {
      return `${t('descriptions.withdrawalRefund')}: ${refundMatch[1]}`;
    }

    // 其他描述保持原样
    return description;
  }, [t]);

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
                bank_name,
                bank_account_number,
                bank_account_name,
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
                bank_name: merchantData.bank_name,
                bank_account_number: merchantData.bank_account_number,
                bank_account_name: merchantData.bank_account_name,
            });
        } else {
             setMerchant({
                merchant_id: '',
                shop_name: t('unregisteredMerchant'),
                platform_balance: 0,
                is_suspended: true,
                status: 'unregistered',
                merchant_transactions: [],
                bank_name: null,
                bank_account_number: null,
                bank_account_name: null,
             });
        }

    } catch (e: unknown) {
        const postgrestError = e as PostgrestError;
        console.error('Fetch Error:', postgrestError);
        setMessage({ type: 'error', text: t('dataLoadFailed') });
    }
    setLoading(false);
  }, [t]);

  // 获取提现记录
  const fetchWithdrawals = useCallback(async () => {
    try {
      const response = await fetch('/api/merchant/withdraw');
      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data.withdrawals || []);
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchWithdrawals();
  }, [fetchData, fetchWithdrawals]);

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
            setMessage({ type: 'error', text: data.message || t('resumeFailed') });
        }
    } catch (error) {
        console.error("Resume Error", error);
        setMessage({ type: 'error', text: t('networkError') });
    } finally {
        setActionLoadingId(null);
    }
  };

  // --- 取消订单 ---
  const handleCancelTransaction = async (txId: number) => {
    if (!confirm(t('confirmCancel'))) return;

    setActionLoadingId(txId);
    try {
        const response = await fetch('/api/merchant/transaction/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactionId: txId }),
        });
        const data = await response.json();

        if (data.success) {
            setMessage({ type: 'success', text: t('orderCanceled') });
            fetchData();
        } else {
            setMessage({ type: 'error', text: data.message || t('cancelFailed') });
        }
    } catch (error) {
        console.error("Cancel Error", error);
        setMessage({ type: 'error', text: t('networkError') });
    } finally {
        setActionLoadingId(null);
    }
  };

  // --- 充值逻辑 ---
  const handleTopUpSubmit = async () => {
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount < 500) {
      setMessage({ type: 'error', text: t('modal.invalidAmount') });
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
        setMessage({ type: 'error', text: data.message || t('modal.rechargeFailed') });
      }
    } catch (error) {
      console.error('Recharge Initiation Error:', error);
      setMessage({ type: 'error', text: t('modal.networkError') });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifySlip = async () => {
    if (!slipFile || !currentTransaction) {
      setMessage({ type: 'error', text: t('modal.uploadRequired') });
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
        setMessage({ type: 'success', text: t('modal.rechargeSuccess') });
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.message || t('modal.verificationFailed') });
      }
    } catch (error) {
        console.error('Verification Error:', error);
        setMessage({ type: 'error', text: t('modal.verificationNetworkError') });
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

  // 计算提现手续费（2%，最低10泰铢）
  const calculateWithdrawFee = (amount: number): number => {
    const fee = amount * 0.02;
    return Math.max(fee, 10);
  };

  // 提交提现申请
  const handleWithdrawSubmit = async () => {
    const amount = parseFloat(withdrawForm.amount);
    if (isNaN(amount) || amount < 500) {
      setMessage({ type: 'error', text: t('withdraw.invalidAmount') });
      return;
    }

    if (!merchant || amount > merchant.platform_balance) {
      setMessage({ type: 'error', text: t('withdraw.insufficientBalance') });
      return;
    }

    if (!merchant.bank_name || !merchant.bank_account_number || !merchant.bank_account_name) {
      setMessage({ type: 'error', text: t('withdraw.kycRequired') || '请在提现前先完成银行账户KYC认证' });
      return;
    }

    setIsWithdrawing(true);
    setMessage(null);

    try {
      const response = await fetch('/api/merchant/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: withdrawForm.amount,
          bankName: merchant.bank_name,
          accountNumber: merchant.bank_account_number,
          accountName: merchant.bank_account_name,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: t('withdraw.success') });
        setIsWithdrawModalOpen(false);
        setWithdrawForm({ amount: '', bankName: '', accountNumber: '', accountName: '' });
        // 刷新数据
        await Promise.all([fetchData(), fetchWithdrawals()]);
      } else {
        setMessage({ type: 'error', text: data.error || t('withdraw.failed') });
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      setMessage({ type: 'error', text: t('withdraw.failed') });
    } finally {
      setIsWithdrawing(false);
    }
  };

  // 打开提现弹窗
  const openWithdrawModal = () => {
    if (!merchant || merchant.platform_balance < 500) {
      setMessage({ type: 'error', text: t('withdraw.insufficientBalance') });
      return;
    }
    setWithdrawForm({
      ...withdrawForm,
      amount: merchant.platform_balance.toString()
    });
    setIsWithdrawModalOpen(true);
    setMessage(null);
  };

  // 关闭提现弹窗
  const closeWithdrawModal = () => {
    setIsWithdrawModalOpen(false);
    setWithdrawForm({ amount: '', bankName: '', accountNumber: '', accountName: '' });
  };

  // 获取提现状态徽章样式
  const getWithdrawStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'badge-warning';
      case 'processing':
        return 'badge-info';
      case 'completed':
        return 'badge-success';
      case 'rejected':
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-96"><span className="loading loading-spinner loading-lg text-primary"></span></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 flex items-center gap-3">
        <HiWallet className="w-8 h-8 text-primary" /> {t('title')}
      </h1>

      {/* 1. 余额卡片 */}
      <div className="card w-full bg-linear-to-r from-primary to-primary-focus text-primary-content shadow-lg mb-8">
        <div className="card-body p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
                <h2 className="text-lg opacity-80 font-medium">{t('currentBalance')}</h2>
                <p className="text-4xl md:text-5xl font-extrabold my-2 tracking-tight">
                    ฿{merchant?.platform_balance.toFixed(2) || '0.00'}
                </p>
            </div>
            <div className="flex gap-3 mt-4 md:mt-0 w-full md:w-auto">
                <div className="tooltip tooltip-bottom" data-tip={!merchant || merchant.platform_balance < 500 ? t('withdraw.minAmount') : ''}>
                  <button
                      className="btn btn-warning flex-1 md:flex-none shadow-md border-none bg-yellow-400 hover:bg-yellow-500 text-yellow-900"
                      onClick={openWithdrawModal}
                      disabled={!merchant || merchant.platform_balance < 500}
                  >
                      <HiArrowDown className="w-5 h-5" /> {t('withdrawButton')}
                  </button>
                </div>
                <button
                    className="btn btn-secondary flex-1 md:flex-none shadow-md"
                    onClick={() => { resetModal(); setIsTopUpModalOpen(true); }}
                >
                    <HiArrowUp className="w-5 h-5" /> {t('topUpButton')}
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
                {t('transactionHistory')}
            </h2>
        </div>

        {/* 表头 (仅在桌面端显示) */}
        <div className="hidden md:grid grid-cols-12 gap-4 p-4 text-sm font-bold text-base-content/60 border-b border-base-100 bg-base-50/50">
            <div className="col-span-2">{t('table.date')}</div>
            <div className="col-span-4">{t('table.typeDescription')}</div>
            <div className="col-span-2 text-right">{t('table.amount')}</div>
            <div className="col-span-2 text-right">{t('table.balance')}</div>
            <div className="col-span-2 text-center">{t('table.actions')}</div>
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
                              {tx.status === 'pending' && <span className="badge badge-warning badge-xs">{t('status.pending')}</span>}
                              {tx.status === 'failed' && <span className="badge badge-error badge-xs">{t('status.failed')}</span>}
                              {tx.status === 'completed' && <span className="badge badge-success badge-xs">{t('status.completed')}</span>}
                          </div>
                          <p className="text-xs text-base-content/50 truncate pr-2">{translateDescription(tx.description)}</p>
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
                                    data-tip={t('actions.pay')}
                                    onClick={() => handleResumeTransaction(tx)}
                                    disabled={actionLoadingId === tx.id}
                                 >
                                    {actionLoadingId === tx.id ? <span className="loading loading-spinner loading-xs"></span> : <HiQrCode className="w-5 h-5" />}
                                 </button>
                                 <button
                                    className="btn btn-sm btn-circle btn-ghost text-error tooltip tooltip-left"
                                    data-tip={t('actions.cancel')}
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
                                      {tx.status === 'pending' && <span className="badge badge-warning badge-xs">{t('status.pending')}</span>}
                                      {tx.status === 'failed' && <span className="badge badge-error badge-xs">{t('status.failed')}</span>}
                                      {tx.status === 'completed' && <span className="badge badge-success badge-xs">{t('status.completed')}</span>}
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
                                      {actionLoadingId === tx.id ? <span className="loading loading-spinner loading-xs"></span> : t('actions.pay')}
                                  </button>
                                  <button
                                      className="btn btn-sm btn-outline btn-error px-3"
                                      onClick={() => handleCancelTransaction(tx.id)}
                                      disabled={actionLoadingId === tx.id}
                                  >
                                      {t('actions.cancel')}
                                  </button>
                              </div>
                          )}
                      </div>

                      {/* 第三行：描述与余额 */}
                      <div className="flex justify-between items-end pt-2 border-t border-base-100 mt-1">
                          <p className="text-xs text-base-content/50 truncate max-w-[60%]">{translateDescription(tx.description)}</p>
                          <div className="text-xs text-base-content/70">
                              {t('balanceLabel')}: <span className="font-semibold text-base-content">{tx.balance_after !== null ? `฿${tx.balance_after.toFixed(2)}` : '-'}</span>
                          </div>
                      </div>
                  </div>

              </div>
            ))
          ) : (
             <div className="p-8 text-center text-base-content/50 flex flex-col items-center">
                <HiWallet className="w-12 h-12 mb-2 opacity-20" />
                <p>{t('noTransactions')}</p>
             </div>
          )}
        </div>
      </div>

      {/* 2.5 提现记录 */}
      {withdrawals.length > 0 && (
        <div className="bg-base-100 rounded-xl shadow-lg border border-base-200 overflow-hidden mt-6">
          <div className="p-4 md:p-6 border-b border-base-200 bg-base-50 flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                  <HiBanknotes className="w-5 h-5 text-warning"/>
                  {t('withdrawHistory.title')}
              </h2>
          </div>

          <div className="divide-y divide-base-100">
            {withdrawals.map((wd) => (
              <div key={wd.id} className="p-4 hover:bg-base-50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-warning/20 text-warning">
                      <HiArrowDown className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold">฿{wd.amount.toFixed(2)}</div>
                      <div className="text-xs text-base-content/60">
                        {t('withdraw.processingFee')}: ฿{wd.fee.toFixed(2)} → {t('withdraw.actualAmount')}: ฿{wd.net_amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-base-content/70">{wd.bank_name}</div>
                    <span className={`badge ${getWithdrawStatusBadge(wd.status)}`}>
                      {t(`withdrawHistory.${wd.status}`)}
                    </span>
                    <div className="text-xs text-base-content/50">{formatDate(wd.requested_at)}</div>
                  </div>
                </div>
                {wd.rejection_reason && (
                  <div className="mt-2 text-xs text-error bg-error/10 p-2 rounded">
                    {wd.rejection_reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. 充值 Modal */}
      {isTopUpModalOpen && (
        <dialog className="modal modal-open items-center sm:items-center">
          <div className="modal-box w-11/12 max-w-md p-0 overflow-hidden bg-base-100">
            {/* Header */}
            <div className="bg-primary text-primary-content p-4 text-center relative">
                 <h3 className="font-bold text-lg">{t('modal.title')}</h3>
                 <p className="text-xs opacity-80 mt-1">{t('modal.subtitle')}</p>
                 <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 text-white" onClick={resetModal}>✕</button>
            </div>

            <div className="p-6">
                {rechargeStep === 'input' && (
                <>
                    <p className="text-sm text-center mb-6 text-base-content/70">{t('modal.minimumAmount')}</p>
                    <div className="form-control mb-6">
                    <label className="label"><span className="label-text font-semibold">{t('modal.amountLabel')}</span></label>
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
                        {t('modal.confirmButton')}
                    </button>
                </>
                )}

                {rechargeStep === 'payment' && currentTransaction && (
                <div className='flex flex-col items-center text-center'>
                    <div className="text-sm mb-4">{t('modal.pleasePay')} <span className='text-xl font-bold text-primary mx-1'>฿{currentTransaction.amount.toFixed(2)}</span></div>
                    <div className="p-3 bg-white border-2 border-primary/20 rounded-xl shadow-inner mb-4">
                        <QRCode value={currentTransaction.promptpayPayload} size={200} level="M" />
                    </div>
                    <p className='text-xs text-base-content/60 mb-6 px-4'>
                        {t('modal.scanInstruction')}
                    </p>
                    <div className="form-control w-full">
                        <input type="file" accept="image/*" className="file-input file-input-bordered file-input-primary w-full text-sm" onChange={handleFileChange} disabled={isProcessing} />
                        {slipFile && <p className='text-xs text-success mt-2 text-left'>{t('modal.fileSelected')}: {slipFile.name}</p>}
                    </div>
                    <div className="flex gap-3 w-full mt-6">
                        <button className="btn btn-outline flex-1" onClick={() => setRechargeStep('input')} disabled={isProcessing}>{t('modal.backButton')}</button>
                        <button className="btn btn-success flex-1 text-white" onClick={handleVerifySlip} disabled={isProcessing || !slipFile}>
                            {isProcessing ? t('modal.verifying') : t('modal.uploadButton')}
                        </button>
                    </div>
                </div>
                )}

                {(rechargeStep === 'verifying' || rechargeStep === 'result') && (
                <div className='flex flex-col items-center text-center py-4'>
                    {rechargeStep === 'verifying' && (
                        <>
                            <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
                            <p className="font-medium">{t('modal.verifyingSlip')}</p>
                            <p className="text-xs text-base-content/60 mt-1">{t('modal.pleaseWait')}</p>
                        </>
                    )}
                    {rechargeStep === 'result' && message && (
                        <div className={`flex flex-col items-center gap-3 w-full ${message.type === 'success' ? 'text-success' : 'text-error'}`}>
                            {message.type === 'success' ? <HiCheckCircle className="w-16 h-16" /> : <HiXCircle className="w-16 h-16" />}
                            <span className="text-lg font-bold">{message.type === 'success' ? t('modal.successTitle') : t('modal.failedTitle')}</span>
                            <p className="text-sm text-base-content/80">{message.text}</p>
                        </div>
                    )}
                    <div className="w-full mt-8">
                        {message?.type === 'error' ? (
                            <button className="btn btn-warning w-full" onClick={() => setRechargeStep('payment')}>{t('modal.reuploadButton')}</button>
                        ) : (
                            <button className="btn btn-primary w-full" onClick={resetModal} disabled={rechargeStep === 'verifying'}>{t('modal.closeButton')}</button>
                        )}
                    </div>
                </div>
                )}
            </div>
          </div>
        </dialog>
      )}

      {/* 4. 提现 Modal */}
      {isWithdrawModalOpen && (
        <dialog className="modal modal-open items-center sm:items-center">
          <div className="modal-box w-11/12 max-w-md p-0 overflow-hidden bg-base-100">
            {/* Header */}
            <div className="bg-warning text-warning-content p-4 text-center relative">
                 <h3 className="font-bold text-lg">{t('withdraw.title')}</h3>
                 <p className="text-xs opacity-80 mt-1">{t('withdraw.subtitle')}</p>
                 <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={closeWithdrawModal}>✕</button>
            </div>

            <div className="p-6 space-y-4">
              {/* 当前余额 */}
              <div className="alert alert-info">
                <span>{t('withdraw.currentBalance')}: ฿{merchant?.platform_balance.toFixed(2) || '0.00'}</span>
              </div>

              {/* 提现金额 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">{t('withdraw.amount')}</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    className="input input-bordered w-full text-lg font-bold pl-8"
                    value={withdrawForm.amount}
                    min={500}
                    max={merchant?.platform_balance || 0}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                    disabled={isWithdrawing}
                  />
                  <span className="absolute left-3 top-3 text-base-content/50 font-bold">฿</span>
                </div>
                <label className="label">
                  <span className="label-text-alt text-base-content/60">{t('withdraw.minAmount')}</span>
                </label>
              </div>

              {/* 手续费计算 */}
              {withdrawForm.amount && parseFloat(withdrawForm.amount) >= 500 && (
                <div className="bg-base-200 rounded-lg p-3 text-sm">
                  <div className="flex justify-between mb-1">
                    <span>{t('withdraw.processingFee')} (2%)</span>
                    <span>฿{calculateWithdrawFee(parseFloat(withdrawForm.amount)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-success">
                    <span>{t('withdraw.actualAmount')}</span>
                    <span>฿{(parseFloat(withdrawForm.amount) - calculateWithdrawFee(parseFloat(withdrawForm.amount))).toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-base-content/50 mt-2">{t('withdraw.feeNote')}</p>
                </div>
              )}

              {/* 银行信息显示或KYC提示 */}
              {merchant?.bank_name && merchant?.bank_account_number && merchant?.bank_account_name ? (
                <>
                  {/* 银行名称 */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">{t('withdraw.bankName')}</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered bg-base-200"
                      value={merchant.bank_name}
                      disabled
                      readOnly
                    />
                  </div>

                  {/* 银行账号 */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">{t('withdraw.accountNumber')}</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered bg-base-200"
                      value={merchant.bank_account_number}
                      disabled
                      readOnly
                    />
                  </div>

                  {/* 账户名称 */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">{t('withdraw.accountName')}</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered bg-base-200"
                      value={merchant.bank_account_name}
                      disabled
                      readOnly
                    />
                  </div>
                </>
              ) : (
                <div className="alert alert-warning">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{t('withdraw.kycRequired') || '请在提现前先完成银行账户KYC认证'}</span>
                </div>
              )}

              {/* 按钮 */}
              <div className="flex gap-3 pt-4">
                <button className="btn btn-outline flex-1" onClick={closeWithdrawModal} disabled={isWithdrawing}>
                  {t('withdraw.cancel')}
                </button>
                <button
                  className="btn btn-warning flex-1"
                  onClick={handleWithdrawSubmit}
                  disabled={
                    isWithdrawing ||
                    !withdrawForm.amount ||
                    !merchant?.bank_name ||
                    !merchant?.bank_account_number ||
                    !merchant?.bank_account_name ||
                    parseFloat(withdrawForm.amount) < 500 ||
                    parseFloat(withdrawForm.amount) > (merchant?.platform_balance || 0)
                  }
                >
                  {isWithdrawing ? (
                    <>
                      <HiArrowPath className="w-4 h-4 animate-spin" />
                      {t('withdraw.submitting')}
                    </>
                  ) : (
                    t('withdraw.submit')
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="modal-backdrop" onClick={closeWithdrawModal}></div>
        </dialog>
      )}
    </div>
  );
}
