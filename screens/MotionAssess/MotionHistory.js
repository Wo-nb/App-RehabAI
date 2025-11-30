import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MotionHistoryManager from '../utils/MotionHistoryManager';

const MotionHistory = ({ onSelectRecord, onClose }) => {
  const [historyList, setHistoryList] = useState([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const data = await MotionHistoryManager.getHistory();
    setHistoryList(data);
  };

  const handleDelete = (id) => {
    Alert.alert('确认删除', '您确定要删除这条评估记录吗？', [
      { text: '取消', style: 'cancel' },
      { 
        text: '删除', 
        style: 'destructive', 
        onPress: async () => {
          const newData = await MotionHistoryManager.deleteRecord(id);
          setHistoryList(newData);
        }
      }
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity 
        style={styles.cardContent} 
        onPress={() => onSelectRecord(item)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.bodyPart}>{item.bodyPart}</Text>
          <Text style={[styles.score, { color: item.score >= 80 ? '#10b981' : '#f59e0b' }]}>
            {item.score.toFixed(1)}分
          </Text>
        </View>
        <Text style={styles.date}>{item.dateStr}</Text>
        {item.userFeedback ? (
          <Text numberOfLines={1} style={styles.feedbackPreview}>反馈: {item.userFeedback}</Text>
        ) : null}
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
        <Ionicons name="trash-outline" size={20} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>历史评估记录</Text>
        <View style={{width: 24}} /> 
      </View>

      {historyList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>暂无历史记录</Text>
        </View>
      ) : (
        <FlatList
          data={historyList}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#334155',
  },
  listContent: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bodyPart: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  score: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 12,
    color: '#94a3b8',
  },
  feedbackPreview: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontStyle: 'italic',
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
  }
});

export default MotionHistory;