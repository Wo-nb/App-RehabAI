"use client"

import { View, StyleSheet, TouchableOpacity } from "react-native"
import { useState, useEffect, useImperativeHandle, forwardRef, useRef } from "react"
import Icon from "react-native-vector-icons/Ionicons"
import RecorderManager from "../utils/RecorderManager"
import RealtimeSpeechRecognition from "../ASR/RealtimeSpeechRecognition"

const Microphone = forwardRef((props, ref) => {
  const [recording, setRecording] = useState(false)
  const [result, setResult] = useState("")
  const [status, setStatus] = useState("点击连接")
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const asrRef = useRef(null)

  // 当状态改变时通知父组件
  useEffect(() => {
    props.onStatusChange && props.onStatusChange(status, isLoading)
  }, [status, isLoading])

  // 监控识别结果变化
  useEffect(() => {
    console.log("当前识别结果状态:", result)
    // 将结果传递给父组件
    if (result) {
      props.handleVoiceInput && props.handleVoiceInput(result)
    }
  }, [result])

  useEffect(() => {
    const initRecorder = async () => {
      await RecorderManager.init()
    }

    initRecorder()

    // 组件卸载时清理
    return () => {
      cleanup()
    }
  }, [])

  // 处理ASR服务的状态更新
  const handleASRStatusChange = (newStatus, newIsLoading) => {
    setStatus(newStatus)
    setIsLoading(newIsLoading)
  }

  // 处理ASR服务的语音识别结果
  const handleASRResult = (newResult) => {
    setResult(newResult)
    props.handleVoiceInput && props.handleVoiceInput(newResult)
  }

  // 清理函数
  const cleanup = () => {
    if (recording) {
      RecorderManager.stop()
    }
    // WebSocketManager.close()
    setIsConnected(false)
    RecorderManager.cleanup()
  }

  useImperativeHandle(ref, () => ({
    cleanup,
  }))

  const connect = () => {
    console.log("尝试连接ASR服务器...")
    asrRef.current?.connect()
  }

  // 处理micro点击事件
  const handleRecording = () => {
    if (!recording) {
      console.log("开始录音")
      startRecording()
    } else {
      console.log("停止录音")
      stopRecording()
    }
  }

  const startRecording = () => {
    if (!isConnected) {
      setStatus("请先连接ASR服务器")
      connect()
      return
    }

    // 清空之前的结果
    setResult("")
    props.handleVoiceInput && props.handleVoiceInput("")

    asrRef.current?.startRecording()
    setRecording(true)
  }

  const stopRecording = () => {
    asrRef.current?.stopRecording()
    setRecording(false)
  }

  // 监听ASR服务的状态变化 - 通过回调处理，不直接访问ref属性
  // useEffect(() => {
  //   // 移除直接访问asrRef.current属性的逻辑，因为RealtimeSpeechRecognition不暴露这些属性
  //   // 状态更新通过handleASRStatusChange回调处理
  // }, [])

  return (
    <View>
      <TouchableOpacity style={styles.voiceButton} onPress={isConnected ? handleRecording : connect}>
        <Icon
          name={isConnected ? (recording ? "mic" : "mic-outline") : "radio-outline"}
          size={24}
          color={recording ? "#ef4444" : "#3b82f6"}
        />
      </TouchableOpacity>
      
      {/* ASR服务组件 */}
      <RealtimeSpeechRecognition
        handleVoiceInput={handleASRResult}
        onStatusChange={handleASRStatusChange}
        onRef={(ref) => {
          asrRef.current = ref
          // 更新本地状态
          if (ref) {
            setIsConnected(ref.isConnected || false)
            setRecording(ref.recording || false)
            setStatus(ref.status || "点击连接")
            setIsLoading(ref.isLoading || false)
          }
        }}
      />
    </View>
  )
})

const styles = StyleSheet.create({
  voiceButton: {
    marginHorizontal: 5,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },
})

export default Microphone
