# 🧩 Connection Board App — Data Model

This document describes the **Firestore data model** for the Connection Board app, including **users, puzzles, plays, reactions, collections, and feeds**. It also covers **security rules**, **indexes**, and a **migration plan** to replace hard-coded data with Firestore.

---

## 📂 Collections & Documents

### `users/{uid}`
Each user document mirrors Firebase Auth plus custom app fields.

```jsonc
{
  "displayName": "Ada Lovelace",
  "bio": "puzzle enjoyer",
  "photoURL": "https://...",
  "email": "ada@example.com",        // mirrored from Auth (not authoritative)
  "providerIds": ["google.com"],

  "settings": {
    "darkMode": true,
    "emailNotifications": true
  },

  "stats": {
    "puzzlesCreated": 0,
    "puzzlesPlayed": 0,
    "puzzlesCompleted": 0
  },

  "pinned": ["puzzle_abc", "puzzle_xyz"],

  "createdAt": <serverTimestamp>,
  "updatedAt": <serverTimestamp>
}
```

---

### `puzzles/{puzzleId}`
Each puzzle contains 4 categories × 4 words.

```jsonc
{
  "title": "Animals & Things",
  "description": "4x4 classic",
  "categories": [
    { "title": "Birds",    "words": ["Sparrow","Crow","Robin","Finch"] },
    { "title": "Big Cats", "words": ["Lion","Tiger","Leopard","Jaguar"] },
    { "title": "Sea Life", "words": ["Tuna","Ray","Eel","Shark"] },
    { "title": "Bugs",     "words": ["Ant","Bee","Fly","Moth"] }
  ],
  "wordsFlat": ["Sparrow","Crow", ...],

  "difficulty": "easy",          // "easy" | "medium" | "hard"
  "tags": ["animals","beginner"],
  "solutionHash": "sha256:...",   // optional anti-spoiler

  "createdBy": { "uid": "abc123", "displayName": "Ada", "photoURL": "..." },
  "visibility": "public",         // "public" | "unlisted" | "private"

  "stats": { "plays": 0, "completions": 0, "avgTimeSec": 0, "likes": 0 },

  "createdAt": <serverTimestamp>,
  "updatedAt": <serverTimestamp>,
  "publishedAt": <serverTimestamp>
}
```

#### 🔽 Subcollections

**Plays:** `puzzles/{puzzleId}/plays/{playId}`  
```jsonc
{
  "uid": "abc123",
  "status": "in_progress",     // "in_progress" | "completed" | "failed"
  "guesses": [
    { "words": ["Crow","Robin","Finch","Sparrow"], "correct": true, "ts": <ts> }
  ],
  "timeSpentSec": 95,
  "completedAt": null,
  "createdAt": <serverTimestamp>,
  "updatedAt": <serverTimestamp>
}
```

**Reactions (likes):**  
`puzzles/{puzzleId}/reactions/{uid}` →  
```jsonc
{ "type": "like", "createdAt": <ts> }
```

**Comments (optional):**  
`puzzles/{puzzleId}/comments/{commentId}`

---

### `users/{uid}/collections/{collectionId}`

```jsonc
{
  "name": "My Animal Sets",
  "description": "Favorites & WIPs",
  "puzzleIds": ["puzzle_abc","puzzle_xyz"],
  "isPublic": false,

  "createdAt": <serverTimestamp>,
  "updatedAt": <serverTimestamp>
}
```

---

### `activity/{activityId}`
Global feed of puzzle and user actions.

```jsonc
{
  "type": "puzzle_created",     // "puzzle_created" | "puzzle_published" | "completed" | "comment"
  "actor": { "uid": "abc123", "displayName": "Ada", "photoURL": "..." },
  "puzzleId": "puzzle_abc",
  "visibility": "public",
  "createdAt": <serverTimestamp>
}
```

---

