// app/actions/merchant-slug.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { validateSlugFormat, sanitizeSlug } from '@/app/utils/slug-validation';

/**
 * Get merchant slug by merchant ID
 */
export async function getMerchantSlug(merchantId: string): Promise<{
  success: boolean;
  slug?: string;
  customSlug?: string;
  error?: string;
}> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('merchants')
      .select('slug, custom_slug')
      .eq('merchant_id', merchantId)
      .single();

    if (error) {
      console.error('Error fetching merchant slug:', error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Merchant not found' };
    }

    return {
      success: true,
      slug: data.slug || undefined,
      customSlug: data.custom_slug || undefined
    };
  } catch (error) {
    console.error('Unexpected error in getMerchantSlug:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update merchant custom slug
 */
export async function updateMerchantSlug(
  merchantId: string,
  customSlug: string
): Promise<{
  success: boolean;
  slug?: string;
  error?: string;
  message?: string;
}> {
  try {
    const supabase = await createSupabaseServerClient();

    // Validate slug format on client side first
    const validationError = validateSlugFormat(customSlug);
    if (validationError) {
      return { success: false, error: validationError };
    }

    // Check if slug already exists (case-insensitive)
    const sanitizedSlug = sanitizeSlug(customSlug);
    const { data: existing } = await supabase
      .from('merchants')
      .select('merchant_id')
      .eq('slug', sanitizedSlug)
      .neq('merchant_id', merchantId)
      .single();

    if (existing) {
      return {
        success: false,
        error: 'This slug is already taken. Please choose another one.'
      };
    }

    // Update custom_slug (trigger will handle slug generation)
    const { data, error } = await supabase
      .from('merchants')
      .update({ custom_slug: customSlug })
      .eq('merchant_id', merchantId)
      .select('slug')
      .single();

    if (error) {
      console.error('Error updating merchant slug:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      slug: data?.slug,
      message: 'Slug updated successfully'
    };
  } catch (error) {
    console.error('Unexpected error in updateMerchantSlug:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Clear merchant slug
 */
export async function clearMerchantSlug(merchantId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from('merchants')
      .update({ custom_slug: null })
      .eq('merchant_id', merchantId);

    if (error) {
      console.error('Error clearing merchant slug:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: 'Slug cleared successfully'
    };
  } catch (error) {
    console.error('Unexpected error in clearMerchantSlug:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get merchant by slug (for shop page)
 */
export async function getMerchantBySlug(slug: string): Promise<{
  success: boolean;
  merchantId?: string;
  error?: string;
}> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('merchants')
      .select('merchant_id')
      .eq('slug', slug.toLowerCase())
      .single();

    if (error) {
      console.error('Error fetching merchant by slug:', error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Merchant not found' };
    }

    return { success: true, merchantId: data.merchant_id };
  } catch (error) {
    console.error('Unexpected error in getMerchantBySlug:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}


/**
 * Check if slug is available
 */
export async function checkSlugAvailability(
  slug: string,
  currentMerchantId?: string
): Promise<{
  available: boolean;
  suggestion?: string;
}> {
  try {
    const supabase = await createSupabaseServerClient();
    const sanitized = sanitizeSlug(slug);

    const query = supabase
      .from('merchants')
      .select('merchant_id')
      .eq('slug', sanitized);

    if (currentMerchantId) {
      query.neq('merchant_id', currentMerchantId);
    }

    const { data } = await query.single();

    if (data) {
      // Slug is taken, generate suggestion
      const suggestion = await generateSlugSuggestion(sanitized);
      return { available: false, suggestion };
    }

    return { available: true };
  } catch (error) {
    // If no results, slug is available
    return { available: true };
  }
}

/**
 * Generate slug suggestion if the desired one is taken
 */
async function generateSlugSuggestion(baseSlug: string): Promise<string> {
  const supabase = await createSupabaseServerClient();

  for (let i = 1; i <= 99; i++) {
    const suggestion = `${baseSlug}-${i}`;
    const { data } = await supabase
      .from('merchants')
      .select('merchant_id')
      .eq('slug', suggestion)
      .single();

    if (!data) {
      return suggestion;
    }
  }

  // If all numbered suggestions are taken, add random suffix
  const random = Math.random().toString(36).substring(2, 6);
  return `${baseSlug}-${random}`;
}
