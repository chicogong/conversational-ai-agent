const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cors = require('cors');
const tencentcloud = require("tencentcloud-sdk-nodejs-trtc");
const TLSSigAPIv2 = require('tls-sig-api-v2');
const agentConfig = require('./src/agent_cards');
const { sendReq } = require('./capi');

const TrtcClient = tencentcloud.trtc.v20190722.Client;

// Check for available agent configurations
const availableAgents = Object.keys(agentConfig);
if (availableAgents.length === 0) {
  console.error("No agent configurations found in agent_cards. Server might not function correctly.");
  process.exit(1);
}

const app = express();
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1m', etag: true }));
app.use('/src', express.static(path.join(__dirname, 'src'), { maxAge: '1m', etag: true }));

/**
 * Create a new TRTC client instance for a specific agent
 * @param {string} agentId - Agent ID used to get configuration
 * @returns {Object} New TRTC client instance
 */
function createClientForAgent(agentId) {
  if (!agentConfig[agentId] || !agentConfig[agentId].CONFIG || !agentConfig[agentId].CONFIG.apiConfig) {
    throw new Error(`Invalid configuration for agent: ${agentId}`);
  }
  
  const { apiConfig } = agentConfig[agentId].CONFIG;
  console.log(`Creating new TRTC client with config from agent: ${agentId}`);
  
  return new TrtcClient({
    credential: {
      secretId: apiConfig.secretId,
      secretKey: apiConfig.secretKey,
    },
    region: apiConfig.region,
    profile: {
      httpProfile: {
        endpoint: apiConfig.endpoint,
      },
    },
  });
}

/**
 * Format agent information for client response
 * @param {string} agentName - Agent identifier
 * @param {Object} agentCardConfig - Agent card configuration
 * @returns {Object} Formatted agent information
 */
function formatAgentInfo(agentName, agentCardConfig) {
  const agentCard = agentCardConfig || {};
  return {
    id: agentName,
    name: agentCard.name || `Agent (${agentName})`,
    avatar: agentCard.avatar || '/src/agent_cards/assets/default.png',
    description: agentCard.description || 'No description available.',
    capabilities: Array.isArray(agentCard.capabilities) ? agentCard.capabilities : [],
    voiceType: agentCard.voiceType || 'Default Voice',
    personality: agentCard.personality || 'Helpful and friendly'
  };
}

/**
 * Start an AI conversation
 * POST /conversations
 */
