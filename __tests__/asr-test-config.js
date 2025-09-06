/**
 * ASR测试配置文件
 * 包含测试所需的各种配置参数
 */

const config = {
  // 阿里云NLS配置
  alibaba: {
    region: 'shanghai', // 可选: beijing, shanghai, singapore (对应cn-beijing, cn-shanghai, ap-southeast-1)
    appKey: 'test_app_key_for_demo', // 测试用AppKey
    accessKeyId: 'YOUR_ACCESS_KEY_ID', // 阿里云AccessKey ID
    accessKeySecret: 'YOUR_ACCESS_KEY_SECRET', // 阿里云AccessKey Secret
    tokenUrl: 'http://localhost:3001/token', // 备用Token服务
    // 根据官方文档的URL格式
    getWebSocketUrl: function(token) {
      return `wss://nls-gateway-cn-${this.region}.aliyuncs.com/ws/v1?token=${encodeURIComponent(token)}`;
    }
  },

  // 测试配置
  test: {
    // 测试持续时间（毫秒）
    duration: 10000,
    // 音频配置
    audio: {
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
      format: 'pcm'
    },
    // 连接超时时间（毫秒）
    connectionTimeout: 10000,
    // 消息等待超时时间（毫秒）
    messageTimeout: 5000
  },

  // 日志配置
  logging: {
    level: 'info', // debug, info, warn, error
    enableConsole: true,
    enableFile: false,
    filePath: './asr-test.log'
  },

  // 测试场景配置
  scenarios: {
    // 基本连接测试
    basicConnection: {
      enabled: true,
      description: '测试WebSocket基本连接功能'
    },
    // 消息处理测试
    messageHandling: {
      enabled: true,
      description: '测试消息发送和接收处理'
    },
    // 音频数据测试
    audioData: {
      enabled: true,
      description: '测试音频数据发送和识别'
    },
    // 错误处理测试
    errorHandling: {
      enabled: true,
      description: '测试各种错误情况的处理'
    }
  },

  // 模拟数据配置
  mockData: {
    // 模拟音频数据
    audio: {
      // 生成正弦波音频数据
      generateSineWave: true,
      frequency: 440, // Hz
      amplitude: 16000, // 最大振幅
      // 生成随机噪声
      generateNoise: false,
      noiseLevel: 0.1
    },
    // 模拟文本数据
    text: {
      // 测试用的中文文本
      chineseTexts: [
        '你好，这是一个语音识别测试',
        '今天天气很好',
        '请帮我打开灯',
        '谢谢你的帮助'
      ],
      // 测试用的英文文本
      englishTexts: [
        'Hello, this is a speech recognition test',
        'The weather is nice today',
        'Please turn on the light',
        'Thank you for your help'
      ]
    }
  },

  // 验证规则
  validation: {
    // 连接验证
    connection: {
      maxRetries: 3,
      retryDelay: 1000
    },
    // 消息验证
    message: {
      expectedEvents: [
        'TranscriptionStarted',
        'TranscriptionResultChanged',
        'SentenceEnd',
        'TranscriptionCompleted'
      ],
      timeoutForEachEvent: 3000
    },
    // 结果验证
    result: {
      minIntermediateResults: 1,
      minSentenceResults: 0,
      requireCompletion: false
    }
  }
};

/**
 * 获取配置值
 * @param {string} path - 配置路径，如 'alibaba.region'
 * @param {*} defaultValue - 默认值
 * @returns {*} 配置值
 */
function getConfig(path, defaultValue = null) {
  const keys = path.split('.');
  let value = config;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return defaultValue;
    }
  }
  
  return value;
}

/**
 * 设置配置值
 * @param {string} path - 配置路径
 * @param {*} value - 配置值
 */
function setConfig(path, value) {
  const keys = path.split('.');
  let current = config;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}

/**
 * 验证配置
 * @returns {Array} 验证错误列表
 */
function validateConfig() {
  const errors = [];
  
  // 验证阿里云配置
  if (!config.alibaba.appKey || config.alibaba.appKey === 'YOUR_ALIBABA_APPKEY') {
    errors.push('请配置有效的阿里云AppKey');
  }
  
  // 检查Token获取方式
  const hasAccessKey = config.alibaba.accessKeyId && config.alibaba.accessKeyId !== 'YOUR_ACCESS_KEY_ID' &&
                      config.alibaba.accessKeySecret && config.alibaba.accessKeySecret !== 'YOUR_ACCESS_KEY_SECRET';
  const hasTokenUrl = config.alibaba.tokenUrl && !config.alibaba.tokenUrl.includes('YOUR_BACKEND');
  
  if (!hasAccessKey && !hasTokenUrl) {
    errors.push('请配置阿里云AccessKey或Token获取URL');
  }
  
  // 如果是测试模式，允许使用模拟配置
  if (config.alibaba.appKey.startsWith('test_') && 
      (config.alibaba.tokenUrl.includes('localhost') || config.alibaba.tokenUrl.includes('mock-token-service'))) {
    // 测试模式，清除相关错误
    const testModeErrors = errors.filter(error => 
      !error.includes('AppKey') && !error.includes('AccessKey') && !error.includes('Token获取URL')
    );
    return testModeErrors;
  }
  
  // 验证测试配置
  if (config.test.duration <= 0) {
    errors.push('测试持续时间必须大于0');
  }
  
  if (config.test.audio.sampleRate <= 0) {
    errors.push('音频采样率必须大于0');
  }
  
  return errors;
}

/**
 * 获取测试环境信息
 * @returns {Object} 环境信息
 */
function getEnvironmentInfo() {
  return {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    timestamp: new Date().toISOString(),
    memoryUsage: process.memoryUsage()
  };
}

module.exports = {
  config,
  getConfig,
  setConfig,
  validateConfig,
  getEnvironmentInfo
};
