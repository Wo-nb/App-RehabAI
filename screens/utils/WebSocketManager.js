// utils/WebSocketManager.js
// 封装阿里云 ISI 实时识别 WebSocket 协议

let ws = null
let onTextMessage = null       // (evt) => void
let onConnState = null         // (0:open, 1:close, 2:error)
let currentTaskId = null
let isOpen = false

// 生成 32 字节 hex
function genHex32() {
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function safeSendText(obj) {
  if (!ws || ws.readyState !== 1) return
  ws.send(JSON.stringify(obj))
}

const WebSocketManager = {
  connect(url, handleJsonMessage, handleConnState) {
    try {
      // url 必须已包含 ?token=xxx
      onTextMessage = handleJsonMessage
      onConnState = handleConnState
      currentTaskId = genHex32()

      ws = new WebSocket(url)
      ws.binaryType = 'arraybuffer'

      ws.onopen = () => {
        isOpen = true
        onConnState && onConnState(0)
      }

      ws.onmessage = (evt) => {
        // 按协议：事件是 Text 帧；音频是 Binary 帧（这里客户端不消费）
        if (typeof evt.data === 'string') {
          onTextMessage && onTextMessage(evt)
        }
      }

      ws.onerror = () => {
        onConnState && onConnState(2)
      }

      ws.onclose = () => {
        isOpen = false
        onConnState && onConnState(1)
      }

      return 1
    } catch (e) {
      console.error('WS connect error:', e)
      onConnState && onConnState(2)
      return -1
    }
  },

  // 发送 Start 指令
  sendStart(appkey, {
    format = 'pcm',       // 'pcm' | 'opus' | 'wav' | ...
    sample_rate = 16000,
    enable_intermediate_result = true,
    enable_punctuation_prediction = true,
    enable_inverse_text_normalization = true,
    extraPayload = {}
  } = {}) {
    if (!isOpen) return
    const msg = {
      header: {
        message_id: genHex32(),
        task_id: currentTaskId,
        namespace: 'SpeechTranscriber',
        name: 'StartTranscription',
        appkey
      },
      payload: {
        format,
        sample_rate,
        enable_intermediate_result,
        enable_punctuation_prediction,
        enable_inverse_text_normalization,
        ...extraPayload
      }
    }
    safeSendText(msg)
  },

  // 持续发送二进制音频
  sendAudio(binaryChunk) {
    if (!isOpen || !ws) return
    // 直接发 Binary Frame
    ws.send(binaryChunk)
  },

  // 发送 Stop 指令
  sendStop(appkey) {
    if (!isOpen) return
    const msg = {
      header: {
        message_id: genHex32(),
        task_id: currentTaskId,
        namespace: 'SpeechTranscriber',
        name: 'StopTranscription',
        appkey
      }
    }
    safeSendText(msg)
  },

  close() {
    try {
      if (ws) {
        ws.close()
        ws = null
      }
    } catch (e) {
      console.warn('WS close warn:', e)
    }
  }
}

export default WebSocketManager
