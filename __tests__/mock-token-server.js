#!/usr/bin/env node

/**
 * 模拟Token服务器
 * 用于本地开发和测试，模拟阿里云Token获取服务
 */

const http = require('http');
const url = require('url');

const PORT = 3001;
const MOCK_TOKEN = 'mock_token_' + Date.now();

// 模拟Token响应
const mockTokenResponse = {
  token: MOCK_TOKEN,
  expires_in: 3600,
  message: 'Mock token for testing purposes'
};

// 创建HTTP服务器
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // 处理Token请求
  if (parsedUrl.pathname === '/token' && req.method === 'POST') {
    console.log('🔑 收到Token请求');
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(mockTokenResponse));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

// 启动服务器
server.listen(PORT, () => {
  console.log(`🚀 模拟Token服务器已启动`);
  console.log(`📍 地址: http://localhost:${PORT}/token`);
  console.log(`🔑 模拟Token: ${MOCK_TOKEN}`);
  console.log(`⏰ 按 Ctrl+C 停止服务器`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭模拟Token服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});

module.exports = { server, MOCK_TOKEN };
