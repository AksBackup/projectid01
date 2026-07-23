const express = require("express");
const router = express.Router();
const admin = require("../firebase");

const db = admin.firestore();

/* GET LIMITS */
router.get("/", async (req, res) => {
  try {
    const doc = await db
      .collection("config")
      .doc("ai_limits")
      .get();

    const defaults = {
      standard_images: 20,
      premium_images: 100,
    };

    if (!doc.exists) {
      return res.json(defaults);
    }

    res.json({
      ...defaults,
      ...doc.data(),
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/* UPDATE LIMITS */
router.post("/", async (req, res) => {
  try {
    const {
      premium_images,
      standard_images,
    } = req.body;

    await db
      .collection("config")
      .doc("ai_limits")
      .set(
        {
          premium_images,
          standard_images,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    res.json({
      success: true,
      message: "AI image limits updated successfully",
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