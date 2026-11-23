# Halka Security Specification (Phase 0 TDD)

## 1. Core Data Invariants
1. **PII Isolation**: User email addresses reside strictly inside `/users/{userId}/private/info`, readable and writable only by `request.auth.uid == userId`.
2. **Membership Authority**: Access to any private server, its channels, or its messages requires an existing document at `/servers/{serverId}/members/{request.auth.uid}`.
3. **Role Integrity**: A joining user can ONLY create their own `/servers/{serverId}/members/{uid}` document with `role == 'member'`, unless they are the immutable `ownerId` of `/servers/{serverId}`. Self-promotion to `admin` or `moderator` is forbidden.
4. **Immutable Authorship & Ownership**: `authorId` on messages, `ownerId` on servers, `createdAt` on all documents, and `fromUid` on friend requests cannot be spoofed or altered after creation.
5. **Temporal Integrity**: All `createdAt` and `updatedAt` timestamps must equal `request.time`.
6. **Participant Isolation**: Friend requests and DM threads are strictly scoped to `request.auth.uid in resource.data.participants` (size 2).
7. **Strict Key & Size Bounds**: Every document enforces `hasAll` + `hasOnly` on create, `affectedKeys().hasOnly(...)` on update, and `.size()` caps on every string/list/map.

## 2. The "Dirty Dozen" Malicious Payloads
1. **PII Leak Attempt**: User B attempts `get` on `/users/userA/private/info`. -> `PERMISSION_DENIED`
2. **Shadow Admin Injection**: User B creates `/servers/s1/members/userB` with `role: 'admin'` while not `ownerId`. -> `PERMISSION_DENIED`
3. **Ghost Field Injection**: User A creates message with extra field `isOfficialSystemBadge: true`. -> `PERMISSION_DENIED`
4. **Author Spoofing**: User B creates a channel message with `authorId: 'userA'`. -> `PERMISSION_DENIED`
5. **Non-Member Message Read**: User C (not a member of private server `s1`) attempts to list `/servers/s1/channels/c1/messages`. -> `PERMISSION_DENIED`
6. **Self-Pinning Abuse**: Regular `member` updates another user's message to set `pinned: true`. -> `PERMISSION_DENIED`
7. **Owner Demotion**: An `admin` attempts to update the server owner's member doc to `role: 'member'`. -> `PERMISSION_DENIED`
8. **Timestamp Backdating**: User creates a message with `createdAt` set to a past timestamp instead of `request.time`. -> `PERMISSION_DENIED`
9. **ID Poisoning**: User creates a channel with a 500-char ID or invalid characters (`../admin`). -> `PERMISSION_DENIED`
10. **Friend Request Self-Accept**: Sender (`fromUid`) attempts to update their own pending request to `status: 'accepted'`. -> `PERMISSION_DENIED`
11. **DM Eavesdropping**: User C (not in `participants`) attempts to read `/dmThreads/userA_userB/messages/m1`. -> `PERMISSION_DENIED`
12. **Unverified Email Bypass**: Unverified auth token attempts to write to `/servers/s1`. -> `PERMISSION_DENIED`
