// const express     = require('express');
// const router      = express.Router();
// const requireAuth = require('../middleware/auth');
// const admin       = require('../firebase');

// router.use(requireAuth);

// // ── GET /api/users/debug ────────────────────────────────────────────────────
// router.get('/debug', async (req, res) => {
//   const results = { auth: null, firestore: null, errors: [] };

//   try {
//     const list = await admin.auth().listUsers(5);
//     results.auth = {
//       ok: true,
//       count: list.users.length,
//       sample: list.users.map(u => ({ uid: u.uid, email: u.email })),
//     };
//   } catch (err) {
//     results.auth = { ok: false };
//     results.errors.push(`Auth: ${err.message}`);
//   }

//   try {
//     const snap = await admin.firestore().collection('users').limit(3).get();
//     results.firestore = {
//       ok: true,
//       docCount: snap.size,
//       ids: snap.docs.map(d => d.id),
//     };
//   } catch (err) {
//     results.firestore = { ok: false };
//     results.errors.push(`Firestore: ${err.message}`);
//   }

//   res.json(results);
// });

// // Plan allocation table
// const ALLOC = {
//   basic:    { monthly: 10000,  annual: 10000  },
//   standard: { monthly: 50000,  annual: 55000  },
//   premium:  { monthly: 100000, annual: 105000 },
// };

// // ── GET /api/users ──────────────────────────────────────────────────────────
// router.get('/', async (req, res) => {
//   try {
//     const db = admin.firestore();

//     let authList;
//     try {
//       authList = await admin.auth().listUsers(1000);
//     } catch (authErr) {
//       console.error('Firebase Auth listUsers failed:', authErr.message);
//       return res.status(500).json({
//         error: `Firebase Auth error: ${authErr.message}`,
//       });
//     }

//     const authMap = {};
//     authList.users.forEach(u => {
//       authMap[u.uid] = {
//         uid:         u.uid,
//         email:       u.email || '',
//         displayName: u.displayName || '',
//         photoURL:    u.photoURL || '',
//         createdAt:   u.metadata.creationTime,
//         lastSignIn:  u.metadata.lastSignInTime,
//       };
//     });

//     const userIds = Object.keys(authMap);
//     if (userIds.length === 0) {
//       return res.json({ users: [], total: 0 });
//     }

//     const users = [];
//     const BATCH = 20;

//     for (let i = 0; i < userIds.length; i += BATCH) {
//       const batch = userIds.slice(i, i + BATCH);

//       await Promise.all(batch.map(async uid => {
//         try {
//           const [userSnap, aiSnap] = await Promise.all([
//             db.collection('users').doc(uid).get(),
//             db.collection('users').doc(uid).collection('ai').doc('usage').get(),
//           ]);

//           const userData = userSnap.data() || {};
//           const aiData   = aiSnap.data() || {};

//           // ✅ FIX: subscription is OBJECT inside user doc
//           const subData = userData.subscription || {};

//           // ✅ Plan logic (NOW WORKS CORRECTLY)
//           const plan  = subData.plan  || userData.plan  || 'basic';
//           const cycle = subData.cycle || userData.billingCycle || 'monthly';

//           const allocation = ALLOC[plan]?.[cycle] || 10000;
//           const tokensUsed = aiData.tokensUsedThisMonth ?? aiData.tokensUsedToday ?? 0;
//           const addonLeft  = aiData.addonTokensLeft ?? aiData.addonCreditsLeft ?? 0;
//           const lastReset  = aiData.lastResetMonth ?? '';

//           const tokensLeft = Math.max(0, allocation - tokensUsed);
//           const usagePct   = allocation > 0
//             ? Math.min(100, Math.round((tokensUsed / allocation) * 100))
//             : 0;

//           users.push({
//             ...authMap[uid],

//             // Dart-aligned fields
//             name: userData.name || authMap[uid].displayName || '',
//             avatarUrl: userData.avatarUrl || authMap[uid].photoURL || '',
//             orgName: userData.organizationName || userData.orgName || userData.companyName || '',

//             // subscription data
//             plan,
//             cycle,

