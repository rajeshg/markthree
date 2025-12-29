import { getDriveToken } from './drive-auth';

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

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_API_BASE = 'https://www.googleapis.com/upload/drive/v3/files';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = await getDriveToken();
  
  if (!token) {
    throw new Error('Not authenticated with Google Drive');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Drive API error: ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export const driveApi = {
  async listFiles(folderId: string): Promise<DriveFile[]> {
    const query = `'${folderId}' in parents and trashed = false and mimeType = 'text/markdown'`;
    const url = `${DRIVE_API_BASE}?q=${encodeURIComponent(query)}&fields=files(id, name, mimeType, modifiedTime)&orderBy=modifiedTime desc`;
    const data = await fetchWithAuth(url);
    return data.files;
  },

  async getFileContent(fileId: string): Promise<string> {
    const token = await getDriveToken();
    const url = `${DRIVE_API_BASE}/${fileId}?alt=media`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch file content');
    return response.text();
  },

  async createFile(name: string, content: string, folderId: string): Promise<DriveFile> {
    const metadata = {
      name,
      mimeType: 'text/markdown',
      parents: [folderId],
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const body =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: text/markdown\r\n\r\n' +
      content +
      closeDelimiter;

    const url = `${UPLOAD_API_BASE}?uploadType=multipart&fields=id,name,mimeType,modifiedTime`;
    return fetchWithAuth(url, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });
  },

  async updateFile(fileId: string, content: string): Promise<void> {
    const url = `${UPLOAD_API_BASE}/${fileId}?uploadType=media`;
    await fetchWithAuth(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'text/markdown',
      },
      body: content,
    });
  },

  async deleteFile(fileId: string): Promise<void> {
    const url = `${DRIVE_API_BASE}/${fileId}`;
    await fetchWithAuth(url, {
      method: 'DELETE',
    });
  },

  async createFolder(name: string): Promise<DriveFolder> {
    const metadata = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };
    return fetchWithAuth(DRIVE_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });
  }
};
