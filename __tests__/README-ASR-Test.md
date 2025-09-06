# ASR 独立测试工具

这是一个用于测试阿里云实时语音识别(ASR)功能的独立测试工具集，可以在不依赖Android APP的情况下运行，用于验证ASR服务的连接性和基本功能。

## 📁 文件结构

```
__tests__/
├── ASRTest.js              # 完整的ASR测试类，包含音频数据模拟
├── simpleASRTest.js         # 简化版ASR测试，专注于基本功能验证
├── asr-test-config.js      # 测试配置文件
├── run-asr-test.js         # 命令行运行脚本
└── README-ASR-Test.md      # 本说明文档
```

## 🚀 快速开始

### 1. 安装依赖

确保已安装Node.js和必要的依赖包：

```bash
npm install ws
```

### 2. 配置参数

在运行测试前，需要配置以下参数：

- **阿里云AppKey**: 在阿里云控制台创建项目后获取
- **Token获取URL**: 后端服务提供的token获取接口
- **区域**: 阿里云NLS服务区域（如cn-shanghai, cn-beijing等）

### 3. 运行测试

#### 快速测试（推荐）
```bash
node __tests__/run-asr-test.js quick
```

#### 完整测试
```bash
node __tests__/run-asr-test.js full
```

#### 协议测试（推荐）
```bash
node __tests__/run-asr-test.js protocol
```

#### 查看配置
```bash
node __tests__/run-asr-test.js config
```

#### 验证配置
```bash
node __tests__/run-asr-test.js validate
```

## 🔧 配置说明

### 方法1: 修改配置文件

编辑 `__tests__/asr-test-config.js` 文件：

```javascript
const config = {
  alibaba: {
    region: 'cn-shanghai',
    appKey: 'your_actual_app_key_here',
    tokenUrl: 'https://your-backend.com/api/token'
  },
  // ... 其他配置
};
```

### 方法2: 命令行参数

```bash
node __tests__/run-asr-test.js quick --appkey "your_app_key" --token-url "https://your-backend.com/api/token" --region "cn-beijing"
```

## 📋 测试功能

### 快速测试 (simpleASRTest.js)

- ✅ WebSocket连接测试
- ✅ 开始转录指令发送
- ✅ 消息接收和处理
- ✅ 停止转录指令发送
- ✅ 基本错误处理

### 完整测试 (ASRTest.js)

- ✅ 所有快速测试功能
- ✅ 模拟音频数据生成
- ✅ 音频数据发送测试
- ✅ 实时识别结果处理
- ✅ 完整的转录流程测试
- ✅ 详细的测试报告

### 协议测试 (alibaba-asr-protocol-test.js) - 推荐

- ✅ 严格按照阿里云官方文档规范实现
- ✅ 正确的WebSocket URL格式
- ✅ 标准的消息格式和字段
- ✅ 32位唯一ID生成
- ✅ 完整的协议流程测试
- ✅ 详细的协议符合性评估

## 🎯 测试场景

### 1. 基本连接测试
验证与阿里云NLS服务的WebSocket连接是否正常。

### 2. 消息处理测试
测试各种ASR消息的发送和接收处理。

### 3. 音频数据测试
使用模拟的PCM音频数据测试识别功能。

### 4. 错误处理测试
测试各种异常情况的处理能力。

## 📊 测试结果

测试完成后会显示详细的测试报告，包括：

- 连接状态
- 消息处理结果
- 识别结果统计
- 错误信息
- 整体测试评估

### 示例输出

```
📊 测试结果汇总:
==================================================
WebSocket连接: ✅ 通过
开始转录指令: ✅ 通过
消息处理: ✅ 通过
停止转录指令: ✅ 通过

📈 通过率: 4/4 (100.0%)
🎉 所有测试通过！ASR功能正常
```

## ⚠️ 注意事项

1. **网络连接**: 确保能够访问阿里云NLS服务
2. **权限配置**: 确保AppKey有正确的权限
3. **Token服务**: 确保后端Token获取服务正常工作
4. **防火墙**: 检查防火墙是否阻止WebSocket连接

## 🔍 故障排除

### 连接失败
- 检查网络连接
- 验证AppKey是否正确
- 确认Token获取服务是否正常

### 消息处理失败
- 检查WebSocket连接状态
- 验证消息格式是否正确
- 查看控制台错误信息

### 识别结果为空
- 检查音频数据格式
- 验证采样率设置
- 确认音频数据是否有效

## 🛠️ 自定义测试

### 修改测试配置

```javascript
const { setConfig } = require('./asr-test-config');

// 设置测试持续时间
setConfig('test.duration', 15000);

// 设置音频采样率
setConfig('test.audio.sampleRate', 8000);
```

### 添加自定义测试

```javascript
const { SimpleASRTest } = require('./simpleASRTest');

class CustomASRTest extends SimpleASRTest {
  async customTest() {
    // 添加自定义测试逻辑
  }
}
```

## 📝 日志说明

测试工具提供详细的日志输出，包括：

- 🔌 连接状态
- 📤 消息发送
- 📨 消息接收
- 🎤 录音状态
- ❌ 错误信息
- ✅ 成功状态

## 🤝 贡献

如需添加新功能或修复问题，请：

1. 创建新的测试文件
2. 更新配置文件
3. 修改运行脚本
4. 更新文档

## 📞 支持

如有问题或建议，请：

1. 查看控制台错误信息
2. 检查配置文件设置
3. 验证网络连接
4. 联系开发团队

---

**注意**: 此测试工具仅用于开发和测试环境，请勿在生产环境中使用模拟的Token和音频数据。
