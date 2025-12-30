import { getDriveToken } from "@/routes/api/drive/token";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  content?: string;
}

export interface DriveFolder {
  id: string;
  name: string;
}

// Utility function to handle authentication failures
function handleAuthFailure() {
  // Clear any cached data
  if (typeof window !== "undefined") {
    // Only redirect if we're not already on the home page
    if (window.location.pathname !== "/") {
      console.warn("[Drive] Authentication failed, redirecting to login");
      // Use replace to avoid back-button loops
      window.location.replace("/");
    }
  }
}

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3/files";
const UPLOAD_API_BASE = "https://www.googleapis.com/upload/drive/v3/files";

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = await getDriveToken();

  if (!token) {
    // Redirect to login if no token available
    handleAuthFailure();
    throw new Error("Not authenticated with Google Drive");
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    // Handle authentication errors by redirecting to login
    if (response.status === 401 || response.status === 403) {
      handleAuthFailure();
      throw new Error("Authentication expired. Redirecting to login...");
    }

    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error?.message || `Drive API error: ${response.status}`,
    );
  }

  if (response.status === 204) return null;
  return response.json();
}

export const driveApi = {
  async listFiles(folderId: string): Promise<DriveFile[]> {
    const query = `'${folderId}' in parents and trashed = false`;
    const url = `${DRIVE_API_BASE}?q=${encodeURIComponent(query)}&fields=files(id, name, mimeType, modifiedTime)&orderBy=modifiedTime desc`;
    const data = await fetchWithAuth(url);

    // Sort items: folders first, then .md files, then others, all by modifiedTime desc
    const items = data.files || [];
    return items.sort((a: DriveFile, b: DriveFile) => {
      const aIsFolder = a.mimeType === "application/vnd.google-apps.folder";
      const bIsFolder = b.mimeType === "application/vnd.google-apps.folder";
      const aIsMd = a.name.toLowerCase().endsWith(".md");
      const bIsMd = b.name.toLowerCase().endsWith(".md");

      // Folders first
      if (aIsFolder && !bIsFolder) return -1;
      if (!aIsFolder && bIsFolder) return 1;

      // Within same type, .md files before other files
      if (!aIsFolder && !bIsFolder) {
        if (aIsMd && !bIsMd) return -1;
        if (!aIsMd && bIsMd) return 1;
      }

      // If same type, sort by modifiedTime desc (already done by API)
      return 0;
    });
  },

  async getFileMetadata(fileId: string): Promise<DriveFile> {
    const url = `${DRIVE_API_BASE}/${fileId}?fields=id,name,mimeType,modifiedTime`;
    return fetchWithAuth(url);
  },

  async getFileContent(fileId: string): Promise<string> {
    const token = await getDriveToken();
    const url = `${DRIVE_API_BASE}/${fileId}?alt=media`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch file content");
    return response.text();
  },

  async createFile(
    name: string,
    content: string,
    folderId: string,
  ): Promise<DriveFile> {
    const metadata = {
      name,
      mimeType: "text/markdown",
      parents: [folderId],
    };

    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const body =
      delimiter +
      "Content-Type: application/json\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: text/markdown\r\n\r\n" +
      content +
      closeDelimiter;

    const url = `${UPLOAD_API_BASE}?uploadType=multipart&fields=id,name,mimeType,modifiedTime`;
    return fetchWithAuth(url, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    });
  },

  async updateFile(fileId: string, content: string): Promise<void> {
    const url = `${UPLOAD_API_BASE}/${fileId}?uploadType=media`;
    await fetchWithAuth(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "text/markdown",
      },
      body: content,
    });
  },

  async renameFile(fileId: string, newName: string): Promise<void> {
    const url = `${DRIVE_API_BASE}/${fileId}`;
    await fetchWithAuth(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: newName.endsWith(".md") ? newName : `${newName}.md`,
      }),
    });
  },

  async deleteFile(fileId: string): Promise<void> {
    const url = `${DRIVE_API_BASE}/${fileId}`;
    await fetchWithAuth(url, {
      method: "DELETE",
    });
  },

  async createFolder(name: string): Promise<DriveFolder> {
    const query = `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const url = `${DRIVE_API_BASE}?q=${encodeURIComponent(query)}&fields=files(id, name)`;
    const existing = await fetchWithAuth(url);

    if (existing.files && existing.files.length > 0) {
      return existing.files[0];
    }

    const metadata = {
      name,
      mimeType: "application/vnd.google-apps.folder",
    };
    return fetchWithAuth(DRIVE_API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    });
  },

  async uploadImage(file: File, folderId: string): Promise<DriveFile> {
    const metadata = {
      name: file.name,
      mimeType: file.type,
      parents: [folderId],
    };

    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const reader = new FileReader();
    const fileContent: ArrayBuffer = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });

    const metadataPart =
      delimiter +
      "Content-Type: application/json\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${file.type}\r\n\r\n`;

    // Combine metadata and binary file content
    const metadataBuffer = new TextEncoder().encode(metadataPart);
    const closeBuffer = new TextEncoder().encode(closeDelimiter);

    const body = new Uint8Array(
      metadataBuffer.length + fileContent.byteLength + closeBuffer.length,
    );
    body.set(metadataBuffer);
    body.set(new Uint8Array(fileContent), metadataBuffer.length);
    body.set(closeBuffer, metadataBuffer.length + fileContent.byteLength);

    const url = `${UPLOAD_API_BASE}?uploadType=multipart&fields=id,name,mimeType`;
    return fetchWithAuth(url, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    });
  },

  async searchFiles(query: string): Promise<DriveFile[]> {
    const q = `name contains '${query}' and mimeType = 'text/markdown' and trashed = false`;
    const url = `${DRIVE_API_BASE}?q=${encodeURIComponent(q)}&fields=files(id, name, mimeType, modifiedTime)&pageSize=10`;
    const data = await fetchWithAuth(url);
    return data.files || [];
  },

  async getFileBlob(fileId: string): Promise<Blob> {
    const token = await getDriveToken();
    if (!token) {
      throw new Error("No authentication token available");
    }
    const url = `${DRIVE_API_BASE}/${fileId}?alt=media`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch image (${response.status}): ${errorText}`,
      );
    }

    const blob = await response.blob();
    return blob;
  },

  async getImageUrl(fileId: string): Promise<string> {
    const token = await getDriveToken();
    if (!token) {
      return "";
    }
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&access_token=${token}`;
    return url;
  },
};
