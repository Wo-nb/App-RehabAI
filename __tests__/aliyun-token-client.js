/**
 * 阿里云Token获取客户端
 * 根据官方文档实现：https://help.aliyun.com/zh/isi/getting-started/use-http-or-https-to-obtain-an-access-token
 */

const crypto = require('crypto');
const https = require('https');
const http = require('http');

class AliyunTokenClient {
  constructor(accessKeyId, accessKeySecret, regionId = 'cn-shanghai') {
    this.accessKeyId = accessKeyId;
    this.accessKeySecret = accessKeySecret;
    this.regionId = regionId;
    this.baseUrl = 'nls-meta.cn-shanghai.aliyuncs.com';
  }

  /**
   * URL编码
   */
  encodeText(text) {
    return encodeURIComponent(text)
      .replace(/\+/g, '%20')
      .replace(/\*/g, '%2A')
      .replace(/%7E/g, '~');
  }

  /**
   * 构造规范化的请求字符串
   */
  canonicalizedQuery(params) {
    const sortedKeys = Object.keys(params).sort();
    const queryParts = sortedKeys.map(key => {
      const value = params[key];
      return `${this.encodeText(key)}=${this.encodeText(value)}`;
    });
    return queryParts.join('&');
  }

  /**
   * 构造待签名字符串
   */
  createStringToSign(method, urlPath, queryString) {
    return `${method}&${this.encodeText(urlPath)}&${this.encodeText(queryString)}`;
  }

  /**
   * 计算HMAC-SHA1签名
   */
  sign(stringToSign, secret) {
    const hmac = crypto.createHmac('sha1', secret);
    hmac.update(stringToSign);
    return hmac.digest('base64');
  }

  /**
   * 生成UUID格式的随机数
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * 获取当前UTC时间戳
   */
  getCurrentTimestamp() {
    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  }

  /**
   * 创建Token
   */
  async createToken() {
    try {
      console.log('🔑 开始获取阿里云Token...');
      
      // 1. 构造请求参数
      const parameters = {
        'AccessKeyId': this.accessKeyId,
        'Action': 'CreateToken',
        'Format': 'JSON',
        'RegionId': this.regionId,
        'SignatureMethod': 'HMAC-SHA1',
        'SignatureNonce': this.generateUUID(),
        'SignatureVersion': '1.0',
        'Timestamp': this.getCurrentTimestamp(),
        'Version': '2019-02-28'
      };

      console.log('📋 请求参数:', parameters);

      // 2. 构造规范化的请求字符串
      const queryString = this.canonicalizedQuery(parameters);
      console.log('📝 规范化请求字符串:', queryString);

      // 3. 构造待签名字符串
      const stringToSign = this.createStringToSign('GET', '/', queryString);
      console.log('🔐 待签名字符串:', stringToSign);

      // 4. 计算签名
      const signature = this.sign(stringToSign, this.accessKeySecret + '&');
      console.log('✍️ 签名结果:', signature);

      // 5. 构造完整请求URL
      const fullUrl = `https://${this.baseUrl}/?Signature=${this.encodeText(signature)}&${queryString}`;
      console.log('🌐 完整请求URL:', fullUrl);

      // 6. 发送HTTP GET请求
      const response = await this.makeRequest(fullUrl);
      
      if (response && response.Token) {
        const token = response.Token.Id;
        const expireTime = response.Token.ExpireTime;
        const expireDate = new Date(expireTime * 1000).toLocaleString('zh-CN');
        
        console.log('✅ Token获取成功');
        console.log(`🔑 Token: ${token}`);
        console.log(`⏰ 过期时间戳: ${expireTime}`);
        console.log(`📅 过期时间: ${expireDate}`);
        
        return {
          token: token,
          expireTime: expireTime,
          expireDate: expireDate
        };
      } else {
        throw new Error('Token响应格式错误: ' + JSON.stringify(response));
      }

    } catch (error) {
      console.error('❌ Token获取失败:', error.message);
      throw error;
    }
  }

  /**
   * 发送HTTP请求
   */
  makeRequest(url) {
    return new Promise((resolve, reject) => {
      const options = {
        method: 'GET',
        headers: {
          'User-Agent': 'Node.js-Token-Client/1.0',
          'Accept': 'application/json'
        }
      };

      const req = https.request(url, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const result = JSON.parse(data);
              resolve(result);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          } catch (error) {
            reject(new Error(`响应解析失败: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`请求失败: ${error.message}`));
      });

      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('请求超时'));
      });

      req.end();
    });
  }
}

/**
 * 创建Token客户端实例
 */
function createTokenClient(accessKeyId, accessKeySecret, regionId = 'cn-shanghai') {
  return new AliyunTokenClient(accessKeyId, accessKeySecret, regionId);
}

/**
 * 快速获取Token的便捷方法
 */
async function getToken(accessKeyId, accessKeySecret, regionId = 'cn-shanghai') {
  const client = createTokenClient(accessKeyId, accessKeySecret, regionId);
  return await client.createToken();
}

module.exports = {
  AliyunTokenClient,
  createTokenClient,
  getToken
};
