// 文件: lib/distance.ts
// 地理位置距离计算工具

/**
 * 使用 Haversine 公式计算两个经纬度点之间的距离
 * @param lat1 起点纬度
 * @param lon1 起点经度
 * @param lat2 终点纬度
 * @param lon2 终点经度
 * @returns 距离（公里）
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // 地球半径（公里）
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // 保留一位小数
}

/**
 * 将角度转换为弧度
 */
function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * 格式化距离显示
 * @param distance 距离（公里）
 * @returns 格式化后的距离字符串
 */
export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(1)}km`;
}
