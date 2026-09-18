
# 🏛️ FaydaTrack Bureau Terminal: Definitive Android Blueprint (Java/Kotlin)

This document serves as the absolute functional and technical specification for the native Android application. Use this blueprint to build a mirror image of the Next.js web terminal using the same Firebase credentials and database structure.

---

## 🚀 Native Android Development Prompt (The Master Command)

"Build a native Android application (Java/Kotlin) for FaydaTrack. The app must use the official **Firebase Android SDK** for Authentication, Firestore, and Cloud Messaging. It must share the exact same Firebase Project ID and Configuration as the web terminal to ensure real-time data parity."

### 🎨 Visual Identity Signature (Onyx & Lime)
- **Primary Surfaces**: Onyx Black background (`#000000` or deep dark grey).
- **Accent Color**: Lime Green (`#C6F04F`) for primary buttons, active states, and highlights.
- **Geometric Requirement**: Mandatory `32dp` corner radius for all cards, dialogs, and input fields.
- **Typography**: Heavy-weight "High-Command" labels with `2sp` letter spacing.

### 🛡️ Mandatory Logic & Security Protocols
1. **Strict Data Isolation**: Every Firestore query for the `registrations` collection **MUST** include the filter: `.whereEqualTo("assignedReviewerId", FirebaseAuth.getInstance().getCurrentUser().getUid())`. 
2. **High-Scale Performance**: Optimize all RecyclerViews to handle up to **10,000 records** using efficient pagination (limit 20-50 per page).
3. **Forensic Signatures**: Every write operation (status change, record creation) must trigger a companion write to the `audit_logs` collection containing the officer's name, action, and timestamp.

---

## 📂 Page-by-Page Functional Requirements

### 1. Identity Gateway (Login)
- **Functionality**: Firebase Email/Password authentication.
- **Logic**: Fetch the user's document from `/users/{uid}` on successful login to determine their `role` (admin vs. reviewer).

### 2. Officer Command Center (Dashboard)
- **Functionality**: 
    - 3 Stats Cards: Total Intake, Processed, and Awaiting Review.
    - Registration Velocity Chart: A line or area chart showing 7-day registration trends (MPAndroidChart).
    - Intelligence Feed: A vertically scrolling list of the latest `announcements`.
    - Active Duty Toggle: A switch that updates the `isDutyActive` boolean in the user's Firestore profile.

### 3. Registration Registry (Records)
- **Functionality**:
    - Searchable list of all registrations assigned to the current user.
    - Filters: Search by RID (29 digits), Name, or Phone.
    - Edit: Ability to modify applicant details or update status (Processed, Rejected, etc.).

### 4. Verification Terminal (Status Check)
- **Functionality**:
    - A searchable list of assigned applicant names on the left (or top).
    - Selecting a name opens an integrated `WebView` loading `https://resident.fayda.et/status?rid={ID}`.
    - Floating Action Buttons (FAB) or Overlay to quickly update the registry status based on the WebView result.

### 5. Production Hub (Printing)
- **Functionality**:
    - Queue displaying all records with status "Processed" where `isPrinted == false`.
    - "Select All" functionality and a "Bulk Mark as Printed" button.

### 6. Performance Intelligence (Analytics)
- **Functionality**:
    - Radial/Pie chart showing "Success Rate" (Processed vs Total).
    - Month-over-Month (MoM) growth percentage indicator.
    - Rejection Audit: A list view showing "Rejected" records and their specific `rejectionReason`.

### 7. Tactical Comms (Chat)
- **Functionality**:
    - Real-time messaging system using Firestore.
    - Group Channels and Direct Messages (DMs).
    - Push notifications for new incoming transmissions.

### 8. Admin Command (Admin Only)
- **Personnel Manager**: List/Add/Edit/Revoke access for all bureau officers.
- **Forensic Audit Ledger**: Searchable global list of all entries in the `audit_logs` collection.
- **Broadcast Center**: Create system-wide announcements with "Alert" or "Update" classifications.
- **Proxy Entry**: Interface to enter daily report totals on behalf of field units.

### 9. System Settings & Profile
- **Functionality**:
    - User Profile: Update name, region, cluster, and profile photo.
    - System Branding (Admin): Update the global Bureau Name and Logo URL.

---

## 🛠️ Synchronization Protocol

1. **Firestore Persistence**: Enable `FirebaseFirestoreSettings.setPersistenceEnabled(true)` to support field officers in low-connectivity zones.
2. **Date Protocol**: Standardize all date fields to **ISO8601 strings** for compatibility with the web terminal.
3. **Audit Accuracy**: Every action must log the `officerName` found in the User Profile, not just the UID.

© 2026 FaydaTrack Operations Group. Authorized Personnel Only.
