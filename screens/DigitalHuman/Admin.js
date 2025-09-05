import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, ScrollView, Dimensions, Alert } from 'react-native';
import Icon from "react-native-vector-icons/Ionicons";
import { LineChart } from 'react-native-chart-kit';
import ConfigManager from '../utils/ConfigManager';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const Admin = ({isAdmin, setIsAdmin}) => {
    const [showChat, setShowChat] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [chatData, setChatData] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedChats, setSelectedChats] = useState([]);
    const [dateInput, setDateInput] = useState('');
    // 配置相关状态
    const [showConfig, setShowConfig] = useState(false);
    const [apiBaseUrl, setApiBaseUrl] = useState('');
    const [digitalHumanUrl, setDigitalHumanUrl] = useState('');
    const [configLoaded, setConfigLoaded] = useState(false);
    // URL测试状态
    const [testingApiUrl, setTestingApiUrl] = useState(false);
    const [testingDigitalHumanUrl, setTestingDigitalHumanUrl] = useState(false);
    const [apiUrlTestResult, setApiUrlTestResult] = useState(null);
    const [digitalHumanUrlTestResult, setDigitalHumanUrlTestResult] = useState(null);
    
    const scrollViewRef = useRef(null);
    const chatDetailRef = useRef(null);

    // 颜色常量
    const ACCURACY_COLOR = 'rgba(67, 97, 238, 1)';
    const FLUENCY_COLOR = 'rgba(76, 201, 240, 1)';

    // 初始化配置管理器
    useEffect(() => {
        const initConfig = async () => {
            await ConfigManager.initialize();
            const config = ConfigManager.getAll();
            setApiBaseUrl(config.API_BASE_URL);
            setDigitalHumanUrl(config.DIGITAL_HUMAN_URL);
            setConfigLoaded(true);
        };
        initConfig();
    }, []);

    useEffect(() => {
        if (isLoggedIn && configLoaded) {
            fetchChatData();
        }
    }, [isLoggedIn, configLoaded]);

    // 获取某个特定反馈的聊天记录
    const fetchChatMessages = async (feedbackId) => {
        try {
            const baseUrl = ConfigManager.getApiBaseUrl();
            const response = await fetch(`${baseUrl}/api/feedback/${feedbackId}/`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                }
            });
            if (response.ok) {
                const data = await response.json();

                return data.messages;
            }
            return null;
        } catch (error) {
            console.log("获取聊天记录失败:", error);
            return null;
        }
    };

    const fetchChatData = async () => {
        try {
            const baseUrl = ConfigManager.getApiBaseUrl();
            const response = await fetch(`${baseUrl}/api/feedback/`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log("get data:",data)
                setChatData(data);
            }else{
                console.log("error data")
            }
        } catch (error) {
            console.log("获取数据失败:", error);
            Alert.alert('错误', '获取数据失败，请稍后重试');
        }
    };

    // 处理数据，计算每天的平均分数
    const processDataByDate = (data) => {
        const dateMap = new Map();
        
        data.forEach(item => {
            if (!dateMap.has(item.date)) {
                dateMap.set(item.date, {
                    accuracySum: 0,
                    fluencySum: 0,
                    count: 0
                });
            }
            const dateStats = dateMap.get(item.date);
            dateStats.accuracySum += item.rating.accuracy;
            dateStats.fluencySum += item.rating.fluency;
            dateStats.count += 1;
        });

        return Array.from(dateMap.entries()).map(([date, stats]) => ({
            date,
            accuracy: stats.accuracySum / stats.count,
            fluency: stats.fluencySum / stats.count
        })).sort((a, b) => a.date.localeCompare(b.date));
    };

    // 处理日期选择
    const handleDateSelect = async (date) => {
        setSelectedDate(date);
        // 找出选中日期的所有聊天记录
        const dateChats = chatData.filter(chat => chat.date === date);
        
        // 获取每个聊天的详细信息
        const chatsWithMessages = await Promise.all(
            dateChats.map(async (chat) => {
                const messages = await fetchChatMessages(chat.id);
                console.log("messages is:",messages);
                return {
                    ...chat,
                    messages: messages || []
                };
            })
        );
        
        setSelectedChats(chatsWithMessages);
        
        setTimeout(() => {
            scrollToChatDetail();
        }, 300);
    };

    const scrollToChatDetail = () => {
        if (chatDetailRef.current && scrollViewRef.current) {
            try {
                chatDetailRef.current.measureLayout(
                    scrollViewRef.current,
                    (x, y) => {
                        scrollViewRef.current.scrollTo({ y, animated: true });
                    },
                    (error) => {
                        console.log('Measurement failed:', error);
                        scrollViewRef.current.scrollToEnd({ animated: true });
                    }
                );
            } catch (error) {
                console.log('Error in scrollToChatDetail:', error);
                scrollViewRef.current.scrollToEnd({ animated: true });
            }
        }
    };

    const handleLogin = () => {
        if (username === 'admin' && password === 'admin') {
            setIsLoggedIn(true);
        } else {
            alert('用户名或密码错误！');
        }
    };

    // 保存配置
    const handleSaveConfig = async () => {
        try {
            const errors = ConfigManager.validateConfig({
                API_BASE_URL: apiBaseUrl,
                DIGITAL_HUMAN_URL: digitalHumanUrl
            });
            
            if (errors.length > 0) {
                Alert.alert('配置错误', errors.join('\n'));
                return;
            }

            await ConfigManager.setMultiple({
                API_BASE_URL: apiBaseUrl,
                DIGITAL_HUMAN_URL: digitalHumanUrl
            });

            Alert.alert('成功', '配置已保存');
            setShowConfig(false);
        } catch (error) {
            console.error('保存配置失败:', error);
            Alert.alert('错误', '保存配置失败，请稍后重试');
        }
    };

    // 重置配置到默认值
    const handleResetConfig = async () => {
        try {
            await ConfigManager.resetToDefaults();
            const config = ConfigManager.getAll();
            setApiBaseUrl(config.API_BASE_URL);
            setDigitalHumanUrl(config.DIGITAL_HUMAN_URL);
            // 清除测试结果
            setApiUrlTestResult(null);
            setDigitalHumanUrlTestResult(null);
            Alert.alert('成功', '配置已重置为默认值');
        } catch (error) {
            console.error('重置配置失败:', error);
            Alert.alert('错误', '重置配置失败，请稍后重试');
        }
    };

    // 测试API URL
    const testApiUrl = async () => {
        if (!apiBaseUrl.trim()) {
            Alert.alert('错误', '请先输入API基础URL');
            return;
        }

        setTestingApiUrl(true);
        setApiUrlTestResult(null);

        try {
            // 测试API连接 - 尝试访问反馈接口
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

            const response = await fetch(`${apiBaseUrl}/api/feedback/`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                setApiUrlTestResult({ success: true, message: '连接成功' });
            } else {
                setApiUrlTestResult({ 
                    success: false, 
                    message: `连接失败 (${response.status}: ${response.statusText})` 
                });
            }
        } catch (error) {
            let errorMessage = '连接失败';
            if (error.name === 'AbortError') {
                errorMessage = '连接超时 (10秒)';
            } else if (error.message.includes('Network request failed')) {
                errorMessage = '网络请求失败';
            } else {
                errorMessage = `连接错误: ${error.message}`;
            }
            setApiUrlTestResult({ success: false, message: errorMessage });
        } finally {
            setTestingApiUrl(false);
        }
    };

    // 测试数字人URL
    const testDigitalHumanUrl = async () => {
        if (!digitalHumanUrl.trim()) {
            Alert.alert('错误', '请先输入数字人URL');
            return;
        }

        setTestingDigitalHumanUrl(true);
        setDigitalHumanUrlTestResult(null);

        try {
            // 测试数字人服务连接 - 尝试访问offer接口
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

            const response = await fetch(`${digitalHumanUrl}/offer`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    sdp: "test",
                    type: "offer",
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok || response.status === 400) {
                // 400错误通常意味着服务可访问但请求格式不正确，这对测试来说是可接受的
                setDigitalHumanUrlTestResult({ success: true, message: '连接成功' });
            } else {
                setDigitalHumanUrlTestResult({ 
                    success: false, 
                    message: `连接失败 (${response.status}: ${response.statusText})` 
                });
            }
        } catch (error) {
            let errorMessage = '连接失败';
            if (error.name === 'AbortError') {
                errorMessage = '连接超时 (10秒)';
            } else if (error.message.includes('Network request failed')) {
                errorMessage = '网络请求失败';
            } else {
                errorMessage = `连接错误: ${error.message}`;
            }
            setDigitalHumanUrlTestResult({ success: false, message: errorMessage });
        } finally {
            setTestingDigitalHumanUrl(false);
        }
    };

    // 获取图表数据
    const getChartData = () => {
        if (!chatData || chatData.length === 0) {
            return {
                labels: [],
                datasets: [
                    {
                        data: [0],
                        color: () => ACCURACY_COLOR,
                        strokeWidth: 2
                    },
                    {
                        data: [0],
                        color: () => FLUENCY_COLOR,
                        strokeWidth: 2
                    }
                ],
                legend: ['准确度', '流畅度']
            };
        }
        
        const processedData = processDataByDate(chatData);
        return {
            labels: processedData.map(item => item.date),
            datasets: [
                {
                    data: processedData.map(item => item.accuracy),
                    color: () => ACCURACY_COLOR,
                    strokeWidth: 2
                },
                {
                    data: processedData.map(item => item.fluency),
                    color: () => FLUENCY_COLOR,
                    strokeWidth: 2
                }
            ],
            legend: ['准确度', '流畅度']
        };
    };

    // 计算统计数据，避免空数据导致的错误
    const calculateStats = () => {
        if (!chatData || chatData.length === 0) {
            return {
                totalChats: 0,
                avgAccuracy: "0.0",
                avgFluency: "0.0"
            };
        }
        
        return {
            totalChats: chatData.length,
            avgAccuracy: (chatData.reduce((acc, curr) => acc + curr.rating.accuracy, 0) / chatData.length).toFixed(1),
            avgFluency: (chatData.reduce((acc, curr) => acc + curr.rating.fluency, 0) / chatData.length).toFixed(1)
        };
    };

    const stats = calculateStats();

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isAdmin}
            onRequestClose={() => {
                setIsLoggedIn(false);
            }}
        >
            <View style={styles.modalContainer}>
                {!isLoggedIn ? (
                    <View style={styles.loginContainer}>
                        <View style={styles.loginHeader}>
                            <TouchableOpacity 
                                style={styles.backButton} 
                                onPress={() => setIsAdmin(false)}
                            >
                                <Icon name="close-outline" size={24} color="#666" />
                            </TouchableOpacity>
                            <Text style={styles.title}>管理员登录</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="用户名"
                            value={username}
                            onChangeText={setUsername}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="密码"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={true}
                            textContentType="password"
                        />
                        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                            <Text style={styles.loginButtonText}>登录</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.dataContainer}>
                        <View style={styles.header}>
                            <Text style={styles.title}>对话数据分析</Text>
                            <View style={styles.headerButtons}>
                                <TouchableOpacity 
                                    style={styles.configButton} 
                                    onPress={() => setShowConfig(true)}
                                >
                                    <Icon name="settings-outline" size={24} color="#666" />
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={styles.logoutButton} 
                                    onPress={() => {
                                        setIsLoggedIn(false);
                                        setUsername('');
                                        setPassword('');
                                    }}
                                >
                                    <Icon name="log-out-outline" size={24} color="#666" />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <ScrollView ref={scrollViewRef} style={styles.scrollContainer}
                            nestedScrollEnabled={true}>
                            <View style={styles.statsContainer}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>总对话数</Text>
                                    <Text style={styles.statValue}>{stats.totalChats}</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>平均准确率</Text>
                                    <Text style={styles.statValue}>{stats.avgAccuracy}</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>平均流畅度</Text>
                                    <Text style={styles.statValue}>{stats.avgFluency}</Text>
                                </View>
                            </View>

                            {/* 日期按钮部分 */}
                            {chatData.length > 0 && (
                                <View style={styles.dateButtonsContainer}>
                                    <Text style={styles.dateButtonsLabel}>选择日期：</Text>
                                    <ScrollView 
                                        horizontal 
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.dateButtonsScrollContent}
                                    >
                                        {Array.from(new Set(chatData.map(item => item.date))).sort().map((date) => (
                                            <TouchableOpacity 
                                                key={date}
                                                style={[
                                                    styles.dateButton,
                                                    selectedDate === date && styles.selectedDateButton
                                                ]}
                                                onPress={() => handleDateSelect(date)}
                                            >
                                                <Text style={[
                                                    styles.dateButtonText,
                                                    selectedDate === date && styles.selectedDateButtonText
                                                ]}>
                                                    {date}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            {chatData.length > 0 && (
                                <View style={styles.chartContainer}>
                                    <Text style={styles.chartTitle}>评分趋势</Text>
                                    <ScrollView 
                                        horizontal 
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.chartScrollContent}
                                    >
                                        <LineChart
                                            data={getChartData()}
                                            width={Math.max(SCREEN_WIDTH - 40, chatData.length < 15 ? chatData.length * 30: chatData.length * 40)}
                                            height={220}
                                            chartConfig={{
                                                backgroundColor: '#ffffff',
                                                backgroundGradientFrom: '#ffffff',
                                                backgroundGradientTo: '#ffffff',
                                                decimalPlaces: 1,
                                                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                                style: {
                                                    borderRadius: 16,
                                                },
                                                propsForDots: {
                                                    r: '6',
                                                    strokeWidth: '2',
                                                },
                                                formatYLabel: (value) => value.toString(),
                                                formatXLabel: (value) => value.toString().substring(5), // 只显示月-日
                                            }}
                                            bezier
                                            style={{
                                                marginVertical: 8,
                                                borderRadius: 16,
                                            }}
                                            fromZero
                                        />
                                    </ScrollView>
                                    <View style={styles.legendContainer}>
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendColor, { backgroundColor: ACCURACY_COLOR }]} />
                                            <Text style={styles.legendText}>准确度</Text>
                                        </View>
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendColor, { backgroundColor: FLUENCY_COLOR }]} />
                                            <Text style={styles.legendText}>流畅度</Text>
                                        </View>
                                    </View>
                                </View>
                            )}
                            
                            {selectedChats.length > 0 && (
                                <View ref={chatDetailRef} style={styles.chatDetail}>
                                    <Text style={styles.chatDetailTitle}>对话详情</Text>
                                    <Text style={styles.chatDate}>日期: {selectedDate}</Text>
                                    {selectedChats.map((chat, index) => (
                                        <View key={chat.id} style={styles.chatSection}>
                                            <Text style={styles.chatSectionTitle}>对话 {index + 1}</Text>
                                            <View style={styles.ratingContainer}>
                                                <Text style={[styles.ratingText, {color: ACCURACY_COLOR}]}>
                                                    准确度评分: {chat.rating.accuracy}
                                                </Text>
                                                <Text style={[styles.ratingText, {color: FLUENCY_COLOR}]}>
                                                    流畅度评分: {chat.rating.fluency}
                                                </Text>
                                            </View>
                                            <ScrollView style={styles.messageContainer}
                                                nestedScrollEnabled={true}>
                                                {chat.messages && chat.messages.map((msg) => (
                                                    <View key={msg.id} style={[
                                                        styles.messageItem,
                                                        msg.isUser ? styles.userMessage : styles.botMessage
                                                    ]}>
                                                        <Text style={styles.messageRole}>
                                                            {msg.isUser ? '用户' : '数字人'}
                                                        </Text>
                                                        <Text style={styles.messageContent}>{msg.text}</Text>
                                                    </View>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </ScrollView>
                    </View>
                )}
            </View>
            
            {/* 配置Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showConfig}
                onRequestClose={() => setShowConfig(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.configContainer}>
                        <View style={styles.configHeader}>
                            <TouchableOpacity 
                                style={styles.backButton} 
                                onPress={() => setShowConfig(false)}
                            >
                                <Icon name="close-outline" size={24} color="#666" />
                            </TouchableOpacity>
                            <Text style={styles.title}>系统配置</Text>
                        </View>
                        
                        <ScrollView style={styles.configScrollContainer}>
                            <View style={styles.configSection}>
                                <Text style={styles.configSectionTitle}>大模型URL</Text>
                                <Text style={styles.configDescription}>大模型的API地址</Text>
                                <View style={styles.urlInputContainer}>
                                    <TextInput
                                        style={[styles.configInput, styles.urlInput]}
                                        placeholder="例如: http://192.168.1.100:8000"
                                        value={apiBaseUrl}
                                        onChangeText={(text) => {
                                            setApiBaseUrl(text);
                                            setApiUrlTestResult(null); // 清除之前的测试结果
                                        }}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                    <TouchableOpacity 
                                        style={styles.testButton} 
                                        onPress={testApiUrl}
                                        disabled={testingApiUrl || !apiBaseUrl.trim()}
                                    >
                                        {testingApiUrl ? (
                                            <ActivityIndicator size="small" color="#666" />
                                        ) : (
                                            <Icon name="checkmark-circle-outline" size={20} color="#666" />
                                        )}
                                    </TouchableOpacity>
                                </View>
                                {apiUrlTestResult && (
                                    <View style={[
                                        styles.testResult,
                                        apiUrlTestResult.success ? styles.testSuccess : styles.testError
                                    ]}>
                                        <Icon 
                                            name={apiUrlTestResult.success ? "checkmark-circle" : "close-circle"} 
                                            size={16} 
                                            color={apiUrlTestResult.success ? "#4caf50" : "#f44336"} 
                                        />
                                        <Text style={[
                                            styles.testResultText,
                                            { color: apiUrlTestResult.success ? "#4caf50" : "#f44336" }
                                        ]}>
                                            {apiUrlTestResult.message}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            
                            <View style={styles.configSection}>
                                <Text style={styles.configSectionTitle}>数字人URL</Text>
                                <Text style={styles.configDescription}>数字人服务的地址</Text>
                                <View style={styles.urlInputContainer}>
                                    <TextInput
                                        style={[styles.configInput, styles.urlInput]}
                                        placeholder="例如: http://192.168.1.100:8010"
                                        value={digitalHumanUrl}
                                        onChangeText={(text) => {
                                            setDigitalHumanUrl(text);
                                            setDigitalHumanUrlTestResult(null); // 清除之前的测试结果
                                        }}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                    <TouchableOpacity 
                                        style={styles.testButton} 
                                        onPress={testDigitalHumanUrl}
                                        disabled={testingDigitalHumanUrl || !digitalHumanUrl.trim()}
                                    >
                                        {testingDigitalHumanUrl ? (
                                            <ActivityIndicator size="small" color="#666" />
                                        ) : (
                                            <Icon name="checkmark-circle-outline" size={20} color="#666" />
                                        )}
                                    </TouchableOpacity>
                                </View>
                                {digitalHumanUrlTestResult && (
                                    <View style={[
                                        styles.testResult,
                                        digitalHumanUrlTestResult.success ? styles.testSuccess : styles.testError
                                    ]}>
                                        <Icon 
                                            name={digitalHumanUrlTestResult.success ? "checkmark-circle" : "close-circle"} 
                                            size={16} 
                                            color={digitalHumanUrlTestResult.success ? "#4caf50" : "#f44336"} 
                                        />
                                        <Text style={[
                                            styles.testResultText,
                                            { color: digitalHumanUrlTestResult.success ? "#4caf50" : "#f44336" }
                                        ]}>
                                            {digitalHumanUrlTestResult.message}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            
                            <View style={styles.configButtonContainer}>
                                <TouchableOpacity style={styles.resetButton} onPress={handleResetConfig}>
                                    <Text style={styles.resetButtonText}>重置为默认</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.saveConfigButton} onPress={handleSaveConfig}>
                                    <Text style={styles.saveConfigButtonText}>保存配置</Text>
                                </TouchableOpacity>
                            </View>
                            
                            <View style={styles.configInfo}>
                                <Text style={styles.configInfoText}>
                                    注意：修改配置后，应用将使用新的URL进行所有网络请求。请确保URL格式正确且服务可访问。
                                </Text>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SCREEN_WIDTH * 0.02,
    },
    loginContainer: {
        width: SCREEN_WIDTH * 0.9,
        backgroundColor: 'white',
        borderRadius: 15,
        padding: SCREEN_WIDTH * 0.05,
        alignItems: 'center',
    },
    dataContainer: {
        width: SCREEN_WIDTH * 0.95,
        height: SCREEN_HEIGHT * 0.8,
        backgroundColor: 'white',
        borderRadius: 15,
        overflow: 'hidden',
        alignSelf: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SCREEN_WIDTH * 0.04,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    scrollContainer: {
        flex: 1,
        padding: SCREEN_WIDTH * 0.03,
    },
    title: {
        flex: 1,
        fontSize: SCREEN_WIDTH * 0.02,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    logoutButton: {
        padding: SCREEN_WIDTH * 0.02,
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
    },
    input: {
        width: '100%',
        height: SCREEN_HEIGHT * 0.06,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: SCREEN_WIDTH * 0.04,
        marginBottom: SCREEN_HEIGHT * 0.02,
        backgroundColor: 'white',
        fontSize: Math.min(SCREEN_WIDTH * 0.04, 16),
    },
    loginButton: {
        backgroundColor: '#4361ee',
        paddingVertical: SCREEN_HEIGHT * 0.015,
        paddingHorizontal: SCREEN_WIDTH * 0.08,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
    },
    loginButtonText: {
        color: 'white',
        fontSize: Math.min(SCREEN_WIDTH * 0.04, 16),
        fontWeight: 'bold',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: SCREEN_WIDTH * 0.04,
        backgroundColor: 'white',
        borderRadius: 10,
        marginBottom: SCREEN_HEIGHT * 0.02,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    statItem: {
        alignItems: 'center',
        width: SCREEN_WIDTH * 0.25,
    },
    statLabel: {
        fontSize: Math.min(SCREEN_WIDTH * 0.035, 14),
        color: '#666',
        marginBottom: 5,
    },
    statValue: {
        fontSize: Math.min(SCREEN_WIDTH * 0.05, 20),
        fontWeight: 'bold',
        color: '#4361ee',
    },
    chartContainer: {
        backgroundColor: 'white',
        borderRadius: 10,
        paddingVertical: SCREEN_HEIGHT * 0.02,
        marginBottom: SCREEN_HEIGHT * 0.02,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    chartTitle: {
        fontSize: Math.min(SCREEN_WIDTH * 0.04, 16),
        fontWeight: 'bold',
        marginBottom: SCREEN_HEIGHT * 0.01,
        color: '#333',
        paddingLeft: SCREEN_WIDTH * 0.04,
    },
    chartScrollContent: {
        paddingRight: 20,
    },
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 10,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 10,
    },
    legendColor: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 5,
    },
    legendText: {
        fontSize: 12,
        color: '#666',
    },
    chatDetail: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 15,
        marginTop: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    chatDetailTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    chatDate: {
        fontSize: 14,
        color: '#666',
        marginBottom: 10,
    },
    ratingContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SCREEN_HEIGHT * 0.02,
    },
    ratingText: {
        fontSize: Math.min(SCREEN_WIDTH * 0.035, 14),
        fontWeight: 'bold',
    },
    messageContainer: {
        maxHeight: SCREEN_HEIGHT * 0.4,
        flex: 1,
    },
    messageItem: {
        marginBottom: SCREEN_HEIGHT * 0.01,
        padding: SCREEN_WIDTH * 0.03,
        borderRadius: 8,
    },
    userMessage: {
        backgroundColor: '#f0f2ff',
        marginLeft: SCREEN_WIDTH * 0.05,
    },
    botMessage: {
        backgroundColor: '#f5f5f5',
        marginRight: SCREEN_WIDTH * 0.05,
    },
    messageRole: {
        fontWeight: 'bold',
        marginBottom: SCREEN_HEIGHT * 0.005,
        fontSize: Math.min(SCREEN_WIDTH * 0.03, 12),
        color: '#666',
    },
    messageContent: {
        color: '#333',
        fontSize: Math.min(SCREEN_WIDTH * 0.035, 14),
        lineHeight: Math.min(SCREEN_WIDTH * 0.05, 20),
    },
    loginHeader: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        position: 'relative',
    },
    backButton: {
        position: 'absolute',
        left: SCREEN_WIDTH * 0.02,
        padding: SCREEN_WIDTH * 0.02,
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
        zIndex: 1,
    },
    helpText: {
        textAlign: 'center',
        fontSize: 12,
        color: '#888',
        marginTop: 5,
        fontStyle: 'italic',
    },
    chatSection: {
        marginBottom: SCREEN_HEIGHT * 0.02,
        padding: SCREEN_WIDTH * 0.04,
        backgroundColor: '#f8f9fa',
        borderRadius: 10,
    },
    chatSectionTitle: {
        fontSize: Math.min(SCREEN_WIDTH * 0.04, 16),
        fontWeight: 'bold',
        marginBottom: SCREEN_HEIGHT * 0.01,
        color: '#333',
    },
    dateButtonsContainer: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: SCREEN_WIDTH * 0.04,
        marginBottom: SCREEN_HEIGHT * 0.02,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    dateButtonsLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    dateButtonsScrollContent: {
        paddingRight: 10,
    },
    dateButton: {
        backgroundColor: '#f5f5f5',
        paddingVertical: SCREEN_HEIGHT * 0.01,
        paddingHorizontal: SCREEN_WIDTH * 0.04,
        borderRadius: 20,
        marginRight: SCREEN_WIDTH * 0.02,
    },
    selectedDateButton: {
        backgroundColor: '#4361ee',
    },
    dateButtonText: {
        fontSize: Math.min(SCREEN_WIDTH * 0.035, 14),
        color: '#666',
    },
    selectedDateButtonText: {
        color: 'white',
    },
    // 配置相关样式
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    configButton: {
        padding: SCREEN_WIDTH * 0.02,
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
        marginRight: SCREEN_WIDTH * 0.02,
    },
    configContainer: {
        width: SCREEN_WIDTH * 0.9,
        height: SCREEN_HEIGHT * 0.75,
        backgroundColor: 'white',
        borderRadius: 15,
        overflow: 'hidden',
        alignSelf: 'center',
    },
    configHeader: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        padding: SCREEN_WIDTH * 0.04,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        position: 'relative',
    },
    configScrollContainer: {
        flex: 1,
        padding: SCREEN_WIDTH * 0.04,
    },
    configSection: {
        marginBottom: SCREEN_HEIGHT * 0.025,
    },
    configSectionTitle: {
        fontSize: Math.min(SCREEN_WIDTH * 0.04, 16),
        fontWeight: 'bold',
        color: '#333',
        marginBottom: SCREEN_HEIGHT * 0.005,
    },
    configDescription: {
        fontSize: Math.min(SCREEN_WIDTH * 0.035, 14),
        color: '#666',
        marginBottom: SCREEN_HEIGHT * 0.01,
        lineHeight: Math.min(SCREEN_WIDTH * 0.05, 20),
    },
    configInput: {
        width: '100%',
        height: SCREEN_HEIGHT * 0.06,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: SCREEN_WIDTH * 0.04,
        backgroundColor: 'white',
        fontSize: Math.min(SCREEN_WIDTH * 0.035, 14),
    },
    configButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: SCREEN_HEIGHT * 0.02,
        marginBottom: SCREEN_HEIGHT * 0.02,
    },
    resetButton: {
        backgroundColor: '#ff6b6b',
        paddingVertical: SCREEN_HEIGHT * 0.015,
        paddingHorizontal: SCREEN_WIDTH * 0.06,
        borderRadius: 8,
        flex: 0.45,
        alignItems: 'center',
    },
    resetButtonText: {
        color: 'white',
        fontSize: Math.min(SCREEN_WIDTH * 0.035, 14),
        fontWeight: 'bold',
    },
    saveConfigButton: {
        backgroundColor: '#4361ee',
        paddingVertical: SCREEN_HEIGHT * 0.015,
        paddingHorizontal: SCREEN_WIDTH * 0.06,
        borderRadius: 8,
        flex: 0.45,
        alignItems: 'center',
    },
    saveConfigButtonText: {
        color: 'white',
        fontSize: Math.min(SCREEN_WIDTH * 0.035, 14),
        fontWeight: 'bold',
    },
    configInfo: {
        backgroundColor: '#f8f9fa',
        padding: SCREEN_WIDTH * 0.04,
        borderRadius: 8,
        marginTop: SCREEN_HEIGHT * 0.01,
    },
    configInfoText: {
        fontSize: Math.min(SCREEN_WIDTH * 0.03, 12),
        color: '#666',
        lineHeight: Math.min(SCREEN_WIDTH * 0.045, 18),
        textAlign: 'center',
    },
});

export default Admin;