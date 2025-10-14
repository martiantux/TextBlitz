// Snippet Pack Manager - handles importing, exporting, and managing snippet packs

import { SnippetPack, Snippet, InstalledPack, CustomFolder } from './types';
import { StorageManager } from './storage';

export interface PackInstallOptions {
  mode: 'all' | 'selected'; // Import all or let user select
  selectedSnippetIds?: string[]; // If mode is 'selected'
  conflictResolution: 'skip' | 'rename' | 'replace'; // How to handle trigger conflicts
  createFolder?: boolean; // Create dedicated folder for this pack
}

export interface PackConflict {
  packSnippetId: string;
  existingSnippetId: string;
  trigger: string;
}

export class PackManager {
  // Check for trigger conflicts before installation
  static async checkConflicts(pack: SnippetPack, snippetIds?: string[]): Promise<PackConflict[]> {
    const existingSnippets = await StorageManager.getSnippets();
    const conflicts: PackConflict[] = [];

    const snippetsToCheck = snippetIds
      ? pack.snippets.filter(s => snippetIds.includes(s.id))
      : pack.snippets;

    for (const packSnippet of snippetsToCheck) {
      for (const [existingId, existingSnippet] of Object.entries(existingSnippets)) {
        if (existingSnippet.trigger.toLowerCase() === packSnippet.trigger.toLowerCase()) {
          conflicts.push({
            packSnippetId: packSnippet.id,
            existingSnippetId: existingId,
            trigger: packSnippet.trigger,
          });
        }
      }
    }

    return conflicts;
  }

  // Install a pack with specified options
  static async installPack(pack: SnippetPack, options: PackInstallOptions): Promise<{ success: boolean; installedCount: number; skippedCount: number }> {
    const existingSnippets = await StorageManager.getSnippets();
    let snippetsToInstall = options.mode === 'selected' && options.selectedSnippetIds
      ? pack.snippets.filter(s => options.selectedSnippetIds!.includes(s.id))
      : pack.snippets;

    let installedCount = 0;
    let skippedCount = 0;
    const installedSnippetIds: string[] = [];

    // Create folder if requested
    let folderId: string | undefined;
    if (options.createFolder) {
      const settings = await StorageManager.getSettings();
      const customFolders = settings.customFolders || [];

      // Check if folder already exists
      const existingFolder = customFolders.find(f => f.name === pack.name);
      if (existingFolder) {
        folderId = existingFolder.id;
      } else {
        // Create new folder
        folderId = `pack-${pack.id}`;
        const newFolder: CustomFolder = {
          id: folderId,
          name: pack.name,
          icon: pack.icon,
          order: customFolders.length,
        };
        customFolders.push(newFolder);
        settings.customFolders = customFolders;
        await StorageManager.saveSettings(settings);
      }
    }

    // Install snippets
    for (const packSnippet of snippetsToInstall) {
      // Check for conflicts
      const conflictExists = Object.values(existingSnippets).some(
        s => s.trigger.toLowerCase() === packSnippet.trigger.toLowerCase()
      );

      if (conflictExists) {
        if (options.conflictResolution === 'skip') {
          skippedCount++;
          continue;
        } else if (options.conflictResolution === 'rename') {
          // Append pack name to trigger
          packSnippet.trigger = `${packSnippet.trigger}_${pack.id.substring(0, 3)}`;
        } else if (options.conflictResolution === 'replace') {
          // Find and delete the existing snippet
          const existingId = Object.entries(existingSnippets).find(
            ([_, s]) => s.trigger.toLowerCase() === packSnippet.trigger.toLowerCase()
          )?.[0];
          if (existingId) {
            await StorageManager.deleteSnippet(existingId);
          }
        }
      }

      // Generate unique ID for this installation
      const newSnippet: Snippet = {
        ...packSnippet,
        id: `${pack.id}-${packSnippet.id}-${Date.now()}`,
        folder: folderId || packSnippet.folder,
        createdAt: Date.now(),
        usageCount: 0,
      };

      await StorageManager.saveSnippet(newSnippet);
      installedSnippetIds.push(newSnippet.id);
      installedCount++;
    }

    // Track installed pack
    const installedPack: InstalledPack = {
      packId: pack.id,
      version: pack.version,
      installedAt: Date.now(),
      enabled: true,
      snippetIds: installedSnippetIds,
    };

    // Save to storage (would need to add installedPacks to StorageManager)
    const data = await StorageManager.exportData();
    const installedPacks = data.installedPacks || {};
    installedPacks[pack.id] = installedPack;

    // Update storage with installed packs info
    await chrome.storage.local.set({ installedPacks });

    return { success: true, installedCount, skippedCount };
  }

  // Get list of installed packs
  static async getInstalledPacks(): Promise<Record<string, InstalledPack>> {
    const result = await chrome.storage.local.get(['installedPacks']);
    return result.installedPacks || {};
  }

  // Uninstall a pack (removes all snippets from that pack)
  static async uninstallPack(packId: string): Promise<boolean> {
    const installedPacks = await this.getInstalledPacks();
    const pack = installedPacks[packId];

    if (!pack) {
      return false;
    }

    // Delete all snippets from this pack
    for (const snippetId of pack.snippetIds) {
      try {
        await StorageManager.deleteSnippet(snippetId);
      } catch (error) {
        console.warn(`Failed to delete snippet ${snippetId}:`, error);
      }
    }

    // Remove from installed packs
    delete installedPacks[packId];
    await chrome.storage.local.set({ installedPacks });

    return true;
  }

  // Export current snippets as a custom pack
  static async exportAsPack(
    name: string,
    description: string,
    icon: string,
    author: string,
    snippetIds: string[],
    tags: string[]
  ): Promise<SnippetPack> {
    const allSnippets = await StorageManager.getSnippets();
    const selectedSnippets = snippetIds
      .map(id => allSnippets[id])
      .filter(s => s !== undefined);

    const pack: SnippetPack = {
      id: `custom-${Date.now()}`,
      name,
      description,
      icon,
      author,
      version: '1.0.0',
      tags,
      snippets: selectedSnippets,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return pack;
  }

  // Download pack as JSON file
  static downloadPack(pack: SnippetPack): void {
    const json = JSON.stringify(pack, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pack.id}-v${pack.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Import pack from JSON file
  static async importPackFromFile(file: File): Promise<SnippetPack> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const pack = JSON.parse(e.target?.result as string) as SnippetPack;
          // Validate pack structure
          if (!pack.id || !pack.name || !pack.snippets || !Array.isArray(pack.snippets)) {
            reject(new Error('Invalid pack file format'));
            return;
          }
          resolve(pack);
        } catch (error) {
          reject(new Error('Failed to parse pack file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}
