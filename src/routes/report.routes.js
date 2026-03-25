const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.get('/user/:userId/nutrition', authenticate, reportController.getUserNutritionReport);
router.post(
  "/recommendations/explain",
  authenticate,
  reportController.explainMealRecommendation
);
router.get("/chat/conversations", authenticate, reportController.getChatConversations);
router.get("/chat/conversations/:id", authenticate, reportController.getChatConversation);
router.delete("/chat/conversations/:id", authenticate, reportController.removeChatConversation);
router.delete("/chat/conversations", authenticate, reportController.removeAllChatConversations);
router.post("/chat", authenticate, reportController.chatWithAssistant);
router.post("/chat/stream", authenticate, reportController.streamChatWithAssistant);

module.exports = router;
