/**
 * ASR测试工具使用示例
 * 展示如何在代码中使用ASR测试工具
 */

const { SimpleASRTest, quickASRTest } = require('./simpleASRTest');
const { ASRTestManager, testASR } = require('./ASRTest');
const { config, setConfig, validateConfig } = require('./asr-test-config');

// 示例1: 基本使用 - 快速测试
async function example1_quickTest() {
  console.log('📝 示例1: 快速ASR测试');
  console.log('='.repeat(40));
  
  try {
    await quickASRTest();
    console.log('✅ 快速测试完成');
  } catch (error) {
    console.error('❌ 快速测试失败:', error.message);
  }
}

// 示例2: 自定义配置测试
async function example2_customConfigTest() {
  console.log('📝 示例2: 自定义配置测试');
  console.log('='.repeat(40));
  
  // 设置自定义配置
  setConfig('alibaba.region', 'cn-beijing');
  setConfig('test.duration', 5000);
  setConfig('test.audio.sampleRate', 8000);
  
  // 验证配置
  const errors = validateConfig();
  if (errors.length > 0) {
    console.log('⚠️  配置验证失败:', errors);
    return;
  }
  
  try {
    const test = new SimpleASRTest();
    await test.runAllTests();
    console.log('✅ 自定义配置测试完成');
  } catch (error) {
    console.error('❌ 自定义配置测试失败:', error.message);
  }
}

// 示例3: 完整功能测试
async function example3_fullTest() {
  console.log('📝 示例3: 完整功能测试');
  console.log('='.repeat(40));
  
  try {
    const asrTest = new ASRTestManager();
    
    // 设置测试配置
    asrTest.setTestConfig({
      region: 'cn-shanghai',
      appKey: 'YOUR_ALIBABA_APPKEY', // 需要替换为实际AppKey
      tokenUrl: 'https://YOUR_BACKEND.example.com/ali-nls/token', // 需要替换为实际URL
      testDuration: 8000
    });
    
    await asrTest.runASRTest();
    console.log('✅ 完整功能测试完成');
  } catch (error) {
    console.error('❌ 完整功能测试失败:', error.message);
  }
}

// 示例4: 错误处理测试
async function example4_errorHandlingTest() {
  console.log('📝 示例4: 错误处理测试');
  console.log('='.repeat(40));
  
  try {
    const test = new SimpleASRTest();
    
    // 故意使用错误的配置来测试错误处理
    test.testConfig = {
      region: 'invalid-region',
      appKey: 'invalid-key',
      tokenUrl: 'https://invalid-url.com/token'
    };
    
    await test.runAllTests();
  } catch (error) {
    console.log('✅ 错误处理测试通过 - 正确捕获了错误:', error.message);
  }
}

// 示例5: 批量测试
async function example5_batchTest() {
  console.log('📝 示例5: 批量测试');
  console.log('='.repeat(40));
  
  const testScenarios = [
    { name: '快速测试', func: quickASRTest },
    { name: '简化测试', func: () => {
      const test = new SimpleASRTest();
      return test.runAllTests();
    }}
  ];
  
  for (const scenario of testScenarios) {
    console.log(`\n🧪 运行 ${scenario.name}...`);
    try {
      await scenario.func();
      console.log(`✅ ${scenario.name} 通过`);
    } catch (error) {
      console.log(`❌ ${scenario.name} 失败:`, error.message);
    }
  }
}

// 示例6: 配置管理
function example6_configManagement() {
  console.log('📝 示例6: 配置管理');
  console.log('='.repeat(40));
  
  // 显示当前配置
  console.log('当前配置:');
  console.log('区域:', config.alibaba.region);
  console.log('AppKey:', config.alibaba.appKey);
  console.log('测试持续时间:', config.test.duration);
  
  // 修改配置
  setConfig('alibaba.region', 'ap-southeast-1');
  setConfig('test.duration', 12000);
  
  console.log('\n修改后配置:');
  console.log('区域:', config.alibaba.region);
  console.log('测试持续时间:', config.test.duration);
  
  // 验证配置
  const errors = validateConfig();
  if (errors.length === 0) {
    console.log('✅ 配置验证通过');
  } else {
    console.log('❌ 配置验证失败:', errors);
  }
}

// 主函数 - 运行所有示例
async function runAllExamples() {
  console.log('🚀 ASR测试工具使用示例');
  console.log('='.repeat(50));
  
  const examples = [
    { name: '基本使用', func: example1_quickTest },
    { name: '自定义配置', func: example2_customConfigTest },
    { name: '完整功能', func: example3_fullTest },
    { name: '错误处理', func: example4_errorHandlingTest },
    { name: '批量测试', func: example5_batchTest },
    { name: '配置管理', func: example6_configManagement }
  ];
  
  for (const example of examples) {
    try {
      await example.func();
      console.log(`\n✅ ${example.name} 示例完成\n`);
    } catch (error) {
      console.error(`\n❌ ${example.name} 示例失败:`, error.message, '\n');
    }
    
    // 添加分隔线
    console.log('-'.repeat(50));
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
  example1_quickTest,
  example2_customConfigTest,
  example3_fullTest,
  example4_errorHandlingTest,
  example5_batchTest,
  example6_configManagement,
  runAllExamples
};
