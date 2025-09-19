'use client';

import {View, StyleSheet, TouchableOpacity} from 'react-native';
import {useState, useEffect, useImperativeHandle, forwardRef} from 'react';
import Icon from 'react-native-vector-icons/Ionicons';
import RecorderManager from '../utils/RecorderManager';
import WebSocketManager from '../utils/WebSocketManager'; // 内部改为本地vosk方案

const Microphone = forwardRef((props, ref) => {
  const [recording, setRecording] = useState(false);
  const [result, setResult] = useState('');
  const [status, setStatus] = useState('点击连接');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 当状态改变时通知父组件
  useEffect(() => {
    props.onStatusChange && props.onStatusChange(status, isLoading);
  }, [status, isLoading]);

  // 监控识别结果变化
  useEffect(() => {
    console.log('当前识别结果状态:', result);
    // 将结果传递给父组件
    if (result) {
      props.handleVoiceInput && props.handleVoiceInput(result);
    }
  }, [result]);

  useEffect(() => {
    const initRecorder = async () => {
      await RecorderManager.init();
    };

    initRecorder();

    // 组件卸载时清理
    return () => {
      cleanup();
    };
  }, []);

  // 清理函数
  const cleanup = () => {
    if (recording) {
      RecorderManager.stop();
    }
    WebSocketManager.close();
    setIsConnected(false);
    RecorderManager.cleanup();
  };

  useImperativeHandle(ref, () => ({
    cleanup,
  }));

  const connect = () => {
    console.log('尝试加载本地模型...');
    setIsLoading(true);
    // 确保先关闭之前的连接
    WebSocketManager.close();

    // 传入模型路径
    // Android 放 assets: model-vosk-cn
    const modelPath = 'model-vosk-cn';
    const ret = WebSocketManager.connect(
      handleEngineMessage,
      handleConnState,
      { modelPath, sampleRate: 16000 }
    );
    if (ret === 1) {
      setStatus('正在加载本地模型...');
    } else {
      setStatus('初始化失败，请检查模型路径');
      setIsLoading(false);
    }

    /*  const ret = WebSocketManager.connect(handleJsonMessage, handleConnState);

    console.log('连接返回值:', ret);

    if (ret === 1) {
      setStatus('正在连接ASR服务器，请等待...');
    } else {
      setStatus('连接失败，请检查ASR地址和端口');
      setIsLoading(false);
    } */
  };

  // 处理micro点击事件
  const handleRecording = () => {
    if (!recording) {
      console.log('开始录音');
      startRecording();
    } else {
      console.log('停止录音');
      stopRecording();
    }
  };

  const startRecording = () => {
    if (!isConnected) {
      setStatus('请先连接本地识别器');
      console.log('未连接');
      setIsLoading(false);
      connect();
      return;
    }

    // 清空之前的结果
    setResult('');
    props.handleVoiceInput && props.handleVoiceInput('');

    RecorderManager.start();
    setRecording(true);
    setStatus('录音中...');
  };

  const stopRecording = async () => {
    RecorderManager.stop();
    setRecording(false);
    console.log("结束")
    setStatus('录音结束,正在识别...');
    await WebSocketManager.flushFinal();

    // // 添加延迟关闭连接，确保所有数据都被处理
    // setTimeout(() => {
    //   WebSocketManager.close()
    //   setStatus("请点击连接")
    //   setIsConnected(false)
    // }, 3000)
  };

/*  const handleJsonMessage = jsonMsg => {
    try {
      console.log('收到原始消息:', jsonMsg);

      const data = JSON.parse(jsonMsg.data);
      console.log('解析后的数据:', data);
      if (data.header.name !== 'SentenceBegin') {
        if (data && data?.payload?.result) {
          // 更新本地状态
          setResult(prevResult => {
            const updatedResult = prevResult + data.payload?.result;
            console.log('更新后的识别结果:', updatedResult);
            return updatedResult;
          });
        } else {
          console.warn('收到的数据中没有payload字段:', data);
        }
      }
    } catch (error) {
      console.error('解析JSON消息时出错:', error, '原始消息:', jsonMsg);
    }
  }; */

  // 统一处理Vosk封装后的消息
  const handleEngineMessage = msg => {
    try {
      // 兼容旧签名：这里是直接对象
      const data = msg;
      if (!data) return;

      if (data.type === 'partial' && data.text) {
        // 增量：拼接显示（你也可以选择只展示最新partial）
        setResult(prev => prev + data.text);
      } else if (data.type === 'final' && data.text) {
        // 最终：收口
        setResult(prev => prev + data.text);
        setStatus('识别完成');
      }
    } catch (e) {
      console.error('处理识别消息出错:', e);
    }
  };

  const handleConnState = connState => {
    console.log('WebSocket连接状态变化:', connState);
    setIsLoading(false);

    if (connState === 0) {
      setStatus('连接成功!请点击开始');
      setIsConnected(true);
    } else if (connState === 1) {
      setStatus('连接关闭');
      setIsConnected(false);
    } else if (connState === 2) {
      setStatus('连接地址失败,请检查ASR地址和端口。');
      setIsConnected(false);
    }
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.voiceButton}
        onPress={isConnected ? handleRecording : connect}>
        <Icon
          name={
            isConnected ? (recording ? 'mic' : 'mic-outline') : 'radio-outline'
          }
          size={24}
          color={recording ? '#ef4444' : '#3b82f6'}
        />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  voiceButton: {
    marginHorizontal: 5,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Microphone;
