"use client"

import React, { useRef, useState, useEffect } from "react"
import {
  StyleSheet,
  View,
  PermissionsAndroid,
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  Button,
  Alert,
  ScrollView,
  Animated,
  Switch,
  AppState,
} from "react-native"
import { useFocusEffect } from "@react-navigation/native"
import ChatView from "./DigitalHuman/ChatView"
import { DigitView } from "./DigitalHuman/DigitView"
import LinearGradient from "react-native-linear-gradient"
import Icon from "react-native-vector-icons/Ionicons"
import UserEval from "./DigitalHuman/UserEval"
import Admin from "./DigitalHuman/Admin"
import WebRTCManager from "./utils/WebRTCManager"
const { width, height } = Dimensions.get("window")
const ChooseVideoTypes = ["肩", "桡骨", "膝", "踝", "俯卧撑","康复操"]
const [showMedicalRecord, setShowMedicalRecord] = useState(false);
const [medicalRecordContent, setMedicalRecordContent] = useState(''); // 存储后端返回的病历内容

// 添加响应式设计辅助函数
const normalize = (size) => {
  return Math.round(size * Math.min(width / 375, height / 812))
}

const DigitalHumanScreen = ({ navigation }) => {
  const [isConnected, setIsConnected] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [remoteVideoStream, setRemoteVideoStream] = useState(null)
  const [remoteAudioStream, setRemoteAudioStream] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isShowEval, setIsShowEval] = useState(false)
  const [messages, setMessages] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [showMotionButton, setShowMotionButton] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  // const [isExpanded, setIsExpanded] = useState(false)
  const [showTypesButtons, setShowTypesButtons] = useState(false)
  const [selectedBodyPart, setSelectedBodyPart] = useState(null)
  const [shouldClearMessages, setShouldClearMessages] = useState(true)
  const videoRef = useRef(null)
  const typeRef = useRef(null)
  const audioRef = useRef(null)
  const chatRef = useRef(null)
  const scrollViewRef = useRef(null)
  const appState = useRef(AppState.currentState)

  // 处理应用状态变化
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        console.log("App has come to the foreground!")
      }

      appState.current = nextAppState
      if (appState.current === "background") {
        console.log("App is in background, disconnecting...")
        handleDisconnect()
      }
    })

    return () => {
      subscription.remove()
    }
  }, [])

  // 初始化 WebRTC 管理器
  useEffect(() => {
    WebRTCManager.initialize({
      // 连接状态变化回调
      onConnectionStateChange: (state, connected) => {
        console.log(`连接状态变化: ${state}, 已连接: ${connected}`)
        setIsConnected(connected)
        setIsLoading(false)
        
        // 如果连接断开，清理消息
        if (!connected && state === "closed") {
          setMessages([])
          if (chatRef.current) {
            chatRef.current.clearMessages()
          }
        }
      },
      // 远程流更新回调
      onRemoteStreamUpdate: ({ type, stream }) => {
        if (type === "audio") {
          setRemoteAudioStream(stream)
        } else if (type === "video") {
          setRemoteVideoStream(stream)
        }
      },
      // 会话 ID 接收回调
      onSessionIdReceived: (newSessionId) => {
        setSessionId(newSessionId)
      },
      // 错误处理回调
      onError: (error) => {
        console.error("WebRTC 错误:", error)
        setIsLoading(false)
      }
    })

    // 组件卸载时清理资源和消息
    return () => {
      WebRTCManager.cleanup()
      setMessages([]) // 确保消息列表被清空
    }
  }, [])

  // 添加一个函数用于添加欢迎消息
  const addWelcomeMessage = () => {
    const welcomeMessage = {
      id: Date.now(),
      text: "您好，我是您的康复治疗师。有什么可以帮助您的吗？",
      isUser: false,
    };
    setMessages([welcomeMessage]);
  };

  // 处理连接状态变化
  useEffect(() => {
    if (isConnected) {
      // 连接成功后添加欢迎消息
      addWelcomeMessage();
    }
  }, [isConnected]);

  // 确保消息更新后滚动到底部
  useEffect(() => {
    if (scrollViewRef.current && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // 修改 useFocusEffect，仅在 shouldClearMessages 为 true 时清空消息
  useFocusEffect(
    React.useCallback(() => {
      if (shouldClearMessages) {
        // 页面获得焦点时重置消息列表
        setMessages([])
        // 如果ChatView组件已挂载，调用其清理方法
        if (chatRef.current) {
          chatRef.current.clearMessages()
        }
        
        // 如果已连接，添加欢迎消息
        if (isConnected) {
          addWelcomeMessage()
        }
        
        // 重置标志，避免下次自动清空
        setShouldClearMessages(false)
      }
      
      // 返回的函数会在页面失去焦点时执行
      return () => {
        // 不再在页面离开时清空消息
      }
    }, [shouldClearMessages, isConnected])
  )

  // 连接数字人
  const handleConnection = async () => {
    try {
      setIsLoading(true)
      console.log("开始建立连接...")
      await WebRTCManager.connect()
    } catch (error) {
      console.error("连接失败:", error)
      setIsLoading(false)
    }
  }
  // 断开连接
  const handleDisconnect = () => {
    WebRTCManager.disconnect()
    // 断开连接时清空消息
    setMessages([])
    if (chatRef.current) {
      chatRef.current.clearMessages()
    }
  }
  
// 新增连接开关逻辑封装
  const toggleConnection = async (value) => {
    if (value) {
      await handleConnection()
    } else {
      handleDisconnect()
    }
  }

  const checkadmin = () => {
    console.log("检查管理员")
    setIsAdmin(!isAdmin)
  }

  // 发送动作评估消息的函数
  const sendMotionAssessMessage = () => {
    // if (!isConnected) {
    //   // 如果未连接，先提示用户连接
    //   Alert.alert("提示", "请先连接数字人才能使用动作评估功能")
    //   return
    // }

    // 添加数字人消息
    const aiMessage = {
      id: Date.now(),
      text: "点击动作评估，来为你评估你的康复动作吧",
      isUser: false,
      showMotionButton: true // 标记这条消息需要显示按钮
    }
    
    // 添加消息到聊天框
    setMessages([...messages, aiMessage]);
    
    // 设置显示动作按钮
    setShowMotionButton(true)
    
    // 确保消息滚动到底部
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  }
  
  // 添加动作评估介绍消息
  const UserChooseVideo = () => {
    const introMessage = {
      id: Date.now(),
      text: "动作评估能帮助您评估康复动作的准确性，为您提供专业的康复建议。",
      isUser: false,
    }
    
    // 添加消息到聊天框
    setMessages([...messages, introMessage]);
    
    // 添加一个临时的"正在输入"消息
    const typingMessage = {
      id: Date.now() + 50,
      text: "",
      isUser: false,
      isTyping: true // 标记为正在输入状态
    }
    
    // 先显示"正在输入"状态
    setTimeout(() => {
      setMessages(prevMessages => [...prevMessages, typingMessage]);
      
      // 确保消息滚动到底部
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
      
      // 模拟数字人思考后，替换为正式消息
      setTimeout(() => {
        // 然后添加请选择部位的消息
        const selectPartMessage = {
          id: Date.now() + 100,
          text: "请选择您想要评估的身体部位：",
          isUser: false,
          showTypeButtons: true // 标记这条消息需要显示类型按钮
        }
        
        // 替换"正在输入"消息为正式消息
        setMessages(prevMessages => {
          // 移除最后一条"正在输入"消息
          const updatedMessages = prevMessages.filter(msg => !msg.isTyping);
          // 添加新消息
          return [...updatedMessages, selectPartMessage];
        });
        
        // 显示类型按钮
        setShowMotionButton(false)
        setShowTypesButtons(true)
        
        // 确保消息滚动到底部
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      }, 1500); // 延迟1.5秒，模拟思考时间
    }, 500); // 延迟0.5秒，增强真实感
  }
  
  // 处理选择特定部位的函数
  const handleSelectBodyPart = (type) => {
    // 设置选中的部位
    setSelectedBodyPart(type);
    typeRef.current = type;
    console.log("typeRef.current is:", typeRef.current)
    // 添加用户选择的消息
    const userSelectMessage = {
      id: Date.now(),
      text: `我想评估${type}部位的动作`,
      isUser: true,
    }
    
    // 添加消息到聊天框
    setMessages(prevMessages => [...prevMessages, userSelectMessage]);
    
    // 隐藏类型按钮（延迟一小段时间，让用户看到选中效果）
    setTimeout(() => {
      setShowTypesButtons(false);
      
      // 模拟数字人回复
      setTimeout(() => {
        // 数字人确认的消息
        const confirmMessage = {
          id: Date.now() + 200,
          text: `好的，我们将为您评估${type}部位的动作。请点击下方按钮开始进行评估。`,
          isUser: false,
          showStartButton: true // 显示开始评估按钮
        }
        
        // 添加确认消息到聊天框
        setMessages(prevMessages => [...prevMessages, confirmMessage]);
        
        // 重置选中状态
        setSelectedBodyPart(null);
        // 确保消息滚动到底部
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      }, 800); // 延迟0.8秒，模拟思考时间
    }, 400); // 延迟0.4秒后隐藏选择按钮
  }
  
  
  // 导航到动作评估页面
  const navigateToMotionAssessment = () => {
    // 设置 shouldClearMessages 为 false，这样从评估页面返回时不会清空消息
    setShouldClearMessages(false)
    console.log("typeRef.current is:", typeRef.current)
    navigation.navigate('MotionAssessment',{
      selectedBodyPart: typeRef.current,
    });
    typeRef.current = null;
  }

  const toggleChat = () => {
    console.log(chatRef.current);
    if (chatRef.current) {
      setMessages(chatRef.current.getMessages());
      setMessages([])
      chatRef.current.clearMessages()
      addWelcomeMessage()
    }
    // 打开评分界面
    setIsShowEval(!isShowEval);
  }
  const handleVoiceInput = (text) => {
    console.log("text is:", text)
    setMessages([...messages, {id: Date.now(), text: text, isUser: true}])
  }

  // 电子病历相关逻辑
    // 发送状态到后端的函数
  const sendStateToBackend = async (state) => {
  try {
    const baseUrl = ConfigManager.getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/medical-record/state/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ state }),
    });
    const data = await response.json();   // 获取后端返回的 JSON
    return data;                          // 返回给调用者
  } catch (error) {
    console.error("发送状态失败:", error);
    return null;
  }
};

  // 处理终止并生成病历
