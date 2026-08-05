
# FaydaTrack Bureau Terminal

A professional Next.js 15 application for official bureau registration tracking, real-time coordination, and AI-assisted operational triage.

## 🌟 Key Capabilities

- **Strict Data Isolation**: All operational terminals (Status, Performance, Registry) are strictly isolated to the signed-in user's assigned records.
- **Unified Registration Terminal**: Aggregates historical archives and live operational data since July 2025 into a single "Grand Aggregate" hub.
- **Verification Portal**: Synchronized status check terminal with direct RID insertion and real-time registry lookup. Displays internal status next to portal data for discrepancy detection.
- **Autonomous Archival**: Automatic background migration of completed monthly logs into the finalized historical ledger.
- **Performance Analysis**: Integrated Recharts-powered trend analysis and MoM (Month-over-Month) growth intelligence.

## 🚀 Deployment & Update Roadmap

### 1. Synchronize Changes with GitHub
Run these commands to commit the latest high-fidelity updates:

```bash
# Stage all changes
git add .


# Commit with a professional summary
git commit -m "Operational Update: Implemented Data Isolation, Auth-Guards, and Enhanced Verification UI"

# Push to your main branch
git push origin main
```

### 2. Troubleshooting "Authentication Failed"
GitHub no longer accepts account passwords for command-line authentication. You MUST use a **Personal Access Token (PAT)**:

1. **Generate a PAT**: Go to GitHub > Settings > Developer Settings > Personal Access Tokens (classic).
2. **Select Permissions**: Create a token with `repo` scope enabled.
3. **Push Again**: Run `git push origin main`.
4. **Password Prompt**: When prompted for your password, **paste the Token** you generated.

### 3. Configure Cloud Environment
Ensure the following variables are active in your deployment environment:

| Variable | Purpose |
| :--- | :--- |
| `GOOGLE_GENAI_API_KEY` | Powers AI Status Suggestions. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API Key. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase App ID. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain. |

---
© 2026 FaydaTrack Operations Group. Restricted Access.
