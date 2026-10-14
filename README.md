# 物业端微信小程序

对齐 `dalian-shipping-smart-ops` 物业端原型，对接航运智能运营平台后端 `/mini/ops`。

## 打开方式

1. 启动 `inter_bu_backend`（默认 `http://127.0.0.1:8080`）
2. 用微信开发者工具导入本目录
3. 关闭「详情 → 本地设置 → 校验合法域名」
4. 使用与 PC 相同的平台账号登录

## 配置

[`miniprogram/config/env.js`](miniprogram/config/env.js)

- `useMock: false` 走真实接口
- `apiBaseUrl` 指向若依后端根地址

## 模块

工作台、待办、消息、我的、巡查管控、工单服务、资产管理、访客管理、会议室管理。
