// asrFilter.js

// 定义常见语气词列表
const FILLER_WORDS = [
  '嗯', '啊', '呀', '呢', '吧', '啦', '咯', 
  '哦', '呵', '哈', '嗨', '喂', '欸', '哎'
];

/**
 * 去除字符串中的多余空格
 * @param {string} text 原始文本
 * @returns {string} 处理后的文本
 */
const removeExtraSpaces = (text) => {
  return text.replace(/\s+/g, ' ').trim();
};

/**
 * 去除语气词
 * @param {string} text 原始文本
 * @returns {string} 处理后的文本
 */
const removeFillerWords = (text) => {
  let result = text;
  // 按优先级从长到短排序，避免部分匹配
  const sortedFillers = [...FILLER_WORDS].sort((a, b) => b.length - a.length);
  
  sortedFillers.forEach(word => {
    // 使用正则匹配整个词，避免部分匹配
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    result = result.replace(regex, '');
  });
  
  return result;
};

/**
 * 去除明显重复内容
 * @param {string} text 原始文本
 * @returns {string} 处理后的文本
 */
const removeDuplicates = (text) => {
  // 简单重复模式处理（如"你好你好" -> "你好"）
  const words = text.split(/\s+/).filter(word => word);
  const result = [];
  
  for (let i = 0; i < words.length; i++) {
    // 跳过与前一个词相同的内容
    if (i > 0 && words[i] === words[i - 1]) {
      continue;
    }
    result.push(words[i]);
  }
  
  return result.join(' ');
};

/**
 * ASR结果过滤主函数
 * @param {string} text 原始识别结果
 * @returns {string} 过滤后的结果
 */
const filterAsrResult = (text) => {
  if (!text) return '';
  
  let result = text;
  // 按顺序应用过滤器
  result = removeExtraSpaces(result);
  result = removeFillerWords(result);
  result = removeDuplicates(result);
  result = removeExtraSpaces(result); // 最后再清理一次空格
  
  return result;
};

export default filterAsrResult;