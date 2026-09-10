# Security Specification: KalaKart Artisans

## Phase 0: Security TDD & Invariants

### 1. Data Invariants

1. **User Profile Invariant**: A user profile document at `/users/{userId}` can only be created or modified by the authenticated user whose `request.auth.uid == userId`. The user cannot modify their UID or account linkage.
2. **Product Ownership & Relational Invariant**: Any product at `/products/{productId}` must have `artisanId == request.auth.uid`. An artisan cannot forge or modify another artisan's products or reassign `artisanId`.
3. **Order Access Invariant**: Orders in `/orders/{orderId}` belong to the designated artisan (`artisanId`). Only the artisan recipient can read and update the status of their orders.
4. **Inquiry Access Invariant**: Inquiries in `/inquiries/{inquiryId}` are bound to `artisanId`. Only the artisan can list/read their own inquiries and post replies.
5. **No Client Query Trust Invariant**: All `list` operations strictly enforce that `resource.data.artisanId == request.auth.uid` (or `resource.data.id == request.auth.uid` for users) so unauthorized clients cannot query or scrape another artisan's catalog, orders, or inquiries.
6. **Boundary & Size Limits**: Names, descriptions, craft categories, and image payload strings are strictly capped with `.size()` limits to prevent Denial of Wallet.
7. **Temporal & State Locking**: Immutability of owner keys (`artisanId`, `id`) and state validation for order statuses.

---

### 2. The "Dirty Dozen" Payloads (Must be rejected with PERMISSION_DENIED)

1. **Payload 1 (Identity Spoofing on User Create)**: Unauthenticated user trying to write to `/users/artisan123`.
2. **Payload 2 (Privilege Escalation on User Profile)**: Authenticated user `userA` trying to overwrite `/users/userB`.
3. **Payload 3 (Shadow Field Injection on User Update)**: Authenticated user sending an unapproved administrative ghost field `isAdmin: true` into `/users/{uid}`.
4. **Payload 4 (Product Identity Forgery)**: Authenticated user `userA` creating a product with `artisanId: "userB"`.
5. **Payload 5 (Cross-Artisan Product Update)**: Authenticated user `userB` attempting to update price or stock of a product owned by `userA`.
6. **Payload 6 (Cross-Artisan Product Deletion)**: Authenticated user `userB` attempting to delete a product owned by `userA`.
7. **Payload 7 (Unbounded String Resource Exhaustion)**: Product creation with a 1MB `name` string exceeding the 150-char ceiling.
8. **Payload 8 (Invalid ID Path Attack)**: Attempting to target a product ID containing illegal characters `/products/invalid%20id#$$@!`.
9. **Payload 9 (Order Tampering by Outsider)**: User `userB` attempting to change order status on `/orders/order123` belonging to `userA`.
10. **Payload 10 (Unauthorized Inquiry Scraping)**: User `userB` attempting to list all inquiries without restricting `where("artisanId", "==", userB.uid)`.
11. **Payload 11 (Terminal State / Invalid Status Transition)**: Attempting to set an invalid order status like `status: "Hacked"`.
12. **Payload 12 (Blanket Collection Read)**: Unauthenticated request attempting to read `/orders` or `/users` collection.
