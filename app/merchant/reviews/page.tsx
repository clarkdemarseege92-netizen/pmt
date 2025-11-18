// 文件: /app/merchant/reviews/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { HiStar, HiUserCircle, HiChatBubbleLeftEllipsis } from "react-icons/hi2";
import Image from "next/image";

// 定义评价类型
type Review = {
  review_id: string;
  rating: number;
  comment: string;
  image_urls: string[] | null;
  created_at: string;
  merchant_reply: string | null; // 新增字段
  reply_at: string | null;       // 新增字段
  // 关联的客户信息 (如果有)
  customer_id: string; 
};

export default function ReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [merchantId, setMerchantId] = useState<string | null>(null);

  // 回复状态管理
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 【修复】将 fetchReviews 移动到 useEffect 之前
  // 2. 获取评价列表
  const fetchReviews = async (mId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("merchant_id", mId)
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching reviews:", error);
    else setReviews(data as Review[]);
    setLoading(false);
  };

  // 1. 初始化
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: merchant } = await supabase
        .from("merchants")
        .select("merchant_id")
        .eq("owner_id", user.id)
        .single();

      if (merchant) {
        setMerchantId(merchant.merchant_id);
        // 现在 fetchReviews 已经定义，可以安全调用
        fetchReviews(merchant.merchant_id);
      } else {
        setLoading(false);
      }
    };
    init();
   
  }, []);

  // 3. 提交回复
  const handleReplySubmit = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setSubmitting(true);

    const { error } = await supabase
      .from("reviews")
      .update({
        merchant_reply: replyText,
        reply_at: new Date().toISOString(),
      })
      .eq("review_id", reviewId);

    if (error) {
      alert("回复失败: " + error.message);
    } else {
      // 成功后刷新列表并关闭输入框
      setReplyText("");
      setReplyingId(null);
      if (merchantId) fetchReviews(merchantId);
    }
    setSubmitting(false);
  };

  // 辅助组件：星星显示
  const StarRating = ({ rating }: { rating: number }) => {
    return (
      <div className="flex gap-1 text-warning">
        {[1, 2, 3, 4, 5].map((star) => (
          <HiStar key={star} className={`w-5 h-5 ${star <= rating ? "fill-current" : "text-base-300"}`} />
        ))}
      </div>
    );
  };

  if (loading) return <div className="p-10 text-center"><span className="loading loading-spinner loading-lg"></span></div>;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">评价管理</h1>

      {reviews.length === 0 ? (
        <div className="text-center p-10 bg-base-100 rounded-lg shadow">
          <HiChatBubbleLeftEllipsis className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
          <p className="text-base-content/60">暂无评价，期待客户的好评吧！</p>
        </div>
      ) : (
        <div className="space-y-8">
          {reviews.map((review) => (
            <div key={review.review_id} className="card bg-base-100 shadow-sm border border-base-200 p-6">
              
              {/* --- 1. 评分与时间 --- */}
              <div className="flex justify-between items-start mb-4 border-b border-base-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="avatar placeholder">
                    <div className="bg-neutral text-neutral-content rounded-full w-10">
                      <span className="text-xl"><HiUserCircle /></span>
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-sm">客户</div>
                    <div className="text-xs text-base-content/50">
                      {new Date(review.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <StarRating rating={review.rating} />
              </div>

              {/* --- 2. 客户评价 (Chat Bubble - Start) --- */}
              <div className="chat chat-start">
                <div className="chat-bubble chat-bubble-primary bg-opacity-10 text-base-content">
                  {review.comment}
                  
                  {/* 客户上传的图片 */}
                  {review.image_urls && review.image_urls.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {review.image_urls.map((url, idx) => (
                        <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-base-300">
                          <Image 
                            src={url} 
                            alt="Review Image" 
                            fill 
                            className="object-cover" 
                            unoptimized
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* --- 3. 商家回复 (Chat Bubble - End) --- */}
              {review.merchant_reply ? (
                // 已回复状态
                <div className="chat chat-end mt-2">
                  <div className="chat-header text-xs text-base-content/50 mb-1">
                    商家回复 • {new Date(review.reply_at!).toLocaleDateString()}
                  </div>
                  <div className="chat-bubble chat-bubble-secondary text-secondary-content">
                    {review.merchant_reply}
                  </div>
                </div>
              ) : (
                // 未回复状态：显示回复框
                <div className="mt-6 pl-12">
                  {replyingId === review.review_id ? (
                    <div className="form-control">
                      <textarea 
                        className="textarea textarea-bordered w-full" 
                        placeholder="感谢您的支持..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={3}
                      ></textarea>
                      <div className="flex justify-end gap-2 mt-2">
                        <button 
                          className="btn btn-sm btn-ghost" 
                          onClick={() => { setReplyingId(null); setReplyText(""); }}
                        >
                          取消
                        </button>
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={() => handleReplySubmit(review.review_id)}
                          disabled={submitting}
                        >
                          {submitting ? "发送中..." : "发送回复"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      className="btn btn-sm btn-outline gap-2"
                      onClick={() => setReplyingId(review.review_id)}
                    >
                      <HiChatBubbleLeftEllipsis className="w-4 h-4" />
                      回复评价
                    </button>
                  )}
                </div>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  );
}