import { ChatService } from "../services/chatService.js";

const chatService = new ChatService();

export const getMe = async (req, res) => {
  return res.json({
    user: req.user,
    session: {
      id: req.session?.id,
      expiresAt: req.session?.expiresAt,
    },
  });
};

export const initConversation = async (req, res, next) => {
  try {
    const { conversationId, mode } = req.body || {};

    const conversation = await chatService.getOrCreateConversation(
      req.user.id,
      conversationId || null,
      mode || "chat"
    );

    const messages = await chatService.getMessages(conversation.id);

    return res.json({ conversation, messages });
  } catch (error) {
    return next(error);
  }
};

export const addMessage = async (req, res, next) => {
  try {
    const { conversationId, role, content } = req.body || {};

    if (!conversationId || !role) {
      return res.status(400).json({ error: "conversationId and role are required" });
    }

    const message = await chatService.addMessage(conversationId, role, content);
    return res.json({ message });
  } catch (error) {
    return next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.query || {};

    if (!conversationId) {
      return res.status(400).json({ error: "conversationId is required" });
    }

    const messages = await chatService.getMessages(conversationId);
    return res.json({ messages });
  } catch (error) {
    return next(error);
  }
};

export const updateTitle = async (req, res, next) => {
  try {
    const { id } = req.params || {};
    const { title } = req.body || {};

    if (!id || !title) {
      return res.status(400).json({ error: "title is required" });
    }

    const conversation = await chatService.updateTitle(id, title);
    return res.json({ conversation });
  } catch (error) {
    return next(error);
  }
};
