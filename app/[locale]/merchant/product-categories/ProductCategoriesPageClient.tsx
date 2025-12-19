// app/[locale]/merchant/product-categories/ProductCategoriesPageClient.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';
import { HiPlus, HiArrowLeft } from 'react-icons/hi2';
import { Link } from '@/i18n/routing';
import { CategoryList } from './components/CategoryList';
import { CategoryFormModalWithDictionary } from './components/CategoryFormModal_with_Dictionary';
import { DeleteCategoryModal } from './components/DeleteCategoryModal';
import { getMerchantCategoryStats, getUncategorizedProductsCount } from '@/app/actions/merchant-categories/merchant-categories';
import type { CategoryStats } from '@/app/actions/merchant-categories/merchant-categories';

type Merchant = {
  merchant_id: string;
  shop_name: string;
};

export function ProductCategoriesPageClient() {
  const t = useTranslations('productCategories');
  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [categories, setCategories] = useState<CategoryStats[]>([]);
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryStats | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CategoryStats | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // 加载商户信息
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

  // 加载分类数据
  useEffect(() => {
    if (!merchant) return;

    const loadCategories = async () => {
      // 并行加载分类统计和未分类商品数量
      const [statsResult, uncategorizedResult] = await Promise.all([
        getMerchantCategoryStats(merchant.merchant_id),
        getUncategorizedProductsCount(merchant.merchant_id)
      ]);

      if (statsResult.success) {
        setCategories(statsResult.data);
      }

      if (uncategorizedResult.success) {
        setUncategorizedCount(uncategorizedResult.count);
      }
    };

    loadCategories();
  }, [merchant, refreshKey]);

  const handleCategoryUpdated = () => {
    setRefreshKey(prev => prev + 1);
    setShowAddModal(false);
    setEditingCategory(null);
  };

  const handleCategoryDeleted = () => {
    setRefreshKey(prev => prev + 1);
    setDeletingCategory(null);
  };

  const handleEditCategory = (category: CategoryStats) => {
    setEditingCategory(category);
  };

  const handleDeleteCategory = (category: CategoryStats) => {
    setDeletingCategory(category);
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
      {/* 页面标题和操作 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/merchant/products" className="btn btn-ghost btn-sm btn-circle">
            <HiArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-base-content/70 mt-1">{merchant.shop_name}</p>
          </div>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowAddModal(true)}
        >
          <HiPlus className="w-5 h-5" />
          {t('addCategory')}
        </button>
      </div>

      {/* 未分类商品提示 */}
      {uncategorizedCount > 0 && (
        <div className="alert alert-warning">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>
            {t('uncategorizedWarning', { count: uncategorizedCount })}
          </span>
          <Link href="/merchant/products" className="btn btn-sm btn-ghost">
            {t('goToProducts')}
          </Link>
        </div>
      )}

      {/* 分类列表 */}
      <CategoryList
        categories={categories}
        onEdit={handleEditCategory}
        onDelete={handleDeleteCategory}
        onReorder={handleCategoryUpdated}
        merchantId={merchant.merchant_id}
      />

      {/* 空状态 */}
      {categories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-base-content/60 mb-4">{t('noCategories')}</p>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <HiPlus className="w-5 h-5" />
            {t('createFirstCategory')}
          </button>
        </div>
      )}

      {/* 添加分类弹窗（字典版本） */}
      {showAddModal && (
        <CategoryFormModalWithDictionary
          merchantId={merchant.merchant_id}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleCategoryUpdated}
        />
      )}

      {/* 编辑分类弹窗（字典版本） */}
      {editingCategory && (
        <CategoryFormModalWithDictionary
          merchantId={merchant.merchant_id}
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
          onSuccess={handleCategoryUpdated}
        />
      )}

      {/* 删除确认弹窗 */}
      {deletingCategory && (
        <DeleteCategoryModal
          category={deletingCategory}
          onClose={() => setDeletingCategory(null)}
          onSuccess={handleCategoryDeleted}
        />
      )}
    </div>
  );
}
