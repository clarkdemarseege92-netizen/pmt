// 文件: /app/[locale]/merchant/products/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { useTranslations, useLocale } from 'next-intl';
import { getMerchantCategories } from '@/app/actions/merchant-categories/merchant-categories';
import type { MerchantCategory } from '@/app/actions/merchant-categories/merchant-categories';
import { batchAssignProductCategory } from '@/app/actions/products/batch-category-operations';
import { ProductFormModalWithDictionary } from './components/ProductFormModalWithDictionary';
import { getLocalizedValue } from '@/lib/i18nUtils';

// 定义分类类型
type Category = {
  category_id: string;
  name: string | { th?: string; en?: string; [key: string]: string | undefined };
  parent_id: string | null;
  icon_url?: string;
  sort_order?: number;
  subcategories?: Category[];
};

// 定义商品类型
type Product = {
  product_id: string;
  merchant_id: string;
  original_price: number;
  image_urls: string[];
  name: { th: string; en: string; [key: string]: string };
  description: { th: string; en: string; [key: string]: string };
  category_id?: string;
  merchant_category_id?: string | null;
};

// --- 工具函数：获取分类名称 ---
const getCategoryName = (name: string | { th?: string; en?: string; [key: string]: string | undefined }): string => {
  if (typeof name === 'string') {
    return name;
  }
  return name.th || name.en || "未命名";
};

