// 文件: /components/PaymentUploadForm.tsx
"use client";

import { useState } from 'react';
import { HiArrowUpTray, HiOutlineDocumentCheck, HiOutlineReceiptPercent } from 'react-icons/hi2';
// 导入 react-qr-code
import QRCode from 'react-qr-code'; 

interface PaymentUploadFormProps {
    orderId: string;
    promptpayPayload: string; // 用于渲染二维码的 Payload
    paymentAmount: number;
}

export default function PaymentUploadForm({ orderId, promptpayPayload, paymentAmount }: PaymentUploadFormProps) {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'initial' | 'processing' | 'success' | 'error'>('initial');
    const [message, setMessage] = useState('');
    const [redemptionCode, setRedemptionCode] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus('initial'); // 重置状态
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setMessage('请上传支付凭证截图。');
            return;
        }

        setLoading(true);
        setStatus('processing');
        setMessage('正在提交凭证并进行 AI 验证...');

        try {
            // 1. 使用标准的 FormData 结构
            const formData = new FormData();
            formData.append('orderId', orderId);
            formData.append('file', file); // 直接发送文件对象

            // 2. 调用后端验证 API (Content-Type 由浏览器自动设置为 multipart/form-data)
            const response = await fetch('/api/verify-payment', {
                method: 'POST',
                // 重要：不要设置 Content-Type header，让浏览器自动处理 FormData 的边界
                body: formData, 
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setStatus('success');
                setMessage('支付验证成功！您的核销码已发放。');
                setRedemptionCode(result.redemptionCode);
            } else {
                setStatus('error');
                setMessage(`验证失败: ${result.message || '请检查凭证是否清晰或是否已付款。'}`);
            }

        } catch (error) {
            console.error('Verification Error:', error);
            setStatus('error');
            setMessage('网络或服务器连接错误。');
        } finally {
            setLoading(false);
        }
    };
    
    // 渲染二维码
    const renderQrCode = () => {
        // 确保只在客户端渲染
        if (typeof window === 'undefined') return null; 
        
        return (
             <div className="bg-white p-4 rounded-lg shadow-inner">
                <QRCode value={promptpayPayload} size={256} level="H" />
            </div>
        );
    };

    const renderStatus = () => {
        switch (status) {
            case 'success':
                return (
                    <div className="alert alert-success mt-4">
                        <HiOutlineDocumentCheck className="w-6 h-6"/>
                        <div>
                            <h3 className="font-bold">验证成功!</h3>
                            <p>{message}</p>
                            <p className="font-mono text-lg mt-1">核销码: **{redemptionCode}**</p>
                            <a href="/my/orders" className="link link-primary text-sm mt-2 block">前往我的订单查看</a>
                        </div>
                    </div>
                );
            case 'error':
                return (
                    <div className="alert alert-error mt-4">
                        <HiOutlineDocumentCheck className="w-6 h-6"/>
                        <div>
                            <h3 className="font-bold">验证失败</h3>
                            <p>{message}</p>
                        </div>
                    </div>
                );
            case 'processing':
                return (
                    <div className="alert mt-4">
                         <span className="loading loading-spinner"></span>
                         <span>{message}</span>
                    </div>
                );
            default:
                return message ? <p className="text-warning text-sm mt-2">{message}</p> : null;
        }
    }


    return (
        <div className="bg-base-100 p-6 rounded-box shadow-xl max-w-xl mx-auto">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <HiOutlineReceiptPercent className="w-6 h-6"/> 步骤 2: PromptPay 付款与凭证上传
            </h2>
            <div className="flex flex-col items-center space-y-4">
                
                {/* 1. 二维码显示区域 */}
                {promptpayPayload && renderQrCode()}

                <p className="text-xl font-bold text-primary">
                    请支付: ฿{paymentAmount.toFixed(2)}
                </p>
                <p className="text-sm text-center text-base-content/70">
                    订单 ID: {orderId.slice(0, 8)}...
                </p>

                <div className="divider">上传支付凭证</div>

                {/* 2. 上传表单 */}
                <form onSubmit={handleSubmit} className="w-full space-y-4">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">上传您的转账截图 (Slip)</span>
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="file-input file-input-bordered w-full"
                            disabled={loading || status === 'success'}
                        />
                         <label className="label">
                            <span className="label-text-alt text-error">
                                * 必须清晰显示收款账户 ID 和金额，否则验证将失败。
                            </span>
                        </label>
                    </div>

                    <button 
                        type="submit" 
                        className="btn btn-primary w-full" 
                        disabled={loading || !file || status === 'success'}
                    >
                        <HiArrowUpTray className="w-5 h-5"/> 
                        {loading ? '验证中...' : '确认付款并上传凭证'}
                    </button>
                </form>

                {/* 3. 状态显示 */}
                {renderStatus()}
            </div>
        </div>
    );
}