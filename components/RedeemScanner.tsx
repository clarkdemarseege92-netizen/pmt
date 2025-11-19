// 文件: /components/RedeemScanner.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
// 修正 1.1: 移除不存在的 Html5QrcodeSupportedMethod，只保留 Html5QrcodeScanner
import { Html5QrcodeScanner } from 'html5-qrcode'; 
// 修正 1.2: 修复 HiQrcode 为 HiQrCode，移除未使用的 HiTicket
import { HiCheckCircle, HiXCircle, HiQrCode, HiOutlineArrowPath } from 'react-icons/hi2'; 

// 修正 2: 定义更具体的类型来替代 'any'
interface RedemptionDetails {
    redemption_code: string;
    price: number;
    order_id: string;
}

// 状态类型
interface RedeemState {
    status: 'initial' | 'scanning' | 'success' | 'error';
    message: string;
    // 修正 2: 使用明确的类型或 null
    details: RedemptionDetails | null; 
}

export default function RedeemScanner() {
    const [state, setState] = useState<RedeemState>({
        status: 'initial',
        message: '点击开始扫描，对准客户的核销二维码。',
        details: null,
    });
    
    // 修正: 明确 useRef 的 DOM 类型
    const scannerRef = useRef<HTMLDivElement>(null); 
    const html5QrcodeScannerRef = useRef<Html5QrcodeScanner | null>(null); 

    // 使用 useCallback 包装 handleRedeem，并包含 state.status 作为依赖
    const handleRedeem = useCallback(async (redemption_code: string) => {
        // 阻止在成功/处理中状态重复触发
        if (state.status === 'scanning' || state.status === 'success') return; 

        // 临时设置状态为 scanning，避免短时间内多次触发
        setState(prev => ({ ...prev, status: 'scanning', message: '正在验证核销码...' }));

        try {
            const response = await fetch('/api/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ redemption_code }),
            });

            const result = await response.json();
            
            // 确保 result.order_details 包含所有 RedemptionDetails 字段
            const orderDetails: RedemptionDetails = result.order_details;

            if (response.ok && result.success) {
                // 核销成功
                setState({
                    status: 'success',
                    message: `核销成功！订单 ID: ${orderDetails.order_id.slice(0, 8)}...`,
                    details: orderDetails,
                });
                
                // 使用 clear() 停止扫描器
                html5QrcodeScannerRef.current?.clear().catch(console.error); 
                html5QrcodeScannerRef.current = null;
            } else {
                // 核销失败（无效码、已使用等）
                setState({
                    status: 'error',
                    message: `核销失败: ${result.message}`,
                    details: null, // 失败时 details 为 null
                });
            }
        } catch (error) {
            console.error(error);
            setState({
                status: 'error',
                message: '网络错误或服务器连接失败。',
                details: null,
            });
        }
    }, [state.status]); 

    // 重置所有状态并重启 (用于按钮点击)
    const resetAndRestart = () => {
        if (html5QrcodeScannerRef.current) {
            // clear() 返回 Promise
            html5QrcodeScannerRef.current.clear().then(() => {
                html5QrcodeScannerRef.current = null;
                setState({ status: 'initial', message: '点击开始扫描，对准客户的核销二维码。', details: null });
            }).catch(console.error);
        } else {
             setState({ status: 'initial', message: '点击开始扫描，对准客户的核销二维码。', details: null });
        }
    }

    // 使用 useEffect 来管理扫描器的生命周期
    useEffect(() => {
        const elementId = 'qr-code-reader';

        // 只有在状态为 'scanning' 且扫描器未初始化时才执行
        if (state.status === 'scanning' && !html5QrcodeScannerRef.current && scannerRef.current) {
            
            // 确保容器DOM节点存在
            if (!document.getElementById(elementId)) return;

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                // 使用字符串 'environment' 优先后置摄像头
                facingMode: 'environment', 
            };

            const scanner = new Html5QrcodeScanner(
                elementId,
                config,
                false // 不显示 UI 上的 “选择摄像头” 选项
            );
            
            html5QrcodeScannerRef.current = scanner;

            // 定义扫描成功的回调函数
            const onScanSuccess = (decodedText: string) => {
                handleRedeem(decodedText);
            };

            // 启动扫描器
            scanner.render(onScanSuccess, () => {
                // 修正 3: 移除未使用的 errorMessage 参数，解决 ESLint 警告
            });
        }

        // 清理函数：在组件卸载或状态改变时停止扫描器
        return () => {
            if (html5QrcodeScannerRef.current) {
                html5QrcodeScannerRef.current.clear().then(() => {
                    html5QrcodeScannerRef.current = null;
                }).catch(console.error);
            }
        };
    }, [state.status, handleRedeem]); 

    // 渲染 Alert 提示框 (保持不变)
    const renderAlert = () => {
        switch (state.status) {
            case 'success':
                return (
                    <div role="alert" className="alert alert-success mt-4">
                        <HiCheckCircle className="w-6 h-6" />
                        <span>{state.message}</span>
                        {state.details && (
                            <div className="text-sm">
                                ฿{state.details.price} | 订单码: {state.details.redemption_code}
                            </div>
                        )}
                    </div>
                );
            case 'error':
                return (
                    <div role="alert" className="alert alert-error mt-4">
                        <HiXCircle className="w-6 h-6" />
                        <span>{state.message}</span>
                    </div>
                );
            case 'scanning':
                return (
                    <div role="alert" className="alert mt-4">
                        <span className="loading loading-spinner"></span>
                        <span>{state.message}</span>
                    </div>
                );
            default:
                return null;
        }
    };
    
    // 启动扫描器的函数
    const startScanning = () => {
         // 必须先清理旧的scanner实例（如果存在）
        if (html5QrcodeScannerRef.current) {
            html5QrcodeScannerRef.current.clear().then(() => {
                html5QrcodeScannerRef.current = null;
                setState({ status: 'scanning', message: '正在启动摄像头并扫描...' , details: null});
            }).catch(() => {
                // 如果 clear 失败，尝试直接设置状态
                html5QrcodeScannerRef.current = null;
                setState({ status: 'scanning', message: '正在启动摄像头并扫描...' , details: null});
            });
        } else {
             setState({ status: 'scanning', message: '正在启动摄像头并扫描...' , details: null});
        }
    }


    return (
        <div className="w-full max-w-lg mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <HiQrCode className="w-6 h-6"/> 请打开摄像头 扫描客户的二维码
            </h2>

            <div className="card bg-base-100 shadow-xl border">
                <div className="card-body p-4 text-center">
                    {/* 只有在 initial 或 error 状态下才显示“开始”按钮 */}
                    {state.status === 'initial' || state.status === 'error' ? (
                        <button className="btn btn-lg btn-primary" onClick={startScanning}>
                            <HiQrCode className="w-6 h-6"/> 开始扫码核销
                        </button>
                    ) : (
                        <div className="relative w-full aspect-square overflow-hidden rounded-lg bg-gray-900">
                            {/* 扫描器容器 */}
                            <div id="qr-code-reader" ref={scannerRef} className="w-full h-full">
                                {/* 扫描器将在此渲染 */}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {renderAlert()}

            {(state.status === 'success' || state.status === 'error' || state.status === 'scanning') && (
                <div className="text-center mt-4">
                    <button className="btn btn-sm btn-outline mt-2" onClick={resetAndRestart}>
                        <HiOutlineArrowPath className="w-4 h-4"/> 重新开始
                    </button>
                </div>
            )}
        </div>
    );
}