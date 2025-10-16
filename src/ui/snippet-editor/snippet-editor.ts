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

    // Paste and copy handlers
    this.setupCopyPaste();

    // Auto-convert typed commands to pills
    this.setupAutoConvertCommands();

    // Double-click to edit pills
    this.setupPillEdit();

    // Event delegation for delete buttons
    this.setupDeleteButtons();

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

    // Check if trying to insert {cursor} when one already exists
    if (commandText === '{cursor}') {
      const existingCursor = this.editor.querySelector('.command-pill[data-command="{cursor}"]');
      if (existingCursor) {
        const replace = confirm('Only one {cursor} command is allowed per snippet.\n\nDo you want to replace the existing {cursor}?');
        if (!replace) return;
        // Remove existing cursor pill
        existingCursor.remove();
      }
    }

    const pill = document.createElement('span');
    pill.className = 'command-pill';
    pill.contentEditable = 'false';
    pill.draggable = true;
    pill.setAttribute('data-command', commandText);

    // Add command text
    const textNode = document.createTextNode(commandText);
    pill.appendChild(textNode);

    // Add delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '✕';
    deleteBtn.setAttribute('aria-label', 'Delete command');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      pill.remove();
    });
    pill.appendChild(deleteBtn);

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

  private setupCopyPaste() {
    if (!this.editor) return;

    // Paste handler: convert {command} text to pills
    this.editor.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = e.clipboardData?.getData('text/plain');
      if (!text) return;

      // Check if pasted text contains command syntax
      const commandPattern = /\{[^}]+\}/g;
      if (commandPattern.test(text)) {
        // Convert to HTML with pills
        const htmlContent = this.contentToHTML(text);

        // Insert at cursor position
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();

          // Create temporary container to parse HTML
          const temp = document.createElement('div');
          temp.innerHTML = htmlContent;

          // Insert all nodes from temp
          const frag = document.createDocumentFragment();
          while (temp.firstChild) {
            frag.appendChild(temp.firstChild);
          }
          range.insertNode(frag);

          // Move cursor to end of inserted content
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } else {
        // Plain text, use default paste
        document.execCommand('insertText', false, text);
      }
    });

    // Copy handler: convert pills to {command} syntax
    this.editor.addEventListener('copy', (e) => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const fragment = range.cloneContents();

      // Create temp container with the selection
      const temp = document.createElement('div');
      temp.appendChild(fragment);

      // Convert pills to plain text
      const plainText = this.htmlToContent(temp.innerHTML);

      // Set clipboard data
      e.clipboardData?.setData('text/plain', plainText);
      e.preventDefault();
    });

    // Cut handler: copy then delete
    this.editor.addEventListener('cut', (e) => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const fragment = range.cloneContents();

      // Create temp container with the selection
      const temp = document.createElement('div');
      temp.appendChild(fragment);

      // Convert pills to plain text
      const plainText = this.htmlToContent(temp.innerHTML);

      // Set clipboard data
      e.clipboardData?.setData('text/plain', plainText);

      // Delete selection
      range.deleteContents();

      e.preventDefault();
    });
  }

  private setupAutoConvertCommands() {
    if (!this.editor) return;

    // Listen for input to detect when user types }
    this.editor.addEventListener('input', (e) => {
      const inputEvent = e as InputEvent;

      // Only process if user typed a character (not paste, cut, etc.)
      if (inputEvent.inputType !== 'insertText') return;
      if (inputEvent.data !== '}') return;

      // Get current selection
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const container = range.startContainer;

      // Get text before cursor
      let textBefore = '';
      if (container.nodeType === Node.TEXT_NODE) {
        textBefore = container.textContent?.substring(0, range.startOffset) || '';
      }

      // Find the last { before cursor
      const lastBraceIndex = textBefore.lastIndexOf('{');
      if (lastBraceIndex === -1) return;

      // Extract potential command (including the })
      const potentialCommand = textBefore.substring(lastBraceIndex) + '}';

      // Validate command
      if (!this.isValidCommand(potentialCommand)) return;

      // Check if trying to add {cursor} when one already exists
      if (potentialCommand === '{cursor}') {
        const existingCursor = this.editor?.querySelector('.command-pill[data-command="{cursor}"]');
        if (existingCursor) {
          const replace = confirm('Only one {cursor} command is allowed per snippet.\n\nDo you want to replace the existing {cursor}?');
          if (!replace) return;
          // Remove existing cursor pill
          existingCursor.remove();
        }
      }

      // Replace text with pill
      // Calculate positions
      const commandLength = potentialCommand.length;
      const startOffset = range.startOffset - commandLength + 1; // +1 because we just typed }

      // Create new range for selection
      const replaceRange = document.createRange();
      replaceRange.setStart(container, startOffset);
      replaceRange.setEnd(container, range.startOffset);

      // Delete the typed command text
      replaceRange.deleteContents();

      // Insert pill at that position
      const pill = document.createElement('span');
      pill.className = 'command-pill';
      pill.contentEditable = 'false';
      pill.draggable = true;
      pill.setAttribute('data-command', potentialCommand);

      // Add command text
      const textNode = document.createTextNode(potentialCommand);
      pill.appendChild(textNode);

      // Add delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = '✕';
      deleteBtn.setAttribute('aria-label', 'Delete command');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        pill.remove();
      });
      pill.appendChild(deleteBtn);

      replaceRange.insertNode(pill);

      // Add space after pill and position cursor
      const space = document.createTextNode('\u00A0');
      replaceRange.collapse(false);
      replaceRange.insertNode(space);
      replaceRange.setStartAfter(space);
      replaceRange.setEndAfter(space);
      selection.removeAllRanges();
      selection.addRange(replaceRange);
    });
  }

  private isValidCommand(command: string): boolean {
    // List of valid command patterns
    const validCommands = [
      /^\{date(?::.+)?\}$/,           // {date} or {date:YYYY-MM-DD} or {date shift +3M}
      /^\{time(?::.+)?\}$/,           // {time} or {time:12h}
      /^\{clipboard\}$/,              // {clipboard}
      /^\{cursor\}$/,                 // {cursor}
      /^\{enter\}$/,                  // {enter}
      /^\{tab\}$/,                    // {tab}
      /^\{delay(?:\s+\+?\d+(?:\.\d+)?(?:s|ms))?\}$/, // {delay} or {delay +1s} or {delay +300ms}
      /^\{key:\s*.+\}$/,              // {key: enter} or {key: tab}
      /^\{formtext(?::.+)?\}$/,       // {formtext} or {formtext: label=Name}
      /^\{formparagraph(?::.+)?\}$/,  // {formparagraph: label=Notes}
      /^\{formmenu(?::.+)?\}$/,       // {formmenu: label=Status; options=Active,Inactive}
      /^\{formdate(?::.+)?\}$/,       // {formdate: label=Date}
      /^\{formtoggle(?::.+)?\}$/,     // {formtoggle: label=Toggle}
    ];

    return validCommands.some(pattern => pattern.test(command));
  }

  private setupPillEdit() {
    if (!this.editor) return;

    // Double-click pill to edit
    this.editor.addEventListener('dblclick', (e) => {
      const target = e.target as HTMLElement;
      if (!target.classList.contains('command-pill')) return;

      e.preventDefault();
      e.stopPropagation();

      this.editPill(target);
    });
  }

  private setupDeleteButtons() {
    if (!this.editor) return;

    // Event delegation for delete buttons (handles dynamically created buttons)
    this.editor.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.classList.contains('delete-btn')) return;

      e.preventDefault();
      e.stopPropagation();

      // Find parent pill and remove it
      const pill = target.closest('.command-pill');
      if (pill) {
        pill.remove();
      }
    });
  }

  private editPill(pill: HTMLElement) {
    const currentCommand = pill.getAttribute('data-command') || pill.textContent || '';

    // Create inline input
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentCommand;
    input.style.cssText = `
      font-family: monospace;
      font-size: 13px;
      padding: 2px 6px;
      border: 2px solid #2196F3;
      border-radius: 4px;
      background: white;
      outline: none;
      min-width: 150px;
    `;

    // Replace pill with input temporarily
    pill.style.display = 'none';
    pill.parentNode?.insertBefore(input, pill);
    input.focus();
    input.select();

    const saveEdit = () => {
      const newCommand = input.value.trim();

      // Validate new command
      if (newCommand && this.isValidCommand(newCommand)) {
        // Check if changing to {cursor} and one already exists (not this one)
        if (newCommand === '{cursor}' && currentCommand !== '{cursor}') {
          const existingCursor = this.editor?.querySelector('.command-pill[data-command="{cursor}"]');
          if (existingCursor && existingCursor !== pill) {
            const replace = confirm('Only one {cursor} command is allowed per snippet.\n\nDo you want to replace the existing {cursor}?');
            if (replace) {
              existingCursor.remove();
            } else {
              cancelEdit();
              return;
            }
          }
        }

        // Update pill - clear and rebuild with new command
        pill.innerHTML = '';
        pill.setAttribute('data-command', newCommand);

        // Add command text
        const textNode = document.createTextNode(newCommand);
        pill.appendChild(textNode);

        // Re-add delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '✕';
        deleteBtn.setAttribute('aria-label', 'Delete command');
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          pill.remove();
        });
        pill.appendChild(deleteBtn);

        pill.style.display = '';
        input.remove();
      } else {
        // Invalid command
        alert('Invalid command syntax. Please check your command and try again.');
        input.focus();
      }
    };

    const cancelEdit = () => {
      pill.style.display = '';
      input.remove();
    };

    // Save on Enter
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      }
    });

    // Save on blur (click outside)
    input.addEventListener('blur', () => {
      // Use setTimeout to allow click events to process first
      setTimeout(() => saveEdit(), 100);
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
      const escapedMatch = this.escapeHtml(match);
      return `<span class="command-pill" contenteditable="false" draggable="true" data-command="${escapedMatch}">${escapedMatch}<button class="delete-btn" aria-label="Delete command">✕</button></span>`;
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
