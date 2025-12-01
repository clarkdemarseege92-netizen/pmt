"use client";

import { useState } from "react";
import { HiPlus, HiPencil, HiTrash, HiChevronRight, HiFolder, HiFolderOpen, HiPhoto, HiEye, HiEyeSlash } from "react-icons/hi2";
import Image from "next/image";

// 分类类型定义
interface Category {
  category_id: string;
  name: string;
  parent_id: string | null;
  description?: string;
  icon_url?: string;
  is_active?: boolean;
  sort_order?: number;
}

interface CategoryManagementProps {
  initialCategories: Category[];
}

export default function CategoryManagement({ initialCategories }: CategoryManagementProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // 获取一级分类（parent_id 为 null）
  const primaryCategories = categories.filter(cat => !cat.parent_id);

  // 获取指定父分类的子分类
  const getSubCategories = (parentId: string) => {
    return categories.filter(cat => cat.parent_id === parentId);
  };

  // 切换分类展开/收起
  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // 添加分类
  const handleAddCategory = async (formData: { name: string; parent_id: string | null; description?: string; icon_url?: string; is_active?: boolean }) => {
    try {
      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('添加失败');

      const newCategory = await response.json();
      setCategories([...categories, newCategory]);
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('添加分类失败:', error);
      alert('添加分类失败，请重试');
    }
  };

  // 更新分类
  const handleUpdateCategory = async (categoryId: string, formData: { name: string; description?: string; icon_url?: string; is_active?: boolean }) => {
    try {
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('更新失败');

      const updatedCategory = await response.json();
      setCategories(categories.map(cat => cat.category_id === categoryId ? updatedCategory : cat));
      setIsEditModalOpen(false);
      setEditingCategory(null);
    } catch (error) {
      console.error('更新分类失败:', error);
      alert('更新分类失败，请重试');
    }
  };

  // 切换分类显示状态
  const handleToggleActive = async (categoryId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (!response.ok) throw new Error('更新失败');

      const updatedCategory = await response.json();
      setCategories(categories.map(cat => cat.category_id === categoryId ? updatedCategory : cat));
    } catch (error) {
      console.error('切换状态失败:', error);
      alert('切换状态失败，请重试');
    }
  };

  // 删除分类
  const handleDeleteCategory = async (categoryId: string) => {
    const subCategories = getSubCategories(categoryId);
    if (subCategories.length > 0) {
      alert('该分类下有子分类，无法删除。请先删除所有子分类。');
      return;
    }

    if (!confirm('确定要删除此分类吗？')) return;

    try {
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('删除失败');

      setCategories(categories.filter(cat => cat.category_id !== categoryId));
    } catch (error) {
      console.error('删除分类失败:', error);
      alert('删除分类失败，请重试');
    }
  };

  return (
    <div className="min-h-screen bg-base-200 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">行业分类管理</h1>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-primary gap-2"
          >
            <HiPlus className="w-5 h-5" />
            添加一级分类
          </button>
        </div>

        {/* 分类列表 */}
        <div className="bg-base-100 rounded-lg shadow-lg">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>分类名称</th>
                  <th>图标</th>
                  <th>描述</th>
                  <th>状态</th>
                  <th className="text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {primaryCategories.map(primaryCat => (
                  <CategoryRow
                    key={primaryCat.category_id}
                    category={primaryCat}
                    level={0}
                    subCategories={getSubCategories(primaryCat.category_id)}
                    isExpanded={expandedCategories.has(primaryCat.category_id)}
                    onToggle={toggleCategory}
                    onEdit={(cat) => {
                      setEditingCategory(cat);
                      setIsEditModalOpen(true);
                    }}
                    onDelete={handleDeleteCategory}
                    onToggleActive={handleToggleActive}
                    onAddSub={() => {
                      setEditingCategory(primaryCat);
                      setIsAddModalOpen(true);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 添加分类对话框 */}
        {isAddModalOpen && (
          <AddCategoryModal
            parentCategory={editingCategory}
            onClose={() => {
              setIsAddModalOpen(false);
              setEditingCategory(null);
            }}
            onSubmit={handleAddCategory}
          />
        )}

        {/* 编辑分类对话框 */}
        {isEditModalOpen && editingCategory && (
          <EditCategoryModal
            category={editingCategory}
            onClose={() => {
              setIsEditModalOpen(false);
              setEditingCategory(null);
            }}
            onSubmit={handleUpdateCategory}
          />
        )}
      </div>
    </div>
  );
}

// 分类行组件（递归显示）
interface CategoryRowProps {
  category: Category;
  level: number;
  subCategories: Category[];
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onEdit: (cat: Category) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, currentStatus: boolean) => void;
  onAddSub: () => void;
}