app.post('/conversations', (req, res) => {
  try {
    const { userInfo } = req.body || {};
    
    if (!userInfo || !userInfo.sdkAppId || !userInfo.roomId || !userInfo.robotId || 
        !userInfo.robotSig || !userInfo.userId || !userInfo.agent) {
      return res.status(400).json({ 
        error: 'Missing required fields in userInfo',
        required: ['sdkAppId', 'roomId', 'robotId', 'robotSig', 'userId', 'agent']
      });
    }
    
    const selectedConfig = agentConfig[userInfo.agent]?.CONFIG;
    if (!selectedConfig) {
      return res.status(400).json({ 
        error: `Agent configuration not found for: ${userInfo.agent}`,
        availableAgents: Object.keys(agentConfig)
      });
    }
    
    const client = createClientForAgent(userInfo.agent);

    const params = {
      "SdkAppId": userInfo.sdkAppId,
      "RoomId": userInfo.roomId.toString(),
      "AgentConfig": {
        "UserId": userInfo.robotId,
        "UserSig": userInfo.robotSig,
        "TargetUserId": userInfo.userId,
        ...selectedConfig.AgentConfig
      },
      "STTConfig": selectedConfig.STTConfig,
      "LLMConfig": JSON.stringify(selectedConfig.LLMConfig),
      "TTSConfig": JSON.stringify(selectedConfig.TTSConfig),
      "ExperimentalParams": JSON.stringify(selectedConfig.ExperimentalParams)
    };

    client.StartAIConversation(params)
      .then(data => res.json(data))
      .catch(err => {
        console.error('Failed to start AI conversation', err);
        return res.status(500).json({ error: err.message });
      });
  } catch (error) {
    console.error('Error in startConversation', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Stop an AI conversation
 * DELETE /conversations
 */
app.delete('/conversations', (req, res) => {
  try {
    const { TaskId, agent } = req.body;
    
    if (!TaskId) {
      return res.status(400).json({ error: 'Missing required TaskId field' });
    }
    
    if (agent && agentConfig[agent]) {
      const client = createClientForAgent(agent);
      return client.StopAIConversation({ TaskId })
        .then(data => res.json(data))
        .catch(err => {
          console.error('Failed to stop AI conversation', err);
          return res.status(500).json({ error: err.message });
        });
    }
    
    const firstAgentId = availableAgents[0];
    if (!firstAgentId) {
      throw new Error("No agent configuration available for initializing client");
    }
    
    const client = createClientForAgent(firstAgentId);
    client.StopAIConversation({ TaskId })
      .then(data => res.json(data))
      .catch(err => {
        console.error('Failed to stop AI conversation', err);
        return res.status(500).json({ error: err.message });
      });
  } catch (error) {
    console.error('Error in stopConversation', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Generate user credentials
 * POST /credentials
 */
app.post('/credentials', (req, res) => {
  try {
    const { agentId } = req.body;
    
    if (!agentId) {
      return res.status(400).json({ 
        error: 'Missing agentId in request body',
        availableAgents: Object.keys(agentConfig)
      });
    }
    
    if (!agentConfig[agentId]) {
      throw new Error(`Agent configuration not found for: ${agentId}`);
    }
    
    const config = agentConfig[agentId].CONFIG;
    if (!config.apiConfig) {
      throw new Error(`Invalid API configuration for agent: ${agentId}`);
    }
    
    const { sdkAppId, secretKey, expireTime } = config.trtcConfig;
    const randomNum = Math.floor(100000 + Math.random() * 900000).toString();
    const userId = `user_${randomNum}`;
    const robotId = `ai_${randomNum}`;
    const roomId = parseInt(randomNum);
    
    const api = new TLSSigAPIv2.Api(sdkAppId, secretKey);
    const userSig = api.genSig(userId, expireTime);
    const robotSig = api.genSig(robotId, expireTime);
    
    const credentials = { sdkAppId, userSig, robotSig, userId, robotId, roomId };
    
    res.json(credentials);
  } catch (error) {
    console.error('Failed to generate user information', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Get all agents information
 * GET /agents
 */
app.get('/agents', (req, res) => {
  try {
    const agentNames = Object.keys(agentConfig);
    const agentsInfo = {};
    
    agentNames.forEach(agentName => {
      const agentConfig_ = agentConfig[agentName];
      const agentCard = agentConfig_.CONFIG.AgentCard || {};
      agentsInfo[agentName] = formatAgentInfo(agentName, agentCard);
    });
    
    res.json({ agents: agentsInfo });
  } catch (error) {
    console.error('Error getting all agents info', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Get specific agent information
 * GET /agents/:agentId
 */
app.get('/agents/:agentId', (req, res) => {
  try {
    const agentName = req.params.agentId;
    
    if (!agentConfig[agentName]) {
      return res.status(404).json({ 
        error: `Agent '${agentName}' not found`,
        availableAgents: Object.keys(agentConfig)
      });
    }
    
    const agentCard = agentConfig[agentName].CONFIG.AgentCard;
    if (!agentCard) {
      throw new Error(`Agent card configuration missing for ${agentName}`);
    }
    
    res.json(formatAgentInfo(agentName, agentCard));
  } catch (error) {
    console.error('Error getting agent information', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Handle TRTC-AI server callback
 * POST /callbacks
 * This is the TRTC-AI server callback documentation: https://cloud.tencent.com/document/product/647/115506
 * You can implement custom logic based on different callback event types
 */
app.post('/callbacks', (req, res) => {
  try {
    const sdkAppId = req.headers.sdkappid;
    console.log('Received server callback:', { 
      time: new Date().toLocaleString(), 
      sdkAppId, 
      body: req.body 
    });
    res.json({ code: 0 });
  } catch (error) {
    console.error('Error in server callback', error);
    res.json({ code: -1, error: error.message });
  }
});

/**
 * Update AI transcription target users
 * POST /transcription
 */
app.post('/transcription', async (req, res) => {
  try {
    const { TaskId, TargetUserIdList, agent } = req.body || {};
    if (!TaskId || !Array.isArray(TargetUserIdList) || TargetUserIdList.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['TaskId', 'TargetUserIdList']
      });
    }
    
    // 获取配置信息
    let config;
    let agentId = agent;
    
    if (agentId && agentConfig[agentId]) {
      config = agentConfig[agentId].CONFIG.apiConfig;
      console.log(`Using API config from agent: ${agentId}`);
    } else {
      agentId = availableAgents[0];
      if (!agentId) {
        throw new Error('No agent configuration available for initializing client');
      }
      config = agentConfig[agentId].CONFIG.apiConfig;
      console.log(`Agent not specified or invalid. Using default agent: ${agentId}`);
    }
    
    if (!config || !config.secretId || !config.secretKey || !config.endpoint) {
      throw new Error(`Invalid API configuration for agent: ${agentId}`);
    }
    
    // 准备请求参数
    const params = {
      TaskId,
      TargetUserIdList
    };
    
    // 将参数转换为 JSON 字符串
    const payload = JSON.stringify(params);
    
    // 发送请求
    const apiConfig = {
      secretId: config.secretId,
      secretKey: config.secretKey,
      host: config.endpoint
    };
    
    console.log(`Sending ModifyAITranscription request for TaskId: ${TaskId}, Users: ${TargetUserIdList.join(',')}`);
    const data = await sendReq(payload, 'UpdateAITranscription', apiConfig, config.region || 'ap-guangzhou');
    
    // 检查响应中是否有错误
    if (data.Response && data.Response.Error) {
      console.error('API returned error:', data.Response.Error);
      return res.status(400).json({ 
        error: data.Response.Error.Message,
        code: data.Response.Error.Code
      });
    }
    
    console.log('Successfully updated transcription targets');
    res.json(data.Response || data);
  } catch (error) {
    console.error('Failed to update AI transcription:', error);
    return res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
app.listen(PORT, HOST, () => console.log(`App running at http://${HOST}:${PORT}/`));