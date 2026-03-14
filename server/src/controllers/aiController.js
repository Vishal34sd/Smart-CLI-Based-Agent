import { ChatService } from "../services/chatService.js";
import { getAIService } from "../services/aiService.js";
import { enableTools, getEnabledTools, resetTools } from "../config/toolConfig.js";
import { generateApplicationPlan } from "../config/agentConfig.js";

const chatService = new ChatService();

export const respond = async (req, res, next) => {
  try {
    const { conversationId, mode, toolIds } = req.body || {};

    if (!conversationId) {
      return res.status(400).json({ error: "conversationId is required" });
    }

    const messages = await chatService.getMessages(conversationId);
    const aiMessages = chatService.formatMessageForAI(messages);

    let tools;
    if (mode === "tool") {
      resetTools();
      if (Array.isArray(toolIds)) {
        enableTools(toolIds);
      }
      tools = getEnabledTools();
    }

    const aiService = getAIService();
    const result = await aiService.sendMessage(aiMessages, null, tools);

    await chatService.addMessage(conversationId, "assistant", result.content);

    return res.json({
      content: result.content,
      toolCalls: result.toolCalls || [],
      toolResults: result.toolResults || [],
    });
  } catch (error) {
    return next(error);
  }
};

export const generateAgentPlan = async (req, res, next) => {
  try {
    const { description } = req.body || {};

    if (!description || typeof description !== "string") {
      return res.status(400).json({ error: "description is required" });
    }

    const aiService = getAIService();
    const application = await generateApplicationPlan(description, aiService);

    return res.json({ application });
  } catch (error) {
    return next(error);
  }
};
