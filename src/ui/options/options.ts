import { StorageManager } from '../../lib/storage';
import { Snippet, TriggerMode, SnippetType, LLMProvider, CustomFolder, CaseTransform, SnippetPack } from '../../lib/types';
import { llmManager } from '../../lib/llm/manager';
import { STARTER_PACKS } from '../../lib/starter-packs';
import { PackManager } from '../../lib/pack-manager';
import { WysiwygEditor } from '../components/WysiwygEditor';

class OptionsPage {
  private currentEditId: string | null = null;
  private currentEditFolderId: string | null = null;
  private currentFolder: string = 'all';
  private searchQuery: string = '';
  private sortBy: 'recent' | 'usage' | 'alpha' = 'recent';
  private llmSettingsSaveCallback: (() => Promise<void>) | null = null;
  private currentPack: SnippetPack | null = null;
  private wysiwygEditor: WysiwygEditor | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    await StorageManager.initialize();
    await this.loadSettings();
    await this.renderFolders();
    await this.loadSnippets();
    this.setupEventListeners();
    this.applyTheme();
  }

  private async loadSettings() {
    const settings = await StorageManager.getSettings();
    const enabledToggle = document.getElementById('enabled-toggle') as HTMLInputElement;
    const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;

    if (enabledToggle) {
      enabledToggle.checked = settings.enabled;
    }
    if (themeSelect) {
      themeSelect.value = settings.darkMode || 'system';
    }
  }

  private async applyTheme() {
    const settings = await StorageManager.getSettings();
    const theme = settings.darkMode || 'system';

    let effectiveTheme = theme;
    if (theme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', effectiveTheme);
  }

  private async loadSnippets() {
    const snippets = await StorageManager.getSnippets();
    const snippetsGrid = document.getElementById('snippets-grid');
    if (!snippetsGrid) return;

    let snippetArray = Object.values(snippets);

    // Filter by folder
    if (this.currentFolder !== 'all') {
      snippetArray = snippetArray.filter(s => s.folder === this.currentFolder);
    }

    // Filter by search query
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      snippetArray = snippetArray.filter(s =>
        s.label.toLowerCase().includes(query) ||
        s.trigger.toLowerCase().includes(query) ||
        s.expansion.toLowerCase().includes(query)
      );
    }

    // Sort
    snippetArray = this.sortSnippets(snippetArray);

    if (snippetArray.length === 0) {
      snippetsGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <div class="empty-title">No snippets found</div>
          <div class="empty-text">${this.searchQuery ? 'Try a different search term' : 'Create your first snippet to get started!'}</div>
          <button class="btn btn-primary" onclick="document.getElementById('add-snippet-btn').click()">
            <span>+</span>
            <span>Create Snippet</span>
          </button>
        </div>
      `;
      return;
    }

    snippetsGrid.innerHTML = snippetArray.map(snippet => this.renderSnippetCard(snippet)).join('');

    // Add event listeners to cards
    this.attachSnippetEventListeners();
  }

  private sortSnippets(snippets: Snippet[]): Snippet[] {
    switch (this.sortBy) {
      case 'usage':
        return snippets.sort((a, b) => b.usageCount - a.usageCount);
      case 'alpha':
        return snippets.sort((a, b) => a.label.localeCompare(b.label));
      case 'recent':
      default:
        return snippets.sort((a, b) => b.createdAt - a.createdAt);
    }
  }

  private renderSnippetCard(snippet: Snippet): string {
    const triggerModeLabel = this.getTriggerModeLabel(snippet.triggerMode);
    const usageText = snippet.usageCount > 0
      ? `Used ${snippet.usageCount} ${snippet.usageCount === 1 ? 'time' : 'times'}`
      : 'Never used';

    return `
      <div class="snippet-card" data-id="${snippet.id}">
        <div class="snippet-header">
          <div class="snippet-main">
            <div class="snippet-title">${this.escapeHtml(snippet.label)}</div>
            <span class="snippet-trigger">${this.escapeHtml(snippet.trigger)}</span>
          </div>
          <div class="snippet-actions">
            <button class="btn btn-icon btn-secondary duplicate-btn" data-id="${snippet.id}" title="Duplicate">
              📋
            </button>
            <button class="btn btn-icon btn-secondary edit-btn" data-id="${snippet.id}" title="Edit">
              ✏️
            </button>
            <button class="btn btn-icon btn-danger delete-btn" data-id="${snippet.id}" title="Delete">
              🗑️
            </button>
          </div>
        </div>
        <div class="snippet-expansion">${this.escapeHtml(snippet.expansion)}</div>
        <div class="snippet-meta">
          <span class="snippet-meta-item">
            <span>📊</span>
            <span>${usageText}</span>
          </span>
          <span class="badge badge-mode">${triggerModeLabel}</span>
          ${!snippet.enabled ? '<span class="badge" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;">Disabled</span>' : ''}
        </div>
      </div>
    `;
  }

  private getTriggerModeLabel(mode: TriggerMode): string {
    switch (mode) {
      case 'word': return 'Word Start';
      case 'word-both': return 'Word Both';
      case 'anywhere': return 'Anywhere';
      default: return mode;
    }
  }

  private attachSnippetEventListeners() {
    // Duplicate buttons
    document.querySelectorAll('.duplicate-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id) this.duplicateSnippet(id);
      });
    });

    // Edit buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id) this.editSnippet(id);
      });
    });

    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id) this.deleteSnippet(id);
      });
    });

    // Card click to edit
    document.querySelectorAll('.snippet-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.snippet-actions')) return;
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id) this.editSnippet(id);
      });
    });
  }

  private setupEventListeners() {
    // Settings toggle
    const enabledToggle = document.getElementById('enabled-toggle') as HTMLInputElement;
    enabledToggle?.addEventListener('change', async () => {
      const settings = await StorageManager.getSettings();
      settings.enabled = enabledToggle.checked;
      await StorageManager.saveSettings(settings);
    });

    // Theme selector
    const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
    themeSelect?.addEventListener('change', async () => {
      const settings = await StorageManager.getSettings();
      settings.darkMode = themeSelect.value as 'light' | 'dark' | 'system';
      await StorageManager.saveSettings(settings);
      await this.applyTheme();
    });

    // Add snippet button
    document.getElementById('add-snippet-btn')?.addEventListener('click', () => {
      this.showModal();
    });

    // Modal actions
    document.getElementById('cancel-snippet-btn')?.addEventListener('click', () => {
      this.hideModal();
    });

    document.getElementById('save-snippet-btn')?.addEventListener('click', () => {
      this.saveSnippet();
    });

    // Close modal on outside click
    document.getElementById('snippet-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.hideModal();
      }
    });

    // Search
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.loadSnippets();
    });

    // Sort
    const sortSelect = document.getElementById('sort-select') as HTMLSelectElement;
    sortSelect?.addEventListener('change', (e) => {
      this.sortBy = (e.target as HTMLSelectElement).value as any;
      this.loadSnippets();
    });

    // Folder navigation
    document.querySelectorAll('.folder-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const folder = (e.currentTarget as HTMLElement).getAttribute('data-folder');
        if (folder) this.switchFolder(folder);
      });
    });

    // Import/Export
    document.getElementById('export-btn')?.addEventListener('click', () => {
      this.exportData();
    });

    document.getElementById('import-btn')?.addEventListener('click', () => {
      document.getElementById('import-file-input')?.click();
    });

    document.getElementById('import-file-input')?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) this.importData(file);
    });

    // New folder button
    document.getElementById('new-folder-btn')?.addEventListener('click', () => {
      this.showFolderModal();
    });

    // Folder modal actions
    document.getElementById('cancel-folder-btn')?.addEventListener('click', () => {
      this.hideFolderModal();
    });

    document.getElementById('save-folder-btn')?.addEventListener('click', () => {
      this.saveFolder();
    });

    document.getElementById('folder-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.hideFolderModal();
      }
    });

    // LLM Settings
    document.getElementById('llm-settings-btn')?.addEventListener('click', () => {
      this.showLLMSettings();
    });

    document.getElementById('close-llm-settings-btn')?.addEventListener('click', () => {
      this.hideLLMSettings();
    });

    document.getElementById('llm-settings-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.hideLLMSettings();
      }
    });

    // Generate Snippet
    document.getElementById('generate-snippet-btn')?.addEventListener('click', () => {
      this.showGenerateSnippet();
    });

    document.getElementById('cancel-generate-btn')?.addEventListener('click', () => {
      this.hideGenerateSnippet();
    });

    document.getElementById('generate-btn')?.addEventListener('click', () => {
      this.generateSnippet();
    });

    document.getElementById('generate-snippet-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.hideGenerateSnippet();
      }
    });

    // Snippet Packs
    document.getElementById('snippet-packs-btn')?.addEventListener('click', () => {
      this.showSnippetPacks();
    });

    document.getElementById('close-packs-btn')?.addEventListener('click', () => {
      this.hideSnippetPacks();
    });

    document.getElementById('snippet-packs-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.hideSnippetPacks();
      }
    });

    document.getElementById('cancel-pack-preview-btn')?.addEventListener('click', () => {
      this.hidePackPreview();
      this.showSnippetPacks();
    });

    document.getElementById('install-pack-btn')?.addEventListener('click', () => {
      this.installPack();
    });

    document.getElementById('pack-preview-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.hidePackPreview();
      }
    });

    // Snippet type toggle
    const typeSelect = document.getElementById('snippet-type') as HTMLSelectElement;
    typeSelect?.addEventListener('change', () => {
      this.toggleSnippetTypeFields();
    });

    // Test Area
    document.getElementById('test-area-btn')?.addEventListener('click', () => {
      this.showTestArea();
    });

    document.getElementById('close-test-area-btn')?.addEventListener('click', () => {
      this.hideTestArea();
    });

    document.getElementById('clear-test-area-btn')?.addEventListener('click', () => {
      const testInput = document.getElementById('test-area-input') as HTMLTextAreaElement;
      if (testInput) testInput.value = '';
    });

    document.getElementById('test-area-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.hideTestArea();
      }
    });

    // Keyboard shortcut: Ctrl+Shift+S to quick add snippet
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        this.showModal();
      }
    });
  }

  private showTestArea() {
    const modal = document.getElementById('test-area-modal');
    modal?.classList.add('active');
  }

  private hideTestArea() {
    document.getElementById('test-area-modal')?.classList.remove('active');
  }

  private switchFolder(folder: string) {
    this.currentFolder = folder;

    // Update UI
    document.querySelectorAll('.folder-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-folder="${folder}"]`)?.classList.add('active');

    // Update title
    const titleEl = document.getElementById('content-title');
    if (titleEl) {
      switch (folder) {
        case 'all':
          titleEl.textContent = 'All Snippets';
          break;
        case 'work':
          titleEl.textContent = 'Work Snippets';
          break;
        case 'personal':
          titleEl.textContent = 'Personal Snippets';
          break;
        default:
          titleEl.textContent = 'Snippets';
      }
    }

    this.loadSnippets();
  }

  private async updateFolderCounts() {
    const snippets = await StorageManager.getSnippets();
    const snippetArray = Object.values(snippets);
    const settings = await StorageManager.getSettings();

    const allCount = snippetArray.length;
    const workCount = snippetArray.filter(s => s.folder === 'work').length;
    const personalCount = snippetArray.filter(s => s.folder === 'personal').length;

    const countAll = document.getElementById('count-all');
    const countWork = document.getElementById('count-work');
    const countPersonal = document.getElementById('count-personal');

    if (countAll) countAll.textContent = allCount.toString();
    if (countWork) countWork.textContent = workCount.toString();
    if (countPersonal) countPersonal.textContent = personalCount.toString();

    // Update snippet counter
    const counterEl = document.getElementById('snippet-counter');
    if (counterEl) {
      counterEl.textContent = `${allCount}/∞`;
    }

    // Update custom folder counts
    const customFolders = settings.customFolders || [];
    customFolders.forEach(folder => {
      const count = snippetArray.filter(s => s.folder === folder.id).length;
      const countEl = document.getElementById(`count-${folder.id}`);
      if (countEl) countEl.textContent = count.toString();
    });
  }

  private async renderFolders() {
    const folderList = document.getElementById('folder-list');
    if (!folderList) return;

    const settings = await StorageManager.getSettings();
    const customFolders = settings.customFolders || [];

    // Build folder HTML
    let html = `
      <div class="folder-item ${this.currentFolder === 'all' ? 'active' : ''}" data-folder="all">
        <span class="folder-icon">📁</span>
        <span>All Snippets</span>
        <span class="folder-count" id="count-all">0</span>
      </div>
      <div class="folder-item ${this.currentFolder === 'work' ? 'active' : ''}" data-folder="work">
        <span class="folder-icon">💼</span>
        <span class="folder-name">Work</span>
        <span class="folder-count" id="count-work">0</span>
        <button class="folder-edit-btn" data-folder-id="work" title="Rename folder">✏️</button>
        <button class="folder-delete-btn" data-folder-id="work" title="Delete folder">×</button>
      </div>
      <div class="folder-item ${this.currentFolder === 'personal' ? 'active' : ''}" data-folder="personal">
        <span class="folder-icon">👤</span>
        <span class="folder-name">Personal</span>
        <span class="folder-count" id="count-personal">0</span>
        <button class="folder-edit-btn" data-folder-id="personal" title="Rename folder">✏️</button>
        <button class="folder-delete-btn" data-folder-id="personal" title="Delete folder">×</button>
      </div>
    `;

    // Add custom folders
    customFolders.forEach(folder => {
      html += `
        <div class="folder-item ${this.currentFolder === folder.id ? 'active' : ''}" data-folder="${folder.id}">
          <span class="folder-icon">${folder.icon}</span>
          <span class="folder-name">${this.escapeHtml(folder.name)}</span>
          <span class="folder-count" id="count-${folder.id}">0</span>
          <button class="folder-edit-btn" data-folder-id="${folder.id}" title="Rename folder">✏️</button>
          <button class="folder-delete-btn" data-folder-id="${folder.id}" title="Delete folder">×</button>
        </div>
      `;
    });

    folderList.innerHTML = html;

    // Re-attach folder click listeners
    document.querySelectorAll('.folder-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        // Don't switch folder if clicking action buttons
        if (target.classList.contains('folder-delete-btn') ||
            target.classList.contains('folder-edit-btn')) {
          return;
        }
        const folder = (e.currentTarget as HTMLElement).getAttribute('data-folder');
        if (folder) this.switchFolder(folder);
      });

      // Double-click to rename any folder except 'all'
      const folderId = item.getAttribute('data-folder');
      if (folderId && folderId !== 'all') {
        item.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          this.showFolderModal(folderId);
        });
      }
    });

    // Attach edit listeners
    document.querySelectorAll('.folder-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const folderId = (e.currentTarget as HTMLElement).getAttribute('data-folder-id');
        if (folderId) this.showFolderModal(folderId);
      });
    });

    // Attach delete listeners
    document.querySelectorAll('.folder-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const folderId = (e.currentTarget as HTMLElement).getAttribute('data-folder-id');
        if (folderId) this.deleteFolder(folderId);
      });
    });

    await this.updateFolderCounts();
  }

  private async showModal(snippet?: Snippet) {
    const modal = document.getElementById('snippet-modal');
    const title = document.getElementById('modal-title');
    const labelInput = document.getElementById('snippet-label') as HTMLInputElement;
    const triggerInput = document.getElementById('snippet-trigger') as HTMLInputElement;
    const expansionInput = document.getElementById('snippet-expansion') as HTMLTextAreaElement;
    const folderSelect = document.getElementById('snippet-folder') as HTMLSelectElement;
    const triggerModeSelect = document.getElementById('snippet-trigger-mode') as HTMLSelectElement;
    const caseTransformSelect = document.getElementById('snippet-case-transform') as HTMLSelectElement;
    const enabledCheckbox = document.getElementById('snippet-enabled') as HTMLInputElement;
    const caseSensitiveCheckbox = document.getElementById('snippet-case-sensitive') as HTMLInputElement;
    const typeSelect = document.getElementById('snippet-type') as HTMLSelectElement;
    const llmProviderSelect = document.getElementById('snippet-llm-provider') as HTMLSelectElement;
    const llmPromptInput = document.getElementById('snippet-llm-prompt') as HTMLTextAreaElement;
    const fallbackInput = document.getElementById('snippet-fallback') as HTMLInputElement;

    // Update folder dropdown with custom folders
    await this.updateFolderDropdown();

    // Initialize WYSIWYG editor if not already created
    if (!this.wysiwygEditor) {
      try {
        this.wysiwygEditor = new WysiwygEditor('wysiwyg-container', '');
        // Sync changes to hidden textarea
        this.wysiwygEditor.onChange((content) => {
          expansionInput.value = content;
        });
      } catch (error) {
        console.error('Failed to initialize WYSIWYG editor:', error);
      }
    }

    if (snippet) {
      this.currentEditId = snippet.id;
      if (title) title.textContent = 'Edit Snippet';
      labelInput.value = snippet.label;
      triggerInput.value = snippet.trigger;
      expansionInput.value = snippet.expansion;
      if (this.wysiwygEditor) {
        this.wysiwygEditor.setContent(snippet.expansion);
      }
      folderSelect.value = snippet.folder || '';
      triggerModeSelect.value = snippet.triggerMode;
      caseTransformSelect.value = snippet.caseTransform || 'none';
      enabledCheckbox.checked = snippet.enabled;
      caseSensitiveCheckbox.checked = snippet.caseSensitive;
      typeSelect.value = snippet.type || 'static';
      llmProviderSelect.value = snippet.llmProvider || 'groq';
      llmPromptInput.value = snippet.llmPrompt || '';
      fallbackInput.value = snippet.fallbackText || '';
    } else {
      this.currentEditId = null;
      if (title) title.textContent = 'New Snippet';
      labelInput.value = '';
      triggerInput.value = '';
      expansionInput.value = '';
      if (this.wysiwygEditor) {
        this.wysiwygEditor.setContent('');
      }

      // Use lastUsedFolder if available, otherwise current folder
      const settings = await StorageManager.getSettings();
      const defaultFolder = settings.lastUsedFolder || (this.currentFolder === 'all' ? '' : this.currentFolder);
      folderSelect.value = defaultFolder;

      triggerModeSelect.value = 'word';
      caseTransformSelect.value = 'none';
      enabledCheckbox.checked = true;
      caseSensitiveCheckbox.checked = false;
      typeSelect.value = 'static';
      llmProviderSelect.value = 'groq';
      llmPromptInput.value = '';
      fallbackInput.value = '';
    }

    this.toggleSnippetTypeFields();
    modal?.classList.add('active');
    labelInput.focus();
  }

  private hideModal() {
    document.getElementById('snippet-modal')?.classList.remove('active');
    this.currentEditId = null;
  }

  private async saveSnippet() {
    const labelInput = document.getElementById('snippet-label') as HTMLInputElement;
    const triggerInput = document.getElementById('snippet-trigger') as HTMLInputElement;
    const expansionInput = document.getElementById('snippet-expansion') as HTMLTextAreaElement;
    const folderSelect = document.getElementById('snippet-folder') as HTMLSelectElement;
    const triggerModeSelect = document.getElementById('snippet-trigger-mode') as HTMLSelectElement;
    const caseTransformSelect = document.getElementById('snippet-case-transform') as HTMLSelectElement;
    const enabledCheckbox = document.getElementById('snippet-enabled') as HTMLInputElement;
    const caseSensitiveCheckbox = document.getElementById('snippet-case-sensitive') as HTMLInputElement;
    const typeSelect = document.getElementById('snippet-type') as HTMLSelectElement;
    const llmProviderSelect = document.getElementById('snippet-llm-provider') as HTMLSelectElement;
    const llmPromptInput = document.getElementById('snippet-llm-prompt') as HTMLTextAreaElement;
    const fallbackInput = document.getElementById('snippet-fallback') as HTMLInputElement;

    const label = labelInput.value.trim();
    const trigger = triggerInput.value.trim();
    const type = typeSelect.value as SnippetType;

    if (!label) {
      alert('Please enter a label for this snippet');
      labelInput.focus();
      return;
    }

    if (!trigger) {
      alert('Please enter a trigger for this snippet');
      triggerInput.focus();
      return;
    }

    // Validation based on type
    let expansion = '';
    let llmPrompt: string | undefined;
    let llmProvider: LLMProvider | undefined;
    let fallbackText: string | undefined;

    if (type === 'dynamic') {
      llmPrompt = llmPromptInput.value.trim();
      if (!llmPrompt) {
        alert('Please enter an AI prompt for this dynamic snippet');
        llmPromptInput.focus();
        return;
      }
      llmProvider = llmProviderSelect.value as LLMProvider;
      fallbackText = fallbackInput.value.trim() || undefined;
      expansion = llmPrompt; // Use prompt as expansion for display purposes
    } else {
      expansion = expansionInput.value.trim();
      if (!expansion) {
        alert('Please enter an expansion for this snippet');
        expansionInput.focus();
        return;
      }
    }

    const snippet: Snippet = {
      id: this.currentEditId || `snippet-${Date.now()}`,
      label,
      trigger,
      expansion,
      folder: folderSelect.value || undefined,
      triggerMode: triggerModeSelect.value as TriggerMode,
      caseTransform: caseTransformSelect.value as CaseTransform,
      caseSensitive: caseSensitiveCheckbox.checked,
      enabled: enabledCheckbox.checked,
      type,
      llmProvider,
      llmPrompt,
      fallbackText,
      createdAt: this.currentEditId ? (await StorageManager.getSnippet(this.currentEditId))?.createdAt || Date.now() : Date.now(),
      usageCount: this.currentEditId ? (await StorageManager.getSnippet(this.currentEditId))?.usageCount || 0 : 0,
      lastUsed: this.currentEditId ? (await StorageManager.getSnippet(this.currentEditId))?.lastUsed : undefined,
    };

    await StorageManager.saveSnippet(snippet);

    // Remember the selected folder for next time
    if (!this.currentEditId) {
      const settings = await StorageManager.getSettings();
      settings.lastUsedFolder = folderSelect.value || undefined;
      await StorageManager.saveSettings(settings);
    }

    await this.loadSnippets();
    await this.updateFolderCounts();
    this.hideModal();
  }

  private async editSnippet(id: string) {
    const snippet = await StorageManager.getSnippet(id);
    if (snippet) {
      this.showModal(snippet);
    }
  }

  private async duplicateSnippet(id: string) {
    const original = await StorageManager.getSnippet(id);
    if (!original) return;

    // Create duplicate with new ID and modified label/trigger
    const duplicate: Snippet = {
      ...original,
      id: `snippet-${Date.now()}`,
      label: `${original.label} (copy)`,
      trigger: `${original.trigger}copy`,
      createdAt: Date.now(),
      usageCount: 0,
      lastUsed: undefined,
    };

    await StorageManager.saveSnippet(duplicate);
    await this.loadSnippets();
    await this.updateFolderCounts();
  }

  private async deleteSnippet(id: string) {
    const snippet = await StorageManager.getSnippet(id);
    if (!snippet) return;

    if (confirm(`Are you sure you want to delete "${snippet.label}"?`)) {
      await StorageManager.deleteSnippet(id);
      await this.loadSnippets();
      await this.updateFolderCounts();
    }
  }

  private async exportData() {
    // Check if we're viewing a specific folder
    if (this.currentFolder !== 'all') {
      await this.exportFolder(this.currentFolder);
    } else {
      // Export all data
      const data = await StorageManager.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `textblitz-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  private async exportFolder(folderId: string) {
    const allSnippets = await StorageManager.getSnippets();
    const folderSnippets = Object.values(allSnippets).filter(s => s.folder === folderId);

    if (folderSnippets.length === 0) {
      alert('This folder has no snippets to export');
      return;
    }

    // Get folder name
    const settings = await StorageManager.getSettings();
    let folderName = folderId;
    if (folderId === 'work') folderName = 'Work';
    else if (folderId === 'personal') folderName = 'Personal';
    else {
      const folder = settings.customFolders?.find(f => f.id === folderId);
      if (folder) folderName = folder.name;
    }

    // Create export data with only folder snippets
    const exportData = {
      snippets: folderSnippets.reduce((acc, snippet) => {
        acc[snippet.id] = snippet;
        return acc;
      }, {} as Record<string, typeof folderSnippets[0]>),
      settings: { ...settings }, // Include settings for compatibility
      version: '1.0',
      exportedAt: Date.now(),
      folderName
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `textblitz-${folderName.toLowerCase()}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private async importData(file: File) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await StorageManager.importData(data);
      await this.loadSnippets();
      await this.loadSettings();
      await this.updateFolderCounts();
      alert('Data imported successfully!');
    } catch (error) {
      alert('Failed to import data. Please check the file format.');
      console.error(error);
    }
  }

  private async updateFolderDropdown() {
    const folderSelect = document.getElementById('snippet-folder') as HTMLSelectElement;
    if (!folderSelect) return;

    const settings = await StorageManager.getSettings();
    const customFolders = settings.customFolders || [];

    // Build folder options
    let html = '<option value="">No Folder</option>';
    html += '<option value="work">💼 Work</option>';
    html += '<option value="personal">👤 Personal</option>';

    customFolders.forEach(folder => {
      html += `<option value="${folder.id}">${folder.icon} ${this.escapeHtml(folder.name)}</option>`;
    });

    folderSelect.innerHTML = html;
  }

  private showFolderModal(folderId?: string) {
    const modal = document.getElementById('folder-modal');
    const title = document.getElementById('folder-modal-title');
    const nameInput = document.getElementById('folder-name') as HTMLInputElement;
    const iconInput = document.getElementById('folder-icon') as HTMLInputElement;

    if (folderId) {
      this.currentEditFolderId = folderId;
      if (title) title.textContent = 'Edit Folder';

      // Load default folder data
      if (folderId === 'work') {
        nameInput.value = 'Work';
        iconInput.value = '💼';
      } else if (folderId === 'personal') {
        nameInput.value = 'Personal';
        iconInput.value = '👤';
      } else {
        // Load custom folder data
        StorageManager.getSettings().then(settings => {
          const folder = settings.customFolders?.find(f => f.id === folderId);
          if (folder) {
            nameInput.value = folder.name;
            iconInput.value = folder.icon;
          }
        });
      }
    } else {
      this.currentEditFolderId = null;
      if (title) title.textContent = 'New Folder';
      nameInput.value = '';
      iconInput.value = '📂';
    }

    modal?.classList.add('active');
    nameInput.focus();
  }

  private hideFolderModal() {
    document.getElementById('folder-modal')?.classList.remove('active');
    this.currentEditFolderId = null;
  }

  private async saveFolder() {
    const nameInput = document.getElementById('folder-name') as HTMLInputElement;
    const iconInput = document.getElementById('folder-icon') as HTMLInputElement;

    const name = nameInput.value.trim();
    const icon = iconInput.value.trim() || '📂';

    if (!name) {
      alert('Please enter a folder name');
      nameInput.focus();
      return;
    }

    const settings = await StorageManager.getSettings();
    const customFolders = settings.customFolders || [];

    if (this.currentEditFolderId) {
      // Convert default folders to custom folders when edited
      if (this.currentEditFolderId === 'work' || this.currentEditFolderId === 'personal') {
        const newFolder: CustomFolder = {
          id: this.currentEditFolderId,
          name,
          icon,
          order: customFolders.length,
        };
        customFolders.push(newFolder);
      } else {
        // Edit existing custom folder
        const folder = customFolders.find(f => f.id === this.currentEditFolderId);
        if (folder) {
          folder.name = name;
          folder.icon = icon;
        }
      }
    } else {
      // Create new folder
      const newFolder: CustomFolder = {
        id: `folder-${Date.now()}`,
        name,
        icon,
        order: customFolders.length,
      };
      customFolders.push(newFolder);
    }

    settings.customFolders = customFolders;
    await StorageManager.saveSettings(settings);
    await this.renderFolders();
    await this.updateFolderDropdown();
    this.hideFolderModal();
  }

  private async deleteFolder(folderId: string) {
    const settings = await StorageManager.getSettings();

    // Get folder name
    let folderName: string;
    let isCustom = false;

    if (folderId === 'work') {
      folderName = 'Work';
    } else if (folderId === 'personal') {
      folderName = 'Personal';
    } else {
      const folder = settings.customFolders?.find(f => f.id === folderId);
      if (!folder) return;
      folderName = folder.name;
      isCustom = true;
    }

    // Check if folder has snippets
    const snippets = await StorageManager.getSnippets();
    const snippetCount = Object.values(snippets).filter(s => s.folder === folderId).length;

    const confirmMsg = snippetCount > 0
      ? `Delete "${folderName}"? ${snippetCount} snippet(s) will be moved to "No Folder".`
      : `Delete "${folderName}"?`;

    if (!confirm(confirmMsg)) return;

    // Move snippets to no folder
    if (snippetCount > 0) {
      for (const snippet of Object.values(snippets)) {
        if (snippet.folder === folderId) {
          snippet.folder = undefined;
          await StorageManager.saveSnippet(snippet);
        }
      }
    }

    // Remove custom folder from settings
    if (isCustom) {
      settings.customFolders = settings.customFolders?.filter(f => f.id !== folderId);
      await StorageManager.saveSettings(settings);
    }

    // Switch to "All Snippets" if we're viewing the deleted folder
    if (this.currentFolder === folderId) {
      this.switchFolder('all');
    }

    await this.renderFolders();
    await this.updateFolderDropdown();
    await this.loadSnippets();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private toggleSnippetTypeFields() {
    const typeSelect = document.getElementById('snippet-type') as HTMLSelectElement;
    const staticFields = document.getElementById('static-fields');
    const dynamicFields = document.getElementById('dynamic-fields');

    if (typeSelect?.value === 'dynamic') {
      staticFields!.style.display = 'none';
      dynamicFields!.style.display = 'block';
    } else {
      staticFields!.style.display = 'block';
      dynamicFields!.style.display = 'none';
    }
  }

  private async showLLMSettings() {
    const modal = document.getElementById('llm-settings-modal');

    // Get all form elements
    const defaultProviderSelect = document.getElementById('llm-default-provider') as HTMLSelectElement;
    const groqKeyInput = document.getElementById('llm-groq-key') as HTMLInputElement;
    const groqModelSelect = document.getElementById('llm-groq-model') as HTMLSelectElement;
    const groqTierSelect = document.getElementById('llm-groq-tier') as HTMLSelectElement;
    const openaiKeyInput = document.getElementById('llm-openai-key') as HTMLInputElement;
    const openaiModelSelect = document.getElementById('llm-openai-model') as HTMLSelectElement;
    const openaiTierSelect = document.getElementById('llm-openai-tier') as HTMLSelectElement;
    const anthropicKeyInput = document.getElementById('llm-anthropic-key') as HTMLInputElement;
    const anthropicModelSelect = document.getElementById('llm-anthropic-model') as HTMLSelectElement;
    const anthropicTierSelect = document.getElementById('llm-anthropic-tier') as HTMLSelectElement;
    const geminiKeyInput = document.getElementById('llm-gemini-key') as HTMLInputElement;
    const geminiModelSelect = document.getElementById('llm-gemini-model') as HTMLSelectElement;
    const geminiTierSelect = document.getElementById('llm-gemini-tier') as HTMLSelectElement;
    const systemPromptInput = document.getElementById('llm-system-prompt') as HTMLTextAreaElement;
    const alertThresholdInput = document.getElementById('llm-alert-threshold') as HTMLInputElement;
    const monthlyBudgetInput = document.getElementById('llm-monthly-budget') as HTMLInputElement;

    // Load current settings
    const settings = await StorageManager.getSettings();

    // Set values
    defaultProviderSelect.value = settings.llmDefaultProvider;
    groqKeyInput.value = settings.llmKeys.groq || '';
    groqModelSelect.value = settings.llmModels.groq || 'llama-3.3-70b-versatile';
    groqTierSelect.value = settings.llmTiers.groq || 'free';
    openaiKeyInput.value = settings.llmKeys.openai || '';
    openaiModelSelect.value = settings.llmModels.openai || 'gpt-4o-mini';
    openaiTierSelect.value = settings.llmTiers.openai || 'tier1';
    anthropicKeyInput.value = settings.llmKeys.anthropic || '';
    anthropicModelSelect.value = settings.llmModels.anthropic || 'claude-sonnet-4-20250514';
    anthropicTierSelect.value = settings.llmTiers.anthropic || 'tier1';
    geminiKeyInput.value = settings.llmKeys.gemini || '';
    geminiModelSelect.value = settings.llmModels.gemini || 'gemini-2.0-flash-exp';
    geminiTierSelect.value = settings.llmTiers.gemini || 'free';
    systemPromptInput.value = settings.llmSystemPrompt || '';
    alertThresholdInput.value = settings.llmUsageAlert?.toString() || '80';
    monthlyBudgetInput.value = settings.llmMonthlyBudget?.toString() || '';

    // Save function
    const saveSettings = async () => {
      settings.llmDefaultProvider = defaultProviderSelect.value as LLMProvider;
      settings.llmKeys.groq = groqKeyInput.value.trim() || undefined;
      settings.llmKeys.openai = openaiKeyInput.value.trim() || undefined;
      settings.llmKeys.anthropic = anthropicKeyInput.value.trim() || undefined;
      settings.llmKeys.gemini = geminiKeyInput.value.trim() || undefined;
      settings.llmModels.groq = groqModelSelect.value;
      settings.llmModels.openai = openaiModelSelect.value;
      settings.llmModels.anthropic = anthropicModelSelect.value;
      settings.llmModels.gemini = geminiModelSelect.value;
      settings.llmTiers.groq = groqTierSelect.value as any;
      settings.llmTiers.openai = openaiTierSelect.value as any;
      settings.llmTiers.anthropic = anthropicTierSelect.value as any;
      settings.llmTiers.gemini = geminiTierSelect.value as any;
      settings.llmSystemPrompt = systemPromptInput.value.trim() || undefined;
      settings.llmUsageAlert = parseInt(alertThresholdInput.value) || 80;
      settings.llmMonthlyBudget = monthlyBudgetInput.value ? parseFloat(monthlyBudgetInput.value) : undefined;
      await StorageManager.saveSettings(settings);
    };

    // Attach change listeners
    defaultProviderSelect.addEventListener('change', saveSettings);
    groqKeyInput.addEventListener('change', saveSettings);
    groqModelSelect.addEventListener('change', saveSettings);
    groqTierSelect.addEventListener('change', saveSettings);
    openaiKeyInput.addEventListener('change', saveSettings);
    openaiModelSelect.addEventListener('change', saveSettings);
    openaiTierSelect.addEventListener('change', saveSettings);
    anthropicKeyInput.addEventListener('change', saveSettings);
    anthropicModelSelect.addEventListener('change', saveSettings);
    anthropicTierSelect.addEventListener('change', saveSettings);
    geminiKeyInput.addEventListener('change', saveSettings);
    geminiModelSelect.addEventListener('change', saveSettings);
    geminiTierSelect.addEventListener('change', saveSettings);
    systemPromptInput.addEventListener('change', saveSettings);
    alertThresholdInput.addEventListener('change', saveSettings);
    monthlyBudgetInput.addEventListener('change', saveSettings);

    // Reset system prompt button
    const resetSystemPromptBtn = document.getElementById('reset-system-prompt-btn');
    resetSystemPromptBtn?.addEventListener('click', async () => {
      const { DEFAULT_LLM_SYSTEM_PROMPT } = await import('../../lib/types');
      systemPromptInput.value = DEFAULT_LLM_SYSTEM_PROMPT;
      await saveSettings();
    });

    // Advanced settings toggle
    const advancedToggle = document.getElementById('advanced-settings-toggle');
    const advancedContent = document.getElementById('advanced-settings-content');
    const advancedIcon = document.getElementById('advanced-settings-icon');

    advancedToggle?.addEventListener('click', () => {
      const isHidden = advancedContent!.style.display === 'none';
      advancedContent!.style.display = isHidden ? 'block' : 'none';
      advancedIcon!.textContent = isHidden ? '▼' : '▶';
    });

    // Reset all stats button
    const resetAllBtn = document.getElementById('reset-all-stats-btn');
    resetAllBtn?.addEventListener('click', async () => {
      if (confirm('Reset all usage statistics? This cannot be undone.')) {
        await llmManager.getUsageTracker().resetAllStats();
        await this.loadUsageStats();
      }
    });

    // Save callback
    this.llmSettingsSaveCallback = saveSettings;

    // Load usage stats
    await this.loadUsageStats();

    modal?.classList.add('active');
  }

  private async hideLLMSettings() {
    // Save keys before closing (in case user didn't blur the input)
    if (this.llmSettingsSaveCallback) {
      await this.llmSettingsSaveCallback();
    }
    document.getElementById('llm-settings-modal')?.classList.remove('active');
  }

  private async showGenerateSnippet() {
    const modal = document.getElementById('generate-snippet-modal');
    const descInput = document.getElementById('generate-description') as HTMLTextAreaElement;
    const statusDiv = document.getElementById('generate-status');

    descInput.value = '';
    statusDiv!.style.display = 'none';
    modal?.classList.add('active');
  }

  private hideGenerateSnippet() {
    document.getElementById('generate-snippet-modal')?.classList.remove('active');
  }

  private async generateSnippet() {
    const descInput = document.getElementById('generate-description') as HTMLTextAreaElement;
    const providerSelect = document.getElementById('generate-provider') as HTMLSelectElement;
    const statusDiv = document.getElementById('generate-status');
    const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;

    const description = descInput.value.trim();
    if (!description) {
      alert('Please describe what you want the snippet to do');
      return;
    }

    // Check if API key exists
    const settings = await StorageManager.getSettings();
    const provider = providerSelect.value as LLMProvider;
    const hasKey = provider === 'groq' ? settings.llmKeys.groq : settings.llmKeys.anthropic;

    if (!hasKey) {
      alert(`Please add your ${provider === 'groq' ? 'Groq' : 'Anthropic'} API key in LLM Settings first`);
      return;
    }

    // Initialize provider if needed
    if (provider === 'groq' && settings.llmKeys.groq) {
      llmManager.setProvider('groq', settings.llmKeys.groq, settings.llmTimeout);
    } else if (provider === 'anthropic' && settings.llmKeys.anthropic) {
      llmManager.setProvider('anthropic', settings.llmKeys.anthropic, settings.llmTimeout);
    }

    // Show loading
    generateBtn.disabled = true;
    statusDiv!.style.display = 'block';
    statusDiv!.style.background = '#f0f9ff';
    statusDiv!.style.borderLeft = '3px solid #6366f1';
    statusDiv!.innerHTML = '⏳ Generating snippet...';

    try {
      const prompt = `You are a snippet generator for a text expansion tool. Generate a snippet based on this description:

"${description}"

Return ONLY valid JSON in this exact format:
{
  "label": "Friendly name for the snippet",
  "trigger": "shortcut text to type (lowercase, no spaces, 2-5 chars)",
  "expansion": "The text that will replace the trigger. Use {date}, {time}, {clipboard}, {cursor} for dynamic content."
}

Examples:
- Description: "email signature with my name John and today's date"
  Response: {"label":"Email Signature","trigger":"sig","expansion":"Best,\\nJohn Smith\\n{date}"}

- Description: "insert current time in 12h format"
  Response: {"label":"Current Time","trigger":"now","expansion":"{time:12h}"}

Return ONLY the JSON, no explanation.`;

      const response = await llmManager.complete(provider, {
        prompt,
        maxTokens: 200,
        temperature: 0.3,
      });

      // Parse JSON response
      let snippetData;
      try {
        snippetData = JSON.parse(response.text);
      } catch (e) {
        // Try to extract JSON from response
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          snippetData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not parse LLM response as JSON');
        }
      }

      // Validate required fields
      if (!snippetData.label || !snippetData.trigger || !snippetData.expansion) {
        throw new Error('Generated snippet missing required fields');
      }

      // Show success
      statusDiv!.style.background = '#f0fdf4';
      statusDiv!.style.borderLeft = '3px solid #22c55e';
      statusDiv!.innerHTML = '✅ Snippet generated! Opening editor...';

      // Close generator modal
      setTimeout(() => {
        this.hideGenerateSnippet();

        // Pre-fill snippet editor with generated data
        const snippet: Partial<Snippet> = {
          label: snippetData.label,
          trigger: snippetData.trigger,
          expansion: snippetData.expansion,
        };
        this.showModal(snippet as Snippet);
      }, 500);

    } catch (error) {
      console.error('Snippet generation failed:', error);
      statusDiv!.style.background = '#fef2f2';
      statusDiv!.style.borderLeft = '3px solid #ef4444';
      statusDiv!.innerHTML = `❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    } finally {
      generateBtn.disabled = false;
    }
  }

  private async loadUsageStats() {
    const statsContainer = document.getElementById('llm-usage-stats');
    if (!statsContainer) return;

    try {
      const result = await chrome.storage.local.get('llmUsage');
      const usage = result.llmUsage;
      const settings = await StorageManager.getSettings();
      const alertThreshold = settings.llmUsageAlert || 80;

      if (!usage || (!usage.groq && !usage.anthropic && !usage.openai && !usage.gemini)) {
        statsContainer.innerHTML = '<div style="font-size: 13px; color: #6b7280;">No usage data yet. Create a dynamic snippet to get started!</div>';
        return;
      }

      const tracker = llmManager.getUsageTracker();
      let html = '<div style="display: flex; flex-direction: column; gap: 16px;">';

      // Helper to render a provider's stats
      const renderProviderStats = async (
        provider: 'groq' | 'anthropic' | 'openai' | 'gemini',
        displayName: string
      ) => {
        const stats = usage[provider];
        if (!stats || stats.requests === 0) return '';

        // Get rate limit for this provider
        const rateLimit = await tracker.getRateLimit(provider as any);
        const limit = rateLimit.requestsPerMinute;
        const current = stats.requestsThisMinute;
        const percentage = (current / limit) * 100;

        // Determine status color
        let statusColor = '#10b981'; // green
        let statusIcon = '✅';
        if (percentage >= 100) {
          statusColor = '#ef4444'; // red
          statusIcon = '🔴';
        } else if (percentage >= alertThreshold) {
          statusColor = '#f59e0b'; // orange
          statusIcon = '⚠️';
        }

        // Model info
        const modelName = stats.model || 'N/A';
        const tier = settings.llmTiers[provider] || '';

        return `
          <div style="border-left: 3px solid ${statusColor}; padding-left: 12px;">
            <div style="display: flex; align-items: center; gap: 8px; font-weight: 500; margin-bottom: 8px;">
              <span>${statusIcon}</span>
              <span>${displayName}</span>
              <span style="font-size: 12px; color: #6b7280; font-weight: normal;">(${modelName}${tier ? ', ' + tier : ''})</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; color: #6b7280;">
              <div>Requests: ${stats.requests}</div>
              <div>Tokens: ${stats.tokensTotal.toLocaleString()}</div>
              <div style="color: ${statusColor};">This minute: ${current}/${limit}</div>
              <div>Cost: $${stats.estimatedCost.toFixed(4)}</div>
            </div>
            ${percentage >= alertThreshold ? `
              <div style="margin-top: 8px; padding: 8px; background: ${percentage >= 100 ? '#fef2f2' : '#fef3c7'}; border-radius: 4px; font-size: 12px; color: ${percentage >= 100 ? '#991b1b' : '#92400e'};">
                ${percentage >= 100 ? 'Rate limit reached!' : `Approaching rate limit (${percentage.toFixed(0)}%)`}
              </div>
            ` : ''}
          </div>
        `;
      };

      // Render all 4 providers
      html += await renderProviderStats('groq', 'Groq');
      html += await renderProviderStats('openai', 'OpenAI');
      html += await renderProviderStats('anthropic', 'Anthropic');
      html += await renderProviderStats('gemini', 'Gemini');

      html += '</div>';
      statsContainer.innerHTML = html;
    } catch (error) {
      console.error('Failed to load usage stats:', error);
    }
  }

  private async showSnippetPacks() {
    const modal = document.getElementById('snippet-packs-modal');
    const packsListDiv = document.getElementById('packs-list');

    if (!packsListDiv) return;

    // Render starter packs
    let html = '';
    for (const pack of STARTER_PACKS) {
      html += `
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; cursor: pointer; transition: all 0.2s;"
             class="pack-card"
             data-pack-id="${this.escapeHtml(pack.name)}">
          <div style="display: flex; align-items: start; gap: 16px;">
            <div style="font-size: 36px;">${pack.icon}</div>
            <div style="flex: 1;">
              <div style="font-weight: 500; font-size: 16px; margin-bottom: 4px;">${this.escapeHtml(pack.name)}</div>
              <div style="font-size: 13px; color: #6b7280; margin-bottom: 8px;">${this.escapeHtml(pack.description)}</div>
              <div style="display: flex; align-items: center; gap: 12px; font-size: 12px; color: #6b7280;">
                <span>📝 ${pack.snippets.length} snippets</span>
                ${pack.author ? `<span>👤 ${this.escapeHtml(pack.author)}</span>` : ''}
                ${pack.tags ? `<span>🏷️ ${pack.tags.join(', ')}</span>` : ''}
              </div>
            </div>
            <button class="btn btn-primary" style="padding: 8px 16px;">
              Preview & Install
            </button>
          </div>
        </div>
      `;
    }

    packsListDiv.innerHTML = html;

    // Add click listeners to pack cards
    document.querySelectorAll('.pack-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const packName = (e.currentTarget as HTMLElement).getAttribute('data-pack-id');
        const pack = STARTER_PACKS.find(p => p.name === packName);
        if (pack) this.showPackPreview(pack);
      });
    });

    modal?.classList.add('active');
  }

  private hideSnippetPacks() {
    document.getElementById('snippet-packs-modal')?.classList.remove('active');
  }

  private async showPackPreview(pack: SnippetPack) {
    this.currentPack = pack;
    const modal = document.getElementById('pack-preview-modal');
    const titleEl = document.getElementById('pack-preview-title');
    const metadataDiv = document.getElementById('pack-metadata');
    const snippetsPreviewDiv = document.getElementById('pack-snippets-preview');

    if (titleEl) titleEl.textContent = `${pack.icon} ${pack.name}`;

    // Render metadata
    if (metadataDiv) {
      metadataDiv.innerHTML = `
        <div style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">
          ${this.escapeHtml(pack.description)}
        </div>
        <div style="display: flex; align-items: center; gap: 16px; font-size: 13px; color: #6b7280;">
          <span>📝 ${pack.snippets.length} snippets</span>
          ${pack.author ? `<span>👤 ${this.escapeHtml(pack.author)}</span>` : ''}
          ${pack.version ? `<span>📌 v${pack.version}</span>` : ''}
        </div>
        ${pack.tags && pack.tags.length > 0 ? `
          <div style="display: flex; gap: 6px; margin-top: 8px;">
            ${pack.tags.map(tag => `
              <span style="background: #f3f4f6; color: #374151; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                ${this.escapeHtml(tag)}
              </span>
            `).join('')}
          </div>
        ` : ''}
      `;
    }

    // Render snippet previews
    if (snippetsPreviewDiv) {
      snippetsPreviewDiv.innerHTML = pack.snippets.map(snippet => `
        <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; background: #f9fafb;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-weight: 500; font-size: 14px;">${this.escapeHtml(snippet.label)}</span>
            <span style="background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-family: monospace;">
              ${this.escapeHtml(snippet.trigger)}
            </span>
          </div>
          <div style="font-size: 13px; color: #6b7280; font-family: monospace; white-space: pre-wrap; background: white; padding: 8px; border-radius: 4px; border: 1px solid #e5e7eb; max-height: 100px; overflow-y: auto;">
            ${this.escapeHtml(snippet.expansion)}
          </div>
        </div>
      `).join('');
    }

    // Hide packs list modal, show preview modal
    this.hideSnippetPacks();
    modal?.classList.add('active');
  }

  private hidePackPreview() {
    document.getElementById('pack-preview-modal')?.classList.remove('active');
    this.currentPack = null;
  }

  private async installPack() {
    if (!this.currentPack) return;

    const conflictMode = (document.getElementById('pack-conflict-mode') as HTMLSelectElement).value as 'skip' | 'rename' | 'replace';
    const createFolder = (document.getElementById('pack-create-folder') as HTMLInputElement).checked;

    try {
      const packManager = new PackManager();
      const result = await packManager.importPack(this.currentPack, {
        onConflict: conflictMode,
        createFolder: createFolder ? this.currentPack.name : undefined,
      });

      // Show success message
      const message = `Successfully installed "${this.currentPack.name}"!\n\n` +
        `Imported: ${result.imported} snippets\n` +
        (result.skipped > 0 ? `Skipped: ${result.skipped} (already exists)\n` : '') +
        (result.renamed > 0 ? `Renamed: ${result.renamed} (duplicates)\n` : '') +
        (result.replaced > 0 ? `Replaced: ${result.replaced} (overwrote existing)\n` : '');

      alert(message);

      // Reload snippets and close modals
      this.hidePackPreview();
      await this.loadSnippets();
      await this.renderFolders();
      await this.updateFolderCounts();

    } catch (error) {
      console.error('Pack installation failed:', error);
      alert(`Failed to install pack: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Initialize the options page
new OptionsPage();
