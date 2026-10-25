import { chatWithAi, generateExecutiveSummary } from '../services/ai.service.js';

export const handleAiChat = async (req, res, next) => {
  try {
    const { message, chatHistory } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, message: 'Message text is required.' });
    }

    const response = await chatWithAi({
      message: message.trim(),
      chatHistory: Array.isArray(chatHistory) ? chatHistory : [],
      user: req.user,
    });

    res.json({ success: true, ...response });
  } catch (err) {
    next(err);
  }
};

export const getExecutiveSummary = async (req, res, next) => {
  try {
    const summary = await generateExecutiveSummary(req.user);
    res.json({ success: true, summary });
  } catch (err) {
    next(err);
  }
};
