// 文件: /components/OrderTabs.tsx
"use client";

import React, { useState, useEffect } from 'react'; // 【修复】：显式引入 React
import QRCode from 'react-qr-code';
import Image from 'next/image';
import { HiTicket, HiStar, HiClock, HiShoppingBag, HiPhoto } from 'react-icons/hi2';
import UploadSlipModal from './UploadSlipModal';

// --- 类型定义 ---
type MultiLangName = { th: string; en: string; [key: string]: string };

// 【修复】：删除未使用的 'CouponData' 类型

// 确保 Order 类型与 page.tsx 传入的一致
type Order = {
    order_id: string;
    coupon_id: string | null;
    redemption_code: string;
    purchase_price: number;
    status: 'paid' | 'used' | 'expired' | 'pending'; // 添加 pending 状态
    created_at: string;
    coupons: { name: MultiLangName; image_urls: string[] } | null; // 单个对象，不是数组
    order_items: {
        quantity: number;
        products: { name: MultiLangName; image_urls: string[] } | null;
    }[];
};

const statusMap = {
    all: { label: '全部订单', color: 'bg-info' },
    pending: { label: '等待确认', color: 'bg-warning' },
    paid: { label: '待使用', color: 'bg-primary' },
    used: { label: '待评价', color: 'bg-warning' },
    expired: { label: '已过期', color: 'bg-neutral' },
};

