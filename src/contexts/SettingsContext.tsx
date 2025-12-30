import { createContext, useContext, useEffect, useState } from "react";

interface FolderPath {
  id: string;
  name: string;
}

interface Settings {
  lineNumbers: boolean;
  driveFolderId: string | null;
  driveFolderName: string | null;
  autoSave: boolean;
  currentFolderId: string | null;
  currentFolderName: string | null;
  folderPath: FolderPath[];
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  navigateToFolder: (folderId: string, folderName: string) => void;
  navigateToParent: () => void;
  navigateToRoot: () => void;
}

const defaultSettings: Settings = {
  lineNumbers: true,
  driveFolderId: null,
  driveFolderName: null,
  autoSave: true,
  currentFolderId: null,
  currentFolderName: null,
  folderPath: [],
};

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("app-settings");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Merge with defaults to ensure all new properties are present
          return { ...defaultSettings, ...parsed };
        } catch (error) {
          console.warn("Failed to parse settings from localStorage:", error);
          return defaultSettings;
        }
      }
    }
    return defaultSettings;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("app-settings", JSON.stringify(settings));
    }
  }, [settings]);

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings((prev) => {
      const newSettings = { ...prev, ...updates };

      // If drive folder is being set and current folder is not set, initialize it
      if (updates.driveFolderId && !prev.currentFolderId) {
        newSettings.currentFolderId = updates.driveFolderId;
        newSettings.currentFolderName =
          updates.driveFolderName || prev.driveFolderName;
      }

      return newSettings;
    });
  };

  const navigateToFolder = (folderId: string, folderName: string) => {
    setSettings((prev) => {
      const newPath = [...(prev.folderPath || [])];
      if (prev.currentFolderId) {
        newPath.push({
          id: prev.currentFolderId,
          name: prev.currentFolderName || "",
        });
      }
      return {
        ...prev,
        currentFolderId: folderId,
        currentFolderName: folderName,
        folderPath: newPath,
      };
    });
  };

  const navigateToParent = () => {
    setSettings((prev) => {
      const newPath = [...(prev.folderPath || [])];
      const parent = newPath.pop();
      return {
        ...prev,
        currentFolderId: parent?.id || prev.driveFolderId,
        currentFolderName: parent?.name || prev.driveFolderName,
        folderPath: newPath,
      };
    });
  };

  const navigateToRoot = () => {
    setSettings((prev) => ({
      ...prev,
      currentFolderId: prev.driveFolderId,
      currentFolderName: prev.driveFolderName,
      folderPath: [],
    }));
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        navigateToFolder,
        navigateToParent,
        navigateToRoot,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
