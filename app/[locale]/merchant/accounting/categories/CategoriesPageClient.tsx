// app/[locale]/merchant/accounting/categories/CategoriesPageClient.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import {
  HiArrowLeft,
  HiPlus,
  HiPencil,
  HiTrash,
  HiEye,
  HiEyeSlash
} from 'react-icons/hi2';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  type AccountingCategory,
} from '@/app/actions/accounting/categories';

type Merchant = {
  merchant_id: string;
  shop_name: string;
};

type CategoryWithStats = AccountingCategory & {
  usage_count?: number;
  total_amount?: number;
};

export function CategoriesPageClient() {
  const t = useTranslations('accounting.categories');
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [categories, setCategories] = useState<CategoryWithStats[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // 模态框状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalType, setModalType] = useState<'income' | 'expense'>('income');
  const [editingCategory, setEditingCategory] = useState<CategoryWithStats | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 获取商户信息
  useEffect(() => {
    const loadMerchant = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('merchants')
        .select('merchant_id, shop_name')
        .eq('owner_id', user.id)
        .maybeSingle();

      setMerchant(data);
      setLoading(false);
    };

    loadMerchant();
  }, []);

  // 加载类目列表
  useEffect(() => {
    if (!merchant) return;

    const loadCategories = async () => {
      const result = await getCategories(merchant.merchant_id);
      if (result.success && result.data) {
        setCategories(result.data);
      }
    };

    loadCategories();
  }, [merchant, refreshKey]);

  // 获取类目显示名称
  const getCategoryName = (category: CategoryWithStats) => {
    if (category.custom_name) {
      return category.custom_name;
    }
    if (category.name && typeof category.name === 'object') {
      return (category.name as any)[locale] || (category.name as any).en || (category.name as any).th;
    }
    return 'Unknown';
  };

  // 打开创建类目模态框
  const openCreateModal = (type: 'income' | 'expense') => {
    setModalMode('create');
    setModalType(type);
    setCategoryName('');
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  // 打开编辑类目模态框
  const openEditModal = (category: CategoryWithStats) => {
    setModalMode('edit');
    setModalType(category.type);
    setCategoryName(category.custom_name || '');
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  // 关闭模态框
  const closeModal = () => {
    setIsModalOpen(false);
    setCategoryName('');
    setEditingCategory(null);
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant || !categoryName.trim()) return;

    setSubmitting(true);

    try {
      if (modalMode === 'create') {
        const result = await createCategory({
          merchant_id: merchant.merchant_id,
          name: categoryName.trim(),
          type: modalType,
        });

        if (result.success) {
          alert(t('createSuccess'));
          closeModal();
          setRefreshKey(prev => prev + 1);
        } else {
          alert(result.error || t('createError'));
        }
      } else if (editingCategory) {
        const result = await updateCategory({
          category_id: editingCategory.category_id,
          name: categoryName.trim(),
        });

        if (result.success) {
          alert(t('updateSuccess'));
          closeModal();
          setRefreshKey(prev => prev + 1);
        } else {
          alert(result.error || t('updateError'));
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 删除类目
  const handleDelete = async (category: CategoryWithStats) => {
    if (category.is_system) {
      alert(t('cannotDeleteSystem'));
      return;
    }

    if (!confirm(`${t('deleteConfirm')}\n${t('deleteWarning')}`)) {
      return;
    }

    const result = await deleteCategory({
      category_id: category.category_id,
    });

    if (result.success) {
      alert(t('deleteSuccess'));
      setRefreshKey(prev => prev + 1);
    } else {
      alert(result.error || t('deleteError'));
    }
  };

  // 切换启用/禁用状态
  const handleToggleStatus = async (category: CategoryWithStats) => {
    const newStatus = !category.is_active;
    const result = await toggleCategoryStatus(category.category_id, newStatus);

    if (result.success) {
      alert(newStatus ? t('enableSuccess') : t('disableSuccess'));
      setRefreshKey(prev => prev + 1);
    } else {
      alert(result.error || t('statusUpdateError'));
    }
  };

  // 按类型筛选类目
  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  // 渲染类目列表
  const renderCategoryList = (
    categoriesList: CategoryWithStats[],
    type: 'income' | 'expense'
  ) => {
    if (categoriesList.length === 0) {
      return (
        <div className="text-center py-8 text-base-content/50">
          {t('noCategories')}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {categoriesList.map((category, index) => (
          <div
            key={category.category_id}
            className={`flex items-center justify-between p-4 rounded-lg border ${
              category.is_active
                ? 'bg-base-100 border-base-200'
                : 'bg-base-200/50 border-base-300 opacity-60'
            }`}
          >
            {/* 左侧：序号和名称 */}
            <div className="flex items-center gap-3">
              <div className="text-sm text-base-content/50 font-medium w-6">
                {index + 1}.
              </div>
              <div>
                <div className="font-medium">
                  {getCategoryName(category)}
                  {category.is_system && (
                    <span className="ml-2 badge badge-sm badge-info">
                      {t('systemCategory')}
                    </span>
                  )}
                  {!category.is_active && (
                    <span className="ml-2 badge badge-sm badge-ghost">
                      {t('inactive')}
                    </span>
                  )}
                </div>
                {category.usage_count !== undefined && category.usage_count > 0 && (
                  <div className="text-xs text-base-content/50 mt-1">
                    {t('usageCount')}: {category.usage_count} | {t('totalAmount')}: ฿
                    {category.total_amount?.toFixed(2) || '0.00'}
                  </div>
                )}
              </div>
            </div>

            {/* 右侧：操作按钮 */}
            <div className="flex items-center gap-2">
              {/* 编辑按钮（非系统类目） */}
              {!category.is_system && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => openEditModal(category)}
                  title={t('edit')}
                >
                  <HiPencil className="w-4 h-4" />
                </button>
              )}

              {/* 启用/禁用按钮 */}
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => handleToggleStatus(category)}
                title={category.is_active ? t('disable') : t('enable')}
              >
                {category.is_active ? (
                  <HiEyeSlash className="w-4 h-4" />
                ) : (
                  <HiEye className="w-4 h-4" />
                )}
              </button>

              {/* 删除按钮（非系统类目且未被使用） */}
              {!category.is_system && (
                <button
                  className="btn btn-ghost btn-sm text-error"
                  onClick={() => handleDelete(category)}
                  title={t('delete')}
                >
                  <HiTrash className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="alert alert-warning">
          <span>{t('noMerchant')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 p-4 md:p-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-4">
        <Link
          href="/merchant/accounting"
          className="btn btn-ghost btn-circle"
        >
          <HiArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-base-content/70 mt-1">{merchant.shop_name}</p>
        </div>
      </div>

      {/* 收入类目 */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <h2 className="card-title text-success">
              {t('incomeCategories')}
            </h2>
            <button
              className="btn btn-success btn-sm"
              onClick={() => openCreateModal('income')}
            >
              <HiPlus className="w-4 h-4" />
              {t('addIncomeCategory')}
            </button>
          </div>
          {renderCategoryList(incomeCategories, 'income')}
        </div>
      </div>

      {/* 支出类目 */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <h2 className="card-title text-error">
              {t('expenseCategories')}
            </h2>
            <button
              className="btn btn-error btn-sm"
              onClick={() => openCreateModal('expense')}
            >
              <HiPlus className="w-4 h-4" />
              {t('addExpenseCategory')}
            </button>
          </div>
          {renderCategoryList(expenseCategories, 'expense')}
        </div>
      </div>

      {/* 添加/编辑类目模态框 */}
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {modalMode === 'create' ? t('addCategory') : t('editCategory')}
            </h3>

            <form onSubmit={handleSubmit}>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">{t('categoryName')}</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  placeholder={t('categoryNamePlaceholder')}
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !categoryName.trim()}
                >
                  {submitting ? (
                    <span className="loading loading-spinner"></span>
                  ) : (
                    t('confirm')
                  )}
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={closeModal}>close</button>
          </form>
        </div>
      )}
    </div>
  );
}
