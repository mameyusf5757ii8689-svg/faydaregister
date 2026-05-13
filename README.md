# RegistraTrack Bureau Terminal

A professional Next.js 15 application for bureau registration tracking, real-time coordination, and AI-assisted status management.

## 🚀 Publication Roadmap

### 1. Initialize Git & Push to GitHub
Run these commands in your terminal to synchronize this terminal with your repository:

```bash
git init
git add .
git commit -m "Initialize professional bureau terminal"
# Replace with your actual repository URL:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
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
