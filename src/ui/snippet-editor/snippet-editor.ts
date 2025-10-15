import { StorageManager } from '../../lib/storage';
import { Snippet, TriggerMode, SnippetType, LLMProvider, CaseTransform } from '../../lib/types';

class SnippetEditorPage {
  private currentSnippetId: string | null = null;
  private editor: HTMLElement | null = null;
  private draggedElement: HTMLElement | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    await StorageManager.initialize();
    await this.loadFolders();
    await this.applyTheme();
    this.setupWYSIWYG();
    this.setupEventListeners();
    await this.loadSnippetData();
  }

  private async applyTheme() {
    const settings = await StorageManager.getSettings();
    const theme = settings.darkMode || 'system';

    let effectiveTheme = theme;
    if (theme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.body.setAttribute('data-theme', effectiveTheme);
  }

  private async loadFolders() {
    const folderSelect = document.getElementById('snippet-folder') as HTMLSelectElement;
    if (!folderSelect) return;

    const settings = await StorageManager.getSettings();
    const customFolders = settings.customFolders || [];

    let html = '<option value="">No Folder</option>';
    html += '<option value="work">💼 Work</option>';
    html += '<option value="personal">👤 Personal</option>';

    customFolders.forEach(folder => {
      html += `<option value="${folder.id}">${folder.icon} ${this.escapeHtml(folder.name)}</option>`;
    });

    folderSelect.innerHTML = html;
  }

  private async loadSnippetData() {
    const urlParams = new URLSearchParams(window.location.search);
    const snippetId = urlParams.get('id');

    if (snippetId) {
      // Editing existing snippet
      this.currentSnippetId = snippetId;
      const snippet = await StorageManager.getSnippet(snippetId);

      if (snippet) {
        this.populateForm(snippet);
        const titleEl = document.getElementById('editor-title');
        if (titleEl) titleEl.textContent = 'Edit Snippet';
      } else {
        alert('Snippet not found');
        this.navigateBack();
      }
    } else {
      // Creating new snippet - use last used folder
      const settings = await StorageManager.getSettings();
      const folderSelect = document.getElementById('snippet-folder') as HTMLSelectElement;
      if (folderSelect && settings.lastUsedFolder) {
        folderSelect.value = settings.lastUsedFolder;
      }
    }
  }

  private populateForm(snippet: Snippet) {
    const labelInput = document.getElementById('snippet-label') as HTMLInputElement;
    const triggerInput = document.getElementById('snippet-trigger') as HTMLInputElement;
    const folderSelect = document.getElementById('snippet-folder') as HTMLSelectElement;
    const typeSelect = document.getElementById('snippet-type') as HTMLSelectElement;
    const triggerModeSelect = document.getElementById('snippet-trigger-mode') as HTMLSelectElement;
    const caseTransformSelect = document.getElementById('snippet-case-transform') as HTMLSelectElement;
    const enabledCheckbox = document.getElementById('snippet-enabled') as HTMLInputElement;
    const caseSensitiveCheckbox = document.getElementById('snippet-case-sensitive') as HTMLInputElement;
    const llmProviderSelect = document.getElementById('snippet-llm-provider') as HTMLSelectElement;
    const llmPromptInput = document.getElementById('snippet-llm-prompt') as HTMLTextAreaElement;
    const fallbackInput = document.getElementById('snippet-fallback') as HTMLInputElement;

    labelInput.value = snippet.label;
    triggerInput.value = snippet.trigger;
    folderSelect.value = snippet.folder || '';
    typeSelect.value = snippet.type || 'static';
    triggerModeSelect.value = snippet.triggerMode;
    caseTransformSelect.value = snippet.caseTransform || 'none';
    enabledCheckbox.checked = snippet.enabled;
    caseSensitiveCheckbox.checked = snippet.caseSensitive;

    if (snippet.type === 'dynamic') {
      llmProviderSelect.value = snippet.llmProvider || 'groq';
      llmPromptInput.value = snippet.llmPrompt || '';
      fallbackInput.value = snippet.fallbackText || '';
    } else {
      // Set WYSIWYG content
      if (this.editor) {
        this.editor.innerHTML = this.contentToHTML(snippet.expansion);
      }
    }

    this.toggleTypeFields();
  }

  private setupEventListeners() {
    // Back button
    document.getElementById('back-btn')?.addEventListener('click', () => {
      this.navigateBack();
    });

    // Cancel button
    document.getElementById('cancel-btn')?.addEventListener('click', () => {
      this.navigateBack();
    });

    // Save button
    document.getElementById('save-btn')?.addEventListener('click', () => {
      this.saveSnippet();
    });

    // Type toggle
    const typeSelect = document.getElementById('snippet-type') as HTMLSelectElement;
    typeSelect?.addEventListener('change', () => {
      this.toggleTypeFields();
    });
  }

  private setupWYSIWYG() {
    this.editor = document.getElementById('wysiwyg-editor');
    const toolbar = document.getElementById('wysiwyg-toolbar');
    const commandMenu = document.getElementById('command-menu');
    const insertCommandBtn = document.getElementById('insert-command-btn');
    const fontSizeSelect = document.getElementById('font-size') as HTMLSelectElement;

    if (!this.editor || !toolbar) return;

    // Format buttons
    toolbar.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-command]') as HTMLElement;
      if (!btn) return;

      e.preventDefault();
      const command = btn.dataset.command;
      if (command) {
        document.execCommand(command, false, null);
        this.updateToolbarState();
        this.editor?.focus();
      }
    });

    // Font size
    fontSizeSelect?.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      if (target.value) {
        document.execCommand('fontSize', false, target.value);
        this.updateToolbarState();
        this.editor?.focus();
      }
    });

    // Update toolbar button states based on current selection
    this.editor.addEventListener('mouseup', () => this.updateToolbarState());
    this.editor.addEventListener('keyup', () => this.updateToolbarState());

    // Command dropdown toggle
    insertCommandBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      commandMenu?.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.insert-command-wrapper')) {
        commandMenu?.classList.remove('show');
      }
    });

    // Insert command pill
    commandMenu?.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest('[data-cmd]') as HTMLElement;
      if (!item) return;

      const commandText = item.dataset.cmd;
      if (commandText) {
        this.insertCommandPill(commandText);
        commandMenu.classList.remove('show');
        this.editor?.focus();
      }
    });

    // Drag and drop
    this.setupDragAndDrop();

    // Focus editor on load
    this.editor.focus();
  }

  private updateToolbarState() {
    const toolbar = document.getElementById('wysiwyg-toolbar');
    if (!toolbar) return;

    const formatButtons = toolbar.querySelectorAll('[data-command]');
    formatButtons.forEach(btn => {
      const command = (btn as HTMLElement).dataset.command;
      if (command && document.queryCommandState(command)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private insertCommandPill(commandText: string) {
    if (!this.editor) return;

    const pill = document.createElement('span');
    pill.className = 'command-pill';
    pill.contentEditable = 'false';
    pill.draggable = true;
    pill.textContent = commandText;
    pill.setAttribute('data-command', commandText);

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(pill);

      // Add space after pill
      const space = document.createTextNode('\u00A0');
      range.collapse(false);
      range.insertNode(space);
      range.setStartAfter(space);
      range.setEndAfter(space);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      this.editor.appendChild(pill);
      this.editor.appendChild(document.createTextNode('\u00A0'));
    }
  }

  private setupDragAndDrop() {
    if (!this.editor) return;

    this.editor.addEventListener('dragstart', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('command-pill')) {
        this.draggedElement = target;
        target.classList.add('dragging');
        e.dataTransfer!.effectAllowed = 'move';
        e.dataTransfer!.setData('text/html', target.outerHTML);
      }
    });

    this.editor.addEventListener('dragend', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('command-pill')) {
        target.classList.remove('dragging');
      }
    });

    this.editor.addEventListener('dragover', (e) => {
      if (this.draggedElement) {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';
      }
    });

    this.editor.addEventListener('drop', (e) => {
      if (!this.draggedElement) return;

      e.preventDefault();

      // Get drop position
      const range = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (!range) return;

      // Remove dragged element from old position
      this.draggedElement.remove();

      // Insert at new position
      range.insertNode(this.draggedElement);

      // Position cursor after dropped element
      const newRange = document.createRange();
      newRange.setStartAfter(this.draggedElement);
      newRange.collapse(true);

      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(newRange);
      }

      this.draggedElement.classList.remove('dragging');
      this.draggedElement = null;

      this.editor?.focus();
    });
  }

  private toggleTypeFields() {
    const typeSelect = document.getElementById('snippet-type') as HTMLSelectElement;
    const dynamicFields = document.getElementById('dynamic-fields');

    if (typeSelect?.value === 'dynamic') {
      dynamicFields!.style.display = 'block';
    } else {
      dynamicFields!.style.display = 'none';
    }
  }

  private async saveSnippet() {
    const labelInput = document.getElementById('snippet-label') as HTMLInputElement;
    const triggerInput = document.getElementById('snippet-trigger') as HTMLInputElement;
    const folderSelect = document.getElementById('snippet-folder') as HTMLSelectElement;
    const typeSelect = document.getElementById('snippet-type') as HTMLSelectElement;
    const triggerModeSelect = document.getElementById('snippet-trigger-mode') as HTMLSelectElement;
    const caseTransformSelect = document.getElementById('snippet-case-transform') as HTMLSelectElement;
    const enabledCheckbox = document.getElementById('snippet-enabled') as HTMLInputElement;
    const caseSensitiveCheckbox = document.getElementById('snippet-case-sensitive') as HTMLInputElement;
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
        alert('Please enter an LLM prompt for this dynamic snippet');
        llmPromptInput.focus();
        return;
      }
      llmProvider = llmProviderSelect.value as LLMProvider;
      fallbackText = fallbackInput.value.trim() || undefined;
      expansion = llmPrompt; // Use prompt as expansion for display purposes
    } else {
      // Get content from WYSIWYG editor
      expansion = this.getEditorContent();
      if (!expansion) {
        alert('Please enter an expansion for this snippet');
        this.editor?.focus();
        return;
      }
    }

    // Get existing snippet data if editing
    let existingSnippet: Snippet | undefined;
    if (this.currentSnippetId) {
      existingSnippet = await StorageManager.getSnippet(this.currentSnippetId);
    }

    const snippet: Snippet = {
      id: this.currentSnippetId || `snippet-${Date.now()}`,
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
      createdAt: existingSnippet?.createdAt || Date.now(),
      usageCount: existingSnippet?.usageCount || 0,
      lastUsed: existingSnippet?.lastUsed,
    };

    await StorageManager.saveSnippet(snippet);

    // Remember the selected folder for next time
    if (!this.currentSnippetId) {
      const settings = await StorageManager.getSettings();
      settings.lastUsedFolder = folderSelect.value || undefined;
      await StorageManager.saveSettings(settings);
    }

    // Navigate back to options page
    this.navigateBack();
  }

  private getEditorContent(): string {
    if (!this.editor) return '';

    // Convert HTML content to plain text with command placeholders
    return this.htmlToContent(this.editor.innerHTML);
  }

  private htmlToContent(html: string): string {
    // Create temporary div to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Replace command pills with their command text
    const pills = temp.querySelectorAll('.command-pill');
    pills.forEach(pill => {
      const commandText = pill.getAttribute('data-command') || pill.textContent || '';
      pill.replaceWith(document.createTextNode(commandText));
    });

    return temp.textContent || '';
  }

  private contentToHTML(content: string): string {
    // Convert plain text with command placeholders to HTML with pills
    const temp = document.createElement('div');
    temp.textContent = content;

    let html = temp.innerHTML;

    // Find command patterns like {date}, {clipboard}, etc.
    const commandPattern = /\{[^}]+\}/g;
    html = html.replace(commandPattern, (match) => {
      return `<span class="command-pill" contenteditable="false" draggable="true" data-command="${this.escapeHtml(match)}">${this.escapeHtml(match)}</span>`;
    });

    return html;
  }

  private navigateBack() {
    window.location.href = '../options/options.html';
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize the snippet editor page
new SnippetEditorPage();
