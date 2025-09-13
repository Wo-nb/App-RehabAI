// AliyunTokenManager.js
import CryptoJS from 'crypto-js';

class AccessToken {
  static _encodeText(text) {
    // encodeURIComponent基本编码，然后替换特定字符
    let encodedText = encodeURIComponent(text);
    return encodedText
      .replace(/%20/g, ' ')
      .replace(/%2A/g, '*')
      .replace(/%7E/g, '~');
  }

  static _encodeDict(dic) {
    // 对字典按键排序并编码
    const keys = Object.keys(dic).sort();
    const sortedPairs = keys.map(key => [key, dic[key]]);
    
    // 构造查询字符串
    const encodedPairs = sortedPairs.map(([key, value]) => {
      return `${this._encodeText(key)}=${this._encodeText(String(value))}`;
    });
    
    let queryString = encodedPairs.join('&');
    return queryString
      .replace(/%20/g, ' ')
      .replace(/%2A/g, '*')
      .replace(/%7E/g, '~');
  }

  static async createToken(accessKeyId, accessKeySecret) {
    const parameters = {
      'AccessKeyId': accessKeyId,
      'Action': 'CreateToken',
      'Format': 'JSON',
      'RegionId': 'cn-shanghai',
      'SignatureMethod': 'HMAC-SHA1',
      'SignatureNonce': this.uuidv4(), // 生成UUID
      'SignatureVersion': '1.0',
      'Timestamp': new Date().toISOString().slice(0, 19) + 'Z',
      'Version': '2019-02-28'
    };

    // 构造规范化的请求字符串
    const queryString = this._encodeDict(parameters);
    console.log('规范化的请求字符串: ' + queryString);

    // 构造待签名字符串
    const stringToSign = 'GET&' + this._encodeText('/') + '&' + this._encodeText(queryString);
    console.log('待签名的字符串: ' + stringToSign);

    // 计算签名
    const key = accessKeySecret + '&';
    const signature = CryptoJS.HmacSHA1(stringToSign, key).toString(CryptoJS.enc.Base64);
    console.log('签名: ' + signature);

    // 进行URL编码
    const encodedSignature = this._encodeText(signature);
    console.log('URL编码后的签名: ' + encodedSignature);

    // 调用服务
    const fullUrl = `http://nls-meta.cn-shanghai.aliyuncs.com/?Signature=${encodedSignature}&${queryString}`;
    console.log('url: ' + fullUrl);

    try {
      // 提交HTTP GET请求（使用fetch替代axios）
      const response = await fetch(fullUrl);
      
      if (response.ok) {
        const rootObj = await response.json();
        const key = 'Token';
        if (key in rootObj) {
          const token = rootObj[key]['Id'];
          const expireTime = rootObj[key]['ExpireTime'];
          return [token, expireTime];
        }
      }
      
      const text = await response.text();
      console.log(text);
      return [null, null];
    } catch (error) {
      console.error('请求出错:', error);
      return [null, null];
    }
  }

  // 生成UUID的辅助函数
  static uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

export default AccessToken;