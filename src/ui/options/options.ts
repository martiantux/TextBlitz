import { StorageManager } from '../../lib/storage';
import { Snippet, TriggerMode, SnippetType, LLMProvider } from '../../lib/types';

class OptionsPage {
  private currentEditId: string | null = null;
  private currentFolder: string = 'all';
  private searchQuery: string = '';
  private sortBy: 'recent' | 'usage' | 'alpha' = 'recent';

  constructor() {
    this.initialize();
  }

  private async initialize() {
    await StorageManager.initialize();
    await this.loadSettings();
    await this.loadSnippets();
    this.setupEventListeners();
    this.updateFolderCounts();
  }

  private async loadSettings() {
    const settings = await StorageManager.getSettings();
    const enabledToggle = document.getElementById('enabled-toggle') as HTMLInputElement;
    if (enabledToggle) {
      enabledToggle.checked = settings.enabled;
    }
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

    // New folder button (future feature)
    document.getElementById('new-folder-btn')?.addEventListener('click', () => {
      alert('Custom folders coming soon!');
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

    // Snippet type toggle
    const typeSelect = document.getElementById('snippet-type') as HTMLSelectElement;
    typeSelect?.addEventListener('change', () => {
      this.toggleSnippetTypeFields();
    });
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

    const allCount = snippetArray.length;
    const workCount = snippetArray.filter(s => s.folder === 'work').length;
    const personalCount = snippetArray.filter(s => s.folder === 'personal').length;

    const countAll = document.getElementById('count-all');
    const countWork = document.getElementById('count-work');
    const countPersonal = document.getElementById('count-personal');

    if (countAll) countAll.textContent = allCount.toString();
    if (countWork) countWork.textContent = workCount.toString();
    if (countPersonal) countPersonal.textContent = personalCount.toString();
  }

  private showModal(snippet?: Snippet) {
    const modal = document.getElementById('snippet-modal');
    const title = document.getElementById('modal-title');
    const labelInput = document.getElementById('snippet-label') as HTMLInputElement;
    const triggerInput = document.getElementById('snippet-trigger') as HTMLInputElement;
    const expansionInput = document.getElementById('snippet-expansion') as HTMLTextAreaElement;
    const folderSelect = document.getElementById('snippet-folder') as HTMLSelectElement;
    const triggerModeSelect = document.getElementById('snippet-trigger-mode') as HTMLSelectElement;
    const enabledCheckbox = document.getElementById('snippet-enabled') as HTMLInputElement;
    const caseSensitiveCheckbox = document.getElementById('snippet-case-sensitive') as HTMLInputElement;
    const typeSelect = document.getElementById('snippet-type') as HTMLSelectElement;
    const llmProviderSelect = document.getElementById('snippet-llm-provider') as HTMLSelectElement;
    const llmPromptInput = document.getElementById('snippet-llm-prompt') as HTMLTextAreaElement;
    const fallbackInput = document.getElementById('snippet-fallback') as HTMLInputElement;

    if (snippet) {
      this.currentEditId = snippet.id;
      if (title) title.textContent = 'Edit Snippet';
      labelInput.value = snippet.label;
      triggerInput.value = snippet.trigger;
      expansionInput.value = snippet.expansion;
      folderSelect.value = snippet.folder || '';
      triggerModeSelect.value = snippet.triggerMode;
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
      folderSelect.value = this.currentFolder === 'all' ? '' : this.currentFolder;
      triggerModeSelect.value = 'word';
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
    const data = await StorageManager.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `textblitz-export-${Date.now()}.json`;
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
    const groqKeyInput = document.getElementById('llm-groq-key') as HTMLInputElement;
    const anthropicKeyInput = document.getElementById('llm-anthropic-key') as HTMLInputElement;

    // Load current settings
    const settings = await StorageManager.getSettings();
    groqKeyInput.value = settings.llmKeys.groq || '';
    anthropicKeyInput.value = settings.llmKeys.anthropic || '';

    // Save on input
    const saveKeys = async () => {
      settings.llmKeys.groq = groqKeyInput.value || undefined;
      settings.llmKeys.anthropic = anthropicKeyInput.value || undefined;
      await StorageManager.saveSettings(settings);
    };

    groqKeyInput.addEventListener('change', saveKeys);
    anthropicKeyInput.addEventListener('change', saveKeys);

    // Load usage stats
    await this.loadUsageStats();

    modal?.classList.add('active');
  }

  private hideLLMSettings() {
    document.getElementById('llm-settings-modal')?.classList.remove('active');
  }

  private async loadUsageStats() {
    const statsContainer = document.getElementById('llm-usage-stats');
    if (!statsContainer) return;

    try {
      const result = await chrome.storage.local.get('llmUsage');
      const usage = result.llmUsage;

      if (!usage || (!usage.groq && !usage.anthropic)) {
        statsContainer.innerHTML = '<div style="font-size: 13px; color: #6b7280;">No usage data yet. Create a dynamic snippet to get started!</div>';
        return;
      }

      let html = '<div style="display: flex; flex-direction: column; gap: 16px;">';

      if (usage.groq && usage.groq.requests > 0) {
        html += `
          <div>
            <div style="font-weight: 500; margin-bottom: 8px;">Groq</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; color: #6b7280;">
              <div>Requests: ${usage.groq.requests}</div>
              <div>Tokens: ${usage.groq.tokensTotal.toLocaleString()}</div>
              <div>This minute: ${usage.groq.requestsThisMinute}/25</div>
              <div>Cost: $${usage.groq.estimatedCost.toFixed(4)}</div>
            </div>
          </div>
        `;
      }

      if (usage.anthropic && usage.anthropic.requests > 0) {
        html += `
          <div>
            <div style="font-weight: 500; margin-bottom: 8px;">Anthropic</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; color: #6b7280;">
              <div>Requests: ${usage.anthropic.requests}</div>
              <div>Tokens: ${usage.anthropic.tokensTotal.toLocaleString()}</div>
              <div>This minute: ${usage.anthropic.requestsThisMinute}/50</div>
              <div>Cost: $${usage.anthropic.estimatedCost.toFixed(4)}</div>
            </div>
          </div>
        `;
      }

      html += '</div>';
      statsContainer.innerHTML = html;
    } catch (error) {
      console.error('Failed to load usage stats:', error);
    }
  }
}

// Initialize the options page
new OptionsPage();