function CategoryRow({ category, level, subCategories, isExpanded, onToggle, onEdit, onDelete, onToggleActive, onAddSub }: CategoryRowProps) {
  const hasChildren = subCategories.length > 0;

  return (
    <>
      <tr className="hover">
        <td>
          <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 2}rem` }}>
            {hasChildren ? (
              <button onClick={() => onToggle(category.category_id)} className="btn btn-ghost btn-xs btn-square">
                {isExpanded ? <HiFolderOpen className="w-4 h-4" /> : <HiFolder className="w-4 h-4" />}
              </button>
            ) : (
              <span className="w-8" />
            )}
            <span className="font-medium">{category.name}</span>
            {level === 0 && (
              <span className="badge badge-primary badge-sm">一级</span>
            )}
            {level === 1 && (
              <span className="badge badge-secondary badge-sm">二级</span>
            )}
          </div>
        </td>
        <td>
          <div className="flex items-center gap-2">
            {category.icon_url ? (
              <div className="avatar">
                <div className="w-10 h-10 rounded">
                  <Image src={category.icon_url} alt={category.name} width={40} height={40} className="object-cover" />
                </div>
              </div>
            ) : (
              <span className="text-base-content/30">-</span>
            )}
          </div>
        </td>
        <td>
          <span className="text-sm text-base-content/60">{category.description || '-'}</span>
        </td>
        <td>
          <button
            onClick={() => onToggleActive(category.category_id, category.is_active ?? true)}
            className={`btn btn-sm gap-2 ${category.is_active !== false ? 'btn-success' : 'btn-ghost'}`}
          >
            {category.is_active !== false ? (
              <>
                <HiEye className="w-4 h-4" />
                显示中
              </>
            ) : (
              <>
                <HiEyeSlash className="w-4 h-4" />
                已隐藏
              </>
            )}
          </button>
        </td>
        <td>
          <div className="flex gap-2 justify-end">
            {level === 0 && (
              <button onClick={onAddSub} className="btn btn-sm btn-outline btn-success gap-1">
                <HiPlus className="w-4 h-4" />
                添加子分类
              </button>
            )}
            <button onClick={() => onEdit(category)} className="btn btn-sm btn-outline btn-info gap-1">
              <HiPencil className="w-4 h-4" />
              编辑
            </button>
            <button onClick={() => onDelete(category.category_id)} className="btn btn-sm btn-outline btn-error gap-1">
              <HiTrash className="w-4 h-4" />
              删除
            </button>
          </div>
        </td>
      </tr>

      {/* 递归显示子分类 */}
      {isExpanded && subCategories.map(subCat => (
        <CategoryRow
          key={subCat.category_id}
          category={subCat}
          level={level + 1}
          subCategories={[]}
          isExpanded={false}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleActive={onToggleActive}
          onAddSub={() => {}}
        />
      ))}
    </>
  );
}

// 添加分类对话框
interface AddCategoryModalProps {
  parentCategory: Category | null;
  onClose: () => void;
  onSubmit: (data: { name: string; parent_id: string | null; description?: string; icon_url?: string; is_active?: boolean }) => void;
}

function AddCategoryModal({ parentCategory, onClose, onSubmit }: AddCategoryModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon_url: '',
    is_active: true,
  });
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('上传失败');

      const data = await response.json();
      setFormData(prev => ({ ...prev, icon_url: data.url }));
    } catch (error) {
      console.error('上传图片失败:', error);
      alert('上传图片失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      parent_id: parentCategory?.category_id || null,
    });
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">
          {parentCategory ? `添加「${parentCategory.name}」的子分类` : '添加一级分类'}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">分类名称 *</span>
            </label>
            <input
              type="text"
              placeholder="例如：美食、泰餐"
              className="input input-bordered"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">分类图标（可选）</span>
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="file-input file-input-bordered w-full"
              disabled={uploading}
            />
            {uploading && <span className="loading loading-spinner loading-sm ml-2"></span>}
            {formData.icon_url && (
              <div className="mt-2">
                <Image src={formData.icon_url} alt="预览" width={60} height={60} className="rounded" />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, icon_url: '' })}
                  className="btn btn-xs btn-ghost mt-1"
                >
                  删除图片
                </button>
              </div>
            )}
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">描述（可选）</span>
            </label>
            <textarea
              className="textarea textarea-bordered"
              placeholder="分类描述"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="form-control mb-4">
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <span className="label-text">在平台显示此分类</span>
            </label>
          </div>

          <div className="modal-action">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={uploading}>
              添加
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button>close</button>
      </form>
    </dialog>
  );
}

// 编辑分类对话框
interface EditCategoryModalProps {
  category: Category;
  onClose: () => void;
  onSubmit: (id: string, data: { name: string; description?: string; icon_url?: string; is_active?: boolean }) => void;
}

function EditCategoryModal({ category, onClose, onSubmit }: EditCategoryModalProps) {
  const [formData, setFormData] = useState({
    name: category.name,
    description: category.description || '',
    icon_url: category.icon_url || '',
    is_active: category.is_active !== false,
  });
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('上传失败');

      const data = await response.json();
      setFormData(prev => ({ ...prev, icon_url: data.url }));
    } catch (error) {
      console.error('上传图片失败:', error);
      alert('上传图片失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(category.category_id, formData);
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">编辑分类</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">分类名称 *</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">分类图标（可选）</span>
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="file-input file-input-bordered w-full"
              disabled={uploading}
            />
            {uploading && <span className="loading loading-spinner loading-sm ml-2"></span>}
            {formData.icon_url && (
              <div className="mt-2">
                <Image src={formData.icon_url} alt="预览" width={60} height={60} className="rounded" />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, icon_url: '' })}
                  className="btn btn-xs btn-ghost mt-1"
                >
                  删除图片
                </button>
              </div>
            )}
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">描述（可选）</span>
            </label>
            <textarea
              className="textarea textarea-bordered"
              placeholder="分类描述"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="form-control mb-4">
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <span className="label-text">在平台显示此分类</span>
            </label>
          </div>

          <div className="modal-action">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={uploading}>
              保存
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button>close</button>
      </form>
    </dialog>
  );
}
