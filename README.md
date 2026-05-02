# RegistraTrack Bureau Terminal

A professional Next.js 15 application for bureau registration tracking, real-time coordination, and AI-assisted status management.

## 🛠 Features

- **Officer Command**: Personnel management and RBAC.
- **Real-time Synchronization**: Firestore-powered data isolation for field officers.
- **AI Status Suggestions**: Genkit-powered triage assistant.
- **Intelligence Feed**: Synchronized personal alerts and bureau broadcasts.
- **Secure Deletion**: Blocking UI protocols for high-stakes record purging.

---

## 🚀 Deployment Instructions

### 1. Push to GitHub
If you haven't initialized git yet, run these commands in your terminal:

```bash
git init
git add .
git commit -m "Initialize RegistraTrack Bureau Terminal"
# Create a repository on GitHub, then link it:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### 2. Connect to Vercel
1.  **Import**: Connect your GitHub repository in the [Vercel Dashboard](https://vercel.com/new).
2.  **Configure Environment Variables**:
    In the Vercel project settings, add the following variables:

    | Variable | Purpose |
    | :--- | :--- |
    | `GOOGLE_GENAI_API_KEY` | Required for Genkit AI features (Gemini). |
    | `NEXT_PUBLIC_FIREBASE_API_KEY` | Your Firebase Web API Key. |
    | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Your Firebase Project ID. |
    | `NEXT_PUBLIC_FIREBASE_APP_ID` | Your Firebase App ID. |
    | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Your Firebase Auth Domain. |

3.  **Deploy**: Click deploy. Vercel will automatically detect the Next.js framework and build the terminal.

---
© 2026 Bureau Operations Group. Restricted Access.
