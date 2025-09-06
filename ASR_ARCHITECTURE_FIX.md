# ASR架构修复总结

## 🔍 问题分析

### 原始问题
连接数字人后发生闪退，主要原因是：

1. **WebSocketManager引用错误**: `Microphone.js` 中调用了未导入的 `WebSocketManager.close()`
2. **ASR架构不兼容**: 新旧ASR组件之间存在接口不匹配
3. **音频数据流冲突**: `RecorderManager` 使用旧的 `WebSocketManager`，而新的ASR组件期望使用回调模式

## 🛠️ 解决方案

### 1. 修改 RecorderManager 支持回调模式

**文件**: `screens/utils/RecorderManager.js`

**主要修改**:
- 添加了 `onDataCallback` 和 `useCallback` 属性
- 新增 `setOnDataCallback(callback)` 方法
- 修改 `init(options)` 方法支持配置参数
- 更新 `processAudioData()` 方法支持回调模式和兼容模式
- 在 `cleanup()` 中清理回调函数

**关键代码**:
```javascript
// 新增属性
this.onDataCallback = null
this.useCallback = false

// 新增方法
setOnDataCallback(callback) {
  this.onDataCallback = callback
  this.useCallback = !!callback
}

// 修改音频数据处理
if (this.useCallback && this.onDataCallback) {
  // 回调模式：发送给回调函数
  this.onDataCallback(sendBuf.buffer)
} else {
  // 兼容模式：使用WebSocketManager发送
  WebSocketManager.sendAudio(sendBuf.buffer)
}
```

### 2. 更新 RealtimeSpeechRecognition 使用新的回调模式

**文件**: `screens/ASR/RealtimeSpeechRecognition.js`

**主要修改**:
- 更新 `initRecorder` 函数使用新的回调模式
- 添加错误处理和日志记录
- 确保音频数据通过回调发送给 `ASRWebSocket`

**关键代码**:
```javascript
// 设置音频数据回调函数
RecorderManager.setOnDataCallback((pcmChunk) => {
  // 直接把 PCM 二进制送入阿里云 ASR WebSocket（二进制帧）
  ASRWebSocket.sendAudio(pcmChunk)
})
```

### 3. 修复 Microphone.js 中的 cleanup 函数

**文件**: `screens/DigitalHuman/Microphone.js`

**主要修改**:
- 移除错误的 `WebSocketManager.close()` 调用
- 添加清晰的注释说明新的架构
- 保持与 `RecorderManager` 的兼容性

**关键代码**:
```javascript
// 清理函数
const cleanup = () => {
  if (recording) {
    RecorderManager.stop()
  }
  // 注意：不再需要调用WebSocketManager.close()，因为现在使用ASRWebSocketManager
  // 音频数据通过RecorderManager的回调模式发送给RealtimeSpeechRecognition
  setIsConnected(false)
  RecorderManager.cleanup()
}
```

## 🧪 测试验证

### 创建了集成测试文件
**文件**: `screens/utils/ASRIntegrationTest.js`

**测试内容**:
1. RecorderManager回调模式设置测试
2. ASRWebSocket连接测试
3. 音频数据流测试

**运行测试**:
```javascript
import ASRIntegrationTest from './screens/utils/ASRIntegrationTest'

const test = new ASRIntegrationTest()
test.runTests()
```

## 📋 架构改进

### 新的ASR数据流
```
用户录音 → RecorderManager → 回调函数 → ASRWebSocket → 阿里云ASR服务
```

### 兼容性保证
- 保持向后兼容：如果未设置回调，仍使用 `WebSocketManager`
- 渐进式迁移：可以逐步将其他组件迁移到新架构
- 错误处理：添加了完善的错误处理和日志记录

## ✅ 修复结果

1. **解决闪退问题**: 移除了错误的 `WebSocketManager` 引用
2. **统一ASR架构**: 所有ASR相关组件现在使用一致的接口
3. **提高可维护性**: 清晰的职责分离和模块化设计
4. **保持兼容性**: 现有代码可以继续工作，同时支持新功能

## 🚀 使用建议

1. **立即部署**: 这些修改解决了闪退问题，可以立即部署
2. **监控日志**: 关注控制台日志，确保回调模式正常工作
3. **逐步迁移**: 其他使用 `RecorderManager` 的组件可以逐步迁移到回调模式
4. **测试验证**: 在生产环境中运行集成测试验证功能正常

## 📝 注意事项

- 确保 `ASRWebSocketManager` 正确配置阿里云ASR服务
- 监控音频数据流的性能和稳定性
- 如果遇到问题，可以回退到兼容模式（不设置回调函数）
