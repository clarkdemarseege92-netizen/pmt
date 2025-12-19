// app/utils/slug-validation.ts

/**
 * Validate slug format (client-side validation)
 */
export function validateSlugFormat(slug: string): string | null {
  if (!slug || slug.trim() === '') {
    return null; // Empty is allowed (means no slug)
  }

  const trimmed = slug.trim();

  // Check length
  if (trimmed.length < 3) {
    return 'Slug must be at least 3 characters long';
  }

  if (trimmed.length > 50) {
    return 'Slug must be no more than 50 characters';
  }

  // Check format: only letters, numbers, and hyphens
  if (!/^[a-zA-Z0-9-]+$/.test(trimmed)) {
    return 'Slug can only contain letters (a-z), numbers (0-9), and hyphens (-)';
  }

  // Cannot start or end with hyphen
  if (trimmed.startsWith('-') || trimmed.endsWith('-')) {
    return 'Slug cannot start or end with a hyphen';
  }

  // Cannot have consecutive hyphens
  if (/--/.test(trimmed)) {
    return 'Slug cannot contain consecutive hyphens';
  }

  // Must start with letter or number
  if (!/^[a-zA-Z0-9]/.test(trimmed)) {
    return 'Slug must start with a letter or number';
  }

  return null; // Valid
}

/**
 * Sanitize slug (convert to lowercase and clean up)
 */
export function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .substring(0, 50);
}
