// 本地Vosk模型加载/缓存工具
// 不再进行任何联网/签名，仅提供简单的路径校验和缓存

class VoskModelLoader {
  constructor() {
    this.modelPath = null;
    this.initialized = false;
  }

  /**
   * 初始化模型路径（仅缓存与简单校验）
   * @param {string} modelPath - 本地模型相对或绝对路径，例如 "models/vosk-model-small-cn-0.22"
   */
  async initModel(modelPath) {
    if (!modelPath || typeof modelPath !== 'string') {
      throw new Error('模型路径无效：请传入有效的字符串路径');
    }
    // 这里不做IO操作，实际项目可按需校验路径是否存在
    this.modelPath = modelPath;
    this.initialized = true;
    return true;
  }

  getModelPath() {
    if (!this.initialized) {
      throw new Error('模型尚未初始化，请先调用 initModel(modelPath)');
    }
    return this.modelPath;
  }

  isReady() {
    return this.initialized && !!this.modelPath;
  }
}

export default new VoskModelLoader();