//             // usage data
//             allocation,
//             tokensUsed,
//             tokensLeft,
//             addonLeft,
//             usagePct,
//             lastReset,
//           });

//         } catch (docErr) {
//           console.warn(`Firestore read failed for ${uid}:`, docErr.message);

//           users.push({
//             ...authMap[uid],

//             name: authMap[uid].displayName || '',
//             avatarUrl: authMap[uid].photoURL || '',
//             orgName: '',

//             plan: 'basic',
//             cycle: 'monthly',
//             allocation: 10000,
//             tokensUsed: 0,
//             tokensLeft: 10000,
//             addonLeft: 0,
//             usagePct: 0,
//             lastReset: '',
//           });
//         }
//       }));
//     }

//     // sorting (unchanged)
//     const RANK = { premium: 0, standard: 1, basic: 2 };
//     users.sort((a, b) =>
//       (RANK[a.plan] ?? 3) - (RANK[b.plan] ?? 3) ||
//       new Date(b.createdAt) - new Date(a.createdAt)
//     );

//     res.json({ users, total: users.length });

//   } catch (err) {
//     console.error('Users route error:', err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // ── GET /api/users/stats ────────────────────────────────────────────────────
// router.get('/stats', async (req, res) => {
//   try {
//     const db = admin.firestore();

//     let authList;
//     try {
//       authList = await admin.auth().listUsers(1000);
//     } catch (authErr) {
//       return res.json({ total: 0, basic: 0, standard: 0, premium: 0, mrr: 0, totalTokensUsed: 0 });
//     }

//     const uids = authList.users.map(u => u.uid);
//     let basic = 0, standard = 0, premium = 0, totalTokensUsed = 0;

//     const BATCH = 20;

//     for (let i = 0; i < uids.length; i += BATCH) {
//       await Promise.all(uids.slice(i, i + BATCH).map(async uid => {
//         try {
//           const [userSnap, aiSnap] = await Promise.all([
//             db.collection('users').doc(uid).get(),
//             db.collection('users').doc(uid).collection('ai').doc('usage').get(),
//           ]);

//           const userData = userSnap.data() || {};
//           const subData  = userData.subscription || {};

//           const plan = subData.plan || userData.plan || 'basic';

//           if (plan === 'premium') premium++;
//           else if (plan === 'standard') standard++;
//           else basic++;

//           const ai = aiSnap.data() || {};
//           totalTokensUsed += ai.tokensUsedThisMonth ?? ai.tokensUsedToday ?? 0;

//         } catch {
//           basic++;
//         }
//       }));
//     }

//     res.json({
//       total: uids.length,
//       basic,
//       standard,
//       premium,
//       mrr: (standard * 499) + (premium * 999),
//       totalTokensUsed,
//     });

//   } catch (err) {
//     console.error('Stats route error:', err.message);
//     res.status(500).json({ error: err.message });
//   }
// });

// module.exports = router;
const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const admin = require('../firebase');

router.use(requireAuth);

const ALLOC = {
  basic: { monthly: 10000, annual: 10000 },
  standard: { monthly: 50000, annual: 55000 },
  premium: { monthly: 100000, annual: 105000 },
};

