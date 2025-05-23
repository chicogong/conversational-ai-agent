/**
 * 腾讯云TRTC API请求工具
 * 基于TC3-HMAC-SHA256签名算法
 */
const crypto = require('crypto');
const https = require('https');


/**
 * 发送API请求到腾讯云TRTC服务
 * @param {string} payload JSON格式的请求参数
 * @param {string} action API动作名称
 * @param {Object} config 配置信息，包含secretId、secretKey和host
 * @param {string} region 地区，默认为ap-guangzhou
 * @returns {Promise<Object>} API响应结果
 */
function sendReq(payload, action, config, region = "ap-guangzhou") {
    return new Promise((resolve, reject) => {
        if (!config || !config.secretId || !config.secretKey || !config.host) {
            return reject(new Error('配置信息不完整，需要提供secretId、secretKey和host'));
        }


        /**
         * HMAC-SHA256签名
         * @param {Buffer} key 密钥
         * @param {string} msg 消息
         * @returns {Buffer} 签名结果
         */
        function sign(key, msg) {
            return crypto.createHmac('sha256', key).update(msg).digest();
        }


        const { secretId, secretKey, host } = config;
        const service = "trtc";
        const version = "2019-07-22";


        console.log(`请求TRTC API: ${action}, region: ${region}, host: ${host}`);


        // 准备请求参数
        const algorithm = "TC3-HMAC-SHA256";
        const timestamp = Math.floor(Date.now() / 1000);
        const date = new Date(timestamp * 1000).toISOString().split('T')[0];


        // 构造规范请求串
        const httpRequestMethod = "POST";
        const canonicalUri = "/";
        const canonicalQuerystring = "";
        const contentType = "application/json; charset=utf-8";
        const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`;
        const signedHeaders = "content-type;host;x-tc-action";
        const hashedRequestPayload = crypto.createHash('sha256').update(payload).digest('hex');


        const canonicalRequest = [
            httpRequestMethod,
            canonicalUri,
            canonicalQuerystring,
            canonicalHeaders,
            signedHeaders,
            hashedRequestPayload
        ].join('\n');


        // 构造待签名字符串
        const credentialScope = `${date}/${service}/tc3_request`;
        const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
        const stringToSign = [
            algorithm,
            timestamp,
            credentialScope,
            hashedCanonicalRequest
        ].join('\n');


        // 计算签名
        const secretDate = sign(Buffer.from(`TC3${secretKey}`), date);
        const secretService = sign(secretDate, service);
        const secretSigning = sign(secretService, "tc3_request");
        const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex');


        // 构造授权信息
        const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;


        // 构造请求头
        const headers = {
            "Authorization": authorization,
            "Content-Type": contentType,
            "Host": host,
            "X-TC-Action": action,
            "X-TC-Timestamp": timestamp.toString(),
            "X-TC-Version": version,
            "X-TC-Region": region
        };


        // 发送请求
        const options = {
            hostname: host,
            port: 443,
            path: '/',
            method: 'POST',
            headers: headers,
            timeout: 10000 // 10秒超时
        };


        // 记录请求详情（不包含敏感信息）
        console.log(`API 请求详情:
            - 动作: ${action}
            - 主机: ${host}
            - 区域: ${region}
            - 时间戳: ${timestamp}
            - 版本: ${version}
        `);


        const req = https.request(options, (res) => {
            let data = '';
            
            // 记录响应状态码
            console.log(`API 响应状态码: ${res.statusCode}`);
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    // 尝试解析响应
                    const response = JSON.parse(data);
                    
                    // 检查是否有错误
                    if (response.Response && response.Response.Error) {
                        console.error(`API 错误: ${response.Response.Error.Code} - ${response.Response.Error.Message}`);
                    } else {
                        console.log(`API 请求成功: ${action}`);
                    }
                    
                    resolve(response);
                } catch (error) {
                    console.error(`解析响应失败: ${error.message}`);
                    console.error(`原始响应: ${data}`);
                    reject(new Error(`解析响应失败: ${error.message}`));
                }
            });
        });


        // 设置请求超时
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('请求超时'));
        });


        req.on('error', (error) => {
            console.error(`API 请求错误: ${error.message}`);
            reject(error);
        });


        req.write(payload);
        req.end();
    });
}


module.exports = {
    sendReq
};
