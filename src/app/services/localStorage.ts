// Local browser storage is intentionally disabled.
// Textbook persistence is handled only through Google Drive.

export interface LocalFileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  uploadedAt: string;
}

// Convert file to data URL (kept for compatibility with existing imports).
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function storeFileLocally(file: File): Promise<LocalFileInfo> {
  const dataUrl = await fileToDataUrl(file);
  return {
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    name: file.name,
    size: file.size,
    type: file.type,
    dataUrl,
    uploadedAt: new Date().toISOString(),
  };
}

export function getStoredFiles(): LocalFileInfo[] {
  return [];
}

export function deleteStoredFile(_fileId: string): void {
  // No-op: local browser storage removed.
}

export function getStorageInfo(): { used: number; available: number; files: number } {
  return {
    used: 0,
    available: 0,
    files: 0,
  };
}

export function clearAllStoredFiles(): void {
  // No-op: local browser storage removed.
}