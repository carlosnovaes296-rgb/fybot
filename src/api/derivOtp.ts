// src/api/derivOtp.ts
export async function getOtpWebSocketUrl(
  patToken: string,
  appId: string,
  accountId: string,
  accountType: string = 'DEMO',
): Promise<{ url: string; balance: string; currency: string }> {
  const url = `/api/deriv/otp`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ patToken, appId, accountId, accountType })
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error?.message ?? `OTP proxy request failed: ${resp.status}`);
  }

  const data = await resp.json();
  if (!data?.data?.url) {
    throw new Error('OTP response missing URL');
  }
  return {
    url: data.data.url,
    balance: data.data.balance || '0',
    currency: data.data.currency || 'USD',
  };
}