const handleTerminate = async () => {
  const result = await sendStateToBackend(1);   // 这里能拿到后端返回值
  if (result && result.file_url) {
    setMedicalRecordContent(`病历文件生成成功：${result.file_url}`);
  } else {
    setMedicalRecordContent("未收到病历文件链接。");
  }
  setShowMedicalRecord(true);
};

  // 处理确认打印
  const handleConfirmPrint = async () => {
    await sendStateToBackend(3);
    setShowMedicalRecord(false);
    // 这里可以添加打印逻辑
  };

  // 处理修改病历
  const handleModify = async () => {
    await sendStateToBackend(2);
    setShowMedicalRecord(false);
    // 这里可以添加修改工作流逻辑
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* 背景渐变 */}
      <LinearGradient
        colors={["#3a0ca3", "#4361ee", "#4cc9f0"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      />
      {/* 数字人视图 - 占据全屏 */}
      <View style={styles.digitViewContainer}>
        <DigitView
          videoRef={videoRef}
          isConnected={isConnected}
          remoteStream={remoteVideoStream}
          style={styles.digitView}
        />
      </View>

      {/* 顶部导航栏 */}
      <SafeAreaView style={styles.header}>
        {/* <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity> */}

        <Text style={styles.headerTitle}>康复治疗师</Text>

        <TouchableOpacity style={styles.adminButton} onPress={checkadmin}>
          <Icon name="shield-checkmark-outline" size={30} color="white"/>
        </TouchableOpacity>

        {/* 动作评估按钮 */}
        <TouchableOpacity style={styles.motionButton} onPress={sendMotionAssessMessage}>
          <Icon name="body-outline" size={24} color="#fff" />
        </TouchableOpacity>

        {!isConnected && (
          <TouchableOpacity style={styles.chatToggleButton} onPress={toggleChat}>
            <Icon name={isShowEval ? "chatbubble" : "chatbubble-outline"} size={24} color="#fff" />
          </TouchableOpacity>
        )}


      </SafeAreaView>
      
      <Admin isAdmin={isAdmin} setIsAdmin={setIsAdmin}/>
      <UserEval isShowEval={isShowEval} isConnected={isConnected} messages={messages} setIsShowEval={setIsShowEval} style={styles.chatToggleButton}/>

      {/* 聊天视图 - 始终显示 */}
      <View style={[styles.chatContainer]}>
        <View style={styles.chatViewContainer}>

          {/* 连接开关栏 */}
          <View style={styles.connectionToggleBar}>
            <Text style={styles.connectionToggleText}>
              {isConnected ? "已连接数字人" : "未连接"}
            </Text>
            <Switch
              value={isConnected}
              onValueChange={toggleConnection}
              trackColor={{ false: "#cbd5e1", true: "#60a5fa" }}
              thumbColor={isConnected ? "#1d4ed8" : "#f8fafc"}
            />
          </View>

          {/* 展开/收起按钮 */}
          <TouchableOpacity style={styles.expandButton} onPress={() => setIsExpanded(!isExpanded)}>
            <Icon name={isExpanded ? "chevron-down" : "chevron-up"} size={20} color="#3b82f6" />
            <Text style={styles.expandButtonText}>{isExpanded ? "收起" : "展开"}</Text>
          </TouchableOpacity>

          {/* 消息列表区域 */}
          <Animated.View style={[styles.messagesWrapper, { height: isExpanded ? height*0.35 : 0 }]}>
            <ScrollView 
              ref={scrollViewRef} 
              style={styles.messagesContainer} 
              contentContainerStyle={styles.messagesContent}
            >
              {messages.map((message) => (
                <View key={message.id}>
                  <View style={[styles.messageBubble, message.isUser ? styles.userBubble : styles.aiBubble]}>
                    <Text style={message.isUser ? styles.userMessageText : styles.aiMessageText}>{message.text}</Text>
                  </View>
                  
                  {/* 显示动作评估按钮 */}
                  {!message.isUser && message.showMotionButton && (
                    <TouchableOpacity 
                      style={styles.motionAssessButton}
                      onPress = {()=>{
                        UserChooseVideo()
                      }}
                      // onPress={() => navigation.navigate('MotionAssessment')}
                    >
                      <LinearGradient
                        colors={["#4cc9f0", "#4361ee"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.motionButtonGradient}
                      >
                        <Icon name="body-outline" size={16} color="#fff" style={styles.buttonIcon} />
                        <Text style={styles.motionButtonText}>开始动作评估</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                  
                  {/* 显示身体部位类型按钮 */}
                  {!message.isUser && message.showTypeButtons && (
                    <View style={styles.typesButtonsContainer}>
                      {ChooseVideoTypes.map((type) => (
                        <TouchableOpacity 
                          key={type} 
                          style={[
                            styles.typeButton,
                            selectedBodyPart === type && styles.typeButtonSelected
                          ]}
                          onPress={() => handleSelectBodyPart(type)}
                          disabled={selectedBodyPart !== null} // 当有选中的部位时禁用所有按钮
                        >
                          <Text 
                            style={[
                              styles.typeButtonText,
                              selectedBodyPart === type && styles.typeButtonTextSelected
                            ]}
                          >
                            {type}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  
                  {/* 显示开始评估按钮 */}
                  {!message.isUser && message.showStartButton && (
                    <TouchableOpacity 
                      style={styles.startAssessButton}
                      onPress={navigateToMotionAssessment}
                    >
                      <LinearGradient
                        colors={["#4cc9f0", "#4361ee"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.motionButtonGradient}
                      >
                        <Icon name="play" size={16} color="#fff" style={styles.buttonIcon} />
                        <Text style={styles.motionButtonText}>开始进行评估</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}


                  
                </View>
              ))}
            </ScrollView>
          </Animated.View>

          {/* 输入区域 - 固定在底部 */}
          <View style={styles.inputWrapper}>
            {/* 可选：AI思考中提示 */}
            {chatRef.current?.isLoading && (
              <View style={styles.loadingIndicator}>
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text style={styles.loadingIndicatorText}>AI思考中...</Text>
              </View>
            )}
            <View style={styles.terminateButtonContainer}>
              <TouchableOpacity
                style={styles.terminateButton}
                onPress={handleTerminate}
                disabled={!isConnected} // 未连接时禁用
              >
                <Text style={styles.terminateButtonText}>终止（生成病历）</Text>
              </TouchableOpacity>
            </View>
            <ChatView 
              sessionId={sessionId} 
              isConnected={isConnected} 
              audioStream={remoteAudioStream} 
              showMotionButton={showMotionButton}
              navigation={navigation}
              messages={messages}
              setMessages={setMessages}
              ref={chatRef}
              showOnlyInput={true}
            />
          </View>
        </View>
      </View>
      {/* 电子病历弹窗 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showMedicalRecord}
        onRequestClose={() => setShowMedicalRecord(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>电子病历</Text>
            <ScrollView style={styles.recordContent}>
              <Text>{medicalRecordContent}</Text>
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modifyButton}
                onPress={handleModify}
              >
                <Text style={styles.buttonText}>修改</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmPrint}
              >
                <Text style={styles.buttonText}>确认（打印）</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  background: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Platform.OS === "ios" ? height * 0.05 : StatusBar.currentHeight + normalize(16),
    paddingHorizontal: width * 0.05,
    paddingBottom: height * 0.01,
    zIndex: 10,
  },
  backButton: {
    position: "absolute",
    left: width * 0.05,
    top: Platform.OS === "ios" ? height * 0.05 : StatusBar.currentHeight + normalize(16),
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  headerTitle: {
    fontSize: normalize(20),
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  chatToggleButton: {
    position: "absolute",
    right: width * 0.05,
    top: height * 0.1,
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  adminButton:{
    position: "absolute",
    right: width * 0.05,
    top: height * 0.05,
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  motionButton: {
    position: "absolute",
    left: width * 0.08,
    top: height * 0.05,
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  digitViewContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: width * 0.05,
    paddingBottom: Platform.OS === "ios" ? height * 0.04 : height * 0.02,
    alignItems: "center",
    zIndex: 10,
  },
  
  connectButton: {
    width: "100%",
    height: normalize(56),
    borderRadius: normalize(28),
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  connectButtonGradient: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonIcon: {
    marginRight: width * 0.02,
  },
  connectButtonText: {
    color: "white",
    fontSize: normalize(18),
    fontWeight: "bold",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.06,
    borderRadius: normalize(30),
  },
  loadingText: {
    color: "#fff",
    marginLeft: width * 0.025,
    fontSize: normalize(16),
  },
  chatContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: height * 0.6,
    borderTopLeftRadius: normalize(20),
    borderTopRightRadius: normalize(20),
    overflow: "hidden",
    zIndex: 20,
    backgroundColor: "rgba(255, 255, 255, 0.55)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 10,
  },

  chatHidden: {
    display: 'none',
  },
  chatViewContainer: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    position: "relative",
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: height * 0.01,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderTopLeftRadius: normalize(20),
    borderTopRightRadius: normalize(20),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(203, 213, 224, 0.5)",
  },
  expandButtonText: {
    marginLeft: width * 0.01,
    color: "#3b82f6",
    fontSize: normalize(14),
    fontWeight: "500",
  },
  messagesWrapper: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
  },
  messagesContainer: {
    flex: 1,
    width: "100%",
  },
  messagesContent: {
    padding: width * 0.025,
    paddingBottom: height * 0.015,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: width * 0.03,
    borderRadius: normalize(18),
    marginVertical: height * 0.005,
    position: "relative",
  },
  userBubble: {
    backgroundColor: "#3b82f6",
    alignSelf: "flex-end",
    borderTopRightRadius: normalize(4),
  },
  aiBubble: {
    backgroundColor: "#e2e8f0",
    alignSelf: "flex-start",
    borderTopLeftRadius: normalize(4),
  },
  userMessageText: {
    fontSize: normalize(16),
    color: "white",
  },
  aiMessageText: {
    fontSize: normalize(16),
    color: "#334155",
  },
  inputWrapper: {
    width: "100%",
    padding: width * 0.025,
    paddingBottom: Platform.OS === "ios" ? height * 0.02 : height * 0.01,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(203, 213, 224, 0.5)",
  },
  connectButtonWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  connectButton: {
    width: "100%",
    height: normalize(50),
    borderRadius: normalize(25),
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  connectButtonGradient: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonIcon: {
    marginRight: width * 0.02,
  },
  connectButtonText: {
    color: "white",
    fontSize: normalize(18),
    fontWeight: "bold",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.06,
    borderRadius: normalize(25),
    width: "100%",
  },
  loadingText: {
    color: "#3b82f6",
    marginLeft: width * 0.025,
    fontSize: normalize(16),
  },
  motionAssessButton: {
    alignSelf: "flex-start",
    marginTop: height * 0.01,
    marginLeft: width * 0.03,
    borderRadius: normalize(20),
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  motionButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.035,
    borderRadius: normalize(20),
  },
  motionButtonText: {
    color: "white",
    fontSize: normalize(14),
    fontWeight: "600",
  },
  loadingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(226, 232, 240, 0.8)",
    padding: width * 0.015,
    borderRadius: normalize(15),
    marginBottom: height * 0.01,
    alignSelf: "center",
  },
  loadingIndicatorText: {
    marginLeft: width * 0.02,
    fontSize: normalize(14),
    color: "#64748b",
  },
  typesButtonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    marginTop: height * 0.01,
    marginBottom: height * 0.005,
    paddingHorizontal: width * 0.01,
  },
  typeButton: {
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.03,
    borderRadius: normalize(16),
    backgroundColor: "rgba(67, 97, 238, 0.15)",
    marginHorizontal: width * 0.01,
    marginVertical: height * 0.005,
    borderWidth: 1,
    borderColor: "rgba(67, 97, 238, 0.3)",
  },
  typeButtonText: {
    fontSize: normalize(14),
    fontWeight: "500",
    color: "#3b82f6",
  },
  startAssessButton: {
    alignSelf: "flex-start",
    marginTop: height * 0.01,
    marginLeft: width * 0.03,
    borderRadius: normalize(20),
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  typeButtonSelected: {
    backgroundColor: "rgba(67, 97, 238, 0.3)",
  },
  typeButtonTextSelected: {
    fontWeight: "bold",
  },
  // 新增
  connectionToggleBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: height * 0.008,
    paddingHorizontal: width * 0.04,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderTopLeftRadius: normalize(20),
    borderTopRightRadius: normalize(20),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(203, 213, 224, 0.5)",
  },
  connectionToggleText: {
    color: "#334155",
    fontSize: normalize(14),
    fontWeight: "500",
  },
  //电子病历相关样式
  terminateButtonContainer: {
    margin: 10,
  },
  terminateButton: {
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  terminateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  recordContent: {
    flex: 1,
    marginBottom: 20,
    padding: 10,
    borderColor: '#e0e0e0',
    borderWidth: 1,
    borderRadius: 5,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  modifyButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    width: '40%',
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 8,
    width: '40%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
})

export default DigitalHumanScreen
