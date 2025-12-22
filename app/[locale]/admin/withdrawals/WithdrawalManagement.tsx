// 文件: app/[locale]/admin/withdrawals/WithdrawalManagement.tsx
"use client";

import { useState } from "react";
import {
  HiMagnifyingGlass,
  HiBanknotes,
  HiClock,
  HiCheckCircle,
  HiXCircle,
  HiArrowPath,
  HiEye,
  HiClipboardDocumentCheck,
  HiExclamationTriangle,
  HiGift,
  HiBuildingStorefront,
} from "react-icons/hi2";

type UserInfo = {
  id: string;
  email: string | null;
  full_name: string | null;
  referral_balance: number;
};

type Withdrawal = {
  id: string;
  user_id: string;
  amount: number;
  bank_name: string | null;
  bank_account: string | null;
  account_name: string | null;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requested_at: string;
  processed_at: string | null;
  admin_note: string | null;
  processed_by: string | null;
  user: UserInfo | null;
};

type MerchantInfo = {
  merchant_id: string;
  shop_name: string;
  owner_id: string;
};

type MerchantWithdrawal = {
  id: string;
  merchant_id: string;
  amount: number;
  fee: number;
  net_amount: number;
  bank_name: string;
  bank_account: string;
  account_name: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requested_at: string;
  processed_at: string | null;
  admin_note: string | null;
  rejection_reason: string | null;
  processed_by: string | null;
  merchants: MerchantInfo | null;
};

type Stats = {
  pendingCount: number;
  pendingAmount: number;
  processingCount: number;
  completedCount: number;
  completedAmount: number;
};

interface WithdrawalManagementProps {
  initialWithdrawals: Withdrawal[];
  initialMerchantWithdrawals?: MerchantWithdrawal[];
  stats: Stats;
  merchantStats?: Stats;
}

