# M✦N Chat

Private terminal-style chat app for **Mahim** & **Nur**.

---

## Features
- 🟢 Real-time messaging via SSE (Server-Sent Events)
- 📎 Share images, videos, audio (record in-app), PDFs & documents
- 🔔 Web push notifications
- 💾 Vercel Blob storage for all files & messages
- 🔐 Login saved in browser localStorage
- 📱 Mobile-friendly, works as PWA
- 🖥️ Terminal / hacker aesthetic

## Credentials
| User | Password |
|------|----------|
| Mahim | 3078323 |
| Nur | nurhafiza |

---

## Local Development (Termux / Any machine)

```bash
# Install deps
npm install

# Set env variable
export BLOB_READ_WRITE_TOKEN=your_token_here

# Start server on port 4758
npm start
# → http://localhost:4758
```

---

## Deploy to Vercel

1. Push to GitHub / GitLab
2. Import project in Vercel dashboard
3. Add environment variable:
   - **Name:** `BLOB_READ_WRITE_TOKEN`
   - **Value:** your Vercel Blob token (from Storage → Blob → Connect)
4. Deploy!

### Get Blob Token
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **Storage** → **Create** → **Blob**
3. Connect to your project
4. Copy the `BLOB_READ_WRITE_TOKEN`

---

## File Structure (flat, all in root)
```
server.js          ← Express server (API + static)
package.json
vercel.json        ← Vercel config
public/
  index.html       ← Full SPA frontend
  manifest.json    ← PWA manifest
  icon.png         ← App icon
```

---

## Vercel Optimization Notes
- All messages stored in a **single JSON blob** → minimal list() calls
- SSE polling done **server-side once**, broadcast to all clients
- File uploads go directly to Blob, no base64 overhead
- Single serverless function handles all routes
