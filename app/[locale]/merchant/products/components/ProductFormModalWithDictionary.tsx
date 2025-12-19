// app/[locale]/merchant/products/components/ProductFormModalWithDictionary.tsx
'use client';

import { useState, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { getLocalizedValue } from '@/lib/i18nUtils';
import { supabase } from '@/lib/supabaseClient';
import { ProductDictionaryInput, type MultilingualProductName } from './ProductDictionaryInput';
import { createProductWithDictionary, updateProductWithDictionary } from '@/app/actions/product-dictionary';
import type { MerchantCategory } from '@/app/actions/merchant-categories/merchant-categories';

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

type ProductFormModalProps = {
  merchantId: string;
  product?: Product;
  categories: Category[];
  merchantCategories: MerchantCategory[];
  onClose: () => void;
  onSuccess: () => void;
};

// --- 工具函数：图片转 WebP ---
const convertImageToWebP = async (file: File, t: (key: string) => string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error(t('errors.imageConversionFailed')));
        }, "image/webp", 0.8);
      } else {
        reject(new Error(t('errors.cannotCreateCanvas')));
      }
    };
    img.onerror = (error) => reject(error);
  });
};

export function ProductFormModalWithDictionary({
  merchantId,
  product,
  categories,
  merchantCategories,
  onClose,
  onSuccess
}: ProductFormModalProps) {
  const t = useTranslations('merchantProducts');
  const locale = useLocale();
  const isEditMode = !!product;

  // --- 工具函数：获取分类名称 ---
  const getCategoryName = (name: string | { th?: string; en?: string; [key: string]: string | undefined }): string => {
    if (typeof name === 'string') {
      return name;
    }
    return name.th || name.en || t('uncategorized');
  };

  // 商品名称状态（使用字典）
  const [name, setName] = useState<MultilingualProductName>({
    th: product?.name?.th || '',
    en: product?.name?.en || '', // 编辑模式下留空，让用户通过字典搜索
    zh: product?.name?.zh || ''
  });

  // 其他表单状态
  const [descTH, setDescTH] = useState(product?.description?.th || '');
  const [descEN, setDescEN] = useState(product?.description?.en || '');
  const [price, setPrice] = useState(product?.original_price?.toString() || '');
  const [imageUrl, setImageUrl] = useState(product?.image_urls?.[0] || '');
  const [categoryId, setCategoryId] = useState(product?.category_id || '');
  const [merchantCategoryId, setMerchantCategoryId] = useState(product?.merchant_category_id || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dictionaryMessage, setDictionaryMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理图片上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setIsUploading(true);
    setError(null);

    try {
      // 1. 转换为 WebP
      const webpBlob = await convertImageToWebP(file, t);
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
      const filePath = `public/${fileName}`;

      // 2. 上传到 Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(filePath, webpBlob, {
          contentType: 'image/webp'
        });

      if (uploadError) throw uploadError;

      // 3. 获取公开访问 URL
      const { data: { publicUrl } } = supabase.storage
        .from("products")
        .getPublicUrl(filePath);

      // 4. 自动填入表单
      setImageUrl(publicUrl);

    } catch (error: unknown) {
      console.error("Upload failed:", error);
      let errorMessage = t('errors.unknownError');
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "object" && error !== null && "message" in error) {
        errorMessage = (error as { message: string }).message;
      }
      setError(t('errors.uploadFailed') + ": " + errorMessage);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDictionaryMessage(null);

    // 验证必填字段
    if (!name.th.trim()) {
      setError(t('modal.thaiNameRequired'));
      return;
    }

    if (!name.en.trim()) {
      setError(t('modal.englishNameRequired'));
      return;
    }

    if (!categoryId) {
      setError(t('errors.selectCategory'));
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      setError(t('modal.priceGreaterThanZero'));
      return;
    }

    setIsSubmitting(true);

    try {
      let result;

      if (isEditMode) {
        // 编辑模式
        result = await updateProductWithDictionary(
          {
            product_id: product.product_id,
            original_price: parseFloat(price),
            image_urls: imageUrl ? [imageUrl] : [],
            category_id: categoryId,
            merchant_category_id: merchantCategoryId || null,
            description: { th: descTH, en: descEN, zh: '' }
          },
          name,
          true // auto_add_to_dictionary
        );
      } else {
        // 创建模式
        result = await createProductWithDictionary({
          merchant_id: merchantId,
          name: name,
          description: { th: descTH, en: descEN, zh: '' },
          original_price: parseFloat(price),
          image_urls: imageUrl ? [imageUrl] : [],
          category_id: categoryId,
          merchant_category_id: merchantCategoryId || null,
          auto_add_to_dictionary: true
        });
      }

      if (result.success) {
        // 显示字典操作结果
        if (result.dictionary_action === 'found_exact') {
          setDictionaryMessage(t('modal.dictionaryUsed'));
        } else if (result.dictionary_action === 'added_new') {
          setDictionaryMessage(t('modal.dictionaryAdded'));
        }

        // 延迟一下让用户看到消息，然后关闭
        setTimeout(() => {
          onSuccess();
        }, 800);
      } else {
        setError(result.error || t('errors.saveFailed'));
      }
    } catch (err) {
      console.error('Error saving product:', err);
      setError(t('errors.saveFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-3xl">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">
            {isEditMode ? t('modal.editTitle') : t('modal.addTitle')}
          </h3>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 错误提示 */}
          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          {/* 字典成功消息 */}
          {dictionaryMessage && (
            <div className="alert alert-success">
              <span>{dictionaryMessage}</span>
            </div>
          )}

          {/* 商品名称（使用字典输入组件） */}
          <ProductDictionaryInput
            value={name}
            onChange={setName}
            disabled={isSubmitting}
            label={t('modal.productName')}
            required={true}
            placeholder={t('dictionaryInput.enterThaiName')}
          />

          {/* 价格 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">
                {t('modal.price')} <span className="text-error">*</span>
              </span>
            </label>
            <input
              type="number"
              step="0.01"
              className="input input-bordered"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={isSubmitting}
              placeholder="0.00"
            />
          </div>

          {/* 行业分类 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">
                {t('modal.category')} <span className="text-error">*</span>
              </span>
            </label>
            <select
              className="select select-bordered"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">{t('modal.selectCategory')}</option>
              {categories.map((category) => (
                <optgroup key={category.category_id} label={getCategoryName(category.name)}>
                  <option value={category.category_id}>
                    {getCategoryName(category.name)} {t('modal.mainCategory')}
                  </option>
                  {category.subcategories?.map((sub) => (
                    <option key={sub.category_id} value={sub.category_id}>
                      └─ {getCategoryName(sub.name)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* 商户自定义分类 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">{t('modal.merchantCategory')}</span>
              <span className="label-text-alt text-base-content/60">
                {t('modal.merchantCategoryOptional')}
              </span>
            </label>
            <select
              className="select select-bordered"
              value={merchantCategoryId}
              onChange={(e) => setMerchantCategoryId(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">{t('modal.noMerchantCategory')}</option>
              {merchantCategories.map((category) => (
                <option key={category.category_id} value={category.category_id}>
                  {category.icon || '📦'} {getLocalizedValue(category.name, locale as 'th' | 'zh' | 'en')}
                </option>
              ))}
            </select>
          </div>

          {/* 图片上传 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">{t('modal.image')}</span>
            </label>

            <input
              type="text"
              placeholder={t('modal.imageUrlPlaceholder')}
              className="input input-bordered mb-2"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              disabled={isSubmitting}
            />

            <div className="flex gap-2 items-center">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageUpload}
              />
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isSubmitting}
              >
                {isUploading ? t('modal.uploading') : t('modal.uploadButton')}
              </button>
              <span className="text-xs text-base-content/60">{t('modal.uploadHint')}</span>
            </div>

            {/* 预览 */}
            {imageUrl && (
              <div className="mt-2">
                <p className="text-xs mb-1">{t('modal.preview')}:</p>
                <Image
                  src={imageUrl}
                  alt="Preview"
                  width={80}
                  height={80}
                  className="h-20 w-20 object-cover rounded-md border"
                  unoptimized
                />
              </div>
            )}
          </div>

          {/* 描述 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('modal.descriptionTH')}</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-24"
                value={descTH}
                onChange={(e) => setDescTH(e.target.value)}
                disabled={isSubmitting}
                placeholder={t('modal.descriptionTHPlaceholder')}
              ></textarea>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('modal.descriptionEN')}</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-24"
                value={descEN}
                onChange={(e) => setDescEN(e.target.value)}
                disabled={isSubmitting}
                placeholder={t('modal.descriptionENPlaceholder')}
              ></textarea>
            </div>
          </div>

          {/* 按钮 */}
          <div className="modal-action">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t('modal.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || isUploading || !name.th.trim() || !name.en.trim()}
            >
              {isSubmitting && <span className="loading loading-spinner"></span>}
              {isEditMode ? t('modal.save') : t('modal.save')}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
