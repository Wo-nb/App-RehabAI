"use client"

import { useState, useEffect } from "react"
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Dimensions, Image, TextInput, Alert } from "react-native"
import { LineChart } from "react-native-chart-kit"
import HlsVideo from "./HlsVideo"
import Ionicons from "react-native-vector-icons/Ionicons"
import LinearGradient from "react-native-linear-gradient"
import MotionHistoryManager from "../utils/MotionHistoryManager"

const { width } = Dimensions.get("window")
const API_BASE_URL = "https://yfvideo.hf.free4inno.com"

const ShowResult = ({ resultData, onReset, recordId, navigation, bodyPart }) => {
  const [evaluationScore, setEvaluationScore] = useState(0)
  const [frameScores, setFrameScores] = useState({
    labels: [],
    datasets: [{ data: [] }],
  })
  const [worstFrames, setWorstFrames] = useState([])
  const [standardVideoHLS, setStandardVideoHLS] = useState("")
  const [exerciseVideoHLS, setExerciseVideoHLS] = useState("")
  const [overlapVideoHLS, setOverlapVideoHLS] = useState("")
  const [videoVisible, setVideoVisible] = useState(false)
  const [currentVideoHLS, setCurrentVideoHLS] = useState("")
  
  // 新增：反馈和记录ID状态
  const [feedback, setFeedback] = useState("")
  const [currentRecordId, setCurrentRecordId] = useState(recordId)

  useEffect(() => {
    if (resultData) {
      console.log("resultData:", resultData)
      // 解析 frame_scores
      const frameScoresObj = resultData.frame_scores || {}

      const scores = Object.values(frameScoresObj)
      const totalScore = scores.length > 0 ? scores.reduce((acc, score) => acc + score, 0) : 0
      const averageScore = scores.length > 0 ? totalScore / scores.length : 0
      setEvaluationScore(averageScore)

      // 设置 frameScores 用于图表 - 只显示每5个帧的标签和点
      const frameLabels = Object.keys(frameScoresObj)
      const frameData = Object.values(frameScoresObj)

      // 创建稀疏标签 - 只保留每5个标签
      const sparseLabels = frameLabels.map((label, index) => (index % 5 === 0 ? label : ""))

      setFrameScores({
        labels: sparseLabels,
        datasets: [{ data: frameData }],
      })

      // 设置 worstFrames
      const worstFramesData = resultData.exercise_worst_frames || []

      setWorstFrames(
        worstFramesData.map((frame, index) => ({
          frame: index + 1,
          image: API_BASE_URL + frame,
          score: frameScoresObj[frame] || 0,
        })),
      )

      // 设置视频流
      setStandardVideoHLS(API_BASE_URL + resultData.standard_video_hls)
      setExerciseVideoHLS(API_BASE_URL + resultData.exercise_video_hls)
      setOverlapVideoHLS(API_BASE_URL + resultData.overlap_video_hls)
      
      // 自动保存逻辑：如果是新评估（无传入ID），则自动保存
      const handleAutoSave = async () => {
        if (!recordId && !currentRecordId) {
            const savedRecord = await MotionHistoryManager.saveRecord(resultData, bodyPart);
            if (savedRecord) {
                setCurrentRecordId(savedRecord.id);
            }
        }
      };
      handleAutoSave();
    }
  }, [resultData, recordId])

  // 加载已有反馈
  useEffect(() => {
    const loadFeedback = async () => {
      const id = recordId || currentRecordId;
      if (id) {
        const history = await MotionHistoryManager.getHistory();
        const record = history.find(item => item.id === id);
        if (record && record.userFeedback) {
          setFeedback(record.userFeedback);
        }
      }
    };
    loadFeedback();
  }, [recordId, currentRecordId]);

  const handleVideoPress = (videoHLS) => {
    setCurrentVideoHLS(videoHLS)
    setVideoVisible(true)
  }

  // 保存反馈
  const handleSaveFeedback = async () => {
    const id = recordId || currentRecordId;
    if (!id) return;
    
    const success = await MotionHistoryManager.updateFeedback(id, feedback);
    if (success) {
      Alert.alert("成功", "反馈已保存");
    } else {
      Alert.alert("错误", "保存失败");
    }
  };

  // 发送给数字人
  const handleSendToDigitalHuman = () => {
    if (!navigation) {
        console.error("Navigation prop missing");
        return;
    }
    
    const scoreText = evaluationScore.toFixed(1);
    const summary = `我刚刚完成了${bodyPart || '康复'}动作评估，得分为 ${scoreText} 分。请针对我的表现给出康复建议。`;
    
    navigation.navigate("DigitalHuman", {
        autoSendMsg: summary,
        assessmentScore: scoreText
    });
  };

  return (
    <ScrollView style={styles.resultsContainer} contentContainerStyle={styles.resultsContent}>
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreTitle}>动作评估得分</Text>
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreValue}>{evaluationScore.toFixed(2)}</Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>
        <Text style={styles.scoreDescription}>
          {evaluationScore >= 90 ? "优秀" : evaluationScore >= 80 ? "良好" : "需要改进"}
        </Text>
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>每帧得分</Text>
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chartScrollContent}
        >
          {frameScores.datasets[0].data.length > 0 ? (
            <LineChart
              data={frameScores}
              width={Math.max(width - 40, 20 * 50)}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              yAxisInterval={1}
              chartConfig={{
                backgroundColor: "#3b82f6",
                backgroundGradientFrom: "#fb8c00",
                backgroundGradientTo: "#ffa726",
                decimalPlaces: 2,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: "6",
                  strokeWidth: "2",
                  stroke: "#ffa726",
                },
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
              // 只在每5个点显示点标记
              renderDotContent={({ x, y, index }) => {
                if (index % 5 === 0) {
                  return (
                    <View
                      key={index}
                      style={{
                        position: "absolute",
                        top: y - 10,
                        left: x - 10,
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: "#ffa726",
                      }}
                    />
                  )
                }
                return null
              }}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No chart data available</Text>
            </View>
          )}
        </ScrollView>
      </View>

      <View style={styles.worstFramesContainer}>
        <Text style={styles.worstFramesTitle}>需要改进的动作帧</Text>
        <View style={styles.worstFramesGrid}>
          {worstFrames.map((frame, index) => (
            <View key={index} style={styles.worstFrameItem}>
              <View style={styles.worstFrameInfo}>
                {/* 使用React Native的Image组件而不是SVG的Image */}
                <Image style={styles.worstImages} source={{ uri: frame.image }} resizeMode="cover" />
                <Text style={styles.worstFrameNumber}>帧 {frame.frame}</Text>
                <Text style={styles.worstFrameScore}>得分: {frame.score.toFixed(2)}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.videoButtonsContainer}>
        <TouchableOpacity style={styles.videoButton} onPress={() => handleVideoPress(standardVideoHLS)}>
          <Text style={styles.videoButtonText}>标准动作视频</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.videoButton} onPress={() => handleVideoPress(exerciseVideoHLS)}>
          <Text style={styles.videoButtonText}>练习动作视频</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.videoButton} onPress={() => handleVideoPress(overlapVideoHLS)}>
          <Text style={styles.videoButtonText}>重叠动作视频</Text>
        </TouchableOpacity>
      </View>

      <HlsVideo visible={videoVisible} videoId={currentVideoHLS} onClose={() => setVideoVisible(false)} />

      {/* 用户反馈区域 */}
      <View style={styles.feedbackContainer}>
        <Text style={styles.feedbackTitle}>用户反馈/备注</Text>
        <TextInput
            style={styles.feedbackInput}
            placeholder="记录下您的感受，或对本次评估的看法..."
            multiline
            value={feedback}
            onChangeText={setFeedback}
        />
        <TouchableOpacity style={styles.saveFeedbackButton} onPress={handleSaveFeedback}>
            <Text style={styles.saveFeedbackText}>保存反馈</Text>
        </TouchableOpacity>
      </View>

      {/* 发送给数字人按钮 */}
      <TouchableOpacity 
        style={styles.consultButton} 
        onPress={handleSendToDigitalHuman}
      >
        <LinearGradient
          colors={['#8b5cf6', '#6366f1']}
          style={styles.consultGradient}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={24} color="white" />
          <Text style={styles.consultButtonText}>发送结果给数字人咨询</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity style={styles.resetButton} onPress={onReset}>
        <Text style={styles.resetButtonText}>返回 / 重新选择</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  resultsContainer: {
    flex: 1,
    padding: 15,
  },
  resultsContent: {
    paddingBottom: 30,
  },
  scoreContainer: {
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 15,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#3b82f6",
  },
  scoreMax: {
    fontSize: 16,
    color: "#64748b",
  },
  scoreDescription: {
    fontSize: 16,
    fontWeight: "500",
    color: "#3b82f6",
  },
  chartContainer: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: "center",
  },
  chartScrollContent: {
    alignItems: "center",
    paddingHorizontal: 10,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 15,
    textAlign: "center",
  },
  worstFramesContainer: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  worstFramesTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 15,
  },
  worstImages: {
    width: 100,
    height: 100,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
  worstFramesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  worstFrameItem: {
    width: "30%",
    marginBottom: 15,
  },
  worstFrameInfo: {
    alignItems: "center",
  },
  worstFrameNumber: {
    fontSize: 14,
    fontWeight: "500",
    color: "#334155",
  },
  worstFrameScore: {
    fontSize: 12,
    color: "#64748b",
  },
  videoButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  videoButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 15,
    padding: 10,
    alignItems: "center",
    width: "30%",
  },
  videoButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
  resetButton: {
    backgroundColor: "#f1f5f9",
    borderRadius: 15,
    padding: 15,
    alignItems: "center",
    marginTop: 10,
  },
  resetButtonText: {
    color: "#334155",
    fontSize: 16,
    fontWeight: "500",
  },
  noDataContainer: {
    height: 220,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 16,
    marginVertical: 8,
  },
  noDataText: {
    color: "#64748b",
    fontSize: 16,
  },
  feedbackContainer: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: "#334155",
  },
  feedbackInput: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    height: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
  },
  saveFeedbackButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#64748b',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  saveFeedbackText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  consultButton: {
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  consultGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 10,
  },
  consultButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
})

export default ShowResult