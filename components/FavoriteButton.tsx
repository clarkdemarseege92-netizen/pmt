"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient"; // 确保使用客户端 Supabase
import { HiHeart } from "react-icons/hi2";
import { HiOutlineHeart } from "react-icons/hi2";

interface FavoriteButtonProps {
  itemId: string;
  itemType: 'product' | 'coupon' | 'merchant';
  variant?: 'icon' | 'button'; // 'icon': 仅心形图标, 'button': 带文字的按钮
  className?: string;
  themeColor?: string; // 用于 'button' 模式的背景色
}

export default function FavoriteButton({ 
  itemId, 
  itemType, 
  variant = 'icon',
  className = "",
  themeColor = "#3b82f6" // 默认蓝色
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkStatus();
  }, [itemId]);

  const checkStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .maybeSingle(); // 使用 maybeSingle 避免 406 错误

    if (data) setIsFavorited(true);
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault(); // 防止触发父级链接跳转
    e.stopPropagation();

    if (loading) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // 未登录提示，可以使用 toast，这里简单 alert
      if(confirm("请先登录才能收藏，是否去登录？")) {
        window.location.href = "/login";
      }
      setLoading(false);
      return;
    }

    try {
      if (isFavorited) {
        // 取消收藏
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('item_type', itemType)
          .eq('item_id', itemId);
        
        if (error) throw error;
        setIsFavorited(false);
      } else {
        // 添加收藏
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            item_type: itemType,
            item_id: itemId
          });
        
        if (error) throw error;
        setIsFavorited(true);
      }
    } catch (error) {
      console.error("Favorite toggle error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  // 渲染模式 A: 纯图标 (适用于商品卡片)
  if (variant === 'icon') {
    return (
      <button 
        className={`btn btn-circle btn-sm bg-base-100/80 backdrop-blur-xs border-0 hover:bg-white shadow-sm ${className}`}
        onClick={toggleFavorite}
        disabled={loading}
        title={isFavorited ? "取消收藏" : "收藏"}
      >
        {isFavorited ? (
          <HiHeart className="w-5 h-5 text-error" />
        ) : (
          <HiOutlineHeart className="w-5 h-5 text-base-content/60" />
        )}
      </button>
    );
  }

  // 渲染模式 B: 按钮 (适用于店铺关注/优惠券详情)
  return (
    <button 
      className={`btn btn-sm text-white border-0 shadow-md gap-2 transition-all ${className}`}
      style={{ 
        backgroundColor: isFavorited ? '#9ca3af' : themeColor, // 已关注变为灰色，未关注显示主题色
      }}
      onClick={toggleFavorite}
      disabled={loading}
    >
      {isFavorited ? (
        <>
          <HiHeart className="w-4 h-4" /> 已收藏
        </>
      ) : (
        <>
          <HiOutlineHeart className="w-4 h-4" /> 收藏
        </>
      )}
    </button>
  );
}