export default function ProductsPage() {
  const t = useTranslations('merchantProducts');
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [merchantId, setMerchantId] = useState<string | null>(null);

  // 分类状态（行业分类）
  const [categories, setCategories] = useState<Category[]>([]);

  // 商户自定义分类状态
  const [merchantCategories, setMerchantCategories] = useState<MerchantCategory[]>([]);
  const [merchantCategoriesLoading, setMerchantCategoriesLoading] = useState(false);

  // 模态框状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // 批量操作状态
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchCategoryId, setBatchCategoryId] = useState("");
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);

  // 1. 初始化
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: merchant } = await supabase
          .from("merchants")
          .select("merchant_id")
          .eq("owner_id", user.id)
          .single();

        if (merchant) {
          setMerchantId(merchant.merchant_id);
          fetchProducts(merchant.merchant_id);
          fetchMerchantCategories(merchant.merchant_id);
        }
      }
    };
    init();
    fetchCategories();
  }, []);

  // 1.5 获取分类列表（行业分类）
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // 1.6 获取商户自定义分类
  const fetchMerchantCategories = async (mId: string) => {
    setMerchantCategoriesLoading(true);
    try {
      const result = await getMerchantCategories(mId);
      if (result.success) {
        setMerchantCategories(result.data);
      } else {
        console.error('Error fetching merchant categories:', result.error);
      }
    } catch (error) {
      console.error('Error fetching merchant categories:', error);
    } finally {
      setMerchantCategoriesLoading(false);
    }
  };

  // 2. 获取商品列表
  const fetchProducts = async (mId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("merchant_id", mId)
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching products:", error);
    else setProducts(data as Product[]);
    setLoading(false);
  };

  // 3. 打开模态框
  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
    } else {
      setEditingProduct(null);
    }
    setIsModalOpen(true);
  };

  // 5. 删除商品
  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    const { error } = await supabase.from("products").delete().eq("product_id", id);
    if (error) alert(t('errors.deleteFailed'));
    else if (merchantId) fetchProducts(merchantId);
  };

  // 6. 根据 category_id 获取分类名称（行业分类）
  const getCategoryNameById = (categoryId?: string): string => {
    if (!categoryId) return "-";

    // 在主分类中查找
    for (const category of categories) {
      if (category.category_id === categoryId) {
        return getCategoryName(category.name);
      }
      // 在子分类中查找
      if (category.subcategories) {
        for (const sub of category.subcategories) {
          if (sub.category_id === categoryId) {
            return `${getCategoryName(category.name)} > ${getCategoryName(sub.name)}`;
          }
        }
      }
    }
    return t('uncategorized');
  };

  // 7. 根据 merchant_category_id 获取商户分类名称
  const getMerchantCategoryNameById = (merchantCategoryId?: string | null): string | null => {
    if (!merchantCategoryId) return null;

    const category = merchantCategories.find(c => c.category_id === merchantCategoryId);
    if (!category) return null;

    // category.name 是 MultiLangName 对象，需要提取对应语言的值
    const categoryName = getLocalizedValue(category.name, locale as 'th' | 'zh' | 'en');
    return `${category.icon || '📦'} ${categoryName}`;
  };

  // 8. 批量操作：选择/取消选择商品
  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  // 9. 批量操作：全选/取消全选
  const handleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.product_id)));
    }
  };

  // 10. 批量操作：提交批量分类设置
  const handleBatchCategorySubmit = async () => {
    if (!merchantId || selectedProducts.size === 0) return;

    setIsBatchUpdating(true);

    try {
      const result = await batchAssignProductCategory({
        product_ids: Array.from(selectedProducts),
        merchant_category_id: batchCategoryId || null
      });

      if (result.success) {
        alert(t('batch.success', { count: result.updated_count || 0 }));
        setIsBatchModalOpen(false);
        setSelectedProducts(new Set());
        setBatchCategoryId("");
        fetchProducts(merchantId);
      } else {
        alert(t('batch.error') + ': ' + result.error);
      }
    } catch (error) {
      console.error('Batch category assignment error:', error);
      alert(t('batch.error'));
    } finally {
      setIsBatchUpdating(false);
    }
  };

  if (loading) return <div className="p-10 text-center"><span className="loading loading-spinner loading-lg"></span></div>;

  return (
    <div className="w-full max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <div className="flex gap-2">
          <button
            className="btn btn-secondary"
            onClick={() => setIsBatchModalOpen(true)}
            disabled={selectedProducts.size === 0}
          >
            {t('batch.setCategory')}
            {selectedProducts.size > 0 && ` (${selectedProducts.size})`}
          </button>
          <button className="btn btn-primary" onClick={() => openModal()}>
            + {t('addProduct')}
          </button>
        </div>
      </div>

      {/* 商品列表表格 */}
      <div className="overflow-x-auto bg-base-100 rounded-lg shadow">
        <table className="table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={products.length > 0 && selectedProducts.size === products.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th>{t('table.image')}</th>
              <th>{t('table.name')}</th>
              <th>{t('table.category')}</th>
              <th>{t('table.price')}</th>
              <th>{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-4">{t('noProducts')}</td></tr>
            ) : (
              products.map((p) => (
                <tr key={p.product_id}>
                  <td>
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={selectedProducts.has(p.product_id)}
                      onChange={() => handleSelectProduct(p.product_id)}
                    />
                  </td>
                  <td>
                    <div className="avatar">
                      <div className="mask mask-squircle w-12 h-12 relative">
                        {p.image_urls?.[0] ? (
                           <Image
                             src={p.image_urls[0]}
                             alt={p.name?.en || 'Product'}
                             width={48}
                             height={48}
                             className="object-cover"
                             unoptimized
                           />
                        ) : (
                           <div className="bg-base-300 w-full h-full flex items-center justify-center text-xs">No Img</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="font-bold">{p.name?.th}</div>
                    <div className="text-sm opacity-50">{p.name?.en}</div>
                  </td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <span className="badge badge-outline badge-sm">{getCategoryNameById(p.category_id)}</span>
                      {getMerchantCategoryNameById(p.merchant_category_id) && (
                        <span className="badge badge-primary badge-sm">
                          {getMerchantCategoryNameById(p.merchant_category_id)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>฿{p.original_price}</td>
                  <td>
                    <button className="btn btn-ghost btn-xs" onClick={() => openModal(p)}>{t('editButton')}</button>
                    <button className="btn btn-ghost btn-xs text-error" onClick={() => handleDelete(p.product_id)}>{t('deleteButton')}</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 编辑/新增 模态框（字典版本） */}
      {isModalOpen && (
        <ProductFormModalWithDictionary
          merchantId={merchantId!}
          product={editingProduct || undefined}
          categories={categories}
          merchantCategories={merchantCategories}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            if (merchantId) fetchProducts(merchantId);
          }}
        />
      )}

      {/* 批量设置分类 模态框 */}
      {isBatchModalOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {t('batch.title')} ({selectedProducts.size} {t('batch.selectedItems')})
            </h3>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">{t('batch.selectCategory')}</span>
              </label>
              <select
                className="select select-bordered"
                value={batchCategoryId}
                onChange={(e) => setBatchCategoryId(e.target.value)}
                disabled={isBatchUpdating || merchantCategoriesLoading}
              >
                <option value="">{t('batch.removeCategory')}</option>
                {merchantCategories.map((category) => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.icon || '📦'} {getLocalizedValue(category.name, locale as 'th' | 'zh' | 'en')}
                  </option>
                ))}
              </select>
              {merchantCategories.length === 0 && !merchantCategoriesLoading && (
                <label className="label">
                  <span className="label-text-alt text-warning">
                    {t('modal.noMerchantCategoriesHint')}
                  </span>
                </label>
              )}
            </div>

            <div className="alert alert-info">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="stroke-current shrink-0 w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{t('batch.hint')}</span>
            </div>

            <div className="modal-action">
              <button
                className="btn"
                onClick={() => {
                  setIsBatchModalOpen(false);
                  setBatchCategoryId("");
                }}
                disabled={isBatchUpdating}
              >
                {t('modal.cancel')}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleBatchCategorySubmit}
                disabled={isBatchUpdating || merchantCategories.length === 0}
              >
                {isBatchUpdating && <span className="loading loading-spinner"></span>}
                {t('batch.confirm')}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
