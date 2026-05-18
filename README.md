
# FaydaTrack Bureau Terminal

A professional Next.js 15 application for bureau registration tracking, real-time coordination, and AI-assisted status management.

## 🚀 Deployment & Update Roadmap

### 1. Synchronize Changes with GitHub
If you have already initialized your repository, run these commands to push the latest updates:

```bash
# Stage all changes
git add .

# Commit with a professional message
git commit -m "Branding Update: Rebranded to FaydaTrack and updated official logo"

# Push to your existing main branch
git push origin main
```

### 2. Connect to Vercel
1.  **Import**: Select your GitHub repository in the [Vercel Dashboard](https://vercel.com/new).
2.  **Configure Environment Variables**:
    In Vercel project settings, provide the following variables for live cloud connectivity:

    | Variable | Purpose |
    | :--- | :--- |
    | `GOOGLE_GENAI_API_KEY` | Powers AI Status Suggestions. |
    | `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API Key. |
    | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID. |
    | `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase App ID. |
    | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain. |

3.  **Deploy**: Click deploy. Vercel will build the terminal using Node.js 20.

---
© 2026 Bureau Operations Group. Restricted Access.
