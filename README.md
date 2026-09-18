
# 🏛️ FaydaTrack Bureau Terminal: Master Blueprint (Web & Android Sync)

This document serves as the absolute "Source of Truth" for the FaydaTrack Bureau Terminal. Use this blueprint when building the native Android application (Java/Kotlin) to ensure 100% logic and visual parity with the web terminal.

## 🚀 Native Android Development Prompt (Java/Kotlin)

"Build a native Android application for FaydaTrack that mirrors the existing Next.js web terminal. The app must use the official Firebase Android SDK for Authentication and Firestore. 

### 🎨 Visual Identity (Onyx & Lime)
- **Design System**: Onyx Black primary surfaces with Lime Green (`#C6F04F`) interactive accents.
- **Geometric Signature**: Mandatory `32dp` (2rem) corner radius for all containers, cards, and input fields.
- **Typography**: Institutional style. Use heavy weights and wide letter spacing for all "High-Command" labels.
- **Layout**: Sidebar navigation for tablets/landscape; Floating bottom-navigation pill for mobile portrait.

### 🛡️ Mandatory Logic & Security
1. **Strict Data Isolation**: Every Firestore query for the `registrations` collection MUST include the owner filter: `.whereEqualTo("assignedReviewerId", currentUserId)`. Failure to include this will result in a permission denial.
2. **High-Scale Performance**: Synchronize all registry lookups to a **10,000-record threshold**. Use pagination to allow smooth browsing through up to 1,000 pages of data.
3. **Forensic Auditing**: Every critical operation (status update, record deletion, personnel change) must trigger a write to the `audit_logs` collection containing the acting officer's signature and a narrative payload.

### 🧩 Core Feature Set
- **Identity Gateway**: Firebase Email/Password authentication.
- **Command Dashboard**: A 3-tier view featuring high-intensity stats, registration velocity charts (MPAndroidChart), and a real-time 'Active Duty' status toggle.
- **Verification Terminal**: A dual-pane interface. One side for local registry browsing; the other for an integrated `WebView` loading `https://resident.fayda.et/status?rid={ID}`.
- **Tactical Comms**: Real-time Firestore-based chat channels and a system-wide announcement intelligence feed.
- **Production Hub**: A dedicated printing queue to mark 'Processed' records as 'Physically Issued'.

---

## 📂 Core Database Architecture (Firestore)

### /users/{userId} (UserProfile)
- `fullName`: String
- `role`: "admin" | "reviewer"
- `isDutyActive`: Boolean
- `region`: String
- `cluster`: String
- `updatedAt`: ISO8601 String

### /registrations/{regId} (Registration)
- `applicantName`: String
- `status`: "Processed" | "Pending Review" | "Rejected" | "Processing" | "Failed"
- `assignedReviewerId`: String (Mandatory query filter)
- `isPrinted`: Boolean
- `submissionDate`: ISO8601 String

### /audit_logs/{logId} (Immutable Forensic Record)
- `officerId`: String
- `officerName`: String
- `action`: String (e.g., "STATUS_UPDATE")
- `targetId`: String
- `details`: String
- `timestamp`: ServerTimestamp

---

## 🛠️ Synchronization Protocol

To maintain 100% parity between the Web Terminal and Android APK:
1. **Firebase Project**: Both apps MUST use the same Firebase Project ID and Configuration.
2. **Security Rules**: Enforce ownership at the database level (`firestore.rules`) using `request.auth.uid`.
3. **Offline Resilience**: Enable Firestore Persistence in the Android app to ensure field officers can log data during network latency.
4. **API Key Management**: Ensure `GOOGLE_GENAI_API_KEY` is present in the Android local properties for AI-assisted features.

---
© 2026 FaydaTrack Operations Group. Restricted Access. Authorized Personnel Only.