async function getUserBundle(uid) {
  const db = admin.firestore();

  const [authUser, userSnap, aiSnap] = await Promise.all([
    admin.auth().getUser(uid),
    db.collection('users').doc(uid).get(),
    db.collection('users').doc(uid).collection('ai').doc('usage').get(),
  ]);

  const userData = userSnap.exists ? userSnap.data() : {};
  const aiData = aiSnap.exists ? aiSnap.data() : {};
  const subData = userData?.subscription || {};

  const plan = subData.plan || userData?.plan || 'basic';
  const cycle = subData.cycle || userData?.billingCycle || 'monthly';
  const allocation = ALLOC[plan]?.[cycle] || 10000;

  const tokensUsed = aiData.tokensUsedThisMonth ?? aiData.tokensUsedToday ?? 0;
  const addonLeft = aiData.addonTokensLeft ?? aiData.addonCreditsLeft ?? 0;
  const lastReset = aiData.lastResetMonth ?? '';
  const tokensLeft = Math.max(0, allocation - tokensUsed);
  const usagePct = allocation > 0 ? Math.min(100, Math.round((tokensUsed / allocation) * 100)) : 0;

  return {
    uid: authUser.uid,
    email: authUser.email || '',
    name: userData.name || authUser.displayName || '',
    displayName: authUser.displayName || '',
    photoURL: authUser.photoURL || '',
    disabled: !!authUser.disabled,
    createdAt: authUser.metadata.creationTime || '',
    lastSignIn: authUser.metadata.lastSignInTime || '',
    providerData: authUser.providerData || [],

    organizationName: userData.organizationName || userData.orgName || userData.companyName || '',
    role: userData.role || 'user',

    subscription: {
      active: userData?.subscription?.active ?? false,
      cycle,
      expiresAt: userData?.subscription?.expiresAt || null,
      plan,
    },

    firestore: userData,
    ai: aiData,

    plan,
    cycle,
    allocation,
    tokensUsed,
    tokensLeft,
    addonLeft,
    usagePct,
    lastReset,
    restricted: !!userData.restricted,
    restrictionReason: userData.restrictionReason || '',
  };
}

