// This file is now deprecated - the token retrieval is handled by the API route
// Keeping it for backward compatibility during migration
export async function getDriveToken(): Promise<string | null> {
  try {
    const response = await fetch("/api/drive/token", {
      method: "GET",
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.log("[Auth] User not authenticated");
        return null;
      }
      console.error("Failed to get drive token:", response.status);
      return null;
    }

    const token = await response.text();
    return token || null;
  } catch (err) {
    console.error("Error getting drive token:", err);
    return null;
  }
}