## 🔒 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {

    function signedIn() { return request.auth != null; }
    function isOwner(uid) { return signedIn() && request.auth.uid == uid; }
    function puzzleOwner(p) { return signedIn() && p.data.createdBy.uid == request.auth.uid; }

    // Users
    match /users/{uid} {
      allow read: if signedIn();
      allow create, update: if isOwner(uid);
    }

    // Puzzles
    match /puzzles/{puzzleId} {
      allow read: if resource.data.visibility == "public"
               || (signedIn() && resource.data.createdBy.uid == request.auth.uid);
      allow create: if signedIn();
      allow update, delete: if puzzleOwner(resource);

      // Plays
      match /plays/{playId} {
        allow read: if signedIn() && (
          resource.data.uid == request.auth.uid ||
          get(/databases/$(db)/documents/puzzles/$(puzzleId)).data.createdBy.uid == request.auth.uid
        );
        allow create: if signedIn() && request.resource.data.uid == request.auth.uid;
        allow update, delete: if signedIn() && resource.data.uid == request.auth.uid;
      }

      // Reactions
      match /reactions/{uid} {
        allow read: if true;
        allow create, update, delete: if isOwner(uid);
      }

      // Comments
      match /comments/{commentId} {
        allow read: if true;
        allow create: if signedIn();
        allow update, delete: if signedIn() && resource.data.uid == request.auth.uid;
      }
    }

    // User collections
    match /users/{uid}/collections/{cid} {
      allow read: if isOwner(uid) || resource.data.isPublic == true;
      allow create, update, delete: if isOwner(uid);
    }

    // Activity
    match /activity/{id} {
      allow read: if true;
      allow write: if false; // Cloud Functions only
    }

    // Global pins
    match /pins/{pinId} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

---

## ⚡️ Cloud Functions (examples)

```ts
export const onReactionWrite = functions.firestore
  .document("puzzles/{puzzleId}/reactions/{uid}")
  .onWrite(async (chg, ctx) => {
    const puzzleRef = db.doc(`puzzles/${ctx.params.puzzleId}`);
    const inc = chg.after.exists && !chg.before.exists ? 1
            : !chg.after.exists && chg.before.exists ? -1 : 0;
    if (inc !== 0) {
      await puzzleRef.update({ "stats.likes": FieldValue.increment(inc) });
    }
  });

export const onPuzzleCreate = functions.firestore
  .document("puzzles/{puzzleId}")
  .onCreate(async (snap, ctx) => {
    const p = snap.data();
    await db.collection("activity").add({
      type: "puzzle_created",
      actor: p.createdBy,
      puzzleId: ctx.params.puzzleId,
      visibility: p.visibility,
      createdAt: FieldValue.serverTimestamp()
    });
    await db.doc(`users/${p.createdBy.uid}`).update({
      "stats.puzzlesCreated": FieldValue.increment(1)
    });
  });
```

---

## 🛠 Migration Steps (Hardcoded → Firestore)

1. **Enable Firebase**
   - Auth → Google Sign-in  
   - Firestore → Production mode  

2. **Add Security Rules** (above).  

3. **Flag toggle for puzzles**
   ```ts
   export async function fetchPuzzles() {
     if (!process.env.NEXT_PUBLIC_USE_REMOTE) return hardcodedPuzzles;
     // else query Firestore
   }
   ```

4. **Seed Firestore**
   Run a Node script that reads your current JSON and inserts into `puzzles`.  

   ```ts
   import { initializeApp, cert } from "firebase-admin/app";
   import { getFirestore, FieldValue } from "firebase-admin/firestore";
   import hardcoded from "./hardcoded.json";

   initializeApp({ credential: cert(require("./sa.json")) });
   const db = getFirestore();

   async function seed(uid: string, displayName: string) {
     for (const p of hardcoded) {
       await db.collection("puzzles").add({
         ...p,
         createdBy: { uid, displayName },
         visibility: "public",
         stats: { plays: 0, completions: 0, avgTimeSec: 0, likes: 0 },
         createdAt: FieldValue.serverTimestamp(),
         updatedAt: FieldValue.serverTimestamp(),
         publishedAt: FieldValue.serverTimestamp()
       });
     }
   }
   seed("YOUR_UID", "You");
   ```

5. **Switch code to Firestore**  
   Replace all imports of local JSON with Firestore queries.  

6. **Add gameplay writes** (plays, likes, etc).  

7. **Remove hard-coded file** once tested.  

---

✅ You now have a **structured Firestore-backed model**, with a clean migration plan to move off hard-coded data.
