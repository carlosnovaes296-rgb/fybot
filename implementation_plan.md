# Implementation Plan

## Goal
Replace the current Deriv WebSocket authentication flow (sending `authorize` with a PAT token) with the official OTP flow required for `pat_` tokens. This will allow the Fybot to connect using the new token format.

## User Review Required
> [!IMPORTANT] The changes affect the core WebSocket connection logic (authentication, balance retrieval, and error handling). Verify that you are comfortable with the new OTP flow and that the `ACCOUNT_ID` (`10229037`) is correct for your Deriv account.

## Open Questions
- **Confirm APP_ID**: We used `1089` (Deriv official app). If you prefer to keep the custom `36544`, let us know.
- **Rate limits**: The OTP endpoint may have a rate limit (e.g., one request per 30 seconds). Ensure the bot does not request OTP too frequently.

## Proposed Changes
---
### src/config.ts [NEW]
```ts
export const PAT_TOKEN = 'pat_2a1d3689233b4f508b3fd03b35943b09d563406359d8caaedcb96fb75f8921d0';
export const APP_ID = '1089'; // can be changed to 36544 if needed
export const ACCOUNT_ID = '10229037'; // your Deriv account ID
```
---
### src/api/derivOtp.ts [NEW]
```ts
export async function getOtpWebSocketUrl(
  patToken: string,
  appId: string,
  accountId: string,
): Promise<string> {
  const url = `https://api.derivws.com/trading/v1/options/accounts/${accountId}/otp`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${patToken}`,
      'Deriv-App-ID': appId,
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error?.message ?? `OTP request failed: ${resp.status}`);
  }
  const data = await resp.json();
  if (!data?.data?.url) {
    throw new Error('OTP response missing URL');
  }
  return data.data.url;
}
```
---
### src/App.tsx [MODIFY]
Add imports at the top:
```tsx
import { getOtpWebSocketUrl } from './api/derivOtp';
import { APP_ID, ACCOUNT_ID } from './config';
```
Replace the original WebSocket creation block (lines ~694‑701) with the OTP‑based async block (already applied). The new block will:
1. Call `getOtpWebSocketUrl(tokenToSend, APP_ID, ACCOUNT_ID)`.
2. Create the WebSocket using the returned URL.
3. Remove the `ws.send({ authorize: … })` call.
4. Log success or error.
---
### src/App.tsx [MODIFY] (error handling)
The existing `ws.onmessage` handler already checks for `msg_type === 'authorize'`. Since the OTP flow does not send an `authorize` message, the block will simply be ignored, and the balance subscription will work as before.
---
## Verification Plan
### Automated
- Add unit test `src/api/derivOtp.test.ts` mocking `fetch` to return a fake OTP URL and asserting the function resolves correctly.
- Run existing test suite (`npm test`) to ensure no regressions.

### Manual
1. Run the app (`npm run dev`).
2. Open the dashboard in the browser.
3. The console should show `[FYBOT] WebSocket conectado via OTP`.
4. The balance should appear and updates should work without "InvalidToken" errors.
5. Inspect the network tab to verify a POST request to the OTP endpoint.

---
**Please confirm the APP_ID and that the ACCOUNT_ID `10229037` is correct. Once approved, I will commit the changes and you can test the new flow.**
