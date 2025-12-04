// 文件: lib/googleMaps.ts
// Google Maps 链接解析工具

/**
 * 从 Google Maps 链接提取经纬度
 * 支持多种 Google Maps URL 格式
 */
export async function extractCoordinatesFromGoogleMaps(
  url: string
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    // 1. 处理短链接 (maps.app.goo.gl)
    if (url.includes('maps.app.goo.gl') || url.includes('goo.gl')) {
      // 需要先展开短链接
      const expandedUrl = await expandShortUrl(url);
      if (!expandedUrl) return null;
      url = expandedUrl;
    }

    // 2. 从 URL 中提取经纬度
    // 格式 1: @lat,lng,zoom (最常见)
    // 例如: https://www.google.com/maps/@13.7563,100.5018,15z
    const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      return {
        latitude: parseFloat(atMatch[1]),
        longitude: parseFloat(atMatch[2]),
      };
    }

    // 格式 2: ?q=lat,lng
    // 例如: https://www.google.com/maps?q=13.7563,100.5018
    const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qMatch) {
      return {
        latitude: parseFloat(qMatch[1]),
        longitude: parseFloat(qMatch[2]),
      };
    }

    // 格式 3: /place/name/@lat,lng
    const placeMatch = url.match(/\/place\/[^/]+\/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (placeMatch) {
      return {
        latitude: parseFloat(placeMatch[1]),
        longitude: parseFloat(placeMatch[2]),
      };
    }

    // 格式 4: !3d 和 !4d (Google Maps embed 格式)
    const latMatch = url.match(/!3d(-?\d+\.\d+)/);
    const lngMatch = url.match(/!4d(-?\d+\.\d+)/);
    if (latMatch && lngMatch) {
      return {
        latitude: parseFloat(latMatch[1]),
        longitude: parseFloat(lngMatch[1]),
      };
    }

    console.warn('无法从 Google Maps URL 提取坐标:', url);
    return null;
  } catch (error) {
    console.error('解析 Google Maps URL 错误:', error);
    return null;
  }
}

/**
 * 展开短链接
 * 通过 fetch HEAD 请求获取重定向后的 URL
 */
async function expandShortUrl(shortUrl: string): Promise<string | null> {
  try {
    // 使用 fetch 获取重定向后的 URL
    const response = await fetch(shortUrl, {
      method: 'HEAD',
      redirect: 'follow',
    });

    return response.url || null;
  } catch (error) {
    console.error('展开短链接失败:', error);
    return null;
  }
}

/**
 * 验证经纬度是否有效
 */
export function isValidCoordinates(
  latitude: number,
  longitude: number
): boolean {
  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * 格式化经纬度为 Google Maps 链接
 */
export function createGoogleMapsLink(
  latitude: number,
  longitude: number
): string {
  return `https://www.google.com/maps/@${latitude},${longitude},15z`;
}
