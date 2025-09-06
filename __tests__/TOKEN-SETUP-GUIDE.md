# 阿里云ASR Token配置指南

## 问题说明

当前ASR服务无法连接是因为**Token认证失败**（403错误）。要解决这个问题，您需要配置有效的阿里云AccessKey来获取真实的Token。

## 解决方案

### 方案1：使用阿里云AccessKey（推荐）

1. **获取阿里云AccessKey**
   - 登录阿里云控制台
   - 进入"访问控制" > "用户" > "AccessKey管理"
   - 创建或查看AccessKey ID和AccessKey Secret

2. **开通智能语音交互服务**
   - 在阿里云控制台搜索"智能语音交互"
   - 开通服务并创建应用
   - 获取AppKey

3. **配置测试命令**
   ```bash
   node run-asr-test.js protocol --appkey "gL0aXXsAifcMbt9r" --access-key-id "LTAI5tK2tg6eYxbBPRU3F45e" --access-key-secret "lNMyv1GQNsZOZCid7ZBTcgujq4leST"
   ```
AccessKey ID
LTAI5tK2tg6eYxbBPRU3F45e

AccessKey Secret
lNMyv1GQNsZOZCid7ZBTcgujq4leST

### 方案2：使用后端Token服务

如果您有后端服务来获取Token，可以配置：

```bash
node run-asr-test.js protocol \
  --appkey "your_actual_app_key" \
  --token-url "https://your-backend.com/token"
```

### 方案3：修改配置文件

编辑 `asr-test-config.js` 文件：

```javascript
alibaba: {
  region: 'shanghai',
  appKey: 'your_actual_app_key',
  accessKeyId: 'your_access_key_id',
  accessKeySecret: 'your_access_key_secret',
  // ... 其他配置
}
```

## 当前状态

✅ **已修复的问题：**
- 函数重复声明错误
- Token获取逻辑实现
- 配置验证逻辑
- 命令行参数支持

❌ **仍需配置：**
- 有效的阿里云AccessKey
- 有效的AppKey
- 或者有效的后端Token服务

## 测试步骤

1. **验证配置**
   ```bash
   node run-asr-test.js validate
   ```

2. **查看当前配置**
   ```bash
   node run-asr-test.js config
   ```

3. **运行协议测试**
   ```bash
   node run-asr-test.js protocol --access-key-id "LTAI5tK2tg6eYxbBPRU3F45e" --access-key-secret "lNMyv1GQNsZOZCid7ZBTcgujq4leST"
   ```

## 技术实现

根据[阿里云官方文档](https://help.aliyun.com/zh/isi/getting-started/use-http-or-https-to-obtain-an-access-token)，我们实现了：

1. **HMAC-SHA1签名算法**
2. **阿里云POP协议规范**
3. **Token获取和验证**
4. **WebSocket连接管理**

## 注意事项

- AccessKey需要有智能语音交互服务权限
- Token有时效性，会自动刷新
- 建议在生产环境中使用后端服务获取Token
- 测试环境可以使用模拟Token进行代码逻辑测试
