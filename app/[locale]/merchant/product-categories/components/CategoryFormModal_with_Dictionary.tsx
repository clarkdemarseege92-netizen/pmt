// app/[locale]/merchant/product-categories/components/CategoryFormModal_with_Dictionary.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { HiXMark } from 'react-icons/hi2';
import { createCategoryWithDictionary, updateCategoryWithDictionary } from '@/app/actions/product-dictionary';
import type { CategoryStats } from '@/app/actions/merchant-categories/merchant-categories';
import { DictionaryInput, type MultilingualName } from './DictionaryInput';

type CategoryFormModalProps = {
  merchantId: string;
  category?: CategoryStats; // 如果提供，则为编辑模式
  onClose: () => void;
  onSuccess: () => void;
};

// 常用 emoji 图标
const COMMON_ICONS = [
  // 餐饮类
  '☕', '🍕', '🍔', '🍟', '🌮', '🍱', '🍜', '🍰', '🧁', '🍩',
  '🥤', '🍺', '🍷', '🧃', '🥛', '🍞', '🥐', '🥯', '🧀', '🍗',
  '🍖', '🥓', '🍳', '🥞', '🧇', '🥗', '🍲', '🍛', '🍝', '🥘',
  '🍣', '🍤', '🦞', '🦀', '🐟', '🥟', '🍙', '🍚', '🥡', '🍌',
  '🍎', '🍊', '🍋', '🍇', '🍓', '🫐', '🥝', '🍑', '🥥', '🍒',
  // 服务类
  '💇', '💇‍♀️', '💇‍♂️', '💆', '💆‍♀️', '💆‍♂️', '💅', '🧖', '🧖‍♀️', '🧖‍♂️',
  // 运动健身类
  '🏋️', '🏋️‍♀️', '🏋️‍♂️', '🤸', '🤸‍♀️', '🤸‍♂️', '🧘', '🧘‍♀️', '🧘‍♂️', '🏃',
  '🏃‍♀️', '🏃‍♂️', '🚴', '🚴‍♀️', '🚴‍♂️', '⛹️', '⛹️‍♀️', '⛹️‍♂️', '🏊', '🏊‍♀️',
  // 医疗健康类
  '💊', '💉', '🩺', '🏥', '⚕️', '🧬', '🩹', '🌡️',
  // 其他服务类
  '✂️', '🎨', '🖌️', '🎭', '🎪', '🎬', '📸', '🎵', '🎸', '🎹',
  '📚', '📖', '✏️', '🖊️', '🛒', '🛍️', '💼', '👔', '👗', '👠',
  '🌺', '🌸', '🌼', '🌻', '🌷', '🌹', '💐', '🎁', '🎀', '🎈',
  // 通用图标
  '📦', '🔥', '❄️', '🌶️', '🍯', '🧂', '🥄', '🍴', '🥢', '⭐',
  '❤️', '💚', '💙', '💜', '🧡', '💛', '🖤', '🤍', '💗', '✨'
];

export function CategoryFormModalWithDictionary({ merchantId, category, onClose, onSuccess }: CategoryFormModalProps) {
  const t = useTranslations('productCategories');
  const isEditMode = !!category;

  // Helper function to extract multilingual name from category (supports both old TEXT and new JSONB formats)
  const extractMultilingualName = (categoryName: string | MultilingualName | null | undefined): MultilingualName => {
    if (!categoryName) {
      return { th: '', en: '', zh: '' };
    }

    // If it's already a MultilingualName object (new JSONB format)
    if (typeof categoryName === 'object' && categoryName !== null) {
      return {
        th: categoryName.th || '',
        en: categoryName.en || '',
        zh: categoryName.zh || ''
      };
    }

    // If it's a string (old TEXT format), treat as Thai name
    return {
      th: typeof categoryName === 'string' ? categoryName : '',
      en: '',
      zh: ''
    };
  };

  // 多语言名称状态
  const [name, setName] = useState<MultilingualName>(
    extractMultilingualName(category?.category_name)
  );

  const [icon, setIcon] = useState(category?.icon || '📦');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dictionaryMessage, setDictionaryMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDictionaryMessage(null);

    // 验证
    if (!name.th.trim()) {
      setError(t('validation.nameRequired'));
      return;
    }

    if (!name.en.trim()) {
      setError('English name is required'); // 新增验证
      return;
    }

    if (name.th.length > 50 || name.en.length > 50) {
      setError(t('validation.nameTooLong'));
      return;
    }

    setIsSubmitting(true);

    try {
      let result;

      if (isEditMode) {
        // 编辑模式
        result = await updateCategoryWithDictionary(
          {
            category_id: category.category_id,
            icon: icon || undefined,
          },
          name, // 传递多语言名称
          true  // auto_add_to_dictionary
        );
      } else {
        // 创建模式
        result = await createCategoryWithDictionary({
          merchant_id: merchantId,
          name: name,
          icon: icon || undefined,
          auto_add_to_dictionary: true
        });
      }

      if (result.success) {
        // 显示字典操作结果
        if (result.dictionary_action === 'found_exact') {
          setDictionaryMessage('使用了字典中的标准翻译');
        } else if (result.dictionary_action === 'added_new') {
          setDictionaryMessage('新翻译已添加到字典，感谢您的贡献！');
        }

        // 延迟一下让用户看到消息，然后关闭
        setTimeout(() => {
          onSuccess();
        }, 800);
      } else {
        setError(result.error || t('error.unknown'));
      }
    } catch (err) {
      console.error('Error saving category:', err);
      setError(t('error.unknown'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">
            {isEditMode ? t('editCategory') : t('addCategory')}
          </h3>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <HiXMark className="w-5 h-5" />
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

          {/* 多语言名称输入（使用 DictionaryInput 组件） */}
          <DictionaryInput
            value={name}
            onChange={setName}
            disabled={isSubmitting}
            label={t('form.name')}
            required={true}
            placeholder={t('form.namePlaceholder')}
          />

          {/* 图标选择 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">{t('form.icon')}</span>
            </label>

            {/* 当前选中的图标 */}
            <div className="flex items-center gap-4 mb-3">
              <div className="text-5xl">{icon}</div>
              <div>
                <p className="text-sm text-base-content/70">{t('form.currentIcon')}</p>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setIcon('📦')}
                  disabled={isSubmitting}
                >
                  {t('form.resetIcon')}
                </button>
              </div>
            </div>

            {/* 图标网格 */}
            <div className="grid grid-cols-10 gap-2 p-4 bg-base-200 rounded-lg max-h-48 overflow-y-auto">
              {COMMON_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`
                    btn btn-sm btn-square text-2xl
                    ${icon === emoji ? 'btn-primary' : 'btn-ghost'}
                  `}
                  onClick={() => setIcon(emoji)}
                  disabled={isSubmitting}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <label className="label">
              <span className="label-text-alt text-base-content/60">
                {t('form.iconHint')}
              </span>
            </label>
          </div>

          {/* 按钮 */}
          <div className="modal-action">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !name.th.trim() || !name.en.trim()}
            >
              {isSubmitting && <span className="loading loading-spinner"></span>}
              {isEditMode ? t('save') : t('create')}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
