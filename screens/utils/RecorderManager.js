// RecorderManager.js
import { Platform, PermissionsAndroid } from "react-native"
import AudioRecord from "react-native-audio-record"
import WebSocketManager from "./WebSocketManager"

class RecorderManager {
  constructor() {
    this.isRecording = false
    this.sampleBuf = new Int16Array()
    this.audioConfig = {
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
      audioSource: 6,
      wavFile: "audio.wav",
    }
  }

  setOnDataCallback(callback) {
    this.onDataCallback = callback
  }

  async requestPermissions() {
      try {
        // iOS 或 Web 平台直接通过
        if (Platform.OS !== "android") {
          return true;
        }

        // 组装需要请求的权限：始终包含录音；API <= 28 追加存储（READ/WRITE）
        const permissions = [
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ];

        const androidApiLevel = Platform.Version || 0;
        if (androidApiLevel <= 28) {
          if (PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE) {
            permissions.push(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
          }
          if (PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE) {
            permissions.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
          }
        }

        // 使用 requestMultiple 统一申请
        const granted = await PermissionsAndroid.requestMultiple(permissions);

        const allGranted = permissions.every((p) => granted[p] === PermissionsAndroid.RESULTS.GRANTED);
        if (!allGranted) {
          throw new Error("需要录音/存储权限才能使用语音识别功能");
        }

        return true;
      } catch (error) {
        console.error("权限请求失败:", error);
        throw error;
      }
  }

  async init() {
    try {
      // 先请求权限
      await this.requestPermissions();

      // 初始化录音
      await AudioRecord.init(this.audioConfig);

      // 设置数据监听
      AudioRecord.on("data", (data) => {
        if (this.isRecording) {
          this.processAudioData(data);
        }
      });

      console.log("RecorderManager initialized successfully");
      return true;
    } catch (error) {
      console.error("初始化录音管理器失败:", error);
      throw error;
    }
  }

  async start() {
    try {
      this.isRecording = true;
      this.sampleBuf = new Int16Array();
      await AudioRecord.start();
      
      // // 发送开始录音的请求
      // const request = {
      //   chunk_size: [5, 10, 5],
      //   wav_name: "react-native",
      //   is_speaking: true,
      //   chunk_interval: 10,
      //   mode: "online",
      // };
      // WebSocketManager.wsSend(JSON.stringify(request));
      
      console.log("Recording started");
    } catch (error) {
      this.isRecording = false;
      console.error("开始录音失败:", error);
      throw error;
    }
  }

  async stop() {
    try {
      if (this.isRecording) {
        this.isRecording = false;
        await AudioRecord.stop();

        // 发送剩余的音频数据
        if (this.sampleBuf.length > 0) {
          WebSocketManager.sendAudio(this.sampleBuf.buffer);
          this.sampleBuf = new Int16Array();
        }

        console.log("Recording stopped");
      }
    } catch (error) {
      console.error("停止录音失败:", error);
      throw error;
    }
  }

  cleanup() {
    try {
      if (this.isRecording) {
        this.stop();
      }
      AudioRecord.stop();
      this.sampleBuf = new Int16Array();
    } catch (error) {
      console.error("清理录音资源失败:", error);
    }
  }

  processAudioData(data) {
    try {
      // Convert base64 to ArrayBuffer
      const buffer = this.base64ToArrayBuffer(data);

      // Convert to Int16Array
      const view = new Int16Array(buffer);

      // Append to sample buffer
      const newBuffer = new Int16Array(this.sampleBuf.length + view.length);
      newBuffer.set(this.sampleBuf);
      newBuffer.set(view, this.sampleBuf.length);
      this.sampleBuf = newBuffer;

      // Send chunks of audio data using ASR protocol
      const chunkSize = 960;

      while (this.sampleBuf.length >= chunkSize) {
        const sendBuf = this.sampleBuf.slice(0, chunkSize);
        this.sampleBuf = this.sampleBuf.slice(chunkSize);
        // 使用sendAudio方法发送二进制音频数据
        WebSocketManager.sendAudio(sendBuf.buffer);
      }
    } catch (error) {
      console.error("处理音频数据失败:", error);
    }
  }

  base64ToArrayBuffer(base64) {
    try {
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);

      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return bytes.buffer;
    } catch (error) {
      console.error("转换音频数据格式失败:", error);
      throw error;
    }
  }
}

export default new RecorderManager();
