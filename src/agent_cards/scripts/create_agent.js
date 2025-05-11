const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create a readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt user for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Function to generate agent template
function generateAgentTemplate(config) {
  return `module.exports = {
    CONFIG: {
        // Tencent Cloud API client configuration
        apiConfig: {
            secretId: process.env.TENCENT_SECRET_ID,
            secretKey: process.env.TENCENT_SECRET_KEY,
            region: process.env.TENCENT_REGION || "${config.region}",
            endpoint: process.env.TENCENT_ENDPOINT || "trtc.tencentcloudapi.com"
        },
    
        // TRTC configuration
        trtcConfig: {
            sdkAppId: parseInt(process.env.TRTC_SDK_APP_ID),
            secretKey: process.env.TRTC_SECRET_KEY,
            expireTime: 10 * 60 * 60  // User signature 10 hours expiration time (seconds)
        },
    
        // Agent card information
        AgentCard: {
            name: "${config.agentName}",
            avatar: "/src/agent_cards/assets/${config.agentId}.png",
            description: "${config.description}",
            capabilities: ${JSON.stringify(config.capabilities)},
            voiceType: "${config.voiceType}",
            personality: "${config.personality}"
        },
    
        // Agent configuration
        AgentConfig: {
            WelcomeMessage: "${config.welcomeMessage}",
            InterruptMode: ${config.interruptMode},
            TurnDetectionMode: 3,
            InterruptSpeechDuration: 200,
            WelcomeMessagePriority: 1
        },
    
        // Speech recognition configuration
        STTConfig: {
            Language: "${config.language}",
            VadSilenceTime: 600,
            HotWordList: "${config.hotWords}"
        },
    
        // LLM configuration
        LLMConfig: {
            LLMType: "${config.llmType}",
            Model: process.env.LLM_MODEL,
            APIUrl: process.env.LLM_API_URL,
            APIKey: process.env.LLM_API_KEY,
            History: ${config.historyLength},
            Timeout: ${config.timeout},
            Streaming: ${config.streaming},
            SystemPrompt: "${config.systemPrompt}",
        },
    
        // Text-to-speech configuration
        TTSConfig: {
            TTSType: "${config.ttsType}",
            GroupId: process.env.MINIMAX_TTS_GROUP_ID,
            APIKey: process.env.MINIMAX_TTS_API_KEY,
            VoiceType: process.env.MINIMAX_TTS_VOICE_TYPE,
            APIUrl: "${config.ttsApiUrl}",
            Model: "${config.ttsModel}",
            Speed: ${config.ttsSpeed}
        }
    }
};`;
}

// Function to update index.js to include the new agent
function updateIndexFile(agentId) {
  const indexPath = path.join(__dirname, '..', 'index.js');
  
  try {
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    // Extract the current module.exports object
    const moduleExportsMatch = indexContent.match(/module\.exports\s*=\s*\{([^}]*)\}/s);
    
    if (moduleExportsMatch) {
      const existingExports = moduleExportsMatch[1].trim();
      // Check if the agent is already in the exports
      if (!existingExports.includes(agentId)) {
        // Add the new agent to the exports
        const newExports = existingExports ? 
          existingExports + `,\n    ${agentId}: require('./${agentId}')` :
          `\n    ${agentId}: require('./${agentId}')`;
        
        // Replace the old exports with the new ones
        const newIndexContent = indexContent.replace(
          /module\.exports\s*=\s*\{([^}]*)\}/s,
          `module.exports = {${newExports}\n}`
        );
        
        fs.writeFileSync(indexPath, newIndexContent);
        console.log(`已更新 index.js 文件，添加新助手: ${agentId}`);
      } else {
        console.log(`助手 ${agentId} 已存在于 index.js 文件中`);
      }
    } else {
      console.error('无法在 index.js 文件中找到 module.exports');
    }
  } catch (error) {
    console.error('更新 index.js 文件时出错:', error.message);
  }
}

