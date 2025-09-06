/**
 * 简化版ASR测试函数
 * 用于快速验证ASR服务的基本连接性和功能
 * 不依赖复杂的音频处理，专注于WebSocket连接和消息处理
 */

const WebSocket = require('ws');
const crypto = require('crypto');

class SimpleASRTest {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.testResults = {
      connection: false,
      startTranscription: false,
      messageHandling: false,
      stopTranscription: false
    };
  }

  /**
   * 生成随机ID
   */
  genId() {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * 获取阿里云NLS token
   * 根据官方文档，需要从后端安全获取临时Token
   */
  async getMockToken() {
    console.log('🔑 获取阿里云NLS Token...');
    
    // 实际使用时需要替换为真实的API调用
    try {
      const response = await fetch('https://YOUR_BACKEND.example.com/ali-nls/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // 根据您的后端API要求添加必要参数
        })
      });
      
      if (!response.ok) {
        throw new Error(`Token获取失败: ${response.status}`);
      }
      
      const data = await response.json();
      const token = data.token || data.access_token;
      
      if (!token) {
        throw new Error('Token响应格式错误');
      }
      
      console.log('✅ Token获取成功');
      return token;
    } catch (error) {
      console.log('⚠️  使用模拟Token进行测试:', error.message);
      return 'mock_token_' + Date.now();
    }
  }

  /**
   * 测试WebSocket连接
   */
  async testConnection() {
    console.log('🔌 测试WebSocket连接...');
    
    try {
      const token = await this.getMockToken();
      // 根据官方文档使用正确的URL格式
      const url = `wss://nls-gateway-cn-shanghai.aliyuncs.com/ws/v1?token=${encodeURIComponent(token)}`;
      
      return new Promise((resolve, reject) => {
        this.ws = new WebSocket(url);
        
        this.ws.on('open', () => {
          console.log('✅ WebSocket连接成功');
          this.isConnected = true;
          this.testResults.connection = true;
          resolve();
        });

        this.ws.on('error', (error) => {
          console.log('❌ WebSocket连接失败:', error.message);
          this.testResults.connection = false;
          reject(error);
        });

        this.ws.on('close', () => {
          console.log('🔌 WebSocket连接已关闭');
          this.isConnected = false;
        });

        // 设置超时
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('连接超时'));
          }
        }, 5000);
      });
    } catch (error) {
      console.log('❌ 连接测试失败:', error.message);
      throw error;
    }
  }

  /**
   * 测试开始转录功能
   * 根据阿里云官方文档规范实现
   */
  testStartTranscription() {
    console.log('📤 测试开始转录指令...');
    
    if (!this.isConnected) {
      console.log('❌ WebSocket未连接，无法测试开始转录');
      return false;
    }

    try {
      // 生成32位唯一ID
      const messageId = this.genId() + this.genId(); // 16位 + 16位 = 32位
      const taskId = this.genId() + this.genId(); // 16位 + 16位 = 32位
      
      // 保存taskId用于后续消息
      this.currentTaskId = taskId;

      const message = {
        header: {
          message_id: messageId,
          task_id: taskId,
          namespace: 'SpeechTranscriber',
          name: 'StartTranscription',
          appkey: 'YOUR_ALIBABA_APPKEY' // 需要替换为实际AppKey
        },
        payload: {
          format: 'pcm',
          sample_rate: 16000,
          enable_intermediate_result: true,
          enable_punctuation_prediction: true,
          enable_inverse_text_normalization: true
        }
      };

      console.log('📋 发送消息:', JSON.stringify(message, null, 2));
      this.ws.send(JSON.stringify(message));
      console.log('✅ 开始转录指令发送成功');
      this.testResults.startTranscription = true;
      return true;
    } catch (error) {
      console.log('❌ 开始转录指令发送失败:', error.message);
      this.testResults.startTranscription = false;
      return false;
    }
  }

  /**
   * 测试消息处理
   */
  testMessageHandling() {
    console.log('📨 测试消息处理...');
    
    if (!this.ws) {
      console.log('❌ WebSocket未初始化');
      return false;
    }

    let messageReceived = false;
    const originalOnMessage = this.ws.onmessage;

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📨 收到消息:', message.header?.name || '未知消息');
        messageReceived = true;
        this.testResults.messageHandling = true;
      } catch (error) {
        console.log('❌ 消息解析失败:', error.message);
      }
    });

    // 等待消息或超时
    return new Promise((resolve) => {
      setTimeout(() => {
        if (messageReceived) {
          console.log('✅ 消息处理测试通过');
        } else {
          console.log('⚠️  未收到预期消息，但消息处理机制正常');
        }
        resolve(messageReceived);
      }, 3000);
    });
  }

  /**
   * 测试停止转录功能
   * 根据阿里云官方文档规范实现
   */
  testStopTranscription() {
    console.log('📤 测试停止转录指令...');
    
    if (!this.isConnected) {
      console.log('❌ WebSocket未连接，无法测试停止转录');
      return false;
    }

    try {
      // 生成32位唯一ID
      const messageId = this.genId() + this.genId(); // 16位 + 16位 = 32位
      // 使用相同的taskId
      const taskId = this.currentTaskId || this.genId() + this.genId();

      const message = {
        header: {
          message_id: messageId,
          task_id: taskId,
          namespace: 'SpeechTranscriber',
          name: 'StopTranscription',
          appkey: 'YOUR_ALIBABA_APPKEY' // 需要替换为实际AppKey
        }
      };

      console.log('📋 发送消息:', JSON.stringify(message, null, 2));
      this.ws.send(JSON.stringify(message));
      console.log('✅ 停止转录指令发送成功');
      this.testResults.stopTranscription = true;
      return true;
    } catch (error) {
      console.log('❌ 停止转录指令发送失败:', error.message);
      this.testResults.stopTranscription = false;
      return false;
    }
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log('🧪 开始ASR功能测试...');
    console.log('='.repeat(50));

    try {
      // 测试连接
      await this.testConnection();
      
      // 等待连接稳定
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 测试开始转录
      this.testStartTranscription();
      
      // 测试消息处理
      await this.testMessageHandling();
      
      // 等待一段时间
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 测试停止转录
      this.testStopTranscription();
      
      // 等待消息处理
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.log('❌ 测试过程中出现错误:', error.message);
    } finally {
      this.cleanup();
      this.printResults();
    }
  }

  /**
   * 打印测试结果
   */
  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 测试结果汇总:');
    console.log('='.repeat(50));

    const tests = [
      { name: 'WebSocket连接', result: this.testResults.connection },
      { name: '开始转录指令', result: this.testResults.startTranscription },
      { name: '消息处理', result: this.testResults.messageHandling },
      { name: '停止转录指令', result: this.testResults.stopTranscription }
    ];

    tests.forEach(test => {
      const status = test.result ? '✅ 通过' : '❌ 失败';
      console.log(`${test.name}: ${status}`);
    });

    const passedTests = tests.filter(t => t.result).length;
    const totalTests = tests.length;
    const successRate = (passedTests / totalTests * 100).toFixed(1);

    console.log(`\n📈 通过率: ${passedTests}/${totalTests} (${successRate}%)`);

    if (passedTests === totalTests) {
      console.log('🎉 所有测试通过！ASR功能正常');
    } else if (passedTests >= totalTests / 2) {
      console.log('⚠️  部分测试通过，ASR功能基本正常，但可能需要检查配置');
    } else {
      console.log('❌ 大部分测试失败，ASR功能可能存在问题');
    }

    console.log('\n💡 提示:');
    console.log('- 请确保已正确配置阿里云AppKey');
    console.log('- 请确保Token获取服务正常工作');
    console.log('- 请检查网络连接和防火墙设置');
  }

  /**
   * 清理资源
   */
  cleanup() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    console.log('🧹 资源清理完成');
  }
}

/**
 * 快速ASR测试函数
 */
async function quickASRTest() {
  const test = new SimpleASRTest();
  await test.runAllTests();
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  console.log('🚀 简化版ASR测试工具');
  console.log('📝 此工具用于快速验证ASR服务的基本功能');
  console.log('');

  quickASRTest().then(() => {
    console.log('\n✅ 测试完成');
    process.exit(0);
  }).catch((error) => {
    console.error('\n❌ 测试失败:', error.message);
    process.exit(1);
  });
}

module.exports = { SimpleASRTest, quickASRTest };
