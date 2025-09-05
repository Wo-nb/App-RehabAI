import ConfigManager from './ConfigManager';

// 初始化配置管理器
ConfigManager.initialize();

// 导出配置管理器实例
export { default as ConfigManager } from './ConfigManager';

// 导出便捷的配置获取函数
export const getApiBaseUrl = () => ConfigManager.getApiBaseUrl();
export const getDigitalHumanUrl = () => ConfigManager.getDigitalHumanUrl();
export const getWebRTCServerUrl = () => ConfigManager.getWebRTCServerUrl();

// 向后兼容的导出（已弃用，建议使用函数形式）
export const API_BASE_URL = ConfigManager.getApiBaseUrl();
export const DIGITAL_HUMAN_URL = ConfigManager.getDigitalHumanUrl();
