#!/usr/bin/env node

/**
 * 测试阿里云Token客户端
 */

const { getToken } = require('./aliyun-token-client');

async function testTokenClient() {
  console.log('🧪 测试阿里云Token客户端');
  console.log('='.repeat(50));
  
  // 测试配置
  const testConfig = {
    accessKeyId: 'YOUR_ACCESS_KEY_ID',
    accessKeySecret: 'YOUR_ACCESS_KEY_SECRET',
    regionId: 'cn-shanghai'
  };
  
  console.log('📋 测试配置:');
  console.log(`AccessKey ID: ${testConfig.accessKeyId}`);
  console.log(`AccessKey Secret: ${testConfig.accessKeySecret ? '***已配置***' : '未配置'}`);
  console.log(`Region ID: ${testConfig.regionId}`);
  console.log('');
  
  try {
    console.log('🔑 开始获取Token...');
    const result = await getToken(
      testConfig.accessKeyId,
      testConfig.accessKeySecret,
      testConfig.regionId
    );
    
    console.log('✅ Token获取成功!');
    console.log(`Token: ${result.token}`);
    console.log(`过期时间: ${result.expireDate}`);
    
  } catch (error) {
    console.log('❌ Token获取失败:');
    console.log(`错误: ${error.message}`);
    console.log('');
    console.log('💡 解决方案:');
    console.log('1. 请确保已配置有效的阿里云AccessKey');
    console.log('2. 请确保网络连接正常');
    console.log('3. 请确保AccessKey有智能语音交互服务权限');
  }
}

// 运行测试
if (require.main === module) {
  testTokenClient().then(() => {
    console.log('\n✅ 测试完成');
    process.exit(0);
  }).catch((error) => {
    console.error('\n❌ 测试失败:', error.message);
    process.exit(1);
  });
}

module.exports = { testTokenClient };
