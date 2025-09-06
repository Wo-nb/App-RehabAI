/**
 * ASR (Automatic Speech Recognition) 独立测试函数
 * 用于测试阿里云实时语音识别功能，不依赖Android APP界面
 * 可以独立运行，用于验证ASR服务的连接性和基本功能
 */

const WebSocket = require('ws');
const crypto = require('crypto');

class ASRTestManager {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.isRecording = false;
    this.recognitionResults = [];
    this.testConfig = {
      region: 'cn-shanghai',
      appKey: 'YOUR_ALIBABA_APPKEY', // 需要替换为实际的AppKey
      tokenUrl: 'https://YOUR_BACKEND.example.com/ali-nls/token', // 需要替换为实际的token获取地址
      testDuration: 10000, // 测试持续时间（毫秒）
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16
    };
  }

  /**
   * 生成32字节的十六进制字符串
   */
  genHex32() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * 获取阿里云NLS token
   * 根据官方文档，需要从后端安全获取临时Token
   */
  async fetchToken() {
    try {
      console.log('🔑 正在获取阿里云NLS token...');
      
      // 实际使用时需要替换为真实的API调用
      const response = await fetch(this.testConfig.tokenUrl, {
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
      
      console.log('✅ Token获取成功');
      return token;
    } catch (error) {
      console.error('❌ Token获取失败:', error.message);
      // 如果真实API调用失败，使用模拟token进行测试
      console.log('⚠️  使用模拟Token进行测试');
      return 'mock_token_' + Date.now();
    }
  }

  /**
   * 生成模拟的PCM音频数据
   * 用于测试ASR识别功能
   */
  generateMockAudioData(duration = 1000) {
    const sampleRate = this.testConfig.sampleRate;
    const samples = Math.floor((duration / 1000) * sampleRate);
    const audioData = new Int16Array(samples);
    
    // 生成简单的正弦波音频数据作为测试
    for (let i = 0; i < samples; i++) {
      const frequency = 440; // A4音符频率
      const amplitude = 16000; // 最大振幅
      const time = i / sampleRate;
      audioData[i] = Math.floor(amplitude * Math.sin(2 * Math.PI * frequency * time));
    }
    
    return audioData.buffer;
  }

  /**
   * 连接阿里云NLS WebSocket服务
   */
  async connect() {
    try {
      console.log('🔌 正在连接阿里云NLS服务...');
      
      // 获取token
      const token = await this.fetchToken();
      
      // 构建WebSocket URL - 根据官方文档使用正确的URL格式
      const url = `wss://nls-gateway-cn-${this.testConfig.region}.aliyuncs.com/ws/v1?token=${encodeURIComponent(token)}`;
      
      // 创建WebSocket连接
      this.ws = new WebSocket(url);
      
      return new Promise((resolve, reject) => {
        this.ws.on('open', () => {
          console.log('✅ WebSocket连接成功');
          this.isConnected = true;
          resolve();
        });

        this.ws.on('message', (data) => {
          this.handleMessage(data);
        });

        this.ws.on('error', (error) => {
          console.error('❌ WebSocket连接错误:', error);
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
   * 根据阿里云官方文档规范处理各种事件
   */
  handleMessage(data) {
    try {
      const message = JSON.parse(data.toString());
      const eventName = message?.header?.name;
      const status = message?.header?.status;
      const statusMessage = message?.header?.status_message;
      const payload = message?.payload || {};

      console.log(`📨 收到消息: ${eventName}`);
      if (status !== 20000000) {
        console.log(`⚠️  状态码: ${status}, 消息: ${statusMessage}`);
      }

      switch (eventName) {
        case 'TranscriptionStarted':
          console.log('🎤 转录已开始');
          this.recognitionResults.push({ 
            type: 'started', 
            timestamp: Date.now(),
            status: status,
            message: statusMessage
          });
          break;
          
        case 'TranscriptionResultChanged':
          const intermediateText = payload.result || '';
          if (intermediateText) {
            console.log(`📝 中间结果: ${intermediateText}`);
            this.recognitionResults.push({ 
              type: 'intermediate', 
              text: intermediateText, 
              timestamp: Date.now(),
              index: payload.index,
              time: payload.time,
              words: payload.words
            });
          }
          break;
          
        case 'SentenceEnd':
          const sentenceText = payload.result || '';
          if (sentenceText) {
            console.log(`📝 句子结束: ${sentenceText}`);
            this.recognitionResults.push({ 
              type: 'sentence', 
              text: sentenceText, 
              timestamp: Date.now(),
              index: payload.index,
              time: payload.time,
              begin_time: payload.begin_time,
              confidence: payload.confidence,
              words: payload.words
            });
          }
          break;
          
        case 'TranscriptionCompleted':
          console.log('✅ 转录完成');
          this.recognitionResults.push({ 
            type: 'completed', 
            timestamp: Date.now(),
            status: status,
            message: statusMessage
          });
          break;
          
        case 'TaskFailed':
          console.error('❌ 任务失败:', payload);
          this.recognitionResults.push({ 
            type: 'failed', 
            timestamp: Date.now(),
            error: payload,
            status: status,
            message: statusMessage
          });
          break;
          
        default:
          console.log(`ℹ️  其他事件: ${eventName}`, payload);
          this.recognitionResults.push({ 
            type: 'other', 
            event: eventName,
            payload: payload,
            timestamp: Date.now()
          });
      }
    } catch (error) {
      console.error('❌ 消息解析错误:', error);
      this.recognitionResults.push({ 
        type: 'parse_error', 
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * 发送开始转录指令
   * 根据阿里云官方文档规范实现
   */
  sendStartTranscription() {
    if (!this.isConnected || !this.ws) {
      throw new Error('WebSocket未连接');
    }

    // 生成32位唯一ID
    const messageId = this.genHex32();
    const taskId = this.genHex32();
    
    // 保存taskId用于后续消息
    this.currentTaskId = taskId;

    const message = {
      header: {
        message_id: messageId,
        task_id: taskId,
        namespace: 'SpeechTranscriber',
        name: 'StartTranscription',
        appkey: this.testConfig.appKey
      },
      payload: {
        format: 'pcm',
        sample_rate: this.testConfig.sampleRate,
        enable_intermediate_result: true,
        enable_punctuation_prediction: true,
        enable_inverse_text_normalization: true
      }
    };

    console.log('📤 发送开始转录指令');
    console.log('📋 消息详情:', JSON.stringify(message, null, 2));
    this.ws.send(JSON.stringify(message));
  }

  /**
   * 发送音频数据
   */
  sendAudioData(audioBuffer) {
    if (!this.isConnected || !this.ws) {
      throw new Error('WebSocket未连接');
    }

    this.ws.send(audioBuffer);
  }

  /**
   * 发送停止转录指令
   * 根据阿里云官方文档规范实现
   */
  sendStopTranscription() {
    if (!this.isConnected || !this.ws) {
      throw new Error('WebSocket未连接');
    }

    // 使用相同的taskId
    const messageId = this.genHex32();
    const taskId = this.currentTaskId || this.genHex32();

    const message = {
      header: {
        message_id: messageId,
        task_id: taskId,
        namespace: 'SpeechTranscriber',
        name: 'StopTranscription',
        appkey: this.testConfig.appKey
      }
    };

    console.log('📤 发送停止转录指令');
    console.log('📋 消息详情:', JSON.stringify(message, null, 2));
    this.ws.send(JSON.stringify(message));
  }

  /**
   * 执行ASR测试
   */
  async runASRTest() {
    console.log('🚀 开始ASR功能测试...');
    console.log('='.repeat(50));

    try {
      // 1. 连接WebSocket
      await this.connect();

      // 2. 开始转录
      this.sendStartTranscription();
      this.isRecording = true;

      // 3. 模拟录音过程
      console.log('🎤 开始模拟录音...');
      const startTime = Date.now();
      const chunkInterval = 100; // 每100ms发送一次音频数据
      const chunkDuration = 100; // 每次发送100ms的音频

      const sendAudioChunks = () => {
        if (this.isRecording && Date.now() - startTime < this.testConfig.testDuration) {
          const audioData = this.generateMockAudioData(chunkDuration);
          this.sendAudioData(audioData);
          setTimeout(sendAudioChunks, chunkInterval);
        } else {
          // 停止录音
          this.stopRecording();
        }
      };

      sendAudioChunks();

      // 4. 等待测试完成
      await new Promise(resolve => {
        setTimeout(resolve, this.testConfig.testDuration + 5000); // 额外等待5秒接收结果
      });

      // 5. 输出测试结果
      this.printTestResults();

    } catch (error) {
      console.error('❌ ASR测试失败:', error.message);
      throw error;
    } finally {
      this.cleanup();
    }
  }

  /**
   * 停止录音
   */
  stopRecording() {
    if (this.isRecording) {
      console.log('🛑 停止录音...');
      this.isRecording = false;
      this.sendStopTranscription();
    }
  }

  /**
   * 打印测试结果
   */
  printTestResults() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 ASR测试结果:');
    console.log('='.repeat(50));

    if (this.recognitionResults.length === 0) {
      console.log('⚠️  未收到任何识别结果');
      return;
    }

    console.log(`📈 总共收到 ${this.recognitionResults.length} 条消息`);
    
    const intermediateResults = this.recognitionResults.filter(r => r.type === 'intermediate');
    const sentenceResults = this.recognitionResults.filter(r => r.type === 'sentence');
    const completedResults = this.recognitionResults.filter(r => r.type === 'completed');

    console.log(`📝 中间结果: ${intermediateResults.length} 条`);
    console.log(`📄 句子结果: ${sentenceResults.length} 条`);
    console.log(`✅ 完成事件: ${completedResults.length} 条`);

    if (sentenceResults.length > 0) {
      console.log('\n📋 识别的句子:');
      sentenceResults.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.text}`);
      });
    }

    // 测试状态评估
    const isSuccess = completedResults.length > 0 || sentenceResults.length > 0;
    console.log(`\n🎯 测试状态: ${isSuccess ? '✅ 成功' : '❌ 失败'}`);
    
    if (isSuccess) {
      console.log('🎉 ASR功能正常工作！');
    } else {
      console.log('⚠️  ASR功能可能存在问题，请检查配置和网络连接');
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
    this.isRecording = false;
    console.log('🧹 资源清理完成');
  }

  /**
   * 设置测试配置
   */
  setTestConfig(config) {
    this.testConfig = { ...this.testConfig, ...config };
  }
}

/**
 * 独立的ASR测试函数
 * 可以在Node.js环境中直接运行
 */
async function testASR() {
  const asrTest = new ASRTestManager();
  
  // 可以在这里修改测试配置
  // asrTest.setTestConfig({
  //   region: 'cn-beijing',
  //   appKey: 'your_actual_app_key',
  //   tokenUrl: 'https://your-backend.com/token',
  //   testDuration: 15000
  // });

  try {
    await asrTest.runASRTest();
  } catch (error) {
    console.error('❌ 测试执行失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  console.log('🧪 ASR独立测试工具');
  console.log('📝 注意: 请确保已正确配置AppKey和Token获取地址');
  console.log('');

  testASR().then(() => {
    console.log('\n✅ 测试完成');
    process.exit(0);
  }).catch((error) => {
    console.error('\n❌ 测试失败:', error.message);
    process.exit(1);
  });
}

module.exports = { ASRTestManager, testASR };
