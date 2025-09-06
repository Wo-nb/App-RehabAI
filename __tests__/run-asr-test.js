#!/usr/bin/env node

/**
 * ASR测试运行脚本
 * 提供命令行接口来运行各种ASR测试
 */

const { SimpleASRTest, quickASRTest } = require('./simpleASRTest');
const { ASRTestManager, testASR } = require('./ASRTest');
const { AlibabaASRProtocolTest } = require('./alibaba-asr-protocol-test');
const { config, validateConfig, getEnvironmentInfo } = require('./asr-test-config');

// 命令行参数解析
const args = process.argv.slice(2);
const command = args[0] || 'quick';

// 帮助信息
function showHelp() {
  console.log(`
🧪 ASR测试工具使用说明

用法: node run-asr-test.js [命令] [选项]

命令:
  quick     快速测试 (默认) - 测试基本连接和消息处理
  full      完整测试 - 包含音频数据模拟和完整流程测试
  protocol  协议测试 - 严格按照阿里云官方文档规范测试
  config    显示当前配置
  validate  验证配置
  help      显示此帮助信息

选项:
  --region <region>     设置阿里云区域 (cn-shanghai, cn-beijing, ap-southeast-1)
  --appkey <key>        设置阿里云AppKey
  --access-key-id <id>  设置阿里云AccessKey ID
  --access-key-secret <secret> 设置阿里云AccessKey Secret
  --token-url <url>     设置Token获取URL
  --duration <ms>       设置测试持续时间（毫秒）
  --verbose             启用详细日志

示例:
  node run-asr-test.js quick
  node run-asr-test.js full --region cn-beijing --duration 15000
  node run-asr-test.js protocol --appkey "your_key" --access-key-id "your_id" --access-key-secret "your_secret"
  node run-asr-test.js protocol --appkey "your_key" --token-url "https://your-backend.com/token"
  node run-asr-test.js config
  node run-asr-test.js validate

注意:
  - 请确保已正确配置阿里云AppKey和Token获取服务
  - 测试需要网络连接到阿里云NLS服务
  - 建议在测试前先运行 'node run-asr-test.js validate' 检查配置
`);
}

// 显示配置
function showConfig() {
  console.log('📋 当前配置:');
  console.log('='.repeat(50));
  console.log(`区域: ${config.alibaba.region}`);
  console.log(`AppKey: ${config.alibaba.appKey}`);
  console.log(`AccessKey ID: ${config.alibaba.accessKeyId}`);
  console.log(`AccessKey Secret: ${config.alibaba.accessKeySecret ? '***已配置***' : '未配置'}`);
  console.log(`Token URL: ${config.alibaba.tokenUrl}`);
  console.log(`测试持续时间: ${config.test.duration}ms`);
  console.log(`音频采样率: ${config.test.audio.sampleRate}Hz`);
  console.log(`音频格式: ${config.test.audio.format}`);
  console.log('');
  
  const envInfo = getEnvironmentInfo();
  console.log('🖥️  环境信息:');
  console.log(`Node.js版本: ${envInfo.nodeVersion}`);
  console.log(`平台: ${envInfo.platform} ${envInfo.arch}`);
  console.log(`时间: ${envInfo.timestamp}`);
}

// 验证配置
function validateConfiguration() {
  console.log('🔍 验证配置...');
  console.log('='.repeat(50));
  
  const errors = validateConfig();
  
  if (errors.length === 0) {
    console.log('✅ 配置验证通过');
    return true;
  } else {
    console.log('❌ 配置验证失败:');
    errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
    return false;
  }
}

// 解析命令行选项
function parseOptions() {
  const options = {
    region: null,
    appkey: null,
    accessKeyId: null,
    accessKeySecret: null,
    tokenUrl: null,
    duration: null,
    verbose: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--region':
        options.region = args[++i];
        break;
      case '--appkey':
        options.appkey = args[++i];
        break;
      case '--access-key-id':
        options.accessKeyId = args[++i];
        break;
      case '--access-key-secret':
        options.accessKeySecret = args[++i];
        break;
      case '--token-url':
        options.tokenUrl = args[++i];
        break;
      case '--duration':
        options.duration = parseInt(args[++i]);
        break;
      case '--verbose':
        options.verbose = true;
        break;
    }
  }
  
  return options;
}

