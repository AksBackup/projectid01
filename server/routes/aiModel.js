const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/auth");
const admin = require("../firebase");

const db = admin.firestore();

// SECURITY FIX: this router previously had no auth check at all — anyone
// who knew the admin server's URL could read AND overwrite the AI model
// list. Every other admin route (banners, pricing, plan-gating) already
// does this; this one was just missed.
router.use(requireAuth);

/* ======================================================
   GET AI MODELS
   Also returns agentModeProviderId — which of the models[]
   entries (by id) powers Agent Mode's tool-calling.
====================================================== */
router.get("/", async (req, res) => {
  try {
    const doc = await db
      .collection("config")
      .doc("ai_models")
      .get();

    if (!doc.exists) {
      return res.status(200).json({
        models: [],
        agentModeProviderId: null,
      });
    }

    const data = doc.data();
    res.status(200).json({
      models: data.models || [],
      agentModeProviderId: data.agentModeProviderId || null,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/* ======================================================
   UPDATE AI MODELS
   Body: { models: [...], agentModeProviderId?: string|null }
   agentModeProviderId must match one of models[].id (or be null
   to disable Agent Mode entirely) — validated below so the
   payment server never has to guess whether the reference is valid.
====================================================== */
router.post("/", async (req, res) => {
  try {
    const { models, agentModeProviderId } = req.body;

    if (!Array.isArray(models)) {
      return res.status(400).json({
        success: false,
        error: "models must be an array",
      });
    }

    if (agentModeProviderId != null) {
      const validIds = models.map(m => m.id);
      if (!validIds.includes(agentModeProviderId)) {
        return res.status(400).json({
          success: false,
          error: `agentModeProviderId "${agentModeProviderId}" does not match any model id in models[]. Valid ids: ${validIds.join(', ')}`,
        });
      }
    }

    await db
      .collection("config")
      .doc("ai_models")
      .set(
        {
          models,
          agentModeProviderId: agentModeProviderId ?? null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    res.status(200).json({
      success: true,
      message: "AI models updated successfully",
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;