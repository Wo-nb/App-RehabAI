import AsyncStorage from '@react-native-async-storage/async-storage';

class ConfigManager {
  constructor() {
    this.config = {
      API_BASE_URL: "http://192.168.177.27:8000",
      DIGITAL_HUMAN_URL: "http://192.168.177.27:8010"
    };
    this.listeners = new Set();
    this.initialized = false;
  }

  // 初始化配置，从本地存储加载
  async initialize() {
    if (this.initialized) return;
    
    try {
      const savedConfig = await AsyncStorage.getItem('app_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        this.config = { ...this.config, ...parsed };
      }
      this.initialized = true;
      this._notifyListeners();
    } catch (error) {
      console.error('加载配置失败:', error);
      this.initialized = true;
    }
  }

  // 获取配置值
  get(key) {
    return this.config[key];
  }

  // 获取所有配置
  getAll() {
    return { ...this.config };
  }

  // 设置配置值
  async set(key, value) {
    this.config[key] = value;
    await this._saveConfig();
    this._notifyListeners();
  }

  // 批量设置配置
  async setMultiple(updates) {
    this.config = { ...this.config, ...updates };
    await this._saveConfig();
    this._notifyListeners();
  }

  // 获取API基础URL
  getApiBaseUrl() {
    return this.config.API_BASE_URL;
  }

  // 获取数字人URL
  getDigitalHumanUrl() {
    return this.config.DIGITAL_HUMAN_URL;
  }

  // 获取WebRTC服务器URL
  getWebRTCServerUrl() {
    return `${this.config.DIGITAL_HUMAN_URL}/offer`;
  }

  // 添加配置变化监听器
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // 移除监听器
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  // 通知所有监听器配置已更改
  _notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.config);
      } catch (error) {
        console.error('配置监听器回调错误:', error);
      }
    });
  }

  // 保存配置到本地存储
  async _saveConfig() {
    try {
      await AsyncStorage.setItem('app_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('保存配置失败:', error);
      throw error;
    }
  }

  // 重置配置到默认值
  async resetToDefaults() {
    this.config = {
      API_BASE_URL: "http://10.3.242.26:8079",
      DIGITAL_HUMAN_URL: "http://10.3.242.26:8010"
    };
    await this._saveConfig();
    this._notifyListeners();
  }

  // 验证URL格式
  validateUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // 验证配置
  validateConfig(config) {
    const errors = [];
    
    if (!config.API_BASE_URL || !this.validateUrl(config.API_BASE_URL)) {
      errors.push('API基础URL格式无效');
    }
    
    if (!config.DIGITAL_HUMAN_URL || !this.validateUrl(config.DIGITAL_HUMAN_URL)) {
      errors.push('数字人URL格式无效');
    }
    
    return errors;
  }
}

// 导出单例
export default new ConfigManager();


