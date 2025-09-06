/**
 * 阿里云ASR WebSocket协议测试
 * 严格按照阿里云官方文档规范实现
 * 参考: https://help.aliyun.com/zh/isi/developer-reference/websocket
 */

const WebSocket = require('ws');
const crypto = require('crypto');
const { getToken } = require('./aliyun-token-client');

class AlibabaASRProtocolTest {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.currentTaskId = null;
    this.testResults = [];
    this.config = {
      region: 'shanghai', // shanghai, beijing, singapore
      appKey: 'gL0aXXsAifcMbt9r', // 需要替换为实际AppKey
      accessKeyId: 'LTAI5tK2tg6eYxbBPRU3F45e', // 阿里云AccessKey ID
      accessKeySecret: 'yv1GQNsZOZCid7ZBTcgujq4leST', // 阿里云AccessKey Secret
      tokenUrl: 'https://YOUR_BACKEND.example.com/ali-nls/token', // 备用Token URL
      sampleRate: 16000,
      format: 'pcm'
    };
  }

  /**
   * 生成32位十六进制字符串
   * 根据官方文档要求：message_id和task_id都必须是32位唯一ID
   */
  genHex32() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * 获取WebSocket URL
   * 根据官方文档格式：wss://nls-gateway-cn-{region}.aliyuncs.com/ws/v1?token={token}
   */
  getWebSocketUrl(token) {
    const regionMap = {
      'beijing': 'cn-beijing',
      'shanghai': 'cn-shanghai', 
      'singapore': 'ap-southeast-1'
    };
    
    const region = regionMap[this.config.region] || 'cn-shanghai';
    return `wss://nls-gateway-${region}.aliyuncs.com/ws/v1?token=${encodeURIComponent(token)}`;
  }

  /**
   * 获取Token
   * 优先使用阿里云官方API获取Token，失败时使用备用方案
   */
  async fetchToken() {
    try {
      console.log('🔑 获取阿里云NLS Token...');
      
      // 方案1: 使用阿里云官方API获取Token
      if (this.config.accessKeyId && this.config.accessKeyId !== 'YOUR_ACCESS_KEY_ID' &&
          this.config.accessKeySecret && this.config.accessKeySecret !== 'YOUR_ACCESS_KEY_SECRET') {
        console.log('📡 使用阿里云官方API获取Token...');
        
        const regionMap = {
          'beijing': 'cn-beijing',
          'shanghai': 'cn-shanghai',
          'singapore': 'ap-southeast-1'
        };
        
        const regionId = regionMap[this.config.region] || 'cn-shanghai';
        const tokenResult = await getToken(
          this.config.accessKeyId,
          this.config.accessKeySecret,
          regionId
        );
        
        console.log('✅ 阿里云API Token获取成功');
        return tokenResult.token;
      }
      
      // 方案2: 使用后端Token服务
      if (this.config.tokenUrl && !this.config.tokenUrl.includes('YOUR_BACKEND')) {
        console.log('📡 使用后端Token服务...');
        
        const response = await fetch(this.config.tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // 根据您的后端API要求添加必要参数
          })
        });
        
        if (!response.ok) {
          throw new Error(`Token获取失败: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        const token = data.token || data.access_token;
        
        if (!token) {
          throw new Error('Token响应格式错误');
        }
        
        console.log('✅ 后端Token服务获取成功');
        return token;
      }
      
      // 方案3: 使用模拟Token（仅用于测试）
      throw new Error('未配置有效的Token获取方式');
      
    } catch (error) {
      console.log('⚠️  Token获取失败，使用模拟Token:', error.message);
      console.log('💡 请配置阿里云AccessKey或后端Token服务');
      return 'mock_token_' + Date.now();
    }
  }

  /**
   * 连接WebSocket
   */
  async connect() {
    try {
      const token = await this.fetchToken();
      const url = this.getWebSocketUrl(token);
      
      console.log('🔌 连接WebSocket:', url);
      
      return new Promise((resolve, reject) => {
        this.ws = new WebSocket(url);
        
        this.ws.on('open', () => {
          console.log('✅ WebSocket连接成功');
          this.isConnected = true;
          resolve();
        });

        this.ws.on('message', (data) => {
          this.handleMessage(data);
        });

        this.ws.on('error', (error) => {
          console.error('❌ WebSocket错误:', error);
          this.isConnected = false;
          reject(error);
        });

        this.ws.on('close', () => {
          console.log('🔌 WebSocket连接已关闭');
          this.isConnected = false;
        });

        // 设置连接超时
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('连接超时'));
          }
        }, 10000);
      });
    } catch (error) {
      console.error('❌ 连接失败:', error.message);
      throw error;
    }
  }

  /**
   * 处理WebSocket消息
   * 根据官方文档处理各种事件
   */
  handleMessage(data) {
    try {
      const message = JSON.parse(data.toString());
      const header = message.header;
      const payload = message.payload || {};
      
      console.log(`📨 收到消息: ${header.name}`);
      console.log(`📋 状态码: ${header.status}, 消息: ${header.status_message}`);
      
      // 记录测试结果
      this.testResults.push({
        event: header.name,
        status: header.status,
        message: header.status_message,
        payload: payload,
        timestamp: Date.now()
      });

      switch (header.name) {
        case 'TranscriptionStarted':
          console.log('🎤 转录已开始');
          break;
          
        case 'TranscriptionResultChanged':
          if (payload.result) {
            console.log(`📝 中间结果: ${payload.result}`);
            if (payload.words) {
              console.log(`🔤 词信息:`, payload.words);
            }
          }
          break;
          
        case 'SentenceEnd':
          if (payload.result) {
            console.log(`📝 句子结束: ${payload.result}`);
            console.log(`📊 置信度: ${payload.confidence || 'N/A'}`);
          }
          break;
          
        case 'TranscriptionCompleted':
          console.log('✅ 转录完成');
          break;
          
        case 'TaskFailed':
          console.error('❌ 任务失败:', payload);
          break;
          
        default:
          console.log(`ℹ️  其他事件: ${header.name}`);
      }
    } catch (error) {
      console.error('❌ 消息解析错误:', error);
      this.testResults.push({
        event: 'parse_error',
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * 发送开始转录指令
   * 严格按照官方文档格式
   */
  sendStartTranscription() {
    if (!this.isConnected || !this.ws) {
      throw new Error('WebSocket未连接');
    }

    // 生成32位唯一ID
    const messageId = this.genHex32();
    const taskId = this.genHex32();
    this.currentTaskId = taskId;

    const message = {
      header: {
        message_id: messageId,
        task_id: taskId,
        namespace: 'SpeechTranscriber',
        name: 'StartTranscription',
        appkey: this.config.appKey
      },
      payload: {
        format: this.config.format,
        sample_rate: this.config.sampleRate,
        enable_intermediate_result: true,
        enable_punctuation_prediction: true,
        enable_inverse_text_normalization: true
      }
    };

    console.log('📤 发送开始转录指令');
    console.log('📋 消息内容:', JSON.stringify(message, null, 2));
    
    this.ws.send(JSON.stringify(message));
  }

  /**
   * 发送音频数据
   * 使用Binary Frame发送PCM音频数据
   */
  sendAudioData(audioBuffer) {
    if (!this.isConnected || !this.ws) {
      throw new Error('WebSocket未连接');
    }

    // 根据官方文档，音频数据使用Binary Frame发送
    this.ws.send(audioBuffer);
  }

  /**
   * 发送停止转录指令
   * 严格按照官方文档格式
   */
  sendStopTranscription() {
    if (!this.isConnected || !this.ws) {
      throw new Error('WebSocket未连接');
    }

    const messageId = this.genHex32();
    const taskId = this.currentTaskId || this.genHex32();

    const message = {
      header: {
        message_id: messageId,
        task_id: taskId,
        namespace: 'SpeechTranscriber',
        name: 'StopTranscription',
        appkey: this.config.appKey
      }
    };

    console.log('📤 发送停止转录指令');
    console.log('📋 消息内容:', JSON.stringify(message, null, 2));
    
    this.ws.send(JSON.stringify(message));
  }

  /**
   * 生成模拟PCM音频数据
   * 16kHz, 16bit, 单声道
   */
  generateMockAudioData(duration = 1000) {
    const sampleRate = this.config.sampleRate;
    const samples = Math.floor((duration / 1000) * sampleRate);
    const audioData = new Int16Array(samples);
    
    // 生成简单的正弦波音频数据
    for (let i = 0; i < samples; i++) {
      const frequency = 440; // A4音符频率
      const amplitude = 16000; // 最大振幅
      const time = i / sampleRate;
      audioData[i] = Math.floor(amplitude * Math.sin(2 * Math.PI * frequency * time));
    }
    
    return audioData.buffer;
  }

  /**
   * 运行完整的ASR协议测试
   */
  async runProtocolTest() {
    console.log('🚀 开始阿里云ASR WebSocket协议测试');
    console.log('='.repeat(60));
    console.log('📖 参考文档: https://help.aliyun.com/zh/isi/developer-reference/websocket');
    console.log('='.repeat(60));

    try {
      // 1. 连接WebSocket
      await this.connect();
      
      // 2. 发送开始转录指令
      this.sendStartTranscription();
      
      // 3. 等待转录开始确认
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 4. 发送模拟音频数据
      console.log('🎤 开始发送模拟音频数据...');
      const audioData = this.generateMockAudioData(3000); // 3秒音频
      this.sendAudioData(audioData);
      
      // 5. 等待音频处理
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 6. 发送停止转录指令
      this.sendStopTranscription();
      
      // 7. 等待最终结果
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 8. 输出测试结果
      this.printTestResults();
      
    } catch (error) {
      console.error('❌ 协议测试失败:', error.message);
      throw error;
    } finally {
      this.cleanup();
    }
  }

  /**
   * 打印测试结果
   */
  printTestResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 ASR协议测试结果');
    console.log('='.repeat(60));

    if (this.testResults.length === 0) {
      console.log('⚠️  未收到任何消息');
      return;
    }

    console.log(`📈 总共收到 ${this.testResults.length} 条消息`);
    
    const eventCounts = {};
    this.testResults.forEach(result => {
      eventCounts[result.event] = (eventCounts[result.event] || 0) + 1;
    });

    console.log('\n📋 事件统计:');
    Object.entries(eventCounts).forEach(([event, count]) => {
      console.log(`  ${event}: ${count} 次`);
    });

    console.log('\n📝 详细消息:');
    this.testResults.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.event} (${result.status})`);
      if (result.payload && result.payload.result) {
        console.log(`     结果: ${result.payload.result}`);
      }
    });

    // 评估测试结果
    const hasStarted = this.testResults.some(r => r.event === 'TranscriptionStarted');
    const hasResults = this.testResults.some(r => r.event === 'TranscriptionResultChanged');
    const hasCompleted = this.testResults.some(r => r.event === 'TranscriptionCompleted');
    
    console.log('\n🎯 协议符合性评估:');
    console.log(`  转录开始: ${hasStarted ? '✅' : '❌'}`);
    console.log(`  结果接收: ${hasResults ? '✅' : '❌'}`);
    console.log(`  转录完成: ${hasCompleted ? '✅' : '❌'}`);
    
    const isProtocolValid = hasStarted && (hasResults || hasCompleted);
    console.log(`\n🎉 协议测试: ${isProtocolValid ? '✅ 通过' : '❌ 失败'}`);
    
    if (isProtocolValid) {
      console.log('🎊 恭喜！ASR WebSocket协议实现正确！');
    } else {
      console.log('⚠️  协议实现可能存在问题，请检查配置和实现');
    }
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

  /**
   * 设置配置
   */
  setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * 运行协议测试
 */
async function runProtocolTest() {
  const test = new AlibabaASRProtocolTest();
  
  // 可以在这里设置配置
  // test.setConfig({
  //   region: 'beijing',
  //   appKey: 'your_actual_app_key',
  //   tokenUrl: 'https://your-backend.com/token'
  // });

  try {
    await test.runProtocolTest();
  } catch (error) {
    console.error('❌ 测试执行失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  console.log('🧪 阿里云ASR WebSocket协议测试工具');
  console.log('📖 严格按照官方文档规范实现');
  console.log('');

  runProtocolTest().then(() => {
    console.log('\n✅ 测试完成');
    process.exit(0);
  }).catch((error) => {
    console.error('\n❌ 测试失败:', error.message);
    process.exit(1);
  });
}

module.exports = { AlibabaASRProtocolTest, runProtocolTest };
