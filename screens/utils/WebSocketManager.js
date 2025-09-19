// WebSocketManager.js —— 使用 react-native-vosk 的本地识别封装
// 兼容旧接口：connect/jsonMessageHandler/connStateHandler + wsSend/flushFinal/close
// 不再使用任何真实 WebSocket 或云端 Token

import VoskModelLoader from './VoskModelLoader';
import Vosk from 'react-native-vosk';

class WebSocketManager {
  constructor() {
    this.jsonMessageHandler = null;
    this.connStateHandler = null;
    this.isReady = false;

    this._vosk = new Vosk();   // 实例
    this._subs = [];           // 事件订阅
    this._recording = false;   // 当前是否在一次会话中（start 后、stop 前）
  }

  /**
   * 加载模型并建立事件（相当于“初始化本地识别器”）
   * @param {(msg:{type:'partial'|'final', text:string})=>void} jsonMessageHandler
   * @param {(state:0|1|2)=>void} connStateHandler  // 0:connected 1:closed 2:error
   * @param {{modelPath:string}} options            // modelPath: 'model-vosk-cn' 或绝对路径
   * @returns {number} 1 启动初始化流程；0 失败
   */
  connect(jsonMessageHandler, connStateHandler, options = {}) {
    try {
      if (!options.modelPath) throw new Error('缺少模型路径 modelPath');

      this.jsonMessageHandler = jsonMessageHandler;
      this.connStateHandler = connStateHandler;

      (async () => {
        try {
          // 1) 记录/校验模型路径（文件夹名或绝对路径）
          await VoskModelLoader.initModel(options.modelPath);

          // 2) 加载模型（react-native-vosk）
          //    - Android: 若模型放在 android/app/src/main/assets/model-vosk-cn/，这里传 'model-vosk-cn'
          //    - iOS: 若打到 bundle，也可直接传同名文件夹；或传沙箱的绝对路径
          await this._vosk.loadModel(VoskModelLoader.getModelPath());

          // 3) 订阅事件（无需轮询）
          this._attachListeners();

          this.isReady = true;
          this.connStateHandler && this.connStateHandler(0); // connected
        } catch (e) {
          console.error('Vosk 加载失败:', e);
          this.connStateHandler && this.connStateHandler(2); // error
        }
      })();

      return 1;
    } catch (e) {
      console.error('初始化本地识别器出错:', e);
      this.connStateHandler && this.connStateHandler(2);
      return 0;
    }
  }

  _attachListeners() {
    // 清理旧订阅
    this._subs.forEach(s => { try { s.remove(); } catch {} });
    this._subs = [];

    this._subs.push(this._vosk.onPartialResult(text => {
      if (text && this.jsonMessageHandler) {
        this.jsonMessageHandler({ type: 'partial', text });
      }
    }));

    // onResult 是中间结果，语义接近 partial；如不需要可注释掉
    this._subs.push(this._vosk.onResult(text => {
      if (text && this.jsonMessageHandler) {
        this.jsonMessageHandler({ type: 'partial', text });
      }
    }));

    this._subs.push(this._vosk.onFinalResult(text => {
      if (text && this.jsonMessageHandler) {
        this.jsonMessageHandler({ type: 'final', text });
      }
    }));

    this._subs.push(this._vosk.onError(err => {
      console.warn('Vosk error:', err);
    }));
  }

  /**
   * 开始一次会话（打开麦克风并开始识别）
   * - 建议在“开始录音”按钮时调用它
   */
  async start() {
    if (!this.isReady || this._recording) return;
    await this._vosk.start({ timeout: 10000 }); // 可选：超时毫秒数
    this._recording = true;
  }

  /**
   * 与旧接口兼容：外部“发送”的数据
   * - 如果收到阿里云的控制 JSON（is_speaking:false），就当作“收口”→ stop()
   * - 任何 PCM 分片在 react-native-vosk 下都会被忽略（库内部自己采集）
   */
  async wsSend(data) {
    if (!this.isReady) return;

    if (typeof data === 'string') {
      try {
        const obj = JSON.parse(data);
        if (obj && obj.is_speaking === false) {
          await this.flushFinal();
        }
      } catch {
        // 非 JSON，忽略
      }
    }
    // 若是 Int16Array/ArrayBuffer（PCM），这里也忽略，因为库不接受外部投喂
  }

  /**
   * 结束本轮会话并触发最终结果（会触发 onFinalResult 回调）
   * - 建议在“停止录音”按钮时调用它
   */
  async flushFinal() {
    if (!this.isReady) return;
    try {
      await this._vosk.stop();   // 触发 onFinalResult
      this._recording = false;
    } catch (e) {
      console.error('flushFinal 失败:', e);
    }
  }

  /**
   * 关闭引擎并释放模型（页面卸载/不再需要识别时调用）
   */
  async close() {
    try {
      if (this._recording) {
        try { await this._vosk.stop(); } catch {}
      }
      this._subs.forEach(s => { try { s.remove(); } catch {} });
      this._subs = [];
      try { await this._vosk.unload(); } catch {}
    } finally {
      this.isReady = false;
      this._recording = false;
      this.connStateHandler && this.connStateHandler(1); // closed
    }
  }

  generateUUID() {
    return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/[x]/g, () =>
      ((Math.random() * 16) | 0).toString(16)
    );
  }
}

export default new WebSocketManager();