// 文件: hooks/useGeolocation.ts
// 获取用户地理位置的 React Hook

'use client';

import { useState, useEffect } from 'react';

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface GeolocationState {
  coordinates: Coordinates | null;
  error: string | null;
  loading: boolean;
  permissionDenied: boolean;
}

/**
 * 获取用户地理位置的 Hook
 * @param autoRequest 是否自动请求位置（默认 false，需要用户手动触发）
 */
export function useGeolocation(autoRequest = false) {
  const [state, setState] = useState<GeolocationState>({
    coordinates: null,
    error: null,
    loading: false,
    permissionDenied: false,
  });

  // 请求位置权限
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: '您的浏览器不支持定位功能',
        loading: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          error: null,
          loading: false,
          permissionDenied: false,
        });
      },
      (error) => {
        let errorMessage = '获取位置失败';
        let permissionDenied = false;

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '您拒绝了位置权限请求';
            permissionDenied = true;
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = '位置信息不可用';
            break;
          case error.TIMEOUT:
            errorMessage = '获取位置超时，请重试';
            break;
          default:
            errorMessage = '未知错误';
        }

        setState({
          coordinates: null,
          error: errorMessage,
          loading: false,
          permissionDenied,
        });
      },
      {
        enableHighAccuracy: true, // 使用高精度模式（GPS）
        timeout: 10000,           // 10秒超时
        maximumAge: 300000,       // 缓存5分钟
      }
    );
  };

  // 如果设置了自动请求，则在组件挂载时请求
  useEffect(() => {
    if (autoRequest) {
      requestLocation();
    }
  }, [autoRequest]);

  return {
    ...state,
    requestLocation,
    clearError: () => setState(prev => ({ ...prev, error: null })),
  };
}