// Main function to run the setup
async function runSetup() {
  console.log('=== TRTC AI Agent 创建工具 ===');
  console.log('这个工具将帮助您创建一个新的AI助手配置。');
  console.log('在每一步中，按回车键使用默认值。\n');
  console.log('注意: 环境变量需要在 .env 文件中单独配置，请参考 env.example\n');

  try {
    // Basic agent information
    const agentId = await prompt('请输入您的助手唯一ID (例如: "customer_service"): ');
    if (!agentId) {
      console.error('助手ID是必填项!');
      rl.close();
      return;
    }

    const agentName = await prompt('请输入您的助手名称 (例如: "客服助手"): ');
    if (!agentName) {
      console.error('助手名称是必填项!');
      rl.close();
      return;
    }

    // Collect agent configuration
    const config = {
      agentId,
      agentName,
      description: await prompt('请输入助手描述: ') || '基于TRTC技术的AI助手',
      capabilities: (await prompt('请输入助手能力 (逗号分隔, 例如: "语音交互,问答服务"): ') || '实时对话,语音交互,问答服务').split(',').map(cap => cap.trim()),
      voiceType: await prompt('请输入语音类型描述: ') || '专业女声',
      personality: await prompt('请输入助手性格特点: ') || '友好、乐于助人、见多识广',
      
      // Agent behavior
      welcomeMessage: await prompt('请输入欢迎语: ') || `您好，我是${agentName}。有什么可以帮您的吗？`,
      interruptMode: parseInt(await prompt('请输入打断模式 (1-3, 默认值 2): ') || '2'),
      
      // Speech recognition
      language: await prompt('请输入语音识别语言模型 (默认: "8k_zh_large"): ') || '8k_zh_large',
      hotWords: await prompt('请输入热词列表及权重 (例如: "AI|6,助手|8"): ') || '',
      
      // LLM configuration
      llmType: await prompt('请输入LLM类型 (例如: "openai"): ') || 'openai',
      historyLength: parseInt(await prompt('请输入历史上下文长度 (默认: 5): ') || '5'),
      timeout: parseInt(await prompt('请输入LLM超时时间（秒） (默认: 3): ') || '3'),
      streaming: (await prompt('是否启用流式响应? (是/否, 默认: 是): ') || '是').toLowerCase() === '是',
      systemPrompt: await prompt('请输入系统提示词: ') || '你是一个乐于助人的助手，能够回答问题并进行自然对话。',
      
      // TTS configuration
      ttsType: await prompt('请输入TTS提供商 (例如: "minimax"): ') || 'minimax',
      ttsApiUrl: await prompt('请输入TTS API URL (默认: "https://api.minimax.chat/v1/t2a_v2"): ') || 'https://api.minimax.chat/v1/t2a_v2',
      ttsModel: await prompt('请输入TTS模型名称 (默认: "speech-01-turbo"): ') || 'speech-01-turbo',
      ttsSpeed: parseFloat(await prompt('请输入TTS语速 (默认: 1.2): ') || '1.2'),
      
      // Tencent Cloud configuration
      region: await prompt('请输入腾讯云区域 (默认: "ap-beijing"): ') || 'ap-beijing',
    };

    // Create directory structure if not exists
    const agentCardDir = path.join(__dirname, '..');
    const assetsDir = path.join(agentCardDir, 'assets');
    
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    // Generate agent file
    const agentFilePath = path.join(agentCardDir, `${agentId}.js`);
    fs.writeFileSync(agentFilePath, generateAgentTemplate(config));
    console.log(`助手配置文件已创建: ${agentFilePath}`);

    // Remind about .env
    console.log('\n⚠️ 请确保您已创建并正确配置了 .env 文件 ⚠️');
    console.log('可以复制项目根目录下的 env.example 文件为 .env，并填入您的实际配置值。');

    // Create placeholder avatar if it doesn't exist
    const avatarPath = path.join(assetsDir, `${agentId}.png`);
    if (!fs.existsSync(avatarPath)) {
      console.log(`注意: 您需要添加头像图片: ${avatarPath}`);
    }

    // Update index.js to include the new agent
    updateIndexFile(agentId);

    console.log('\n=== 创建完成 ===');
    console.log(`您的助手 "${agentName}" 已成功配置，ID为 "${agentId}"。`);
    console.log('要启动服务器，请运行: npm start');
    
  } catch (error) {
    console.error('设置过程中出错:', error);
  } finally {
    rl.close();
  }
}

// Run the setup
runSetup(); 