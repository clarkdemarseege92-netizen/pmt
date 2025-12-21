// 文件: /app/[locale]/merchant/coupons/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { HiPlus, HiPencil, HiTrash, HiPhoto } from "react-icons/hi2";
import { useTranslations, useLocale } from 'next-intl';
import { checkCouponTypeLimit } from '@/app/actions/subscriptions';
import { UsageLimitIndicator } from '@/components/subscription';
import { useRouter } from 'next/navigation';

// ----- 类型定义 -----

// 基础商品 (用于选择列表)
type Product = {
  product_id: string;
  name: { th: string; en: string };
  original_price: number;
  image_urls: string[];
  category_id?: string;
};

// 优惠券 (主表)
type Coupon = {
  coupon_id: string;
  merchant_id: string;
  name: { th: string; en: string };
  selling_price: number;
  original_value: number;
  stock_quantity: number;
  image_urls: string[]; // 封面图
  rules: { th: string; en: string }; // 使用须知
  category_id?: string;
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

export default function CouponsPage() {
  const t = useTranslations('merchantCoupons');
  const locale = useLocale();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [merchantId, setMerchantId] = useState<string | null>(null);

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // 订阅限制状态
  const [couponLimit, setCouponLimit] = useState({ current_count: 0, limit_count: 0, can_create: true });

  // 钱包余额
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // 每张优惠券认证费用（泰铢）
  const COUPON_CERTIFICATION_FEE = 3;

  // 模态框与表单
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 表单数据
  const [formData, setFormData] = useState({
    nameTH: "",
    nameEN: "",
    sellingPrice: "",
    stock: "100",
    imageUrl: "",
    rulesTH: "",
    rulesEN: "",
  });

  // 选中的商品 (关键逻辑) Map<productId, quantity>
  const [selection, setSelection] = useState<Map<string, number>>(new Map());

  // 1. 初始化数据
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 获取 Merchant ID
      const { data: merchant } = await supabase
        .from("merchants")
        .select("merchant_id")
        .eq("owner_id", user.id)
        .single();

      if (merchant) {
        setMerchantId(merchant.merchant_id);
        // 并行加载
        await Promise.all([
          fetchCoupons(merchant.merchant_id),
          fetchProducts(merchant.merchant_id),
          fetchCouponLimit(merchant.merchant_id),
          fetchWalletBalance(merchant.merchant_id)
        ]);
      }
      setLoading(false);
    };
    init();
  }, []);

  // 2. 获取优惠券
  const fetchCoupons = async (mId: string) => {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("merchant_id", mId)
      .order("created_at", { ascending: false });
    if (!error) setCoupons(data as unknown as Coupon[]);
  };

  // 3. 获取商品
  const fetchProducts = async (mId: string) => {
    const { data, error } = await supabase
      .from("products")
      .select("product_id, name, original_price, image_urls, category_id")
      .eq("merchant_id", mId);
    if (!error) setProducts(data as unknown as Product[]);
  };

  // 4. 获取优惠券数量限制
  const fetchCouponLimit = async (mId: string) => {
    try {
      const result = await checkCouponTypeLimit(mId);
      if (result.success && result.data) {
        setCouponLimit(result.data);
      }
    } catch (error) {
      console.error('Error fetching coupon limit:', error);
    }
  };

  // 5. 获取钱包余额
  const fetchWalletBalance = async (mId: string) => {
    const { data: lastTransaction } = await supabase
      .from('merchant_transactions')
      .select('balance_after')
      .eq('merchant_id', mId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    setWalletBalance(lastTransaction?.balance_after || 0);
  };

  // 计算认证费用
  const calculateCertificationFee = (stockQuantity: number) => {
    return stockQuantity * COUPON_CERTIFICATION_FEE;
  };

  // 计算最大可发行数量
  const getMaxStock = () => {
    return Math.floor(walletBalance / COUPON_CERTIFICATION_FEE);
  };

  // --- 逻辑：打开模态框 (新增/编辑) ---
  const openModal = async (coupon?: Coupon) => {
    // 如果是新增优惠券，检查是否达到上限
    if (!coupon && !couponLimit.can_create) {
      if (confirm(t('limitReached.confirmUpgrade'))) {
        router.push(`/${locale}/merchant/subscription`);
      }
      return;
    }

    if (coupon) {
      // 编辑模式
      setEditingId(coupon.coupon_id);
      setFormData({
        nameTH: coupon.name?.th || "",
        nameEN: coupon.name?.en || "",
        sellingPrice: coupon.selling_price.toString(),
        stock: coupon.stock_quantity.toString(),
        imageUrl: coupon.image_urls?.[0] || "",
        rulesTH: coupon.rules?.th || "",
        rulesEN: coupon.rules?.en || "",
      });

      // 获取该优惠券关联的商品
      const { data: relations } = await supabase
        .from("coupon_products")
        .select("product_id, quantity")
        .eq("coupon_id", coupon.coupon_id);

      const newMap = new Map<string, number>();

      relations?.forEach((r: { product_id: string; quantity: number }) => {
          newMap.set(r.product_id, r.quantity);
      });

      setSelection(newMap);

    } else {
      // 新增模式
      setEditingId(null);
      setFormData({
        nameTH: "", nameEN: "", sellingPrice: "", stock: "999", imageUrl: "", rulesTH: "", rulesEN: ""
      });
      setSelection(new Map());
    }
    setIsModalOpen(true);
  };

  // --- 逻辑：商品选择与数量变更 ---
  const toggleProduct = (productId: string) => {
    const newMap = new Map(selection);
    if (newMap.has(productId)) {
      newMap.delete(productId);
    } else {
      newMap.set(productId, 1);
    }
    setSelection(newMap);
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty < 1) return;
    const newMap = new Map(selection);
    if (newMap.has(productId)) {
      newMap.set(productId, qty);
      setSelection(newMap);
    }
  };

  // --- 逻辑：自动计算原价 ---
  const calculateTotalOriginalPrice = () => {
    let total = 0;
    selection.forEach((qty, pid) => {
      const p = products.find(p => p.product_id === pid);
      if (p) total += p.original_price * qty;
    });
    return total;
  };

  // --- 逻辑：继承分类（取第一个选中商品的分类）---
  const getInheritedCategory = (): string | null => {
    if (selection.size === 0) return null;
    const firstProductId = Array.from(selection.keys())[0];
    const firstProduct = products.find(p => p.product_id === firstProductId);
    return firstProduct?.category_id || null;
  };

  // --- 逻辑：图片上传 ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploading(true);
    try {
      const webpBlob = await convertImageToWebP(file);
      const filePath = `public/${Date.now()}-${Math.random().toString(36).substr(2,9)}.webp`;
      const { error: uploadError } = await supabase.storage.from("products").upload(filePath, webpBlob, { contentType: 'image/webp' });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("products").getPublicUrl(filePath);
      setFormData(prev => ({ ...prev, imageUrl: publicUrl }));
    } catch (err: unknown) {
       console.error(err);
       alert(t('errors.uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  // --- 逻辑：保存提交 ---
  const handleSubmit = async () => {
    if (!merchantId) return;
    if (selection.size === 0) {
      alert(t('errors.selectProduct'));
      return;
    }

    // 验证库存数量与余额
    const stockQuantity = parseInt(formData.stock) || 0;
    const requiredFee = calculateCertificationFee(stockQuantity);

    if (requiredFee > walletBalance) {
      const maxStock = getMaxStock();
      alert(t('errors.insufficientBalance', {
        required: requiredFee,
        balance: walletBalance,
        maxStock: maxStock,
        fee: COUPON_CERTIFICATION_FEE
      }));
      return;
    }

    const totalOriginalValue = calculateTotalOriginalPrice();
    const inheritedCategoryId = getInheritedCategory();

    const payload = {
      merchant_id: merchantId,
      name: { th: formData.nameTH, en: formData.nameEN },
      rules: { th: formData.rulesTH, en: formData.rulesEN },
      selling_price: parseFloat(formData.sellingPrice),
      original_value: totalOriginalValue,
      stock_quantity: parseInt(formData.stock),
      image_urls: formData.imageUrl ? [formData.imageUrl] : [],
      category_id: inheritedCategoryId,
    };

    let targetCouponId = editingId;
    setLoading(true);

    try {
      // 1. 写入 coupons 表
      if (editingId) {
        const { error } = await supabase.from("coupons").update(payload).eq("coupon_id", editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("coupons").insert(payload).select("coupon_id").single();
        if (error) throw error;
        targetCouponId = data.coupon_id;
      }

      // 2. 处理 coupon_products 中间表
      if (targetCouponId) {
        // A. 删除旧关联
        await supabase.from("coupon_products").delete().eq("coupon_id", targetCouponId);

        // B. 准备新关联数据
        const relations = Array.from(selection).map(([pid, qty]) => ({
          coupon_id: targetCouponId,
          product_id: pid,
          quantity: qty
        }));

        // C. 插入新关联
        const { error: relError } = await supabase.from("coupon_products").insert(relations);
        if (relError) throw relError;
      }

      setIsModalOpen(false);
      fetchCoupons(merchantId);

    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : t('errors.unknownError');
      alert(t('errors.saveFailed') + ": " + message);
    } finally {
      setLoading(false);
    }
  };

  // 删除
  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    const { error } = await supabase.from("coupons").delete().eq("coupon_id", id);
    if (!error && merchantId) fetchCoupons(merchantId);
  };

  if (loading && !merchantId) return <div className="p-10 text-center"><span className="loading loading-spinner loading-lg"></span></div>;

  return (
    <div className="w-full max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-base-content/60 text-sm mt-1">{t('subtitle')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <HiPlus className="w-5 h-5" /> {t('createButton')}
        </button>
      </div>

      {/* 优惠券券种使用量指示器 */}
      {couponLimit.limit_count > 0 && (
        <div className="mb-6">
          <UsageLimitIndicator
            currentCount={couponLimit.current_count}
            limitCount={couponLimit.limit_count}
            type="coupon"
            showUpgrade={true}
            onUpgradeClick={() => router.push(`/${locale}/merchant/subscription`)}
          />
        </div>
      )}

      {/* 优惠券列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coupons.map((coupon) => (
          <div key={coupon.coupon_id} className="card bg-base-100 shadow-md border border-base-200">
             <figure className="h-40 relative bg-base-200">
                {coupon.image_urls?.[0] ? (
                   <Image
                      src={coupon.image_urls[0]}
                      alt={coupon.name?.en || "Coupon"}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                ) : (
                   <div className="flex items-center justify-center w-full h-full text-base-content/30"><HiPhoto className="w-12 h-12"/></div>
                )}
                <div className="absolute top-2 right-2 badge badge-secondary">
                   {t('stock')}: {coupon.stock_quantity}
                </div>
             </figure>
             <div className="card-body p-4">
                <h2 className="card-title text-lg">{coupon.name?.th}</h2>
                <p className="text-sm text-base-content/70 truncate">{coupon.name?.en}</p>

                <div className="flex items-end gap-2 mt-2">
                   <span className="text-2xl font-bold text-primary">฿{coupon.selling_price}</span>
                   <span className="text-sm line-through text-base-content/50 mb-1">฿{coupon.original_value}</span>
                </div>

                <div className="card-actions justify-end mt-4 pt-4 border-t border-base-200">
                   <button className="btn btn-sm btn-ghost" onClick={() => openModal(coupon)}>
                      <HiPencil className="w-4 h-4" /> {t('editButton')}
                   </button>
                   <button className="btn btn-sm btn-ghost text-error" onClick={() => handleDelete(coupon.coupon_id)}>
                      <HiTrash className="w-4 h-4" /> {t('deleteButton')}
                   </button>
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* === 核心：新建/编辑 模态框 === */}
      {isModalOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box w-11/12 max-w-4xl">
            <h3 className="font-bold text-xl mb-6 pb-2 border-b">
               {editingId ? t('modal.editTitle') : t('modal.createTitle')}
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

               {/* 左侧：基本信息 */}
               <div className="space-y-4">
                  <h4 className="font-bold text-sm text-primary uppercase tracking-wider">{t('modal.basicInfo')}</h4>

                  {/* 名称 */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="form-control">
                      <label className="label"><span className="label-text">{t('modal.nameTH')}</span></label>
                      <input type="text" className="input input-bordered" placeholder={t('modal.nameTHPlaceholder')}
                        value={formData.nameTH} onChange={e => setFormData({...formData, nameTH: e.target.value})} />
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text">{t('modal.nameEN')}</span></label>
                      <input type="text" className="input input-bordered" placeholder={t('modal.nameENPlaceholder')}
                        value={formData.nameEN} onChange={e => setFormData({...formData, nameEN: e.target.value})} />
                    </div>
                  </div>

                  {/* 价格与库存 */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="form-control">
                      <label className="label"><span className="label-text">{t('modal.sellingPrice')}</span></label>
                      <input type="number" className="input input-bordered input-primary"
                        value={formData.sellingPrice} onChange={e => setFormData({...formData, sellingPrice: e.target.value})} />
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">{t('modal.stock')}</span>
                        <span className="label-text-alt text-xs">
                          {t('modal.maxStock')}: {getMaxStock()}
                        </span>
                      </label>
                      <input
                        type="number"
                        className={`input input-bordered ${
                          calculateCertificationFee(parseInt(formData.stock) || 0) > walletBalance
                            ? 'input-error'
                            : ''
                        }`}
                        value={formData.stock}
                        onChange={e => setFormData({...formData, stock: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* 认证费用提示 */}
                  <div className={`alert ${
                    calculateCertificationFee(parseInt(formData.stock) || 0) > walletBalance
                      ? 'alert-error'
                      : 'alert-info'
                  } py-2`}>
                    <div className="text-sm">
                      <div className="flex justify-between">
                        <span>{t('modal.walletBalance')}:</span>
                        <span className="font-semibold">฿{walletBalance.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('modal.certificationFee')} ({parseInt(formData.stock) || 0} x ฿{COUPON_CERTIFICATION_FEE}):</span>
                        <span className="font-semibold">฿{calculateCertificationFee(parseInt(formData.stock) || 0)}</span>
                      </div>
                      {calculateCertificationFee(parseInt(formData.stock) || 0) > walletBalance && (
                        <div className="text-error font-semibold mt-1">
                          {t('modal.insufficientBalanceWarning')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 图片 */}
                  <div className="form-control">
                    <label className="label"><span className="label-text">{t('modal.coverImage')}</span></label>
                    <div className="flex gap-2">
                        <input type="text" className="input input-bordered flex-1" placeholder={t('modal.imageUrlPlaceholder')}
                            value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
                        <button className="btn btn-square btn-outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                           {isUploading ? <span className="loading loading-spinner"></span> : <HiPhoto className="w-6 h-6"/>}
                        </button>
                        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                    </div>
                    {formData.imageUrl && (
                       <div className="mt-2 relative h-32 w-full rounded-lg overflow-hidden border">
                          <Image src={formData.imageUrl} alt="Preview" fill className="object-cover" unoptimized />
                       </div>
                    )}
                  </div>

                  {/* 使用须知 (Rules) */}
                  <div className="form-control">
                      <label className="label"><span className="label-text">{t('modal.rulesTH')}</span></label>
                      <textarea className="textarea textarea-bordered h-20" placeholder={t('modal.rulesTHPlaceholder')}
                        value={formData.rulesTH} onChange={e => setFormData({...formData, rulesTH: e.target.value})}></textarea>
                  </div>
               </div>

               {/* 右侧：选择商品 (套餐内容) */}
               <div className="space-y-4 flex flex-col h-full">
                  <div className="flex justify-between items-center">
                     <h4 className="font-bold text-sm text-primary uppercase tracking-wider">{t('modal.packageProducts')}</h4>
                     <span className="text-xs text-base-content/60">{t('modal.selectProducts')}</span>
                  </div>

                  <div className="flex-1 border rounded-lg overflow-y-auto max-h-[400px] bg-base-200 p-2">
                     {products.length === 0 ? (
                        <div className="text-center p-8 text-base-content/50">
                           {t('modal.noProducts')}
                        </div>
                     ) : (
                        products.map(product => {
                           const isSelected = selection.has(product.product_id);
                           const quantity = selection.get(product.product_id) || 1;

                           return (
                              <div key={product.product_id} className={`flex items-center gap-3 p-3 mb-2 rounded-lg border transition-all ${isSelected ? 'bg-base-100 border-primary shadow-sm' : 'bg-base-100/50 border-transparent opacity-70 hover:opacity-100'}`}>
                                 {/* Checkbox */}
                                 <input
                                    type="checkbox"
                                    className="checkbox checkbox-primary"
                                    checked={isSelected}
                                    onChange={() => toggleProduct(product.product_id)}
                                 />

                                 {/* 商品图 */}
                                 <div className="w-10 h-10 relative rounded overflow-hidden bg-base-300 shrink-0">
                                    {product.image_urls?.[0] && <Image src={product.image_urls[0]} alt="" fill className="object-cover" unoptimized />}
                                 </div>

                                 {/* 名称 & 价格 */}
                                 <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">{product.name?.th}</div>
                                    <div className="text-xs text-base-content/60">{t('modal.originalPrice')}: ฿{product.original_price}</div>
                                 </div>

                                 {/* 数量输入 (仅选中时显示) */}
                                 {isSelected && (
                                    <div className="flex items-center gap-1">
                                       <span className="text-xs">x</span>
                                       <input
                                          type="number"
                                          className="input input-sm input-bordered w-16 text-center px-1"
                                          value={quantity}
                                          min={1}
                                          onChange={(e) => updateQuantity(product.product_id, parseInt(e.target.value))}
                                       />
                                    </div>
                                 )}
                              </div>
                           );
                        })
                     )}
                  </div>

                  {/* 价格计算面板 */}
                  <div className="bg-base-200 p-4 rounded-lg space-y-2">
                     <div className="flex justify-between text-sm">
                        <span>{t('modal.totalOriginalPrice')}:</span>
                        <span className="font-bold line-through text-base-content/60">฿{calculateTotalOriginalPrice()}</span>
                     </div>
                     <div className="flex justify-between text-lg font-bold text-primary">
                        <span>{t('modal.packagePrice')}:</span>
                        <span>฿{formData.sellingPrice || 0}</span>
                     </div>
                  </div>

               </div>
            </div>

            <div className="modal-action border-t mt-6 pt-4">
              <button className="btn" onClick={() => setIsModalOpen(false)}>{t('modal.cancel')}</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={loading || isUploading}>
                 {loading ? t('modal.saving') : t('modal.save')}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
