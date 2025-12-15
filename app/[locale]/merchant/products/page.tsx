// 文件: /app/[locale]/merchant/products/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { useTranslations } from 'next-intl';

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
};

// --- 工具函数：获取分类名称 ---
const getCategoryName = (name: string | { th?: string; en?: string; [key: string]: string | undefined }): string => {
  if (typeof name === 'string') {
    return name;
  }
  return name.th || name.en || "未命名";
};

// --- 工具函数：图片转 WebP ---
const convertImageToWebP = async (file: File): Promise<Blob> => {
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
          else reject(new Error("图片转换失败"));
        }, "image/webp", 0.8);
      } else {
        reject(new Error("无法创建 Canvas 上下文"));
      }
    };
    img.onerror = (error) => reject(error);
  });
};

export default function ProductsPage() {
  const t = useTranslations('merchantProducts');
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [merchantId, setMerchantId] = useState<string | null>(null);

  // 分类状态
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // 模态框状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // 上传状态
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 表单状态
  const [formData, setFormData] = useState({
    nameTH: "",
    nameEN: "",
    descTH: "",
    descEN: "",
    price: "",
    imageUrl: "",
    categoryId: "",
  });

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
        }
      }
    };
    init();
    fetchCategories();
  }, []);

  // 1.5 获取分类列表
  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setCategoriesLoading(false);
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
      setFormData({
        nameTH: product.name?.th || "",
        nameEN: product.name?.en || "",
        descTH: product.description?.th || "",
        descEN: product.description?.en || "",
        price: product.original_price.toString(),
        imageUrl: product.image_urls?.[0] || "",
        categoryId: product.category_id || "",
      });
    } else {
      setEditingProduct(null);
      setFormData({
        nameTH: "", nameEN: "", descTH: "", descEN: "", price: "", imageUrl: "", categoryId: ""
      });
    }
    setIsModalOpen(true);
  };

  // --- 新功能：处理图片上传 ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setIsUploading(true);

    try {
      // 1. 转换为 WebP
      const webpBlob = await convertImageToWebP(file);
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

      // 4. 自动填入表单的 URL 字段
      setFormData(prev => ({ ...prev, imageUrl: publicUrl }));

    } catch (error: unknown) {
      console.error("Upload failed:", error);
      let errorMessage = t('errors.unknownError');
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "object" && error !== null && "message" in error) {
         errorMessage = (error as { message: string }).message;
      }
      alert(t('errors.uploadFailed') + ": " + errorMessage);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 4. 提交表单
  const handleSubmit = async () => {
    if (!merchantId) return;

    // 验证必填字段
    if (!formData.categoryId) {
      alert(t('errors.selectCategory'));
      return;
    }

    const payload = {
      merchant_id: merchantId,
      name: { th: formData.nameTH, en: formData.nameEN },
      description: { th: formData.descTH, en: formData.descEN },
      original_price: parseFloat(formData.price),
      image_urls: formData.imageUrl ? [formData.imageUrl] : [],
      category_id: formData.categoryId,
    };

    let error;
    if (editingProduct) {
      const { error: updateError } = await supabase
        .from("products")
        .update(payload)
        .eq("product_id", editingProduct.product_id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("products")
        .insert(payload);
      error = insertError;
    }

    if (error) {
      alert(t('errors.saveFailed') + ": " + error.message);
    } else {
      setIsModalOpen(false);
      fetchProducts(merchantId);
    }
  };

  // 5. 删除商品
  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    const { error } = await supabase.from("products").delete().eq("product_id", id);
    if (error) alert(t('errors.deleteFailed'));
    else if (merchantId) fetchProducts(merchantId);
  };

  // 6. 根据 category_id 获取分类名称
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

  if (loading) return <div className="p-10 text-center"><span className="loading loading-spinner loading-lg"></span></div>;

  return (
    <div className="w-full max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <button className="btn btn-primary" onClick={() => openModal()}>
          + {t('addProduct')}
        </button>
      </div>

      {/* 商品列表表格 */}
      <div className="overflow-x-auto bg-base-100 rounded-lg shadow">
        <table className="table">
          <thead>
            <tr>
              <th>{t('table.image')}</th>
              <th>{t('table.name')}</th>
              <th>{t('table.category')}</th>
              <th>{t('table.price')}</th>
              <th>{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-4">{t('noProducts')}</td></tr>
            ) : (
              products.map((p) => (
                <tr key={p.product_id}>
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
                    <span className="badge badge-outline badge-sm">{getCategoryNameById(p.category_id)}</span>
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

      {/* 编辑/新增 模态框 */}
      {isModalOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">{editingProduct ? t('modal.editTitle') : t('modal.addTitle')}</h3>

            <div className="space-y-4">
              {/* 名称 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('modal.nameTH')}</span></label>
                  <input type="text" className="input input-bordered"
                    value={formData.nameTH} onChange={e => setFormData({...formData, nameTH: e.target.value})} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('modal.nameEN')}</span></label>
                  <input type="text" className="input input-bordered"
                    value={formData.nameEN} onChange={e => setFormData({...formData, nameEN: e.target.value})} />
                </div>
              </div>

              {/* 价格 */}
              <div className="form-control">
                <label className="label"><span className="label-text">{t('modal.price')}</span></label>
                <input type="number" className="input input-bordered"
                  value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
              </div>

              {/* 行业分类 */}
              <div className="form-control">
                <label className="label"><span className="label-text">{t('modal.category')}</span></label>
                <select
                  className="select select-bordered"
                  value={formData.categoryId}
                  onChange={e => setFormData({...formData, categoryId: e.target.value})}
                  disabled={categoriesLoading}
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

              {/* 图片上传区域 */}
              <div className="form-control">
                <label className="label"><span className="label-text">{t('modal.image')}</span></label>

                <input
                  type="text"
                  placeholder={t('modal.imageUrlPlaceholder')}
                  className="input input-bordered mb-2"
                  value={formData.imageUrl}
                  onChange={e => setFormData({...formData, imageUrl: e.target.value})}
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
                    className="btn btn-sm btn-outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? t('modal.uploading') : t('modal.uploadButton')}
                  </button>
                  <span className="text-xs text-base-content/60">{t('modal.uploadHint')}</span>
                </div>

                {/* 预览 */}
                {formData.imageUrl && (
                   <div className="mt-2">
                      <p className="text-xs mb-1">{t('modal.preview')}:</p>
                      <Image
                        src={formData.imageUrl}
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
              <div className="form-control">
                <label className="label"><span className="label-text">{t('modal.descriptionTH')}</span></label>
                <textarea className="textarea textarea-bordered"
                  value={formData.descTH} onChange={e => setFormData({...formData, descTH: e.target.value})}></textarea>
              </div>
            </div>

            <div className="modal-action">
              <button className="btn" onClick={() => setIsModalOpen(false)}>{t('modal.cancel')}</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={isUploading}>
                 {isUploading ? t('modal.waitingUpload') : t('modal.save')}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
