// components/subscription/InvoiceList.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { getSubscriptionInvoices } from '@/app/actions/subscriptions';
import type { SubscriptionInvoice } from '@/app/types/subscription';
import { FileText, Download, AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';

interface InvoiceListProps {
  merchantId: string;
  limit?: number;
}

export function InvoiceList({ merchantId, limit = 10 }: InvoiceListProps) {
  const t = useTranslations('subscription');
  const locale = useLocale();
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvoices() {
      try {
        setLoading(true);
        const result = await getSubscriptionInvoices(merchantId, limit);

        if (result.success && result.data) {
          setInvoices(result.data);
        } else {
          setError(result.error || 'Failed to load invoices');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchInvoices();
  }, [merchantId, limit]);

  const getStatusIcon = (status: SubscriptionInvoice['status']) => {
    switch (status) {
      case 'paid':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'refunded':
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: SubscriptionInvoice['status']) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">{t('loadingInvoices')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle className="w-5 h-5" />
          <span>{t('errorLoadingInvoices')}: {error}</span>
        </div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">{t('noInvoices')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {invoices.map((invoice) => (
        <div
          key={invoice.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            {/* Left side - Invoice info */}
            <div className="flex items-start gap-3 flex-1">
              {getStatusIcon(invoice.status)}

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900">
                    {t('invoice')} #{invoice.id.slice(0, 8)}
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}
                  >
                    {t(`invoiceStatus.${invoice.status}`)}
                  </span>
                </div>

                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    {t('billingPeriod')}: {formatDate(invoice.period_start)} -{' '}
                    {formatDate(invoice.period_end)}
                  </p>
                  {invoice.paid_at && (
                    <p>
                      {t('paidAt')}: {formatDate(invoice.paid_at)}
                    </p>
                  )}
                  {invoice.failure_reason && (
                    <p className="text-red-600">
                      {t('failureReason')}: {invoice.failure_reason}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right side - Amount */}
            <div className="text-right ml-4">
              <div className="text-2xl font-bold text-gray-900">
                ฿{invoice.amount.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {invoice.payment_method === 'wallet' ? t('fromWallet') : invoice.payment_method}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {invoice.status === 'paid' && (
            <div className="mt-3 pt-3 border-t flex gap-2">
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                <Download className="w-4 h-4" />
                {t('downloadReceipt')}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
