# Quizian Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **Owner Isolation (`/users/{userId}` and subcollections)**: All user PII (`email`), `totalPoints`, personal `quizzes`, `studyMaterials`, and `activities` are strictly readable and writable ONLY by the authenticated owner (`request.auth.uid == userId`). No user may read or list another user's profile or private history.
2. **Anti-Privilege Escalation**: On `/users/{userId}` creation, `role` MUST equal `'student'`, `id == userId`, and initial `totalPoints` is bounded (`<= 100`). On update, `role`, `id`, and `createdAt` are immutable, and point increments per write are bounded (`<= existing + 200`) to prevent arbitrary score forging.
3. **Challenge Room Lifecycle Integrity (`/challengeRooms/{roomCode}`)**:
   - A room can only be created with `hostId == request.auth.uid`, `status == 'waiting'`, `participantIds == [request.auth.uid]`, `1 <= questions.size() <= 35`, and `2 <= maxPlayers <= 6`.
   - `hostId`, `code`, `quizId`, and `createdAt` are immutable.
   - A joining user may only add their own UID to `participantIds` while `status == 'waiting'` and `participantIds.size() <= maxPlayers`.
   - Only the room `hostId` can transition `status` from `'waiting'` -> `'active'` or `'active'` -> `'completed'`.
   - Once `status == 'completed'`, the room document is terminally locked against all further updates.
4. **Master Gate for Room Participants (`/challengeRooms/{roomCode}/participants/{participantId}`)**:
   - Parent room `/challengeRooms/$(roomCode)` MUST exist (checked via `get()`).
   - Human participants can only create/update their own document (`participantId == request.auth.uid`, `uid == request.auth.uid`, `isBot == false`).
   - Bot participants (`isBot == true`) can only be added by the room `hostId` while `room.status == 'waiting'`.
   - Score updates are rejected once the parent room reaches `'completed'`.
5. **Challenge Invitations (`/challengeInvitations/{invitationId}`)**:
   - Can only be created by `senderUid == request.auth.uid` for an existing `roomCode` with `status == 'pending'`.
   - `allow list` and `allow get` strictly check `senderUid == request.auth.uid` OR (`request.auth.token.email_verified == true` AND `recipientEmail == request.auth.token.email.lower()`).
   - Updates are strictly restricted while `existing().status == 'pending'` to either recipient accepting/declining (`['accepted', 'declined']`) with verified email, or sender cancelling (`'cancelled'`). Once resolved, the invitation is terminally locked.
6. **Strict Server Timestamps & Bounded Sizes**: Every `createdAt` on create and `updatedAt` on create/update must equal `request.time`. All IDs match `^[a-zA-Z0-9_-]+$` (`<= 128` chars) and all strings enforce explicit `.size()` bounds.

## 2. The "Dirty Dozen" Attack Payloads (Expected: `PERMISSION_DENIED`)
1. **Cross-User PII Read**: Authenticated User B performs `getDoc(doc(db, 'users', userA_uid))` -> Rejected (not owner).
2. **Self-Role Escalation**: User A creates/updates `/users/{userA}` with `role: 'admin'` -> Rejected (`role` must be `'student'` and immutable).
3. **Ghost Shadow Field on User Profile**: User A updates `/users/{userA}` adding `{ isVerified: true, extraPoints: 99999 }` -> Rejected by `keys().hasOnly(...)` & `affectedKeys().hasOnly(...)`.
4. **Reward Poisoning**: User A updates `/users/{userA}` setting `totalPoints: 999999` -> Rejected by bounded delta check.
5. **Client Timestamp Forgery**: User A creates a quiz with `createdAt: Timestamp.fromMillis(1000)` -> Rejected (`createdAt == request.time`).
6. **Malformed ID Poisoning**: User A attempts write to `/users/{userA}/quizzes/../../admin` or 500-char ID -> Rejected by `isValidId(quizId)`.
7. **Blanket Challenge Room List Scrape**: User B runs `getDocs(collection(db, 'challengeRooms'))` without filtering to rooms they participate in -> Rejected (`resource.data.hostId == uid || uid in resource.data.participantIds`).
8. **Non-Host Force Start**: Joiner User B tries updating `/challengeRooms/{code}` setting `status: 'active'` -> Rejected (`existing().hostId == request.auth.uid`).
9. **Terminal State Resurrection**: Host User A tries updating `/challengeRooms/{code}` after `status == 'completed'` -> Rejected (`existing().status != 'completed'`).
10. **Score Impersonation in Room**: User B updates `/challengeRooms/{code}/participants/{userA_uid}` with `score: 0` -> Rejected (`participantId == request.auth.uid`).
11. **Unverified Email Spoofing on Invites**: User with `email_verified: false` queries or accepts `/challengeInvitations/{id}` where `recipientEmail == 'victim@school.edu'` -> Rejected (`request.auth.token.email_verified == true`).
12. **Orphan Invitation Creation**: User A creates `/challengeInvitations/{id}` pointing to nonexistent `roomCode: 'FAKE99'` -> Rejected (`exists(/databases/$(database)/documents/challengeRooms/FAKE99)`).
