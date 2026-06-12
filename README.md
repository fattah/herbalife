# Herbalife Pharmaceuticals – Sales Force Communication Hub

A React web application for managing and tracking communication with sales representatives across Bangladesh.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed ([nodejs.org](https://nodejs.org))
- npm 8+

### Installation

```bash
# 1. Extract the zip and enter the folder
cd herbalife-pharma

# 2. Install dependencies
npm install

# 3. Start the development server
npm start
```

The app will open at **http://localhost:3000**

---

## 🔐 Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `changeit2026` |
| Superadmin | `superadmin` | `secretmanager` |

> **Important:** On first launch, the app will auto-seed these two accounts in Firebase. This happens once.

---

## 🔥 Firebase Setup (Required)

You need to configure these Firebase services:

### 1. Authentication
- Go to **Firebase Console → Authentication → Sign-in method**
- Enable **Email/Password** provider

### 2. Firestore Database
- Go to **Firestore Database → Create database**
- Start in **test mode** (we provide rules below)
- Select a region close to Bangladesh (e.g., `asia-south1`)

### 3. Storage
- Go to **Storage → Get started**
- Start in test mode

### 4. Apply Security Rules

**Firestore Rules** (Firebase Console → Firestore → Rules):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Storage Rules** (Firebase Console → Storage → Rules):
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 📁 Project Structure

```
src/
├── firebase/
│   ├── config.js          # Firebase configuration
│   └── seed.js            # Auto-seeds default admin accounts
├── contexts/
│   └── AuthContext.js     # Authentication state & functions
├── data/
│   └── bangladeshData.js  # All 64 districts + ~500 thanas
├── utils/
│   └── agentUtils.js      # Status logic, formatting helpers
├── components/
│   ├── Sidebar.js         # Navigation sidebar
│   ├── AgentPanel.js      # Right slide-out panel with call history
│   ├── AgentFormModal.js  # Add/Edit agent form
│   ├── MoveAgentModal.js  # Move agent to new thana
│   └── BulkUploadModal.js # XLS bulk import + sample download
├── pages/
│   ├── LoginPage.js       # Login screen
│   ├── DashboardPage.js   # Overview stats and recent activity
│   ├── AgentsPage.js      # Full agent list with filter/search/pagination
│   ├── MapPage.js         # Interactive Bangladesh map
│   ├── AdminsPage.js      # Admin user management
│   └── ProfilePage.js     # Profile & password change
└── index.css              # All styles (olive green theme)
```

---

## ✨ Features

1. **Authentication** — Username/password login for central admins
2. **Agent Management** — Add, edit, delete, filter, and paginate agents
3. **Bulk Upload** — Import agents from XLS with sample file download
4. **Call Logging** — Log calls with notes and status (Complete / Follow-up / Incomplete)
5. **Status Indicators** — 🔴 Overdue (no call in 7+ days or incomplete), 🟡 Follow-up, 🟢 Up to date
6. **Interactive Map** — Bangladesh map with color-coded pins per agent status
7. **Agent Transfer** — Move agents between thanas (history preserved)
8. **Admin Management** — Add/manage admins; superadmin can delete admins
9. **Profile Settings** — Change name, username, and password

---

## 📊 Firestore Collections

| Collection | Description |
|---|---|
| `admins` | Admin user profiles |
| `agents` | Sales representative data |
| `callHistory` | Call log entries (linked to agents) |
| `territoryHistory` | Agent transfer history |
| `system` | App metadata (seed flag) |

---

## 🛠 Build for Production

```bash
npm run build
```

Outputs to `build/` folder — deploy to Firebase Hosting, Netlify, or any static host.

---

## 🎨 Color Theme

| Color | Hex | Usage |
|---|---|---|
| Olive Dark | `#3F4A1E` | Sidebar background |
| Olive | `#5C6B2E` | Primary buttons |
| Olive Light | `#8A9E45` | Accents |
| Olive Faint | `#EFF3E0` | Backgrounds |

---

Built with React 18, Firebase 10, React-Leaflet, and XLSX.
