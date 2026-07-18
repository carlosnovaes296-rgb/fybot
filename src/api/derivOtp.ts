// src/api/derivOtp.ts
export async function getOtpWebSocketUrl(
  patToken: string,
  appId: string,
  accountId: string,
): Promise<string> {
  const url = `/api/deriv/otp`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ patToken, appId, accountId })
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error?.message ?? `OTP proxy request failed: ${resp.status}`);
  }

  const data = await resp.json();
  if (!data?.data?.url) {
    throw new Error('OTP response missing URL');
  }
  return data.data.url;
}
