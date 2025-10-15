// WYSIWYG snippet editor with visual command insertion
// Based on the screenshot reference - clean, intuitive UI for snippet editing

export class WysiwygEditor {
  private container: HTMLElement;
  private editor: HTMLDivElement;
  private toolbar: HTMLDivElement;
  private onChangeCallback?: (content: string) => void;

  constructor(containerId: string, initialContent: string = '') {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container element #${containerId} not found`);
    }
    this.container = container;

    this.toolbar = this.createToolbar();
    this.editor = this.createEditor(initialContent);

    this.container.appendChild(this.toolbar);
    this.container.appendChild(this.editor);

    this.setupEventListeners();
  }

  private createToolbar(): HTMLDivElement {
    const toolbar = document.createElement('div');
    toolbar.className = 'wysiwyg-toolbar';

    // Formatting buttons
    const formatGroup = this.createButtonGroup([
      { label: 'B', command: 'bold', title: 'Bold' },
      { label: 'I', command: 'italic', title: 'Italic' },
      { label: 'U', command: 'underline', title: 'Underline' },
      { label: 'S', command: 'strikeThrough', title: 'Strikethrough' },
    ]);

    // Command insertion buttons
    const commandGroup = this.createCommandGroup();

    toolbar.appendChild(formatGroup);
    toolbar.appendChild(this.createDivider());
    toolbar.appendChild(commandGroup);

    return toolbar;
  }

  private createButtonGroup(buttons: Array<{label: string, command: string, title: string}>): HTMLDivElement {
    const group = document.createElement('div');
    group.className = 'wysiwyg-button-group';

    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'wysiwyg-btn';
      button.textContent = btn.label;
      button.title = btn.title;
      button.addEventListener('click', (e) => {
        e.preventDefault();
        document.execCommand(btn.command, false);
        this.editor.focus();
      });
      group.appendChild(button);
    });

    return group;
  }

  private createCommandGroup(): HTMLDivElement {
    const group = document.createElement('div');
    group.className = 'wysiwyg-command-group';

    const commands = [
      { icon: '⏎', label: 'enter', title: 'Insert Enter key' },
      { icon: '⇥', label: 'tab', title: 'Insert Tab key' },
      { icon: '⏱️', label: 'delay', title: 'Insert delay (e.g., +3s)' },
      { icon: '📅', label: 'date', title: 'Insert current date' },
      { icon: '🕐', label: 'time', title: 'Insert current time' },
      { icon: '📋', label: 'clipboard', title: 'Insert clipboard contents' },
      { icon: '|', label: 'cursor', title: 'Set cursor position' },
      { icon: '📝', label: 'formtext', title: 'Insert text input field' },
      { icon: '📋', label: 'formlist', title: 'Insert dropdown list' },
    ];

    commands.forEach(cmd => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'wysiwyg-cmd-btn';
      button.innerHTML = `<span class="cmd-icon">${cmd.icon}</span><span class="cmd-label">${cmd.label}</span>`;
      button.title = cmd.title;
      button.addEventListener('click', (e) => {
        e.preventDefault();
        this.insertCommand(cmd.label);
      });
      group.appendChild(button);
    });

    return group;
  }

  private createDivider(): HTMLDivElement {
    const divider = document.createElement('div');
    divider.className = 'wysiwyg-divider';
    return divider;
  }

  private createEditor(initialContent: string): HTMLDivElement {
    const editor = document.createElement('div');
    editor.className = 'wysiwyg-editor';
    editor.contentEditable = 'true';
    editor.setAttribute('spellcheck', 'true');

    // Convert plain text with commands to visual format
    editor.innerHTML = this.textToHtml(initialContent);

    return editor;
  }

  private setupEventListeners() {
    // Track changes
    this.editor.addEventListener('input', () => {
      if (this.onChangeCallback) {
        this.onChangeCallback(this.getContent());
      }
    });

    // Prevent default behavior for certain keys
    this.editor.addEventListener('keydown', (e) => {
      // Allow normal editing
      if (e.key === 'Enter' && !e.shiftKey) {
        // Allow enter but ensure it creates a new line
        document.execCommand('insertLineBreak');
        e.preventDefault();
      }
    });
  }

  private insertCommand(command: string) {
    // Special handling for commands that need user input
    if (command === 'delay') {
      const delay = prompt('Enter delay (e.g., 3s for 3 seconds):', '3s');
      if (delay) {
        this.insertCommandPill(`{delay:${delay}}`);
      }
      return;
    }

    if (command === 'formtext') {
      const name = prompt('Enter field name:', 'name');
      const defaultVal = prompt('Enter default value (optional):', '');
      if (name) {
        const cmdText = defaultVal
          ? `{formtext: name=${name}; default=${defaultVal}}`
          : `{formtext: name=${name}}`;
        this.insertCommandPill(cmdText);
      }
      return;
    }

    if (command === 'formlist') {
      const name = prompt('Enter field name:', 'option');
      const options = prompt('Enter options (comma-separated):', 'Option 1, Option 2, Option 3');
      if (name && options) {
        this.insertCommandPill(`{formlist: name=${name}; options=${options}}`);
      }
      return;
    }

    // Standard commands
    const commandMap: Record<string, string> = {
      'enter': '{enter}',
      'tab': '{tab}',
      'date': '{date}',
      'time': '{time}',
      'clipboard': '{clipboard}',
      'cursor': '{cursor}',
    };

    const cmdText = commandMap[command];
    if (cmdText) {
      this.insertCommandPill(cmdText);
    }
  }

  private insertCommandPill(commandText: string) {
    const pill = document.createElement('span');
    pill.className = 'command-pill';
    pill.contentEditable = 'false';
    pill.textContent = commandText;
    pill.setAttribute('data-command', commandText);

    // Insert at cursor position
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(pill);

      // Move cursor after pill
      range.setStartAfter(pill);
      range.setEndAfter(pill);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      this.editor.appendChild(pill);
    }

    this.editor.focus();

    if (this.onChangeCallback) {
      this.onChangeCallback(this.getContent());
    }
  }

  // Convert plain text with {commands} to HTML with visual pills
  private textToHtml(text: string): string {
    if (!text) return '';

    // Escape HTML first
    const div = document.createElement('div');
    div.textContent = text;
    let escaped = div.innerHTML;

    // Replace newlines with <br>
    escaped = escaped.replace(/\n/g, '<br>');

    // Find and replace commands with pills
    const commandRegex = /\{[^}]+\}/g;
    escaped = escaped.replace(commandRegex, (match) => {
      return `<span class="command-pill" contenteditable="false" data-command="${this.escapeHtml(match)}">${this.escapeHtml(match)}</span>`;
    });

    return escaped;
  }

  // Convert HTML back to plain text with {commands}
  private htmlToText(html: string): string {
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Replace command pills with their text
    const pills = temp.querySelectorAll('.command-pill');
    pills.forEach(pill => {
      const command = pill.getAttribute('data-command') || pill.textContent || '';
      const textNode = document.createTextNode(command);
      pill.parentNode?.replaceChild(textNode, pill);
    });

    // Replace <br> with newlines
    const brs = temp.querySelectorAll('br');
    brs.forEach(br => {
      br.parentNode?.replaceChild(document.createTextNode('\n'), br);
    });

    // Get plain text
    return temp.textContent || '';
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Public API
  public getContent(): string {
    return this.htmlToText(this.editor.innerHTML);
  }

  public setContent(text: string) {
    this.editor.innerHTML = this.textToHtml(text);
  }

  public onChange(callback: (content: string) => void) {
    this.onChangeCallback = callback;
  }

  public focus() {
    this.editor.focus();
  }

  public destroy() {
    this.container.innerHTML = '';
  }
}
