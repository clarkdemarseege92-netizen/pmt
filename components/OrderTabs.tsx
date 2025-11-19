// 文件: /components/OrderTabs.tsx
"use client";

import { useState } from 'react';
// import Link from 'next/link';
import QRCode from 'react-qr-code'; // 引入二维码库
import Image from 'next/image';
import { HiTicket, HiStar, HiClock, } from 'react-icons/hi2';

// --- 类型定义 (与 Server Component 共享) ---
type CouponData = {
    name: { th: string; en: string; };
    image_urls: string[];
};

type Order = {
    order_id: string;
    coupon_id: string;
    redemption_code: string;
    purchase_price: number;
    status: 'paid' | 'used' | 'expired';
    created_at: string;
    coupons: CouponData[]; // 嵌套的优惠券详情
};

const statusMap = {
    paid: { label: '待使用', color: 'bg-primary' },
    used: { label: '待评价', color: 'bg-warning' },
    expired: { label: '已过期', color: 'bg-neutral' },
};

export default function OrderTabs({ orders }: { orders: Order[] }) {
    const [activeTab, setActiveTab] = useState('paid'); // 默认显示待使用
    const [modalOrder, setModalOrder] = useState<Order | null>(null);

    // const filteredOrders = orders.filter(order => order.status === activeTab);

    // 过滤订单状态
const renderOrders = (status: 'paid' | 'used' | 'expired') => {
        const list = orders.filter(order => order.status === status);
        if (list.length === 0) {
            return <p className="text-center py-10 text-base-content/60">该分类下暂无订单记录。</p>;
        }

        return (
            <div className="space-y-4">
                {list.map(order => { // 修正: 使用 {} 显式返回，以便定义 coupon 变量
                    
                    // 定义 coupon 变量
                    const coupon = order.coupons?.[0]; 
                    
                    if (!coupon) return null; // 如果数据错误，跳过渲染

                    return (
                        <div key={order.order_id} className="card card-side bg-base-100 shadow-md border border-base-200">
                            
                            <figure className="relative w-32 h-32 md:w-48 shrink-0">
                                <Image 
                                    // 修正: 使用定义的 coupon 变量
                                    src={coupon.image_urls?.[0] || '/placeholder.jpg'} 
                                    alt="Coupon Image" 
                                    fill 
                                    className="object-cover"
                                    unoptimized
                                />
                            </figure>

                            <div className="card-body p-4 justify-between">
                                <div>
                                    <h2 className="card-title text-lg">
                                        {/* 修正: 使用定义的 coupon 变量 */}
                                        {coupon.name.th}
                                    </h2>
                                    <p className="text-sm text-base-content/60">
                                        {statusMap[order.status].label} | ฿{order.purchase_price}
                                    </p>
                                </div>

                                <div className="card-actions justify-end">
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
                    )
                })} 
            </div>
        );
    };


    return (
        <div className="w-full">
            {/* 标签页导航 */}
            <div role="tablist" className="tabs tabs-boxed">
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
                {activeTab === 'paid' && renderOrders('paid')}
                {activeTab === 'used' && renderOrders('used')}
                {activeTab === 'expired' && renderOrders('expired')}
            </div>

            {/* --- 核销二维码模态框 --- */}
            {modalOrder && (
                <dialog className="modal modal-open">
                    <div className="modal-box w-11/12 max-w-sm text-center">
                        <h3 className="font-bold text-xl mb-4">待使用优惠券</h3>
                        <p className="text-sm text-base-content/60 mb-6">请向商家出示此二维码进行核销。</p>
                        
                        <div className="flex justify-center mb-6 p-4 bg-white rounded-lg shadow">
                            <QRCode 
                                value={modalOrder.redemption_code} // 核销码作为二维码内容
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
        </div>
    );
}
