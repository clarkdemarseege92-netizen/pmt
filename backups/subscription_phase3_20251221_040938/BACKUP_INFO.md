# 订阅系统前端组件开发 - 页面备份

**备份时间**: 2025-12-21 04:09:38
**阶段**: Phase 3 - Frontend Components Development
**备份目录**: /Users/jasonbear/pmt/backups/subscription_phase3_20251221_040938

## 备份的文件和目录

### 商户页面
- `dashboard/` - 仪表板页面（将添加订阅状态展示）
- `settings/` - 设置页面（将添加订阅管理入口）
- `products/` - 产品管理页面（将添加数量限制提示）
- `coupons/` - 优惠券管理页面（将添加券种限制提示）
- `wallet/` - 钱包页面（将添加订阅账单展示）

### 核心组件
- `MerchantSidebar.tsx` - 商户侧边栏（将添加订阅状态指示）
- `MerchantLayoutWrapper.tsx` - 商户布局包装器（将添加权限检查）

## 恢复方法

如需恢复任何文件，使用以下命令：

```bash
# 恢复整个目录
cp -r /Users/jasonbear/pmt/backups/subscription_phase3_20251221_040938/dashboard /Users/jasonbear/pmt/app/[locale]/merchant/

# 恢复单个文件
cp /Users/jasonbear/pmt/backups/subscription_phase3_20251221_040938/MerchantSidebar.tsx /Users/jasonbear/pmt/components/
```

## 修改计划

1. **Dashboard 页面**: 添加订阅状态卡片、试用期倒计时
2. **Products/Coupons 页面**: 添加数量限制进度条
3. **Settings 页面**: 添加订阅管理界面
4. **Wallet 页面**: 添加订阅账单列表
5. **MerchantSidebar**: 添加订阅状态徽章和锁定功能指示
6. **MerchantLayoutWrapper**: 添加全局权限检查逻辑