// GET /api/users/debug
router.get('/debug', async (req, res) => {
  const results = { auth: null, firestore: null, errors: [] };

  try {
    const list = await admin.auth().listUsers(5);
    results.auth = {
      ok: true,
      count: list.users.length,
      sample: list.users.map(u => ({ uid: u.uid, email: u.email })),
    };
  } catch (err) {
    results.auth = { ok: false };
    results.errors.push(`Auth: ${err.message}`);
  }

  try {
    const snap = await admin.firestore().collection('users').limit(3).get();
    results.firestore = {
      ok: true,
      docCount: snap.size,
      ids: snap.docs.map(d => d.id),
    };
  } catch (err) {
    results.firestore = { ok: false };
    results.errors.push(`Firestore: ${err.message}`);
  }

  res.json(results);
});

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const db = admin.firestore();

    let authList;
    try {
      authList = await admin.auth().listUsers(1000);
    } catch (authErr) {
      console.error('Firebase Auth listUsers failed:', authErr.message);
      return res.status(500).json({
        error: `Firebase Auth error: ${authErr.message}`,
      });
    }

    const authMap = {};
    authList.users.forEach(u => {
      authMap[u.uid] = {
        uid: u.uid,
        email: u.email || '',
        displayName: u.displayName || '',
        photoURL: u.photoURL || '',
        disabled: !!u.disabled,
        createdAt: u.metadata.creationTime,
        lastSignIn: u.metadata.lastSignInTime,
      };
    });

    const userIds = Object.keys(authMap);
    if (userIds.length === 0) {
      return res.json({ users: [], total: 0 });
    }

    const users = [];
    const BATCH = 20;

    for (let i = 0; i < userIds.length; i += BATCH) {
      const batch = userIds.slice(i, i + BATCH);

      await Promise.all(batch.map(async uid => {
        try {
          const [userSnap, aiSnap] = await Promise.all([
            db.collection('users').doc(uid).get(),
            db.collection('users').doc(uid).collection('ai').doc('usage').get(),
          ]);

          const userData = userSnap.data() || {};
          const aiData = aiSnap.data() || {};
          const subData = userData.subscription || {};

          const plan = subData.plan || userData.plan || 'basic';
          const cycle = subData.cycle || userData.billingCycle || 'monthly';
          const allocation = ALLOC[plan]?.[cycle] || 10000;
          const tokensUsed = aiData.tokensUsedThisMonth ?? aiData.tokensUsedToday ?? 0;
          const addonLeft = aiData.addonTokensLeft ?? aiData.addonCreditsLeft ?? 0;
          const lastReset = aiData.lastResetMonth ?? '';
          const tokensLeft = Math.max(0, allocation - tokensUsed);
          const usagePct = allocation > 0
            ? Math.min(100, Math.round((tokensUsed / allocation) * 100))
            : 0;

          users.push({
            ...authMap[uid],

            name: userData.name || authMap[uid].displayName || '',
            avatarUrl: userData.avatarUrl || authMap[uid].photoURL || '',
            orgName: userData.organizationName || userData.orgName || userData.companyName || '',

            plan,
            cycle,

            allocation,
            tokensUsed,
            tokensLeft,
            addonLeft,
            usagePct,
            lastReset,

            restricted: !!userData.restricted,
            restrictionReason: userData.restrictionReason || '',
          });
        } catch (docErr) {
          console.warn(`Firestore read failed for ${uid}:`, docErr.message);

          users.push({
            ...authMap[uid],
            name: authMap[uid].displayName || '',
            avatarUrl: authMap[uid].photoURL || '',
            orgName: '',
            plan: 'basic',
            cycle: 'monthly',
            allocation: 10000,
            tokensUsed: 0,
            tokensLeft: 10000,
            addonLeft: 0,
            usagePct: 0,
            lastReset: '',
            restricted: false,
            restrictionReason: '',
          });
        }
      }));
    }

    const RANK = { premium: 0, standard: 1, basic: 2 };
    users.sort((a, b) =>
      (RANK[a.plan] ?? 3) - (RANK[b.plan] ?? 3) ||
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json({ users, total: users.length });
  } catch (err) {
    console.error('Users route error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/stats
router.get('/stats', async (req, res) => {
  try {
    const db = admin.firestore();

    let authList;
    try {
      authList = await admin.auth().listUsers(1000);
    } catch (authErr) {
      return res.json({ total: 0, basic: 0, standard: 0, premium: 0, mrr: 0, totalTokensUsed: 0 });
    }

    const uids = authList.users.map(u => u.uid);
    let basic = 0, standard = 0, premium = 0, totalTokensUsed = 0;
    const BATCH = 20;

    for (let i = 0; i < uids.length; i += BATCH) {
      await Promise.all(uids.slice(i, i + BATCH).map(async uid => {
        try {
          const [userSnap, aiSnap] = await Promise.all([
            db.collection('users').doc(uid).get(),
            db.collection('users').doc(uid).collection('ai').doc('usage').get(),
          ]);

          const userData = userSnap.data() || {};
          const subData = userData.subscription || {};
          const plan = subData.plan || userData.plan || 'basic';

          if (plan === 'premium') premium++;
          else if (plan === 'standard') standard++;
          else basic++;

          const ai = aiSnap.data() || {};
          totalTokensUsed += ai.tokensUsedThisMonth ?? ai.tokensUsedToday ?? 0;
        } catch {
          basic++;
        }
      }));
    }

    res.json({
      total: uids.length,
      basic,
      standard,
      premium,
      mrr: (standard * 499) + (premium * 999),
      totalTokensUsed,
    });
  } catch (err) {
    console.error('Stats route error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:uid
router.get('/:uid', async (req, res) => {
  try {
    const user = await getUserBundle(req.params.uid);
    res.json({ user });
  } catch (err) {
    console.error('User details error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/users/:uid/restrict
router.patch('/:uid/restrict', async (req, res) => {
  try {
    const { restricted, reason = '' } = req.body;
    const uid = req.params.uid;
    const db = admin.firestore();

    await admin.auth().updateUser(uid, {
      disabled: !!restricted,
    });

    await db.collection('users').doc(uid).set({
      restricted: !!restricted,
      restrictionReason: reason,
      restrictedAt: restricted ? admin.firestore.FieldValue.serverTimestamp() : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    res.json({ ok: true, uid, restricted: !!restricted });
  } catch (err) {
    console.error('Restrict user error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:uid
router.delete('/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;
    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);

    await admin.auth().deleteUser(uid).catch(err => {
      console.warn('Auth delete skipped/failed:', err.message);
    });

    // Delete known docs first
    await userRef.collection('ai').doc('usage').delete().catch(() => {});
    await userRef.delete().catch(() => {});

    // Best-effort recursive cleanup if available
    if (typeof db.recursiveDelete === 'function') {
      try {
        await db.recursiveDelete(userRef);
      } catch (e) {
        console.warn('recursiveDelete failed:', e.message);
      }
    }

    res.json({ ok: true, uid });
  } catch (err) {
    console.error('Delete user error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;