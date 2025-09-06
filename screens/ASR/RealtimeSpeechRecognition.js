"use client"

// RealtimeSpeechRecognition.js（改为使用 ASRWebSocketManager）
import { useEffect, useState, useRef } from "react"
import { Alert } from "react-native"
import ASRWebSocket from "../utils/ASRWebSocketManager"   // ⬅️ 新：专用 ASR WS 管理器
import RecorderManager from "../utils/RecorderManager"
import WebRTCManager from "../utils/WebRTCManager"        // ⬅️ 可选：用于录音时礼让麦克风

// === 需要你配置的两个量 ===
const REGION = "cn-shanghai"       // 你的项目所在地域，例：cn-beijing / cn-shanghai / ap-southeast-1
const APPKEY = "gL0aXXsAifcMbt9r" // 阿里云控制台创建项目的 AppKey

const RealtimeSpeechRecognition = ({ 
  handleVoiceInput, 
  onStatusChange, 
  ...props 
}) => {
  const [recording, setRecording] = useState(false)
  const [result, setResult] = useState("")
  const [status, setStatus] = useState("点击连接")
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const scrollViewRef = useRef(null)
  const tokenRef = useRef(null)

  useEffect(() => {
    const initRecorder = async () => {
      // 确保输出 16k、单声道、PCM（小端 Int16）
      await RecorderManager.init?.({ sampleRate: 16000, channels: 1, format: "pcm" })
      if (RecorderManager.setOnDataCallback) {
        RecorderManager.setOnDataCallback((pcmChunk) => {
          // 直接把 PCM 二进制送入阿里云 ASR WebSocket（二进制帧）
          ASRWebSocket.sendAudio(pcmChunk)
        })
      }
    }
    initRecorder()

    return () => {
      RecorderManager.cleanup?.()
      ASRWebSocket.close()
    }
  }, [])

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true })
    }
    // 将结果传递给父组件
    if (result && handleVoiceInput) {
      handleVoiceInput(result)
    }
  }, [result, handleVoiceInput])

  // 当状态改变时通知父组件
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(status, isLoading)
    }
  }, [status, isLoading, onStatusChange])

  const fetchToken = async () => {
    try {
      // 重要：token 必须由你后端安全签发，这里使用mock token进行测试
      // TODO: 替换为真实的后端token服务URL
      console.warn("使用mock token，请在生产环境中替换为真实的后端服务")
      
      // 临时mock token - 请替换为真实的token获取逻辑
      return "mock_token_for_development_only"
      
      // 以下是真实实现的示例：
      // const resp = await fetch("https://your-backend.com/api/ali-nls/token")
      // if (!resp.ok) throw new Error(`获取token失败: ${resp.status}`)
      // const { token } = await resp.json()
      // return token
    } catch (error) {
      console.error("获取ASR token失败:", error)
      throw new Error("无法获取ASR服务token，请检查后端服务")
    }
  }

  const connect = async () => {
    try {
      setIsLoading(true)
      setStatus("正在获取token...")
      
      // 1) 获取临时 token
      tokenRef.current = await fetchToken()
      
      // 检查token是否有效（临时解决方案）
      if (tokenRef.current === "mock_token_for_development_only") {
        setStatus("使用mock token连接（仅测试）")
        setIsLoading(false)
        setIsConnected(true)
        return
      }
      
      const url = `wss://nls-gateway-${REGION}-internal.aliyuncs.com:80/ws/v1?token=${encodeURIComponent(tokenRef.current)}`
      
      // 2) 连接
      setStatus("正在连接ASR服务器...")
      const ret = ASRWebSocket.connect(url, handleJsonMessage, handleConnState)
      
      if (ret === 1) {
        setStatus("正在连接ASR服务器，请等待...")
      } else {
        throw new Error("连接失败，请检查 ASR 地址")
      }
    } catch (e) {
      console.error("ASR连接失败:", e)
      const errorMessage = e?.message || "连接失败"
      setStatus(errorMessage)
      setIsLoading(false)
      setIsConnected(false)
      Alert.alert("ASR连接失败", errorMessage + "\n\n请检查网络连接或联系技术支持")
    }
  }

  const startRecording = async () => {
    try {
      setResult("")
      // 可选：礼让数字人通话麦克风（若未实现这两个方法，会被忽略）
      try { WebRTCManager.muteLocalMic?.() } catch {}

      // 先发 Start 指令，再开始推音频
      ASRWebSocket.sendStart(APPKEY, {
        format: "pcm",
        sample_rate: 16000,
        enable_intermediate_result: true,
        enable_punctuation_prediction: true,
        enable_inverse_text_normalization: true
      })
      await RecorderManager.start()
      setRecording(true)
      setStatus("录音中...")
    } catch (e) {
      console.error("开始录音失败：", e)
      setStatus("开始录音失败")
      Alert.alert("错误", "开始录音失败：" + (e?.message || ""))
    }
  }

  const stopRecording = async () => {
    try {
      await RecorderManager.stop()
      // 发送 Stop 指令
      ASRWebSocket.sendStop()
      setRecording(false)
      setStatus("发送完数据,请等候,正在识别...")

      // 可选：恢复数字人通话麦克风
      try { WebRTCManager.unmuteLocalMic?.() } catch {}

      // 等服务端返回 Completed/或兜底延迟后关闭
      setTimeout(() => {
        ASRWebSocket.close()
        setStatus("请点击连接")
        setIsConnected(false)
      }, 3000)
    } catch (e) {
      console.error("停止录音失败：", e)
      setRecording(false)
      setStatus("停止录音失败")
      Alert.alert("错误", "停止录音失败：" + (e?.message || ""))
    }
  }

  // 解析阿里云事件：按 header.name 分发；文本通常在 payload.result / payload.text
  const handleJsonMessage = (evt) => {
    try {
      const msg = JSON.parse(evt.data)
      const name = msg?.header?.name
      const text = msg?.payload?.result ?? msg?.payload?.text ?? msg?.payload?.result_text ?? ""

      switch (name) {
        case "TranscriptionStarted":
          // 可以开始推音频（已在 startRecording 中完成）
          break
        case "SentenceBegin":
          // 需要可在此标记起点
          break
        case "TranscriptionResultChanged":
          if (text) setResult((prev) => prev + text)
          break
        case "SentenceEnd":
          if (text) setResult((prev) => prev + text + "\n")
          break
        case "TranscriptionCompleted":
          setStatus("识别完成")
          break
        default:
          // 其他事件忽略或调试
          // console.log("WS event:", name, msg)
          break
      }
    } catch (error) {
      console.error("JSON parse error:", error)
    }
  }

  const handleConnState = (connState) => {
    setIsLoading(false)
    if (connState === 0) {
      setStatus("连接成功!请点击开始")
      setIsConnected(true)
    } else if (connState === 1) {
      setStatus("连接关闭")
      setIsConnected(false)
    } else if (connState === 2) {
      setStatus("连接地址失败,请检查ASR地址和端口。")
      setIsConnected(false)
    }
  }

  // 暴露公共方法给父组件使用
  useEffect(() => {
    if (props.onRef) {
      props.onRef({
        connect,
        startRecording,
        stopRecording,
        isConnected,
        recording,
        status,
        isLoading
      })
    }
  }, [isConnected, recording, status, isLoading])

  // 不返回UI，只提供ASR功能
  return null
}

// 不需要样式，因为不返回UI

export default RealtimeSpeechRecognition
