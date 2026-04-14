// Google Drive API configuration
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

let gapiReady = false;
let tokenClient: any = null;
let accessToken = '';
let tokenPromiseResolve: ((value: void) => void) | null = null;

// Initialize Google API with improved error handling
export const initializeGapi = async () => {
  if (gapiReady) return;

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/platform.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      (window as any).gapi.load('client', async () => {
        try {
          await (window as any).gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
          });
          gapiReady = true;
          resolve();
        } catch (error) {
          console.error('GAPI initialization failed:', error);
          reject(new Error('Failed to initialize Google API'));
        }
      });
    };
    script.onerror = () => {
      reject(new Error('Failed to load Google API script'));
    };
    document.head.appendChild(script);
  });
};

// Initialize OAuth token client
export const initializeTokenClient = async () => {
  if (tokenClient) return;

  return new Promise<void>((resolve, reject) => {
    try {
      tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (response: any) => {
          if (response.access_token) {
            accessToken = response.access_token;
            console.log('Successfully obtained access token');
            if (tokenPromiseResolve) {
              tokenPromiseResolve();
              tokenPromiseResolve = null;
            }
          } else {
            console.error('No access token in response:', response);
          }
        },
        error_callback: (error: any) => {
          console.error('OAuth error:', error);
        },
      });
      resolve();
    } catch (error) {
      console.error('Token client initialization failed:', error);
      reject(new Error('Failed to initialize OAuth'));
    }
  });
};

export const signIn = async (): Promise<void> => {
  await initializeTokenClient();
  
  return new Promise((resolve, reject) => {
    try {
      if (accessToken) {
        resolve();
        return;
      }

      // Set up a promise to wait for the callback
      tokenPromiseResolve = () => {
        resolve();
      };

      // Request token with consent prompt
      tokenClient.requestAccessToken({ prompt: 'consent' });

      // Set timeout as fallback in case callback doesn't fire
      const timeout = setTimeout(() => {
        if (accessToken) {
          resolve();
        } else {
          reject(new Error('Token request timed out'));
        }
      }, 5000);

      // Clear timeout if token arrives
      const originalResolve = tokenPromiseResolve;
      tokenPromiseResolve = () => {
        clearTimeout(timeout);
        if (originalResolve) originalResolve();
      };
    } catch (error) {
      reject(error);
    }
  });
};

export const signOut = async (): Promise<void> => {
  if (accessToken) {
    (window as any).google.accounts.oauth2.revoke(accessToken, () => {
      console.log('Token revoked');
    });
    accessToken = '';
  }
};

export const isSignedIn = (): boolean => {
  return !!accessToken;
};

export const uploadFileToDrive = async (
  file: File,
  folderId?: string
): Promise<{ id: string; name: string; webViewLink: string }> => {
  if (!accessToken) {
    throw new Error('Not authenticated with Google Drive');
  }

  const metadata = {
    name: file.name,
    mimeType: file.type,
    parents: folderId ? [folderId] : undefined,
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  try {
    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Upload failed: ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json();
    return {
      id: result.id,
      name: result.name,
      webViewLink: result.webViewLink,
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

export const createFolder = async (name: string, parentId?: string): Promise<string> => {
  if (!accessToken) {
    throw new Error('Not authenticated with Google Drive');
  }

  const metadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentId ? [parentId] : undefined,
  };

  try {
    const response = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      throw new Error(`Failed to create folder: ${response.statusText}`);
    }

    const result = await response.json();
    return result.id;
  } catch (error) {
    console.error('Folder creation error:', error);
    throw error;
  }
};

export const getOrCreateTextbooksFolder = async (): Promise<string> => {
  if (!accessToken) {
    throw new Error('Not authenticated with Google Drive');
  }

  try {
    // Check if 'Textbooks' folder exists
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='Textbooks' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to list folders: ${response.statusText}`);
    }

    const result = await response.json();
    if (result.files && result.files.length > 0) {
      return result.files[0].id;
    }

    // Create the folder if it doesn't exist
    return await createFolder('Textbooks');
  } catch (error) {
    console.error('Get/create folder error:', error);
    throw error;
  }
};

export const listTextbooksFromDrive = async (): Promise<Array<{ id: string; name: string; webViewLink: string }>> => {
  if (!accessToken) {
    throw new Error('Not authenticated with Google Drive');
  }

  try {
    const folderId = await getOrCreateTextbooksFolder();
    
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,webViewLink,mimeType)&pageSize=50`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to list files: ${response.statusText}`);
    }

    const result = await response.json();
    return result.files || [];
  } catch (error) {
    console.error('List files error:', error);
    throw error;
  }
};