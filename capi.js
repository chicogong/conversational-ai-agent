/**
 * Tencent Cloud TRTC API Request Tool
 * Based on TC3-HMAC-SHA256 Signature Algorithm
 */
const crypto = require('crypto');
const https = require('https');

/**
 * Send API request to Tencent Cloud TRTC service
 * @param {string} payload JSON formatted request parameters
 * @param {string} action API action name
 * @param {Object} config Configuration information, including secretId, secretKey and host
 * @param {string} region Region, default is ap-guangzhou
 * @returns {Promise<Object>} API response result
 */
function sendReq(payload, action, config, region = 'ap-guangzhou') {
  return new Promise((resolve, reject) => {
    if (!config || !config.secretId || !config.secretKey || !config.host) {
      return reject(
        new Error('Incomplete configuration, secretId, secretKey and host are required')
      );
    }

    /**
     * HMAC-SHA256 signature
     * @param {Buffer} key Secret key
     * @param {string} msg Message
     * @returns {Buffer} Signature result
     */
    function sign(key, msg) {
      return crypto.createHmac('sha256', key).update(msg).digest();
    }

    const { secretId, secretKey, host } = config;
    const service = 'trtc';
    const version = '2019-07-22';

    console.log(`Requesting TRTC CAPI: ${action}, region: ${region}, host: ${host}`);

    // Prepare request parameters
    const algorithm = 'TC3-HMAC-SHA256';
    const timestamp = Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000).toISOString().split('T')[0];

    // Construct canonical request string
    const httpRequestMethod = 'POST';
    const canonicalUri = '/';
    const canonicalQuerystring = '';
    const contentType = 'application/json; charset=utf-8';
    const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`;
    const signedHeaders = 'content-type;host;x-tc-action';
    const hashedRequestPayload = crypto.createHash('sha256').update(payload).digest('hex');

    const canonicalRequest = [
      httpRequestMethod,
      canonicalUri,
      canonicalQuerystring,
      canonicalHeaders,
      signedHeaders,
      hashedRequestPayload,
    ].join('\n');

    // Construct string to sign
    const credentialScope = `${date}/${service}/tc3_request`;
    const hashedCanonicalRequest = crypto
      .createHash('sha256')
      .update(canonicalRequest)
      .digest('hex');
    const stringToSign = [algorithm, timestamp, credentialScope, hashedCanonicalRequest].join('\n');

    // Calculate signature
    const secretDate = sign(Buffer.from(`TC3${secretKey}`), date);
    const secretService = sign(secretDate, service);
    const secretSigning = sign(secretService, 'tc3_request');
    const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex');

    // Construct authorization information
    const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // Construct request headers
    const headers = {
      Authorization: authorization,
      'Content-Type': contentType,
      Host: host,
      'X-TC-Action': action,
      'X-TC-Timestamp': timestamp.toString(),
      'X-TC-Version': version,
      'X-TC-Region': region,
    };

    // Send request
    const options = {
      hostname: host,
      port: 443,
      path: '/',
      method: 'POST',
      headers: headers,
      timeout: 10000, // 10 seconds timeout
    };

    // Record request details (without sensitive information)
    console.log(`CAPI Request Details:
            - Action: ${action}
            - Host: ${host}
            - Region: ${region}
            - Timestamp: ${timestamp}
            - Version: ${version}
        `);

    const req = https.request(options, (res) => {
      let data = '';

      // Record response status code
      console.log(`CAPI Response Status Code: ${res.statusCode}`);

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          // Try to parse response
          const response = JSON.parse(data);

          // Check if there's an error
          if (response.Response && response.Response.Error) {
            console.error(
              `CAPI Error: ${response.Response.Error.Code} - ${response.Response.Error.Message}`
            );
          } else {
            console.log(`CAPI Request Successful: ${action}`);
          }

          resolve(response);
        } catch (error) {
          console.error(`Failed to parse response: ${error.message}, raw response: ${data}`);
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    // Set request timeout
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.on('error', (error) => {
      console.error(`CAPI Request Error: ${error.message}`);
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

module.exports = {
  sendReq,
};
