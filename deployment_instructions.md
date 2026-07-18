# Deployment Instructions for Fybot (VPS)

## 1️⃣ What was changed

| File | Purpose |
|------|---------|
| `src/config.ts` | Stores your **PAT token**, `APP_ID` (`1089` by default) and `ACCOUNT_ID` (`10229037`). |
| `src/api/derivOtp.ts` | Helper that calls Deriv's **OTP endpoint** and returns a WebSocket URL already authenticated. |
| `src/App.tsx` (imports) | Added `getOtpWebSocketUrl`, `APP_ID` and `ACCOUNT_ID` imports. |
| `src/App.tsx` (WebSocket logic) | Replaced the old proxy‑based connection (`ws.send({ authorize: … })`) with the **OTP flow** – fetch URL → open WebSocket directly – no `authorize` message. |
| `otp_test.cjs` (new) | Small script you can run on the VPS to verify the OTP flow before starting the full app. |

All other parts of the project remain unchanged.

---
## 2️⃣ How to transfer the updates to your VPS

You have several options. Choose the one you feel most comfortable with.

### Option A – Git (recommended)
1. **Commit locally**
   ```bash
   git add src/config.ts src/api/derivOtp.ts src/App.tsx otp_test.cjs
   git commit -m "Implement Deriv OTP authentication"
   ```
2. **Push to a remote repo** (GitHub, GitLab, Bitbucket, etc.)
   ```bash
   git push origin main   # or the branch you use
   ```
3. **On the VPS**
   ```bash
   cd /path/to/fybot   # directory where the project lives
   git pull origin main   # fetch the latest commit
   ```
4. Re‑install dependencies (if you added new ones) and restart:
   ```bash
   npm install          # only if package.json changed
   pm2 restart fybot   # or however you run the service
   ```

### Option B – scp / rsync (quick copy)
1. **Create a temporary archive locally**
   ```bash
   tar -czf fybot_update.tar.gz src/config.ts src/api/derivOtp.ts src/App.tsx otp_test.cjs
   ```
2. **Copy to the VPS** (replace `user@vps_ip` with your login details)
   ```bash
   scp fybot_update.tar.gz user@vps_ip:/tmp/
   ```
3. **Log into the VPS** and extract:
   ```bash
   ssh user@vps_ip
   cd /path/to/fybot
   tar -xzf /tmp/fybot_update.tar.gz -C .
   ```
4. **Install & restart**
   ```bash
   npm install          # if needed
   pm2 restart fybot   # or your start command
   ```

### Option C – FTP / SFTP client (GUI)
1. Open your favourite SFTP client (FileZilla, WinSCP, Cyberduck…).
2. Connect to the VPS with your SSH credentials.
3. Drag‑and‑drop the modified files (`src/config.ts`, `src/api/derivOtp.ts`, `src/App.tsx`, `otp_test.cjs`) to the same paths on the server, overwriting the old ones.
4. SSH into the VPS and run `npm install` (if you added new deps) and restart the process.

---
## 3️⃣ Verify the OTP flow on the VPS

Run the test script **before** starting the full UI:
```bash
node otp_test.cjs
```
You should see something like:
```
=== TESTE OTP - obtendo URL autenticada ===
✅ URL OTP recebida: wss://api.derivws.com/....
🟢 WebSocket conectado via OTP
📩 Mensagem da Deriv: {"msg_type":"balance", ...}
🔚 Conexão encerrada
```
If you get an error, double‑check:
- `src/config.ts` values (PAT token, APP_ID, ACCOUNT_ID).
- Network connectivity from the VPS to `api.derivws.com` (port 443).
- That the VPS time is correct (Deriv checks timestamps).

Once the test succeeds, start the app:
```bash
npm run dev      # for development (exposes http://<vps_ip>:5173)
# or
npm run build && npm start   # production mode
```
Open the public URL (or tunnel it with `ssh -L 5173:localhost:5173 user@vps_ip`) and check the console – you should see:
```
[FYBOT] WebSocket conectado via OTP
```
and the balance should display.

---
## 4️⃣ Optional – Switch back to your custom app_id
If you prefer to keep using your own `app_id = 36544` (the one Fybot originally used), just edit `src/config.ts`:
```ts
export const APP_ID = '36544';
```
Then repeat the transfer/restart steps and run `node otp_test.cjs` again.

---
## 5️⃣ TL;DR – One‑liner for a quick copy‑paste (scp & restart)
```bash
# From your local machine (Linux/macOS/WSL) – adjust paths/user/IP as needed
tar -czf fybot_update.tar.gz src/config.ts src/api/derivOtp.ts src/App.tsx otp_test.cjs && \
scp fybot_update.tar.gz user@vps_ip:/tmp/ && \
ssh user@vps_ip "cd /path/to/fybot && tar -xzf /tmp/fybot_update.tar.gz -C . && npm install && pm2 restart fybot && node otp_test.cjs"
```
The command packs the files, copies them, extracts, reinstalls deps, restarts the service and runs the OTP test in one go.

---
## 📌 Final checklist
- [ ] `src/config.ts` contains the correct **PAT token**, `APP_ID`, `ACCOUNT_ID`.
- [ ] `src/api/derivOtp.ts` present on the server.
- [ ] `src/App.tsx` imports the OTP helper and uses the async OTP block (already applied).
- [ ] Run `node otp_test.cjs` on the VPS – should return a balance.
- [ ] Restart the Fybot service and verify the dashboard shows the balance without `InvalidToken`.

If any step fails, copy the exact error message and let me know – I’ll help you troubleshoot further.

---
*Este documento foi gerado automaticamente por Antigravity, seu assistente de coding.*
