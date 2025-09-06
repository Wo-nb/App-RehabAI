/**
 * 阿里云ASR协议测试使用示例
 * 展示如何正确配置和使用协议测试功能
 */

const { AlibabaASRProtocolTest } = require('./alibaba-asr-protocol-test');

// 示例1: 基本使用
async function example1_basicUsage() {
  console.log('📝 示例1: 基本协议测试');
  console.log('='.repeat(50));
  
  const test = new AlibabaASRProtocolTest();
  
  try {
    await test.runProtocolTest();
    console.log('✅ 基本协议测试完成');
  } catch (error) {
    console.error('❌ 基本协议测试失败:', error.message);
  }
}

// 示例2: 自定义配置
async function example2_customConfig() {
  console.log('📝 示例2: 自定义配置测试');
  console.log('='.repeat(50));
  
  const test = new AlibabaASRProtocolTest();
  
  // 设置自定义配置
  test.setConfig({
    region: 'beijing', // 使用北京区域
    appKey: 'your_actual_app_key_here', // 替换为实际AppKey
    tokenUrl: 'https://your-backend.com/api/token', // 替换为实际Token URL
    sampleRate: 8000, // 使用8kHz采样率
    format: 'pcm'
  });
  
  try {
    await test.runProtocolTest();
    console.log('✅ 自定义配置测试完成');
  } catch (error) {
    console.error('❌ 自定义配置测试失败:', error.message);
  }
}

// 示例3: 分步测试
async function example3_stepByStep() {
  console.log('📝 示例3: 分步测试');
  console.log('='.repeat(50));
  
  const test = new AlibabaASRProtocolTest();
  
  try {
    // 步骤1: 连接
    console.log('🔌 步骤1: 连接WebSocket...');
    await test.connect();
    
    // 步骤2: 发送开始指令
    console.log('📤 步骤2: 发送开始转录指令...');
    test.sendStartTranscription();
    
    // 步骤3: 等待确认
    console.log('⏳ 步骤3: 等待转录开始确认...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 步骤4: 发送音频数据
    console.log('🎤 步骤4: 发送模拟音频数据...');
    const audioData = test.generateMockAudioData(2000); // 2秒音频
    test.sendAudioData(audioData);
    
    // 步骤5: 等待处理
    console.log('⏳ 步骤5: 等待音频处理...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 步骤6: 发送停止指令
    console.log('📤 步骤6: 发送停止转录指令...');
    test.sendStopTranscription();
    
    // 步骤7: 等待最终结果
    console.log('⏳ 步骤7: 等待最终结果...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 步骤8: 输出结果
    console.log('📊 步骤8: 输出测试结果...');
    test.printTestResults();
    
    console.log('✅ 分步测试完成');
  } catch (error) {
    console.error('❌ 分步测试失败:', error.message);
  } finally {
    test.cleanup();
  }
}

// 示例4: 错误处理测试
async function example4_errorHandling() {
  console.log('📝 示例4: 错误处理测试');
  console.log('='.repeat(50));
  
  const test = new AlibabaASRProtocolTest();
  
  // 使用错误的配置来测试错误处理
  test.setConfig({
    region: 'invalid-region',
    appKey: 'invalid-key',
    tokenUrl: 'https://invalid-url.com/token'
  });
  
  try {
    await test.runProtocolTest();
  } catch (error) {
    console.log('✅ 错误处理测试通过 - 正确捕获了错误:', error.message);
  }
}

// 示例5: 批量测试不同区域
async function example5_multiRegionTest() {
  console.log('📝 示例5: 多区域测试');
  console.log('='.repeat(50));
  
  const regions = ['shanghai', 'beijing', 'singapore'];
  
  for (const region of regions) {
    console.log(`\n🌍 测试区域: ${region}`);
    console.log('-'.repeat(30));
    
    const test = new AlibabaASRProtocolTest();
    test.setConfig({
      region: region,
      appKey: 'YOUR_ALIBABA_APPKEY', // 需要替换为实际AppKey
      tokenUrl: 'https://YOUR_BACKEND.example.com/ali-nls/token' // 需要替换为实际URL
    });
    
    try {
      await test.runProtocolTest();
      console.log(`✅ ${region} 区域测试通过`);
    } catch (error) {
      console.log(`❌ ${region} 区域测试失败:`, error.message);
    }
  }
}

// 示例6: 性能测试
async function example6_performanceTest() {
  console.log('📝 示例6: 性能测试');
  console.log('='.repeat(50));
  
  const test = new AlibabaASRProtocolTest();
  const startTime = Date.now();
  
  try {
    await test.runProtocolTest();
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`⏱️  测试耗时: ${duration}ms`);
    console.log(`📊 平均响应时间: ${duration / test.testResults.length}ms/消息`);
  } catch (error) {
    console.error('❌ 性能测试失败:', error.message);
  }
}

// 主函数 - 运行所有示例
async function runAllExamples() {
  console.log('🚀 阿里云ASR协议测试使用示例');
  console.log('='.repeat(60));
  console.log('📖 参考文档: https://help.aliyun.com/zh/isi/developer-reference/websocket');
  console.log('='.repeat(60));
  
  const examples = [
    { name: '基本使用', func: example1_basicUsage },
    { name: '自定义配置', func: example2_customConfig },
    { name: '分步测试', func: example3_stepByStep },
    { name: '错误处理', func: example4_errorHandling },
    { name: '多区域测试', func: example5_multiRegionTest },
    { name: '性能测试', func: example6_performanceTest }
  ];
  
  for (const example of examples) {
    try {
      await example.func();
      console.log(`\n✅ ${example.name} 示例完成\n`);
    } catch (error) {
      console.error(`\n❌ ${example.name} 示例失败:`, error.message, '\n');
    }
    
    // 添加分隔线
    console.log('='.repeat(60));
  }
  
  console.log('🎉 所有示例运行完成');
}

// 如果直接运行此文件，则执行所有示例
if (require.main === module) {
  runAllExamples().catch((error) => {
    console.error('❌ 示例运行失败:', error.message);
    process.exit(1);
  });
}

module.exports = {
  example1_basicUsage,
  example2_customConfig,
  example3_stepByStep,
  example4_errorHandling,
  example5_multiRegionTest,
  example6_performanceTest,
  runAllExamples
};
