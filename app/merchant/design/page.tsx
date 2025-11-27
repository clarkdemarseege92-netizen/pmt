"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  getMerchantCustomization, 
  MerchantCustomization,
  DisplayConfig
} from '@/app/actions/merchantDesign';
import Image from "next/image";
import Link from "next/link";
import { 
  HiPaintBrush, 
  HiPhoto, 
  HiSwatch, 
  HiEye, 
  HiDevicePhoneMobile, 
  HiCheck, 
  HiArrowTopRightOnSquare 
} from "react-icons/hi2";

interface ApiResponse {
  success: boolean;
  data?: MerchantCustomization;
  error?: string;
  message?: string;
}

export default function MerchantDesignPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  
  const [config, setConfig] = useState<MerchantCustomization>({
    merchant_id: '',
    plan_level: 'free',
    template_id: 'default',
    theme_primary_color: '#3b82f6',
    theme_secondary_color: '#ffffff',
    button_style: 'rounded',
    font_family: 'sans',
    display_config: {
      show_stock: true,
      show_sales_count: true,
      grid_cols: 2
    }
  });

  const [uploading, setUploading] = useState<'cover' | 'bg' | null>(null);

  // API 调用函数
  const updateMerchantCustomizationViaAPI = async (
    merchantId: string, 
    config: MerchantCustomization
  ): Promise<ApiResponse> => {
    try {
      const response = await fetch(`/api/merchant/${merchantId}/customization`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          return { success: false, error: errorJson.error || errorText };
        } catch {
          return { success: false, error: errorText };
        }
      }

      const result = await response.json();
      return { success: true, data: result };
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      return { success: false, error: errorMessage };
    }
  };

  // 保存配置函数
  const handleSave = async () => {
    if (!merchantId) {
      alert('没有商户ID，无法保存');
      return;
    }
    
    setSaving(true);
    
    try {
      const res = await updateMerchantCustomizationViaAPI(merchantId, config);
      
      if (res.success) {
        alert("装修已保存！");
      } else {
        alert(`保存失败: ${res.error}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert(`保存失败: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: merchant } = await supabase
          .from('merchants')
          .select('merchant_id')
          .eq('owner_id', user.id)
          .single();

        if (merchant) {
          setMerchantId(merchant.merchant_id);
          const res = await getMerchantCustomization(merchant.merchant_id);
          if (res.success && res.data) {
            const normalizedData = {
              ...res.data,
              plan_level: (res.data.plan_level || 'free') as 'free' | 'pro' | 'enterprise',
              merchant_id: res.data.merchant_id || merchant.merchant_id,
              template_id: res.data.template_id || 'default',
              theme_primary_color: res.data.theme_primary_color || '#3b82f6',
              theme_secondary_color: res.data.theme_secondary_color || '#ffffff',
              button_style: (res.data.button_style || 'rounded') as 'rounded' | 'pill' | 'square',
              font_family: res.data.font_family || 'sans',
              display_config: {
                show_stock: res.data.display_config?.show_stock ?? true,
                show_sales_count: res.data.display_config?.show_sales_count ?? true,
                grid_cols: (res.data.display_config?.grid_cols || 2) as 1 | 2
              }
            };
            setConfig(normalizedData);
          } else {
            setConfig((prev: MerchantCustomization) => ({
              ...prev,
              merchant_id: merchant.merchant_id
            }));
          }
        }
      } catch (error) {
        console.error('初始化异常:', error);
      } finally {
        setLoading(false);
      }
    };
    
    init();
  }, []);

  const handleChange = (field: keyof MerchantCustomization, value: string | number | boolean) => {
    setConfig((prev: MerchantCustomization) => ({ ...prev, [field]: value }));
  };

  const handleDisplayChange = (field: keyof DisplayConfig, value: boolean | number) => {
    setConfig((prev: MerchantCustomization) => ({
      ...prev,
      display_config: { ...prev.display_config, [field]: value }
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'bg') => {
    if (!e.target.files?.[0] || !merchantId) return;
    const file = e.target.files[0];
    setUploading(type);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `design/${merchantId}/${type}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
          .from('products') 
          .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName);
      
      if (type === 'cover') handleChange('cover_image_url', publicUrl);
      if (type === 'bg') handleChange('background_image_url', publicUrl);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '上传失败';
      alert(`上传失败: ${errorMessage}`);
    } finally {
      setUploading(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center">
      <div className="text-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="mt-4 text-lg">加载商户信息...</p>
      </div>
    </div>
  );

  if (!merchantId) return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center">
      <div className="text-center max-w-md p-8">
        <HiPaintBrush className="w-16 h-16 text-warning mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">未找到商户信息</h2>
        <p className="text-base-content/70 mb-6">
          您还没有创建商户，或者当前账户没有关联的商户。
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-base-200 p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <HiPaintBrush className="text-primary" /> 店铺装修
          </h1>
          <p className="text-sm opacity-60">自定义您的店铺外观，打造独特品牌形象</p>
        </div>
        <div className="flex gap-3">
          {merchantId && (
            <Link 
              href={`/shop/${merchantId}`} 
              target="_blank"
              className="btn btn-outline gap-2"
            >
              <HiEye /> 预览店铺
            </Link>
          )}
          <button 
            className="btn btn-primary gap-2 min-w-[120px]" 
            onClick={handleSave} 
            disabled={saving}
          >
            {saving ? <span className="loading loading-spinner"></span> : <><HiCheck /> 保存发布</>}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 左侧编辑区域 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 全局风格 */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <h2 className="card-title text-lg mb-4"><HiSwatch /> 风格设置</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="form-control">
                  <label className="label"><span className="label-text font-bold">主题色 (Primary)</span></label>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="color" 
                      className="w-12 h-12 p-0 border-0 rounded-lg cursor-pointer shadow-sm"
                      value={config.theme_primary_color}
                      onChange={(e) => handleChange('theme_primary_color', e.target.value)}
                    />
                    <input 
                      type="text" 
                      className="input input-bordered w-full uppercase"
                      value={config.theme_primary_color}
                      onChange={(e) => handleChange('theme_primary_color', e.target.value)}
                    />
                  </div>
                  <span className="text-xs text-base-content/50 mt-1">影响按钮、链接和高亮元素</span>
                </div>

                <div className="form-control">
                  <label className="label"><span className="label-text font-bold">按钮样式</span></label>
                  <div className="join w-full">
                    <button 
                      className={`btn join-item flex-1 ${config.button_style === 'rounded' ? 'btn-active btn-neutral' : ''}`}
                      onClick={() => handleChange('button_style', 'rounded')}
                    >默认圆角</button>
                    <button 
                      className={`btn join-item flex-1 ${config.button_style === 'pill' ? 'btn-active btn-neutral' : ''}`}
                      onClick={() => handleChange('button_style', 'pill')}
                    >胶囊型</button>
                    <button 
                      className={`btn join-item flex-1 ${config.button_style === 'square' ? 'btn-active btn-neutral' : ''}`}
                      onClick={() => handleChange('button_style', 'square')}
                    >直角</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 图片素材 */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <h2 className="card-title text-lg mb-4"><HiPhoto /> 图片素材</h2>
              
              <div className="form-control mb-4">
                <label className="label"><span className="label-text font-bold">店铺封面图 (Header)</span></label>
                <div className="border-2 border-dashed border-base-300 rounded-xl p-4 text-center relative h-40 bg-base-200 group overflow-hidden">
                  {config.cover_image_url ? (
                    <Image src={config.cover_image_url} alt="Cover" fill className="object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-base-content/40">
                      <HiPhoto className="w-8 h-8 mb-2" />
                      <span>点击上传封面大图</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white font-bold">更换图片</span>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => handleImageUpload(e, 'cover')}
                    disabled={!!uploading}
                  />
                </div>
                {uploading === 'cover' && <progress className="progress progress-primary w-full mt-2"></progress>}
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text font-bold">全屏背景图 (Background)</span></label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 relative bg-base-200 rounded-lg border border-base-300 overflow-hidden shrink-0">
                    {config.background_image_url && <Image src={config.background_image_url} alt="BG" fill className="object-cover" />}
                  </div>
                  <div className="flex-1">
                    <input 
                      type="file" 
                      className="file-input file-input-bordered w-full" 
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'bg')}
                      disabled={!!uploading}
                    />
                    <div className="text-xs mt-2 flex gap-2">
                      {config.background_image_url && (
                        <button 
                          className="text-error hover:underline" 
                          onClick={() => handleChange('background_image_url', '')}
                        >
                          移除背景图
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {uploading === 'bg' && <progress className="progress progress-primary w-full mt-2"></progress>}
              </div>
            </div>
          </div>

          {/* 显示配置 */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <h2 className="card-title text-lg mb-4"><HiArrowTopRightOnSquare /> 页面布局</h2>
              
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-4">
                  <input 
                    type="checkbox" 
                    className="toggle toggle-primary" 
                    checked={config.display_config.show_stock}
                    onChange={(e) => handleDisplayChange('show_stock', e.target.checked)}
                  />
                  <span className="label-text">显示商品库存数量</span>
                </label>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-4">
                  <input 
                    type="checkbox" 
                    className="toggle toggle-primary" 
                    checked={config.display_config.show_sales_count}
                    onChange={(e) => handleDisplayChange('show_sales_count', e.target.checked)}
                  />
                  <span className="label-text">显示商品已售数量</span>
                </label>
              </div>

              <div className="form-control mt-4">
                <label className="label"><span className="label-text">商品列表排列</span></label>
                <div className="tabs tabs-boxed w-fit">
                  <a 
                    className={`tab ${config.display_config.grid_cols === 1 ? 'tab-active' : ''}`}
                    onClick={() => handleDisplayChange('grid_cols', 1)}
                  >单列大图</a> 
                  <a 
                    className={`tab ${config.display_config.grid_cols === 2 ? 'tab-active' : ''}`}
                    onClick={() => handleDisplayChange('grid_cols', 2)}
                  >双列瀑布流</a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧预览区域 */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <div className="flex items-center gap-2 mb-2 font-bold text-sm opacity-50 justify-center">
              <HiDevicePhoneMobile /> 实时预览效果
            </div>
            
            <div className="mockup-phone border-primary">
              <div className="camera"></div> 
              <div className="display">
                <div 
                  className="artboard artboard-demo phone-1 relative justify-start overflow-y-auto overflow-x-hidden w-full"
                  style={{
                    backgroundColor: '#f3f4f6',
                    backgroundImage: config.background_image_url ? `url(${config.background_image_url})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    '--preview-primary': config.theme_primary_color
                  } as React.CSSProperties}
                >
                  {/* 预览内容 */}
                  <div className="w-full bg-white pb-4 shadow-sm relative">
                    <div className="h-32 bg-gray-300 w-full relative">
                      {config.cover_image_url ? (
                        <Image src={config.cover_image_url} fill className="object-cover" alt="Cover" />
                      ) : (
                        <div className="w-full h-full bg-linear-to-r from-blue-100 to-purple-100"></div>
                      )}
                    </div>
                    <div className="px-4 -mt-8 flex justify-between items-end relative z-10">
                      <div className="w-16 h-16 rounded-full border-4 border-white bg-white shadow-md overflow-hidden relative">
                        <div className="w-full h-full bg-gray-200 grid place-items-center text-xs">Logo</div>
                      </div>
                      <div 
                        className="btn btn-sm text-white border-0 shadow-md"
                        style={{ 
                          backgroundColor: config.theme_primary_color,
                          borderRadius: config.button_style === 'pill' ? '9999px' : config.button_style === 'square' ? '0px' : '0.5rem'
                        }}
                      >关注</div>
                    </div>
                    <div className="px-4 mt-2">
                      <div className="h-4 w-32 bg-gray-800/10 rounded mb-1"></div>
                      <div className="h-3 w-48 bg-gray-800/5 rounded"></div>
                    </div>
                  </div>

                  <div className={`p-3 grid gap-3 w-full ${config.display_config.grid_cols === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="bg-white p-2 rounded-lg shadow-sm flex flex-col gap-2">
                        <div className="aspect-square bg-gray-100 rounded-md w-full relative overflow-hidden">
                          <div className="absolute inset-0 grid place-items-center text-gray-300 text-xs">Product</div>
                        </div>
                        <div className="h-3 w-3/4 bg-gray-800/10 rounded"></div>
                        <div className="flex justify-between items-center mt-auto">
                          <div className="h-4 w-8 bg-primary/20 rounded" style={{color: config.theme_primary_color}}></div>
                          <div 
                            className="w-6 h-6 rounded flex items-center justify-center text-white text-xs"
                            style={{ 
                              backgroundColor: config.theme_primary_color,
                              borderRadius: config.button_style === 'pill' ? '50%' : config.button_style === 'square' ? '0px' : '0.25rem'
                            }}
                          >+</div>
                        </div>
                        {(config.display_config.show_stock || config.display_config.show_sales_count) && (
                          <div className="text-[10px] text-gray-400 flex gap-1">
                            {config.display_config.show_stock && <span>库存99</span>}
                            {config.display_config.show_sales_count && <span>已售10</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center mt-4 text-sm opacity-50">
              * 仅为效果示意，实际展示可能略有不同
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}