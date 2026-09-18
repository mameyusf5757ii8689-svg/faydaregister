
# FaydaTrack Bureau Terminal

A high-fidelity institutional terminal for official bureau registration tracking, real-time coordination, and forensic operational triage. Engineered for absolute accuracy, strict data isolation, and massive scale.

## 🏛️ Master Terminal Definition (APK Sync Blueprint)

Use this definition when building the Android/iOS version to ensure 100% synchronization with the web backend.

### 1. Tech Stack Signature
- **Frontend Framework**: Next.js 15 (App Router) / React 19.
- **Backend Architecture**: Firebase (Authentication, Firestore, Security Rules).
- **Styling Engine**: Tailwind CSS.
- **UI Design System**: Onyx & Lime (Onyx surfaces, `#C6F04F` interactive accents).
- **Geometric Protocol**: Mandatory `rounded-[2rem]` (32px) curvature on all primary containers.

### 2. Core Database Architecture (Firestore)
- `/users/{userId}`: Profiles with role-based access (Admin/Reviewer) and Duty Status.
- `/registrations/{regId}`: Strict isolation records. **Requirement**: All queries must filter by `assignedReviewerId == currentUser.uid`.
- `/audit_logs/{logId}`: Immutable signatures of all critical operations (purgings, status updates, exports).
- `/daily_reports/{reportId}`: Aggregate metrics for bureau-wide performance analytics.
- `/conversations/` & `/messages/`: Encrypted team coordination channels.

### 3. Operational Protocols
- **Strict Data Isolation**: No officer can view a registration record not assigned to their unique ID. This is enforced via `firestore.rules`.
- **High-Scale Capacity**: Every registry and ledger query is synchronized to a **10,000-record threshold** to eliminate the "Page 50 wall."
- **Permission Sync**: Every database request must explicitly include the owner filter to prevent "Missing or insufficient permissions" errors.

### 4. Key Functionalities
- **Command Dashboard**: Real-time stats matrix, registration velocity charts (Recharts), and active duty coordination.
- **Verification Terminal**: Integrated government status portal via secure iframe synchronization (`https://resident.fayda.et/status?rid={ID}`).
- **Printing Production**: Queue management for marking processed IDs as physically issued.
- **Forensic Audit**: Searchable ledger of every institutional action signed by the acting official.
- **Intelligence Feed**: Centralized notifications for broadcasts, personal alerts, and tactical pings.

### 5. Mobile Hardening (APK Readiness)
- **Zero-Bleed Architecture**: Fixed navigation bars optimized for touch targets (min 44px).
- **Offline Protocol**: Firestore persistence enabled to allow field entry during network latency.
- **Responsive Layout**: Sidebar navigation for desktop/tablet; Bottom-pill navigation for mobile.

---

## 🚀 Deployment & Update Roadmap

### 📦 Synchronize for Mobile (Capacitor)
To wrap this web terminal into a native Android APK:
1. `npx cap init`
2. `npx cap add android`
3. `npm run build && npx cap sync`

### 🛡️ Cloud Environment
Ensure the following variables are active in your deployment environment:
| Variable | Purpose |
| :--- | :--- |
| `GOOGLE_GENAI_API_KEY` | Powers AI Status Suggestions. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API Key. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain. |

---
© 2026 FaydaTrack Operations Group. Restricted Access. Authorized Personnel Only.
