import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'motion_assessment_history';

class MotionHistoryManager {
  // 保存新的评估记录
  static async saveRecord(resultData, bodyPart) {
    try {
      const existingData = await this.getHistory();
      const newRecord = {
        id: Date.now().toString(), // 唯一ID
        timestamp: Date.now(),
        dateStr: new Date().toLocaleString(),
        bodyPart: bodyPart || '未知部位',
        score: resultData.frame_scores 
          ? (Object.values(resultData.frame_scores).reduce((a, b) => a + b, 0) / Object.values(resultData.frame_scores).length) 
          : 0,
        data: resultData, // 完整结果数据
        userFeedback: '' // 用户反馈默认为空
      };
      
      const newData = [newRecord, ...existingData];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      return newRecord;
    } catch (error) {
      console.error('保存历史记录失败:', error);
      return null;
    }
  }

  // 获取所有历史记录
  static async getHistory() {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (error) {
      console.error('读取历史记录失败:', error);
      return [];
    }
  }

  // 删除某条记录
  static async deleteRecord(id) {
    try {
      const existingData = await this.getHistory();
      const newData = existingData.filter(item => item.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      return newData;
    } catch (error) {
      console.error('删除记录失败:', error);
      return [];
    }
  }

  // 更新用户反馈
  static async updateFeedback(id, feedback) {
    try {
      const existingData = await this.getHistory();
      const index = existingData.findIndex(item => item.id === id);
      if (index !== -1) {
        existingData[index].userFeedback = feedback;
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existingData));
        return true;
      }
      return false;
    } catch (error) {
      console.error('更新反馈失败:', error);
      return false;
    }
  }
}

export default MotionHistoryManager;