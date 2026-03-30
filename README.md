# 🎤 SpeakLift AI

**SpeakLift AI** is a real-time AI-powered English speaking coach that helps users improve fluency, grammar, and confidence through continuous voice-based conversations — directly in the browser.

---

## 🌐 Overview

SpeakLift AI enables users to:

* 🎙 Speak naturally using their microphone
* 🤖 Receive instant AI-generated responses
* ✏️ Get grammar corrections
* 📘 Understand mistakes with simple explanations
* 💬 Practice unlimited conversations

---

## 🚀 Features

* 🎤 Real-Time Voice Interaction
* ⚡ Fast AI Responses (low latency)
* ✏️ Grammar Correction + Suggestions
* 💡 Vocabulary Improvement Tips
* 🔁 Continuous Conversation Mode
* 🌙 Clean & Responsive UI (Mobile + Desktop)

---

## 🧠 Architecture

```text
User Browser 🎤
   ↓
Frontend (Vercel)
   ↓
Backend (Render)
   ↓
Groq AI (LLM)
   ↓
Response → Voice 🔊
```

---

## 🛠 Tech Stack

### Frontend

* React.js
* Web Speech API (Speech Recognition)
* SpeechSynthesis API (Text-to-Speech)

### Backend

* Node.js
* Express.js

### AI

* Groq API (LLM for fast responses)

---

## 📦 Local Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-username/speaklift-ai.git
cd speaklift-ai
```

---

### 2. Setup Backend

```bash
cd backend
npm install
npm start
```

---

### 3. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🚀 Deployment Guide (Free)

Deploy your app so anyone can access it from any device 🌍

---

### 🔹 Step 1 — Push to GitHub

```bash
git add .
git commit -m "feat: deployment ready"
git push
```

⚠️ Ensure `.env` files are in `.gitignore`
❌ Never push API keys to GitHub

---

### 🔹 Step 2 — Deploy Backend (Render)

Use Render

1. Go to https://render.com → Sign up with GitHub
2. Click **New + → Web Service**
3. Select your repository

#### Settings:

| Field          | Value                 |
| -------------- | --------------------- |
| Name           | english-coach-backend |
| Root Directory | backend               |
| Runtime        | Node                  |
| Build Command  | npm install           |
| Start Command  | node server.js        |
| Instance Type  | Free                  |

#### Environment Variables:

| Key  | Value |
| ---- | ----- |
| PORT | 5000  |

⚠️ Do NOT add API key here (users provide their own)

After deployment, you’ll get:

```text
https://english-coach-backend.onrender.com
```

---

### 🔹 Step 3 — Deploy Frontend (Vercel)

Use Vercel

1. Go to https://vercel.com → Sign up with GitHub
2. Click **Add New Project**
3. Select your repository

#### Settings:

* Root Directory → `frontend`

#### Environment Variable:

| Key          | Value                                      |
| ------------ | ------------------------------------------ |
| VITE_API_URL | https://english-coach-backend.onrender.com |

Click **Deploy**

After deployment:

```text
https://your-app.vercel.app
```

---

### 🔹 Step 4 — Test

Open your app on:

* 💻 Laptop
* 📱 Mobile
* 🌍 Any device

👉 Users will:

1. Enter their Groq API key
2. Start speaking instantly 🎤

---

## 📱 Mobile Support

| Feature            | Support                |
| ------------------ | ---------------------- |
| Speech Recognition | ✅ Chrome / Edge        |
| Text-to-Speech     | ✅                      |
| Responsive UI      | ✅                      |
| Microphone Access  | ⚠️ Permission required |

---

## 🔄 Updates

After pushing new code:

* Vercel → Auto deploy frontend ✅
* Render → Auto deploy backend ✅

---

## 💸 Cost Summary

| Service  | Cost                              |
| -------- | --------------------------------- |
| Vercel   | 🆓 Free                           |
| Render   | 🆓 Free (sleeps after inactivity) |
| Groq API | 🆓 Free tier                      |
| Total    | $0                                |

⚠️ Note: Render free tier sleeps after 15 minutes inactivity (first request may take ~30s)

---

## 🎯 Goal

To build a **24/7 personal AI English speaking coach** that is:

* Accessible anywhere 🌍
* Fast ⚡
* Easy to use 🎯

---

## 🔮 Future Improvements

* 📊 Speaking analytics
* 🧪 Interview / IELTS mode
* 👤 User login system
* 🌐 Multi-language support
* 📱 Native mobile app

---

## 🤝 Contributing

Feel free to fork and contribute!

---

## 📄 License

For educational use.

---

## ⭐ Support

If you like this project, give it a ⭐ on GitHub!

---

## 👨‍💻 Author

Developed by **Your Name**

---

**SpeakLift AI – Speak Better, Instantly 🚀**
