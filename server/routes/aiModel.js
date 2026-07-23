const express = require("express");
const router = express.Router();
const admin = require("../firebase");

const db = admin.firestore();

/* ======================================================
   GET AI MODELS
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
      });
    }

    res.status(200).json(doc.data());

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
====================================================== */
router.post("/", async (req, res) => {
  try {
    const { models } = req.body;

    if (!Array.isArray(models)) {
      return res.status(400).json({
        success: false,
        error: "models must be an array",
      });
    }

    await db
      .collection("config")
      .doc("ai_models")
      .set(
        {
          models,
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