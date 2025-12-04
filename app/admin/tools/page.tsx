// 文件: app/admin/tools/page.tsx
// 管理员工具页面 - 批量更新商户位置

'use client';

import { useState } from 'react';
import { HiLocationMarker, HiRefresh } from 'react-icons/hi';

export default function AdminToolsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    updated?: number;
    failed?: number;
    total?: number;
    errors?: string[];
  } | null>(null);

  const handleUpdateLocations = async () => {
    if (!confirm('确定要批量更新所有商户的位置信息吗？')) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/update-merchant-locations', {
        method: 'POST',
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        alert(data.message);
      } else {
        alert(`失败: ${data.message}`);
      }
    } catch (error) {
      console.error('批量更新位置错误:', error);
      setResult({
        success: false,
        message: '网络错误，请稍后重试',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-4 lg:p-8">
      <h1 className="text-3xl font-bold mb-6">管理员工具</h1>

      {/* 批量更新位置 */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title flex items-center gap-2">
            <HiLocationMarker className="text-primary" />
            批量更新商户位置
          </h2>
          <p className="text-base-content/70">
            自动从商户的 Google Maps 链接中提取经纬度，并更新到数据库。
          </p>

          <div className="alert alert-info mt-4">
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
              ></path>
            </svg>
            <div>
              <div className="font-bold">操作说明</div>
              <div className="text-sm">
                1. 确保商户已填写 Google Maps 链接（google_maps_link）
                <br />
                2. 点击下方按钮开始批量更新
                <br />
                3. 系统会自动提取经纬度并保存到 latitude 和 longitude 字段
              </div>
            </div>
          </div>

          <div className="card-actions justify-end mt-4">
            <button
              className="btn btn-primary"
              onClick={handleUpdateLocations}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  处理中...
                </>
              ) : (
                <>
                  <HiRefresh className="w-5 h-5" />
                  开始更新
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 结果显示 */}
      {result && (
        <div className={`alert ${result.success ? 'alert-success' : 'alert-error'} mb-6`}>
          <div className="w-full">
            <div className="font-bold mb-2">{result.message}</div>
            {result.total !== undefined && (
              <div className="text-sm space-y-1">
                <p>总计: {result.total} 个商户</p>
                <p>成功: {result.updated} 个</p>
                <p>失败: {result.failed} 个</p>
              </div>
            )}
            {result.errors && result.errors.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer font-semibold">
                  查看错误详情 ({result.errors.length} 个)
                </summary>
                <ul className="list-disc list-inside mt-2 text-xs space-y-1 max-h-60 overflow-y-auto">
                  {result.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">支持的 Google Maps 链接格式</h2>
          <ul className="list-disc list-inside space-y-2 text-sm text-base-content/70">
            <li>
              短链接: <code>https://maps.app.goo.gl/xxxxx</code>
            </li>
            <li>
              标准链接: <code>https://www.google.com/maps/@13.7563,100.5018,15z</code>
            </li>
            <li>
              地点链接: <code>https://www.google.com/maps/place/xxx/@13.7563,100.5018</code>
            </li>
            <li>
              查询链接: <code>https://www.google.com/maps?q=13.7563,100.5018</code>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