export default function WithdrawalManagement({
  initialWithdrawals,
  initialMerchantWithdrawals = [],
  stats,
  merchantStats = { pendingCount: 0, pendingAmount: 0, processingCount: 0, completedCount: 0, completedAmount: 0 }
}: WithdrawalManagementProps) {
  const [activeTab, setActiveTab] = useState<'referral' | 'merchant'>('referral');
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>(initialWithdrawals);
  const [merchantWithdrawals, setMerchantWithdrawals] = useState<MerchantWithdrawal[]>(initialMerchantWithdrawals);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [selectedMerchantWithdrawal, setSelectedMerchantWithdrawal] = useState<MerchantWithdrawal | null>(null);
  const [processingAction, setProcessingAction] = useState<'approve' | 'reject' | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  // 搜索和过滤 - 推荐提现
  const filteredWithdrawals = withdrawals.filter((w) => {
    const matchesSearch =
      w.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.bank_account?.includes(searchTerm) ||
      w.account_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === "all" || w.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // 搜索和过滤 - 商户提现
  const filteredMerchantWithdrawals = merchantWithdrawals.filter((w) => {
    const matchesSearch =
      w.merchants?.shop_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.bank_account?.includes(searchTerm) ||
      w.account_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === "all" || w.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // 当前活跃的统计数据
  const currentStats = activeTab === 'referral' ? stats : merchantStats;
  const currentTotal = activeTab === 'referral' ? withdrawals.length : merchantWithdrawals.length;

  // 状态徽章
  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { text: "待处理", color: "badge-warning", icon: <HiClock className="w-4 h-4" /> },
      processing: { text: "处理中", color: "badge-info", icon: <HiArrowPath className="w-4 h-4" /> },
      completed: { text: "已完成", color: "badge-success", icon: <HiCheckCircle className="w-4 h-4" /> },
      rejected: { text: "已拒绝", color: "badge-error", icon: <HiXCircle className="w-4 h-4" /> },
    };
    const badge = badges[status as keyof typeof badges] || badges.pending;

    return (
      <div className={`badge ${badge.color} gap-1`}>
        {badge.icon}
        {badge.text}
      </div>
    );
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 处理提现（批准或拒绝）
  const handleProcessWithdrawal = async (action: 'approve' | 'reject') => {
    if (!selectedWithdrawal) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/withdrawals/${selectedWithdrawal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          admin_note: adminNote,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "处理失败");
      }

      const updatedWithdrawal = await response.json();
      setWithdrawals(withdrawals.map(w =>
        w.id === selectedWithdrawal.id ? { ...w, ...updatedWithdrawal } : w
      ));

      alert(action === 'approve' ? "提现已批准" : "提现已拒绝");
      setSelectedWithdrawal(null);
      setProcessingAction(null);
      setAdminNote("");
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      alert(error instanceof Error ? error.message : "处理失败");
    } finally {
      setLoading(false);
    }
  };

  // 处理商户提现（批准或拒绝）
  const handleProcessMerchantWithdrawal = async (action: 'approve' | 'reject') => {
    if (!selectedMerchantWithdrawal) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/merchant-withdrawals/${selectedMerchantWithdrawal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          adminNote,
          rejectionReason: action === 'reject' ? rejectionReason : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "处理失败");
      }

      // 更新本地状态
      setMerchantWithdrawals(merchantWithdrawals.map(w =>
        w.id === selectedMerchantWithdrawal.id
          ? { ...w, status: action === 'approve' ? 'completed' : 'rejected' }
          : w
      ));

      alert(action === 'approve' ? "商户提现已批准" : "商户提现已拒绝");
      setSelectedMerchantWithdrawal(null);
      setProcessingAction(null);
      setAdminNote("");
      setRejectionReason("");
    } catch (error) {
      console.error("Error processing merchant withdrawal:", error);
      alert(error instanceof Error ? error.message : "处理失败");
    } finally {
      setLoading(false);
    }
  };

  // 批量处理待审核项目
  const handleBatchProcess = async () => {
    const pendingIds = activeTab === 'referral'
      ? filteredWithdrawals.filter(w => w.status === 'pending').map(w => w.id)
      : filteredMerchantWithdrawals.filter(w => w.status === 'pending').map(w => w.id);

    if (pendingIds.length === 0) {
      alert("没有待处理的提现申请");
      return;
    }

    if (!confirm(`确定要批量处理 ${pendingIds.length} 个提现申请吗？`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/withdrawals/batch', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: 'processing',
          ids: pendingIds,
        }),
      });

      if (!response.ok) {
        throw new Error("批量处理失败");
      }

      // 刷新页面
      window.location.reload();
    } catch (error) {
      console.error("Error batch processing:", error);
      alert("批量处理失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">提现审核管理</h1>
      </div>

      {/* 选项卡切换 */}
      <div className="tabs tabs-boxed mb-6 bg-base-200 p-1">
        <button
          className={`tab gap-2 ${activeTab === 'referral' ? 'tab-active bg-primary text-primary-content' : ''}`}
          onClick={() => { setActiveTab('referral'); setSearchTerm(''); setFilterStatus('all'); }}
        >
          <HiGift className="w-4 h-4" />
          推荐返利提现
          {stats.pendingCount > 0 && (
            <span className="badge badge-warning badge-sm">{stats.pendingCount}</span>
          )}
        </button>
        <button
          className={`tab gap-2 ${activeTab === 'merchant' ? 'tab-active bg-primary text-primary-content' : ''}`}
          onClick={() => { setActiveTab('merchant'); setSearchTerm(''); setFilterStatus('all'); }}
        >
          <HiBuildingStorefront className="w-4 h-4" />
          商户钱包提现
          {merchantStats.pendingCount > 0 && (
            <span className="badge badge-warning badge-sm">{merchantStats.pendingCount}</span>
          )}
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat bg-warning/10 rounded-box">
          <div className="stat-figure text-warning">
            <HiClock className="w-8 h-8" />
          </div>
          <div className="stat-title">待处理</div>
          <div className="stat-value text-warning">{currentStats.pendingCount}</div>
          <div className="stat-desc">฿{currentStats.pendingAmount.toFixed(0)} 待审批</div>
        </div>

        <div className="stat bg-info/10 rounded-box">
          <div className="stat-figure text-info">
            <HiArrowPath className="w-8 h-8" />
          </div>
          <div className="stat-title">处理中</div>
          <div className="stat-value text-info">{currentStats.processingCount}</div>
          <div className="stat-desc">正在处理转账</div>
        </div>

        <div className="stat bg-success/10 rounded-box">
          <div className="stat-figure text-success">
            <HiCheckCircle className="w-8 h-8" />
          </div>
          <div className="stat-title">已完成</div>
          <div className="stat-value text-success">{currentStats.completedCount}</div>
          <div className="stat-desc">฿{currentStats.completedAmount.toFixed(0)} 已发放</div>
        </div>

        <div className="stat bg-base-100 rounded-box shadow">
          <div className="stat-figure text-primary">
            <HiBanknotes className="w-8 h-8" />
          </div>
          <div className="stat-title">总申请数</div>
          <div className="stat-value">{currentTotal}</div>
          <div className="stat-desc">累计提现申请</div>
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
                  placeholder={activeTab === 'referral' ? "搜索用户（邮箱、姓名、银行账户）" : "搜索商户（店铺名、银行账户）"}
                  className="input input-bordered w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* 状态筛选 */}
            <select
              className="select select-bordered w-full md:w-48"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">所有状态</option>
              <option value="pending">待处理</option>
              <option value="processing">处理中</option>
              <option value="completed">已完成</option>
              <option value="rejected">已拒绝</option>
            </select>

            {/* 批量操作 */}
            <button
              className="btn btn-primary gap-2"
              onClick={handleBatchProcess}
              disabled={loading || currentStats.pendingCount === 0}
            >
              <HiClipboardDocumentCheck className="w-5 h-5" />
              批量标记处理中
            </button>
          </div>
        </div>
      </div>

      {/* 提现列表 */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>{activeTab === 'referral' ? '申请人' : '商户'}</th>
                  <th>金额</th>
                  <th>银行信息</th>
                  <th>状态</th>
                  <th>申请时间</th>
                  <th className="text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {/* 推荐返利提现列表 */}
                {activeTab === 'referral' && (
                  filteredWithdrawals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-base-content/60">
                        暂无提现申请
                      </td>
                    </tr>
                  ) : (
                    filteredWithdrawals.map((withdrawal) => (
                      <tr key={withdrawal.id}>
                        <td>
                          <div>
                            <div className="font-bold">
                              {withdrawal.user?.full_name || withdrawal.user?.email || "未知用户"}
                            </div>
                            <div className="text-sm opacity-50">
                              {withdrawal.user?.email}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="font-bold text-lg text-success">
                            ฿{parseFloat(String(withdrawal.amount)).toFixed(0)}
                          </div>
                        </td>
                        <td>
                          <div className="text-sm">
                            <div className="font-medium">{withdrawal.bank_name || "-"}</div>
                            <div className="opacity-70">{withdrawal.bank_account || "-"}</div>
                            <div className="opacity-50">{withdrawal.account_name || "-"}</div>
                          </div>
                        </td>
                        <td>
                          {getStatusBadge(withdrawal.status)}
                          {withdrawal.admin_note && (
                            <div className="text-xs opacity-50 mt-1 max-w-[150px] truncate" title={withdrawal.admin_note}>
                              备注: {withdrawal.admin_note}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="text-sm">{formatDate(withdrawal.requested_at)}</div>
                          {withdrawal.processed_at && (
                            <div className="text-xs opacity-50">处理: {formatDate(withdrawal.processed_at)}</div>
                          )}
                        </td>
                        <td>
                          <div className="flex gap-2 justify-center">
                            <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedWithdrawal(withdrawal); setProcessingAction(null); }} title="查看详情">
                              <HiEye className="w-4 h-4" />
                            </button>
                            {withdrawal.status === 'pending' && (
                              <>
                                <button className="btn btn-success btn-sm" onClick={() => { setSelectedWithdrawal(withdrawal); setProcessingAction('approve'); }} disabled={loading} title="批准">
                                  <HiCheckCircle className="w-4 h-4" />
                                </button>
                                <button className="btn btn-error btn-sm" onClick={() => { setSelectedWithdrawal(withdrawal); setProcessingAction('reject'); }} disabled={loading} title="拒绝">
                                  <HiXCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {withdrawal.status === 'processing' && (
                              <button className="btn btn-success btn-sm" onClick={() => { setSelectedWithdrawal(withdrawal); setProcessingAction('approve'); }} disabled={loading} title="标记完成">
                                <HiCheckCircle className="w-4 h-4" /> 完成
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )
                )}

                {/* 商户钱包提现列表 */}
                {activeTab === 'merchant' && (
                  filteredMerchantWithdrawals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-base-content/60">
                        暂无商户提现申请
                      </td>
                    </tr>
                  ) : (
                    filteredMerchantWithdrawals.map((withdrawal) => (
                      <tr key={withdrawal.id}>
                        <td>
                          <div>
                            <div className="font-bold flex items-center gap-2">
                              <HiBuildingStorefront className="w-4 h-4 text-primary" />
                              {withdrawal.merchants?.shop_name || "未知商户"}
                            </div>
                            <div className="text-sm opacity-50">
                              ID: {withdrawal.merchant_id}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="font-bold text-lg text-success">
                            ฿{parseFloat(String(withdrawal.amount)).toFixed(0)}
                          </div>
                          <div className="text-xs opacity-50">
                            手续费: ฿{parseFloat(String(withdrawal.fee)).toFixed(0)} → 到账: ฿{parseFloat(String(withdrawal.net_amount)).toFixed(0)}
                          </div>
                        </td>
                        <td>
                          <div className="text-sm">
                            <div className="font-medium">{withdrawal.bank_name || "-"}</div>
                            <div className="opacity-70">{withdrawal.bank_account || "-"}</div>
                            <div className="opacity-50">{withdrawal.account_name || "-"}</div>
                          </div>
                        </td>
                        <td>
                          {getStatusBadge(withdrawal.status)}
                          {withdrawal.rejection_reason && (
                            <div className="text-xs text-error mt-1 max-w-[150px] truncate" title={withdrawal.rejection_reason}>
                              原因: {withdrawal.rejection_reason}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="text-sm">{formatDate(withdrawal.requested_at)}</div>
                          {withdrawal.processed_at && (
                            <div className="text-xs opacity-50">处理: {formatDate(withdrawal.processed_at)}</div>
                          )}
                        </td>
                        <td>
                          <div className="flex gap-2 justify-center">
                            <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedMerchantWithdrawal(withdrawal); setProcessingAction(null); }} title="查看详情">
                              <HiEye className="w-4 h-4" />
                            </button>
                            {withdrawal.status === 'pending' && (
                              <>
                                <button className="btn btn-success btn-sm" onClick={() => { setSelectedMerchantWithdrawal(withdrawal); setProcessingAction('approve'); }} disabled={loading} title="批准">
                                  <HiCheckCircle className="w-4 h-4" />
                                </button>
                                <button className="btn btn-error btn-sm" onClick={() => { setSelectedMerchantWithdrawal(withdrawal); setProcessingAction('reject'); }} disabled={loading} title="拒绝">
                                  <HiXCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {withdrawal.status === 'processing' && (
                              <button className="btn btn-success btn-sm" onClick={() => { setSelectedMerchantWithdrawal(withdrawal); setProcessingAction('approve'); }} disabled={loading} title="标记完成">
                                <HiCheckCircle className="w-4 h-4" /> 完成
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 详情/处理模态框 */}
      {selectedWithdrawal && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg mb-4">
              {processingAction === 'approve' ? '批准提现' :
               processingAction === 'reject' ? '拒绝提现' : '提现详情'}
            </h3>

            <div className="space-y-4">
              {/* 基本信息 */}
              <div className="bg-base-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-base-content/60">申请人</div>
                    <div className="font-medium">
                      {selectedWithdrawal.user?.full_name || selectedWithdrawal.user?.email}
                    </div>
                  </div>
                  <div>
                    <div className="text-base-content/60">提现金额</div>
                    <div className="font-bold text-success text-lg">
                      ฿{parseFloat(String(selectedWithdrawal.amount)).toFixed(0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-base-content/60">当前余额</div>
                    <div className="font-medium">
                      ฿{selectedWithdrawal.user?.referral_balance?.toFixed(0) || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-base-content/60">状态</div>
                    {getStatusBadge(selectedWithdrawal.status)}
                  </div>
                </div>
              </div>

              {/* 银行信息 */}
              <div className="bg-base-200 rounded-lg p-4">
                <h4 className="font-medium mb-2">银行信息</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-base-content/60">银行名称</span>
                    <span className="font-medium">{selectedWithdrawal.bank_name || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/60">账户号码</span>
                    <span className="font-mono">{selectedWithdrawal.bank_account || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/60">账户名</span>
                    <span className="font-medium">{selectedWithdrawal.account_name || "-"}</span>
                  </div>
                </div>
              </div>

              {/* 时间信息 */}
              <div className="text-sm text-base-content/60">
                <div>申请时间: {formatDate(selectedWithdrawal.requested_at)}</div>
                {selectedWithdrawal.processed_at && (
                  <div>处理时间: {formatDate(selectedWithdrawal.processed_at)}</div>
                )}
              </div>

              {/* 处理操作 */}
              {processingAction && (
                <>
                  <div className="divider"></div>

                  {processingAction === 'reject' && (
                    <div className="alert alert-warning">
                      <HiExclamationTriangle className="w-5 h-5" />
                      <span>拒绝后，提现金额将退还到用户余额</span>
                    </div>
                  )}

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">管理员备注</span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered"
                      placeholder={processingAction === 'approve'
                        ? "可选：填写转账备注（如转账流水号）"
                        : "必填：填写拒绝原因"}
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="modal-action">
              <button
                className="btn"
                onClick={() => {
                  setSelectedWithdrawal(null);
                  setProcessingAction(null);
                  setAdminNote("");
                }}
              >
                {processingAction ? '取消' : '关闭'}
              </button>

              {processingAction === 'approve' && (
                <button
                  className="btn btn-success"
                  onClick={() => handleProcessWithdrawal('approve')}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <>
                      <HiCheckCircle className="w-4 h-4" />
                      确认批准
                    </>
                  )}
                </button>
              )}

              {processingAction === 'reject' && (
                <button
                  className="btn btn-error"
                  onClick={() => handleProcessWithdrawal('reject')}
                  disabled={loading || !adminNote.trim()}
                >
                  {loading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <>
                      <HiXCircle className="w-4 h-4" />
                      确认拒绝
                    </>
                  )}
                </button>
              )}

              {!processingAction && selectedWithdrawal.status === 'pending' && (
                <>
                  <button
                    className="btn btn-success"
                    onClick={() => setProcessingAction('approve')}
                  >
                    <HiCheckCircle className="w-4 h-4" />
                    批准
                  </button>
                  <button
                    className="btn btn-error"
                    onClick={() => setProcessingAction('reject')}
                  >
                    <HiXCircle className="w-4 h-4" />
                    拒绝
                  </button>
                </>
              )}
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => {
              setSelectedWithdrawal(null);
              setProcessingAction(null);
              setAdminNote("");
            }}>close</button>
          </form>
        </dialog>
      )}

      {/* 商户提现详情/处理模态框 */}
      {selectedMerchantWithdrawal && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg mb-4">
              {processingAction === 'approve' ? '批准商户提现' :
               processingAction === 'reject' ? '拒绝商户提现' : '商户提现详情'}
            </h3>

            <div className="space-y-4">
              {/* 商户信息 */}
              <div className="bg-base-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-base-content/60">商户</div>
                    <div className="font-medium flex items-center gap-2">
                      <HiBuildingStorefront className="w-4 h-4 text-primary" />
                      {selectedMerchantWithdrawal.merchants?.shop_name || "未知商户"}
                    </div>
                  </div>
                  <div>
                    <div className="text-base-content/60">提现金额</div>
                    <div className="font-bold text-success text-lg">
                      ฿{parseFloat(String(selectedMerchantWithdrawal.amount)).toFixed(0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-base-content/60">手续费</div>
                    <div className="font-medium">
                      ฿{parseFloat(String(selectedMerchantWithdrawal.fee)).toFixed(0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-base-content/60">实际到账</div>
                    <div className="font-bold text-primary">
                      ฿{parseFloat(String(selectedMerchantWithdrawal.net_amount)).toFixed(0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* 银行信息 */}
              <div className="bg-base-200 rounded-lg p-4">
                <h4 className="font-medium mb-2">银行信息</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-base-content/60">银行名称</span>
                    <span className="font-medium">{selectedMerchantWithdrawal.bank_name || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/60">账户号码</span>
                    <span className="font-mono">{selectedMerchantWithdrawal.bank_account || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/60">账户名</span>
                    <span className="font-medium">{selectedMerchantWithdrawal.account_name || "-"}</span>
                  </div>
                </div>
              </div>

              {/* 时间和状态 */}
              <div className="text-sm text-base-content/60">
                <div className="flex items-center gap-2">
                  <span>状态:</span>
                  {getStatusBadge(selectedMerchantWithdrawal.status)}
                </div>
                <div>申请时间: {formatDate(selectedMerchantWithdrawal.requested_at)}</div>
                {selectedMerchantWithdrawal.processed_at && (
                  <div>处理时间: {formatDate(selectedMerchantWithdrawal.processed_at)}</div>
                )}
              </div>

              {/* 处理操作 */}
              {processingAction && (
                <>
                  <div className="divider"></div>

                  {processingAction === 'reject' && (
                    <>
                      <div className="alert alert-warning">
                        <HiExclamationTriangle className="w-5 h-5" />
                        <span>拒绝后，提现金额将退还到商户钱包余额</span>
                      </div>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">拒绝原因 *</span>
                        </label>
                        <textarea
                          className="textarea textarea-bordered"
                          placeholder="请填写拒绝原因（必填）"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={2}
                        />
                      </div>
                    </>
                  )}

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">管理员备注</span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered"
                      placeholder={processingAction === 'approve' ? "可选：填写转账备注（如转账流水号）" : "可选：填写额外备注"}
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      rows={2}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="modal-action">
              <button
                className="btn"
                onClick={() => {
                  setSelectedMerchantWithdrawal(null);
                  setProcessingAction(null);
                  setAdminNote("");
                  setRejectionReason("");
                }}
              >
                {processingAction ? '取消' : '关闭'}
              </button>

              {processingAction === 'approve' && (
                <button
                  className="btn btn-success"
                  onClick={() => handleProcessMerchantWithdrawal('approve')}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <>
                      <HiCheckCircle className="w-4 h-4" />
                      确认批准
                    </>
                  )}
                </button>
              )}

              {processingAction === 'reject' && (
                <button
                  className="btn btn-error"
                  onClick={() => handleProcessMerchantWithdrawal('reject')}
                  disabled={loading || !rejectionReason.trim()}
                >
                  {loading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <>
                      <HiXCircle className="w-4 h-4" />
                      确认拒绝
                    </>
                  )}
                </button>
              )}

              {!processingAction && selectedMerchantWithdrawal.status === 'pending' && (
                <>
                  <button
                    className="btn btn-success"
                    onClick={() => setProcessingAction('approve')}
                  >
                    <HiCheckCircle className="w-4 h-4" />
                    批准
                  </button>
                  <button
                    className="btn btn-error"
                    onClick={() => setProcessingAction('reject')}
                  >
                    <HiXCircle className="w-4 h-4" />
                    拒绝
                  </button>
                </>
              )}
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => {
              setSelectedMerchantWithdrawal(null);
              setProcessingAction(null);
              setAdminNote("");
              setRejectionReason("");
            }}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
