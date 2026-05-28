/**
 * Safely fetches a URL, logging issues and handling rate limit errors.
 */
export async function safeFetch(url: string, options?: RequestInit) {
  try {
    const res = await fetch(url, options);
    if (res.status === 429) {
      console.warn(`Request to ${url} was rate limited (429)`);
      return null;
    }
    if (!res.ok) {
      console.warn(`Request to ${url} failed with status: ${res.status}`);
      return null;
    }
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.warn(`Request to ${url} returned non-JSON content-type: ${contentType}`);
      return null;
    }
    return await res.json();
  } catch (e: any) {
    console.error(`Failed to fetch from ${url}:`, e);
    return null;
  }
}
