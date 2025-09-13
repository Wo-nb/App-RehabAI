// WebSocketManager.js
import AccessToken from "./AliyunTokenManager";

class WebSocketManager {
  constructor() {
    this.ws = null;
    this.jsonMessageHandler = null;
    this.connStateHandler = null;
  }

  async connect(jsonMessageHandler, connStateHandler) {
    if (this.ws) {
      console.log('not exist ws');
      this.close();
    }

    try {
      const appkey = 'gL0aXXsAifcMbt9r';
      const token = await getAliyunToken();
      const socketUrl = `wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1?token=${token}`;

      this.ws = new WebSocket(socketUrl);
      this.jsonMessageHandler = jsonMessageHandler;
      this.connStateHandler = connStateHandler;

      this.ws.onopen = () => {
        console.log('WebSocket connection opened');

        var startTranscriptionMessage = {
          header: {
            appkey: appkey,
            namespace: 'SpeechTranscriber',
            name: 'StartTranscription',
            task_id: this.generateUUID(),
            message_id: this.generateUUID(),
          },
          payload: {
            format: 'pcm',
            sample_rate: 16000,
            enable_intermediate_result: true,
            enable_punctuation_prediction: true,
            enable_inverse_text_normalization: true,
          },
        };

        this.ws.send(JSON.stringify(startTranscriptionMessage));

        if (this.connStateHandler) {
          this.connStateHandler(0); // 0 means connected
        }
      };

      this.ws.onmessage = event => {
        console.log(event.data);
        if (this.jsonMessageHandler && event && event.data) {
          this.jsonMessageHandler({
            type: 'message',
            data: event.data,
          });
        }
      };

      this.ws.onclose = event => {
        console.log('WebSocket connection closed');
        console.log('Close code:', event.code);
        console.log('Close reason:', event.reason);
        console.log('Was clean:', event.wasClean);
        if (this.connStateHandler) {
          this.connStateHandler(1); // 1 means closed
        }
        this.ws = null;
      };

      this.ws.onerror = error => {
        console.error('WebSocket error:', error);
        if (this.connStateHandler) {
          this.connStateHandler(2); // 2 means error
        }
        this.close();
      };

      return 1; // Success
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.close();
      return 0; // Error
    }
  }

  wsSend(data) {
    // if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
    //   console.error('WebSocket is not connected');
    //   return;
    // }
    if(!this.ws){console.log("ws closed")}
    try {
      this.ws.send(data);
    } catch (error) {
      this.close();
      console.error('Error sending data:', error);
    }
  }

  close() {
    if (this.ws) {
      console.log('Closing the ws connect');
      this.ws.close();
      this.ws = null;
    }
  }

  generateUUID() {
    // 生成32位hex字符的唯一ID
    return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/[x]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      return r.toString(16);
    });
  }
}

// 在需要获取token的地方
const getAliyunToken = async () => {
  const accessKeyId = 'LTAI5tK2tg6eYxbBPRU3F45e';      // 替换为你的AccessKey ID
  const accessKeySecret = 'lNMyv1GQNsZOZCid7ZBTcgujq4leST';  // 替换为你的AccessKey Secret
  
  try {
    const [token, expireTime] = await AccessToken.createToken(accessKeyId, accessKeySecret);
    console.log('token: ' + token + ', expire time(s): ' + expireTime);
    
    
    if (expireTime) {
      const expireDate = new Date(expireTime * 1000);
      console.log('token有效期的北京时间：' + expireDate.toLocaleString('zh-CN'));
    }
    
    return token;
  } catch (error) {
    console.error('获取token失败:', error);
  }
};

export default new WebSocketManager();
