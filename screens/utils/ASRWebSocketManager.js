"use client"

// utils/ASRWebSocketManager.js
// 仅负责阿里云 NLS 实时识别的 WebSocket 链路。
// API：connect(url, onJson, onState) / sendStart(appkey, payload) / sendAudio(bin) / sendStop() / close()

let ws = null
let onJsonMessage = null
let onConnState = null
let appkeyCache = null
let taskId = null

// RN 环境下尽量避免依赖 web crypto；用轻量随机 ID
const rid = () =>
  (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).padEnd(16, "0")

function connect(url, jsonHandler, stateHandler) {
  try {
    onJsonMessage = jsonHandler
    onConnState = stateHandler
    taskId = rid()

    ws = new WebSocket(url)
    ws.binaryType = "arraybuffer"

    ws.onopen = () => onConnState?.(0)            // 连接成功
    ws.onclose = () => { onConnState?.(1); cleanup() } // 连接关闭
    ws.onerror = () => onConnState?.(2)           // 连接出错
    ws.onmessage = (evt) => {
      if (typeof evt.data === "string") {
        onJsonMessage?.(evt) // 文本帧：命令/事件
      }
      // 二进制帧为音频，不从这里回调
    }
    return 1
  } catch (e) {
    console.error("[ASR] connect error:", e)
    return 0
  }
}

function sendStart(appkey, payload = {}) {
  if (!ws || ws.readyState !== 1) return
  appkeyCache = appkey
  const cmd = {
    header: {
      message_id: rid(),
      task_id: taskId,
      namespace: "SpeechTranscriber",
      name: "StartTranscription",
      appkey: appkeyCache,
    },
    payload: {
      // 常用默认：16k PCM + 中间结果 + 标点 + ITN
      format: payload.format ?? "pcm",
      sample_rate: payload.sample_rate ?? 16000,
      enable_intermediate_result:
        payload.enable_intermediate_result ?? true,
      enable_punctuation_prediction:
        payload.enable_punctuation_prediction ?? true,
      enable_inverse_text_normalization:
        payload.enable_inverse_text_normalization ?? true,
      ...payload,
    },
  }
  ws.send(JSON.stringify(cmd))
}

function sendAudio(pcmChunk) {
  if (!ws || ws.readyState !== 1) return
  if (pcmChunk instanceof Uint8Array) ws.send(pcmChunk.buffer)
  else ws.send(pcmChunk) // ArrayBuffer
}

function sendStop() {
  if (!ws || ws.readyState !== 1) return
  const cmd = {
    header: {
      message_id: rid(),
      task_id: taskId,
      namespace: "SpeechTranscriber",
      name: "StopTranscription",
      appkey: appkeyCache,
    },
  }
  ws.send(JSON.stringify(cmd))
}

function close() {
  try { ws?.close() } catch {}
}

function cleanup() {
  ws = null
  onJsonMessage = null
  onConnState = null
  appkeyCache = null
  taskId = null
}

export default {
  connect,
  sendStart,
  sendAudio,
  sendStop,
  close,
}
