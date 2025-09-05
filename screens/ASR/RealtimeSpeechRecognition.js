"use client"

// RealtimeSpeechRecognition.js
import { useEffect, useState, useRef } from "react"
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native"
import WebSocketManager from "../utils/WebSocketManager"
import RecorderManager from "../utils/RecorderManager"

// === 需要你配置的两个量 ===
const REGION = "cn-shanghai"       // 你的项目所在地域，例：cn-beijing / cn-shanghai / ap-southeast-1
const APPKEY = "YOUR_ALIBABA_APPKEY" // 阿里云控制台创建项目的 AppKey

const RealtimeSpeechRecognition = () => {
  const [recording, setRecording] = useState(false)
  const [result, setResult] = useState("")
  const [status, setStatus] = useState("点击连接")
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const scrollViewRef = useRef(null)
  const tokenRef = useRef(null)

  useEffect(() => {
      const initRecorder = async () => {
        await RecorderManager.init?.()
        // 若 RecorderManager 支持数据回调，则把音频二进制直接推给 WS
        // 约定：输出 16k 单声道 PCM Int16（ArrayBuffer / Uint8Array 皆可）
        if (RecorderManager.setOnDataCallback) {
          RecorderManager.setOnDataCallback((pcmChunk) => {
            WebSocketManager.sendAudio(pcmChunk)
          })
        }
      }
      initRecorder()

      return () => {
        RecorderManager.cleanup?.()
        WebSocketManager.close()
      }
    }, [])

    useEffect(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: true })
      }
    }, [result])

    const fetchToken = async () => {
      // 重要：token 必须由你后端安全签发，这里只是示例
      const resp = await fetch("https://YOUR_BACKEND.example.com/ali-nls/token")
      if (!resp.ok) throw new Error("获取 token 失败")
      const { token } = await resp.json()
      return token
    }

    const connect = async () => {
      try {
        setIsLoading(true)
        // 1) 获取临时 token
        tokenRef.current = await fetchToken()
        const url = `wss://nls-gateway.${REGION}.aliyuncs.com/ws/v1?token=${encodeURIComponent(tokenRef.current)}`
        // 2) 连接
        const ret = WebSocketManager.connect(url, handleJsonMessage, handleConnState)
        if (ret === 1) {
          setStatus("正在连接ASR服务器，请等待...")
        } else {
          throw new Error("连接失败，请检查 ASR 地址")
        }
      } catch (e) {
        console.error(e)
        setStatus(e.message || "连接失败")
        setIsLoading(false)
        Alert.alert("连接失败", (e && e.message) || "请检查网络/鉴权")
      }
    }

    const startRecording = async () => {
      try {
        setResult("")
        // 先发 Start 指令，再开始推音频
        WebSocketManager.sendStart(APPKEY, {
          // 根据录音实际编码设置：常用 PCM 16k
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
        // 停止后发 Stop 指令
        WebSocketManager.sendStop(APPKEY)
        setRecording(false)
        setStatus("发送完数据,请等候,正在识别...")
        // 等服务端返回 Completed/或自行延迟后关闭
        setTimeout(() => {
          WebSocketManager.close()
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


  return (
    <View style={styles.container}>
      <Text style={styles.title}>实时语音识别</Text>

      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>{status}</Text>
        {isLoading && <ActivityIndicator size="small" color="#3b82f6" />}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, isConnected ? styles.buttonDisabled : styles.buttonEnabled]}
          onPress={connect}
          disabled={isConnected || isLoading}
        >
          <Text style={styles.buttonText}>连接</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, !isConnected || recording ? styles.buttonDisabled : styles.buttonEnabled]}
          onPress={startRecording}
          disabled={!isConnected || recording}
        >
          <Text style={styles.buttonText}>开始</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, !recording ? styles.buttonDisabled : styles.buttonEnabled]}
          onPress={stopRecording}
          disabled={!recording}
        >
          <Text style={styles.buttonText}>停止</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.resultContainer}>
        <Text style={styles.resultTitle}>识别结果:</Text>
        <ScrollView ref={scrollViewRef} style={styles.resultScrollView} contentContainerStyle={styles.resultContent}>
          <Text style={styles.resultText}>{result}</Text>
        </ScrollView>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f0f8ff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#3b82f6",
    textAlign: "center",
    marginVertical: 16,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  statusText: {
    fontSize: 16,
    color: "#334155",
    marginRight: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  buttonEnabled: {
    backgroundColor: "#3b82f6",
  },
  buttonDisabled: {
    backgroundColor: "#94a3b8",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  resultContainer: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },
  resultScrollView: {
    flex: 1,
  },
  resultContent: {
    paddingBottom: 16,
  },
  resultText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#1e293b",
  },
})

export default RealtimeSpeechRecognition
