// app/actions/merchantDesign.ts

export interface DisplayConfig {
  show_stock: boolean;
  show_sales_count: boolean;
  grid_cols: 1 | 2;
}

export interface MerchantCustomization {
  merchant_id: string;
  plan_level: 'free' | 'pro' | 'enterprise';
  template_id: string;
  theme_primary_color: string;
  theme_secondary_color: string;
  button_style: 'rounded' | 'pill' | 'square';
  font_family: string;
  cover_image_url?: string;
  background_image_url?: string;
  display_config: DisplayConfig;
  homepage_styles?: Record<string, unknown>; 
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 创建默认配置
export const defaultMerchantCustomization: MerchantCustomization = {
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
};

// 类型保护函数，确保数据符合 MerchantCustomization 类型
function isValidMerchantCustomization(data: unknown): data is MerchantCustomization {
  return (
    typeof data === 'object' &&
    data !== null &&
    'merchant_id' in data &&
    typeof (data as MerchantCustomization).merchant_id === 'string' &&
    'plan_level' in data &&
    ['free', 'pro', 'enterprise'].includes((data as MerchantCustomization).plan_level) &&
    'template_id' in data &&
    typeof (data as MerchantCustomization).template_id === 'string' &&
    'theme_primary_color' in data &&
    typeof (data as MerchantCustomization).theme_primary_color === 'string' &&
    'theme_secondary_color' in data &&
    typeof (data as MerchantCustomization).theme_secondary_color === 'string' &&
    'button_style' in data &&
    ['rounded', 'pill', 'square'].includes((data as MerchantCustomization).button_style) &&
    'font_family' in data &&
    typeof (data as MerchantCustomization).font_family === 'string' &&
    'display_config' in data &&
    typeof (data as MerchantCustomization).display_config === 'object' &&
    (data as MerchantCustomization).display_config !== null &&
    'show_stock' in (data as MerchantCustomization).display_config &&
    typeof (data as MerchantCustomization).display_config.show_stock === 'boolean' &&
    'show_sales_count' in (data as MerchantCustomization).display_config &&
    typeof (data as MerchantCustomization).display_config.show_sales_count === 'boolean' &&
    'grid_cols' in (data as MerchantCustomization).display_config &&
    [1, 2].includes((data as MerchantCustomization).display_config.grid_cols)
  );
}

// 数据转换函数
function normalizeMerchantCustomization(data: unknown): MerchantCustomization {
  if (isValidMerchantCustomization(data)) {
    return data;
  }
  
  // 如果数据不完整，使用默认值填充
  const partialData = data as Partial<MerchantCustomization>;
  return {
    ...defaultMerchantCustomization,
    ...partialData,
    merchant_id: partialData.merchant_id || '',
    display_config: {
      ...defaultMerchantCustomization.display_config,
      ...(partialData.display_config || {})
    }
  };
}

export async function getMerchantCustomization(merchantId: string): Promise<ApiResponse<MerchantCustomization>> {
  try {
    const response = await fetch(`/api/merchants/${merchantId}/customization`);
    if (!response.ok) throw new Error('Failed to fetch customization');
    const data = await response.json();
    
    // 规范化数据
    const normalizedData = normalizeMerchantCustomization(data);
    
    return { success: true, data: normalizedData };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function updateMerchantCustomization(
  merchantId: string, 
  config: MerchantCustomization
): Promise<ApiResponse<MerchantCustomization>> {
  try {
    const response = await fetch(`/api/merchants/${merchantId}/customization`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!response.ok) throw new Error('Failed to update customization');
    const data = await response.json();
    
    // 规范化返回的数据
    const normalizedData = normalizeMerchantCustomization(data);
    
    return { success: true, data: normalizedData };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}