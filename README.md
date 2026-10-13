# 💸 PaisaMatters

> Split expenses effortlessly — track group spending, settle debts instantly, and focus on the adventure.

PaisaMatters makes splitting travel expenses with friends simple, fair, and stress-free.

---

## 🏗️ Project Structure

```
paisamatters/
├── api/            # .NET 10 Web API (C#)
│   ├── Properties/ # Launch profiles
│   ├── Program.cs  # API entry point
│   └── api.csproj  # Project file
├── web/            # Next.js 16 Frontend (React 19 + TypeScript)
│   ├── public/     # Static assets & images
│   └── src/app/    # App Router pages & components
├── .env.example    # Root environment template
├── .gitignore      # Monorepo-wide ignore rules
└── README.md       # This file
```

## ⚡ Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 20
- [.NET SDK](https://dotnet.microsoft.com/download) ≥ 10.0

### 1. Clone & Setup

```bash
git clone <repo-url> paisamatters
cd paisamatters
```

### 2. Frontend (Next.js)

```bash
cd web
cp .env.example .env.local   # Configure environment
npm install
npm run dev                   # → http://localhost:3000
```

### 3. Backend (API)

```bash
cd api
dotnet run                    # → http://localhost:5099
```

## 🛠️ Tech Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Frontend | Next.js 16, React 19, Tailwind CSS 4, GSAP, Framer Motion |
| Backend  | .NET 10, ASP.NET Core Web API       |
| Tooling  | TypeScript 5, ESLint 9, PostCSS     |

## 📄 License

Private — All rights reserved.