function OrderTabs({ orders }: { orders: Order[] }) {
    const [activeTab, setActiveTab] = useState<'all' | 'paid' | 'used' | 'expired'>('all');
    const [modalOrder, setModalOrder] = useState<Order | null>(null);
    const [uploadSlipOrder, setUploadSlipOrder] = useState<Order | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<Record<string, number>>({});

    // 计算订单剩余时间（30分钟倒计时）
    // 只在有 pending 订单时才启动定时器
    useEffect(() => {
        const hasPendingOrders = orders.some(order => order.status === 'pending');

        if (!hasPendingOrders) {
            return; // 没有待确认订单，不启动定时器
        }

        const interval = setInterval(() => {
            const now = Date.now();
            const newTimeRemaining: Record<string, number> = {};

            orders.forEach(order => {
                if (order.status === 'pending') {
                    const createdTime = new Date(order.created_at).getTime();
                    const elapsed = now - createdTime;
                    const thirtyMinutes = 30 * 60 * 1000;
                    const remaining = Math.max(0, thirtyMinutes - elapsed);
                    newTimeRemaining[order.order_id] = remaining;
                }
            });

            setTimeRemaining(newTimeRemaining);
        }, 1000);

        return () => clearInterval(interval);
    }, [orders]);

    // 格式化剩余时间
    const formatTimeRemaining = (ms: number): string => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };


    const renderOrders = (status: 'all' | 'paid' | 'used' | 'expired') => {
        const list = status === 'all'
            ? orders
            : orders.filter(order => order.status === status);

        if (list.length === 0) {
            return <p className="text-center py-10 text-base-content/60">该分类下暂无订单记录。</p>;
        }

        return (
            <div className="space-y-4">
                 {list.map(order => {
                    // --- 核心逻辑：智能判断显示内容 ---
                    let displayImage = '/placeholder.jpg';
                    let displayName = '未知商品';
                    let isProductOrder = false;

                    // 优先检查是否有优惠券信息
                    if (order.coupons) {
                        displayImage = order.coupons.image_urls?.[0] || displayImage;
                        displayName = order.coupons.name?.th || '优惠券';
                    }
                    // 如果没有优惠券，检查是否有商品信息
                    else if (order.order_items && order.order_items.length > 0) {
                        isProductOrder = true;
                        // 取第一个商品作为封面
                        const firstItem = order.order_items[0];
                        if (firstItem.products) {
                            displayImage = firstItem.products.image_urls?.[0] || displayImage;
                            const count = order.order_items.length;
                            // 如果有多个商品，显示"XX 等 N 件商品"
                            displayName = count > 1
                                ? `${firstItem.products.name?.th} และอื่นๆ (${count} รายการ)`
                                : firstItem.products.name?.th || '商品';
                        }
                    } else {
                        // 数据异常，跳过显示
                        return null;
                    }

                    return (
                        <div key={order.order_id} className="card card-side bg-base-100 shadow-md border border-base-200">
                            
                            <figure className="relative w-32 h-32 md:w-48 shrink-0 bg-base-100">
                                <Image 
                                    src={displayImage} 
                                    alt="Order Image" 
                                    fill 
                                    className="object-cover"
                                    unoptimized
                                />
                            </figure>

                            <div className="card-body p-4 justify-between">
                                <div>
                                    <h2 className="card-title text-lg flex items-center gap-2">
                                        {isProductOrder && <HiShoppingBag className="w-5 h-5 text-secondary" />}
                                        {displayName}
                                    </h2>
                                    <p className="text-sm text-base-content/60">
                                        {statusMap[order.status].label} | ฿{order.purchase_price}
                                    </p>
                                </div>

                                <div className="card-actions justify-end">
                                    {order.status === 'pending' && (
                                        <div className="flex flex-col gap-2 w-full">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs text-warning flex items-center gap-1">
                                                    <HiClock className="w-4 h-4" />
                                                    {timeRemaining[order.order_id] > 0
                                                        ? `剩余 ${formatTimeRemaining(timeRemaining[order.order_id])}`
                                                        : '已过期'}
                                                </span>
                                                <button
                                                    className="btn btn-sm btn-primary"
                                                    onClick={() => setUploadSlipOrder(order)}
                                                    disabled={timeRemaining[order.order_id] === 0}
                                                >
                                                    <HiPhoto className="w-4 h-4" /> 上传凭证
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {order.status === 'paid' && (
                                        <button
                                            className="btn btn-sm btn-primary"
                                            onClick={() => setModalOrder(order)}
                                        >
                                            <HiTicket className="w-4 h-4" /> 立即核销
                                        </button>
                                    )}
                                    {order.status === 'used' && (
                                        <button className="btn btn-sm btn-warning">
                                            <HiStar className="w-4 h-4" /> 待评价
                                        </button>
                                    )}
                                    {order.status === 'expired' && (
                                        <span className="text-sm text-base-content/50 flex items-center gap-1">
                                            <HiClock className="w-4 h-4" /> 交易已过期
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })} 
            </div>
        );
    };

    return (
        <div className="w-full">
            {/* 标签页导航 */}
            <div role="tablist" className="tabs tabs-boxed">
                <a role="tab"
                   className={`tab ${activeTab === 'all' ? 'tab-active' : ''}`}
                   onClick={() => setActiveTab('all')}>
                    全部订单
                </a>
                <a role="tab"
                   className={`tab ${activeTab === 'paid' ? 'tab-active' : ''}`}
                   onClick={() => setActiveTab('paid')}>
                    待使用
                </a>
                <a role="tab"
                   className={`tab ${activeTab === 'used' ? 'tab-active' : ''}`}
                   onClick={() => setActiveTab('used')}>
                    待评价
                </a>
                <a role="tab"
                   className={`tab ${activeTab === 'expired' ? 'tab-active' : ''}`}
                   onClick={() => setActiveTab('expired')}>
                    已过期
                </a>
            </div>

            {/* 标签页内容 */}
            <div className="py-6">
                {activeTab === 'all' && renderOrders('all')}
                {activeTab === 'paid' && renderOrders('paid')}
                {activeTab === 'used' && renderOrders('used')}
                {activeTab === 'expired' && renderOrders('expired')}
            </div>

            {/* --- 核销二维码模态框 --- */}
            {modalOrder && (
                <dialog className="modal modal-open">
                    <div className="modal-box w-11/12 max-w-sm text-center">
                        <h3 className="font-bold text-xl mb-4">订单核销码</h3>
                        <p className="text-sm text-base-content/60 mb-6">请向商家出示此二维码。</p>
                        
                        <div className="flex justify-center mb-6 p-4 bg-white rounded-lg shadow">
                            <QRCode 
                                value={modalOrder.redemption_code}
                                size={200}
                                level="H"
                            />
                        </div>

                        <p className="text-lg font-mono font-bold text-primary mb-2">
                           {modalOrder.redemption_code}
                        </p>
                        <p className="text-xs text-base-content/70">
                            (核销码请勿泄露)
                        </p>

                        <div className="modal-action justify-center mt-6">
                            <button className="btn" onClick={() => setModalOrder(null)}>关闭</button>
                        </div>
                    </div>
                </dialog>
            )}

            {/* --- 上传付款凭证模态框 --- */}
            {uploadSlipOrder && (
                <UploadSlipModal
                    orderId={uploadSlipOrder.order_id}
                    orderAmount={uploadSlipOrder.purchase_price}
                    isOpen={!!uploadSlipOrder}
                    onClose={() => setUploadSlipOrder(null)}
                />
            )}
        </div>
    );
}

// 使用 React.memo 优化性能，只在 orders 改变时重新渲染
export default React.memo(OrderTabs, (prevProps, nextProps) => {
    // 比较订单数组是否真的改变了
    if (prevProps.orders.length !== nextProps.orders.length) {
        return false; // 数量变了，需要重新渲染
    }

    // 比较每个订单的关键属性
    for (let i = 0; i < prevProps.orders.length; i++) {
        const prev = prevProps.orders[i];
        const next = nextProps.orders[i];

        if (
            prev.order_id !== next.order_id ||
            prev.status !== next.status ||
            prev.redemption_code !== next.redemption_code
        ) {
            return false; // 订单有变化，需要重新渲染
        }
    }

    return true; // 订单没有实质性变化，跳过渲染
});