// 应用命令行选项
function applyOptions(options) {
  if (options.region) {
    config.alibaba.region = options.region;
  }
  if (options.appkey) {
    config.alibaba.appKey = options.appkey;
  }
  if (options.accessKeyId) {
    config.alibaba.accessKeyId = options.accessKeyId;
  }
  if (options.accessKeySecret) {
    config.alibaba.accessKeySecret = options.accessKeySecret;
  }
  if (options.tokenUrl) {
    config.alibaba.tokenUrl = options.tokenUrl;
  }
  if (options.duration) {
    config.test.duration = options.duration;
  }
  if (options.verbose) {
    config.logging.level = 'debug';
  }
}

// 运行快速测试
async function runQuickTest() {
  console.log('🚀 运行快速ASR测试...');
  console.log('='.repeat(50));
  
  try {
    await quickASRTest();
  } catch (error) {
    console.error('❌ 快速测试失败:', error.message);
    process.exit(1);
  }
}

// 运行完整测试
async function runFullTest() {
  console.log('🚀 运行完整ASR测试...');
  console.log('='.repeat(50));
  
  try {
    const asrTest = new ASRTestManager();
    asrTest.setTestConfig({
      region: config.alibaba.region,
      appKey: config.alibaba.appKey,
      tokenUrl: config.alibaba.tokenUrl,
      testDuration: config.test.duration
    });
    
    await asrTest.runASRTest();
  } catch (error) {
    console.error('❌ 完整测试失败:', error.message);
    process.exit(1);
  }
}

// 运行协议测试
async function runProtocolTest() {
  console.log('🚀 运行阿里云ASR协议测试...');
  console.log('='.repeat(50));
  
  try {
    const protocolTest = new AlibabaASRProtocolTest();
    protocolTest.setConfig({
      region: config.alibaba.region,
      appKey: config.alibaba.appKey,
      accessKeyId: config.alibaba.accessKeyId,
      accessKeySecret: config.alibaba.accessKeySecret,
      tokenUrl: config.alibaba.tokenUrl
    });
    
    await protocolTest.runProtocolTest();
  } catch (error) {
    console.error('❌ 协议测试失败:', error.message);
    process.exit(1);
  }
}

// 主函数
async function main() {
  console.log('🧪 ASR测试工具');
  console.log('='.repeat(50));
  
  // 解析命令行选项
  const options = parseOptions();
  applyOptions(options);
  
  // 根据命令执行相应操作
  switch (command) {
    case 'quick':
      if (!validateConfiguration()) {
        console.log('\n💡 请先修复配置问题，或使用 --appkey 和 --token-url 参数');
        process.exit(1);
      }
      await runQuickTest();
      break;
      
    case 'full':
      if (!validateConfiguration()) {
        console.log('\n💡 请先修复配置问题，或使用 --appkey 和 --token-url 参数');
        process.exit(1);
      }
      await runFullTest();
      break;
      
    case 'protocol':
      if (!validateConfiguration()) {
        console.log('\n💡 请先修复配置问题，或使用 --appkey 和 --token-url 参数');
        process.exit(1);
      }
      await runProtocolTest();
      break;
      
    case 'config':
      showConfig();
      break;
      
    case 'validate':
      validateConfiguration();
      break;
      
    case 'help':
      showHelp();
      break;
      
    default:
      console.log(`❌ 未知命令: ${command}`);
      console.log('使用 "node run-asr-test.js help" 查看帮助信息');
      process.exit(1);
  }
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  process.exit(1);
});

// 运行主函数
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ 程序执行失败:', error.message);
    process.exit(1);
  });
}

module.exports = { main, runQuickTest, runFullTest, showConfig, validateConfiguration };
