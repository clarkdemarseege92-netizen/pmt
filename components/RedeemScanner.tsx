// 文件: /components/RedeemScanner.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { HiCheckCircle, HiXCircle, HiQrCode, HiOutlineArrowPath, HiCamera } from 'react-icons/hi2';
import { useTranslations } from 'next-intl';

interface RedemptionDetails {
    redemption_code: string;
    price: number;
    order_id: string;
}

interface RedeemState {
    status: 'initial' | 'scanning' | 'success' | 'error';
    message: string;
    details: RedemptionDetails | null;
}

export default function RedeemScanner() {
    const t = useTranslations('redeemScanner');

    const [state, setState] = useState<RedeemState>({
        status: 'initial',
        message: '',
        details: null,
    });

    const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
    const isInitializingRef = useRef(false);

    // ─── 核心逻辑：处理扫码结果 ───
    const handleRedeem = useCallback(async (redemption_code: string) => {
        // 尝试暂停摄像头
        if (html5QrcodeRef.current) {
            try { 
                await html5QrcodeRef.current.pause(); 
            } catch {
                // 忽略暂停失败
                console.warn('暂停摄像头失败');
            }
        }

        setState(prev => ({ ...prev, status: 'scanning', message: t('verifying') }));

        try {
            const response = await fetch('/api/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ redemption_code }),
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                await stopScanner(); // 成功后彻底关闭
                setState({
                    status: 'success',
                    message: t('redeemSuccess'),
                    details: result.order_details,
                });
            } else {
                // 验证失败：恢复摄像头允许重试
                if (html5QrcodeRef.current) {
                    try { 
                        await html5QrcodeRef.current.resume(); 
                    } catch (err) {
                        console.warn('恢复摄像头失败:', err);
                    }
                }
                setState(prev => ({
                    ...prev,
                    status: 'error',
                    message: `${t('redeemFailed')}: ${result.message || t('invalidCode')}`,
                    details: null,
                }));
                
                // 3秒后自动清除错误提示
                setTimeout(() => {
                    setState(current =>
                        current.status === 'error' && html5QrcodeRef.current
                            ? { ...current, status: 'scanning', message: t('aimAtQR') }
                            : current
                    );
                }, 3000);
            }
        } catch (error) {
            console.error(error);
            setState({
                status: 'error',
                message: t('networkError'),
                details: null,
            });
            await stopScanner();
        }
    }, [t]);

    // ─── 工具：停止扫描器 ───
    const stopScanner = async () => {
        if (html5QrcodeRef.current) {
            try {
                if (html5QrcodeRef.current.isScanning) {
                    await html5QrcodeRef.current.stop();
                }
                html5QrcodeRef.current.clear();
            } catch (error) {
                console.error("停止摄像头时出错:", error);
            }
            html5QrcodeRef.current = null;
        }
        isInitializingRef.current = false;
    };

    // ─── 核心逻辑：启动扫描器 ───
    const startScanner = async () => {
        if (isInitializingRef.current || html5QrcodeRef.current) return;
        
        // 权限预检查
        try {
            if (navigator.permissions && navigator.permissions.query) {
                const permissionName = 'camera' as unknown as PermissionName;
                const permissionStatus = await navigator.permissions.query({ name: permissionName });
                if (permissionStatus.state === 'denied') {
                    setState({ status: 'error', message: t('cameraPermissionDenied'), details: null });
                    return;
                }
            }
        } catch {
            console.log('浏览器不支持权限查询 API，跳过检查');
        }

        isInitializingRef.current = true;
        setState({ status: 'scanning', message: t('startingCamera'), details: null });

        // 启动超时熔断
        const timeoutId = setTimeout(() => {
            if (isInitializingRef.current) {
                console.error("摄像头启动超时");
                isInitializingRef.current = false;
                setState({ status: 'error', message: t('cameraTimeout'), details: null });
                stopScanner();
            }
        }, 10000);

        try {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const delayTime = isIOS ? 300 : 100;
            
            if (isIOS) console.log(`iOS 设备检测到，应用 ${delayTime}ms 延时`);

            await new Promise(resolve => setTimeout(resolve, delayTime));

            const elementId = "qr-code-reader";
            if (!document.getElementById(elementId)) {
                throw new Error("扫描组件 DOM 未加载");
            }

            const html5Qrcode = new Html5Qrcode(elementId);
            html5QrcodeRef.current = html5Qrcode;

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
            };

            // 【关键修改】移除未使用的错误回调参数
            await html5Qrcode.start(
                { facingMode: "environment" }, 
                config,
                (decodedText) => {
                    console.log('扫码成功:', decodedText);
                    handleRedeem(decodedText);
                },
                () => {
                    // 扫描失败回调：留空即可，不需要接收参数
                }
            );
            
            setState(prev => ({ ...prev, message: t('aimAtQR') }));

        } catch (error: unknown) {
            console.error('启动失败:', error);
            
            let errorMessage = t('unknownError');
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            }

            setState({
                status: 'error',
                message: `${t('cameraStartFailed')}: ${errorMessage || t('checkPermissions')}`,
                details: null,
            });
            await stopScanner();
        } finally {
            clearTimeout(timeoutId);
            isInitializingRef.current = false;
        }
    };

    const restartScanner = async () => {
        await stopScanner();
        startScanner();
    };

    const resetScanner = async () => {
        await stopScanner();
        setState({ status: 'initial', message: t('initialMessage'), details: null });
    };

    useEffect(() => {
        return () => {
            stopScanner();
        };
    }, []);

    const renderAlert = () => {
        if (state.status === 'scanning') return null; 

        if (state.status === 'success') {
             return (
                <div role="alert" className="alert alert-success mt-4 shadow-lg">
                    <HiCheckCircle className="w-6 h-6" />
                    <div>
                        <h3 className="font-bold">{t('successTitle')}</h3>
                        {state.details && (
                            <div className="text-xs mt-1">
                                {t('orderId')}: {state.details.order_id.slice(0, 8)}... <br/>
                                {t('amount')}: ฿{state.details.price}
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        if (state.status === 'error') {
            return (
                <div role="alert" className="alert alert-error mt-4 shadow-lg">
                    <HiXCircle className="w-6 h-6" />
                    <span>{state.message}</span>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full max-w-lg mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <HiQrCode className="w-6 h-6"/> {t('scanTitle')}
            </h2>

            <div className="card bg-base-100 shadow-xl border overflow-hidden">
                <div className="card-body p-4 text-center relative min-h-[300px] flex flex-col justify-center">
                    
                    {state.status === 'initial' && (
                        <div className="flex flex-col items-center justify-center h-full py-10">
                            <button
                                className="btn btn-lg btn-primary shadow-lg"
                                onClick={startScanner}
                            >
                                <HiCamera className="w-6 h-6"/> {t('startCameraButton')}
                            </button>
                            <p className="mt-4 text-base-content/60 text-sm">{t('cameraPermissionNote')}</p>
                        </div>
                    )}

                    {state.status === 'scanning' && (
                        <div className="absolute inset-0 bg-black">
                            <div id="qr-code-reader" className="w-full h-full"></div>
                            <div className="absolute bottom-4 w-full text-center text-white z-10 bg-black/50 py-2">
                                {state.message}
                            </div>
                        </div>
                    )}

                    {(state.status === 'success' || state.status === 'error') && (
                         <div className="flex flex-col items-center justify-center h-full z-20 bg-base-100/90 p-4 rounded-xl">
                             {state.status === 'success' ? (
                                 <HiCheckCircle className="w-24 h-24 text-success mb-4" />
                             ) : (
                                 <HiXCircle className="w-24 h-24 text-error mb-4" />
                             )}
                             {renderAlert()}
                             
                             <div className="flex gap-2 mt-6">
                                <button className="btn btn-outline" onClick={restartScanner}>
                                    <HiOutlineArrowPath className="w-4 h-4"/> {t('continueScan')}
                                </button>
                                <button className="btn btn-ghost" onClick={resetScanner}>
                                    {t('back')}
                                </button>
                             </div>
                         </div>
                    )}
                </div>
            </div>

            {state.status !== 'scanning' && (
                <ManualInputFallback 
                    onManualRedeem={handleRedeem} 
                    disabled={state.status === 'success'} 
                />
            )}
        </div>
    );
}

function ManualInputFallback({ onManualRedeem, disabled }: {
    onManualRedeem: (code: string) => void;
    disabled: boolean;
}) {
    const t = useTranslations('redeemScanner');
    const [manualCode, setManualCode] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualCode.trim() && !disabled) {
            onManualRedeem(manualCode.trim());
            setManualCode('');
        }
    };

    return (
        <div className="mt-6 border-t pt-4">
            <h3 className="text-lg font-semibold mb-2 text-base-content/80">{t('manualInputTitle')}</h3>
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="text"
                    placeholder={t('manualInputPlaceholder')}
                    className="input input-bordered flex-1"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    disabled={disabled}
                />
                <button
                    type="submit"
                    className="btn btn-neutral"
                    disabled={!manualCode.trim() || disabled}
                >
                    {t('redeemButton')}
                </button>
            </form>
        </div>
    );
}