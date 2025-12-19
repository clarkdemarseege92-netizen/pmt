// app/[locale]/merchant/accounting/components/TransactionList.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { queryTransactions } from '@/app/actions/accounting/transactions';
import { deleteManualTransaction } from '@/app/actions/accounting/transactions';
import type { TransactionFiltersType } from '../AccountingPageClient';
import type { AccountTransactionWithCategory } from '@/app/types/accounting';
import { HiPencil, HiTrash, HiLockClosed } from 'react-icons/hi2';
import { EditTransactionModal } from './EditTransactionModal';

type TransactionListProps = {
  merchantId: string;
  filters: TransactionFiltersType;
  refreshKey: number;
  onTransactionUpdated: () => void;
};

export function TransactionList({
  merchantId,
  filters,
  refreshKey,
  onTransactionUpdated,
}: TransactionListProps) {
  const t = useTranslations('accounting');
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<AccountTransactionWithCategory[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<AccountTransactionWithCategory | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 获取类目显示名称
  const getCategoryName = (category: any) => {
    if (!category) return '-';
    // 优先使用 custom_name（自定义类目）
    if (category.custom_name) {
      return category.custom_name;
    }
    // 使用 name 的国际化版本（系统类目）
    if (category.name && typeof category.name === 'object') {
      return category.name[locale as 'th' | 'zh' | 'en'] || category.name.en || category.name.th;
    }
    return '-';
  };

  useEffect(() => {
    const loadTransactions = async () => {
      setLoading(true);
      const result = await queryTransactions({
        merchant_id: merchantId,
        ...filters,
        limit: 50,
      });

      if (result.success && result.data) {
        setTransactions(result.data);
      }
      setLoading(false);
    };

    loadTransactions();
  }, [merchantId, filters, refreshKey]);

  const handleDelete = async (transactionId: string) => {
    if (!confirm(t('confirmDelete'))) return;

    setDeletingId(transactionId);
    const result = await deleteManualTransaction({ transaction_id: transactionId });

    if (result.success) {
      onTransactionUpdated();
    } else {
      alert(result.error || t('deleteError'));
    }
    setDeletingId(null);
  };

  const handleEditSuccess = () => {
    setEditingTransaction(null);
    onTransactionUpdated();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <div className="flex items-center justify-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <div className="text-center py-12">
            <p className="text-base-content/50 text-lg">{t('noTransactions')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card bg-base-100 shadow-md">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>{t('table.date')}</th>
                  <th>{t('table.type')}</th>
                  <th>{t('table.category')}</th>
                  <th>{t('table.source')}</th>
                  <th>{t('table.amount')}</th>
                  <th>{t('table.note')}</th>
                  <th>{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.transaction_id}>
                    <td className="whitespace-nowrap">
                      {formatDate(tx.transaction_date)}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          tx.type === 'income' ? 'badge-success' : 'badge-error'
                        }`}
                      >
                        {t(tx.type)}
                      </span>
                    </td>
                    <td>
                      {getCategoryName(tx.category)}
                    </td>
                    <td>
                      <span className="badge badge-outline">
                        {t(`source.${tx.source}`)}
                      </span>
                    </td>
                    <td
                      className={`font-semibold ${
                        tx.type === 'income' ? 'text-success' : 'text-error'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="max-w-xs truncate">
                      {tx.note || '-'}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {tx.is_editable ? (
                          <>
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => setEditingTransaction(tx)}
                              title={t('edit')}
                            >
                              <HiPencil className="w-4 h-4" />
                            </button>
                            <button
                              className="btn btn-ghost btn-xs text-error"
                              onClick={() => handleDelete(tx.transaction_id)}
                              disabled={deletingId === tx.transaction_id}
                              title={t('delete')}
                            >
                              {deletingId === tx.transaction_id ? (
                                <span className="loading loading-spinner loading-xs"></span>
                              ) : (
                                <HiTrash className="w-4 h-4" />
                              )}
                            </button>
                          </>
                        ) : (
                          <div
                            className="tooltip"
                            data-tip={t('cannotEdit')}
                          >
                            <HiLockClosed className="w-4 h-4 text-base-content/30" />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editingTransaction && (
        <EditTransactionModal
          merchantId={merchantId}
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
}
