// Professional WYSIWYG snippet editor with formatting + command insertion

export class WysiwygEditor {
  private container: HTMLElement;
  private editor: HTMLDivElement;
  private toolbar: HTMLDivElement;
  private commandMenu: HTMLDivElement | null = null;
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

    // Text formatting buttons
    const formatGroup = this.createFormatButtons();

    // Font size selector
    const fontSizeSelect = this.createFontSizeSelector();

    // Divider
    const divider1 = this.createDivider();

    // Insert Command dropdown button
    const insertCmdBtn = this.createInsertCommandButton();

    toolbar.appendChild(formatGroup);
    toolbar.appendChild(fontSizeSelect);
    toolbar.appendChild(divider1);
    toolbar.appendChild(insertCmdBtn);

    return toolbar;
  }

  private createFormatButtons(): HTMLDivElement {
    const group = document.createElement('div');
    group.className = 'wysiwyg-button-group';

    const formats = [
      { label: 'B', command: 'bold', title: 'Bold (Ctrl+B)', style: 'font-weight: bold;' },
      { label: 'I', command: 'italic', title: 'Italic (Ctrl+I)', style: 'font-style: italic;' },
      { label: 'U', command: 'underline', title: 'Underline (Ctrl+U)', style: 'text-decoration: underline;' },
      { label: 'S', command: 'strikeThrough', title: 'Strikethrough', style: 'text-decoration: line-through;' },
    ];

    formats.forEach(fmt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wysiwyg-btn';
      btn.innerHTML = `<span style="${fmt.style}">${fmt.label}</span>`;
      btn.title = fmt.title;
      btn.setAttribute('data-command', fmt.command);
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        document.execCommand(fmt.command, false);
        this.editor.focus();
        this.updateToolbarState();
      });
      group.appendChild(btn);
    });

    return group;
  }

  private createFontSizeSelector(): HTMLSelectElement {
    const select = document.createElement('select');
    select.className = 'wysiwyg-font-select';
    select.title = 'Font size';

    const sizes = [
      { label: 'Small', value: '1' },
      { label: 'Normal', value: '3' },
      { label: 'Large', value: '5' },
      { label: 'Huge', value: '7' }
    ];

    sizes.forEach(size => {
      const option = document.createElement('option');
      option.value = size.value;
      option.textContent = size.label;
      if (size.value === '3') option.selected = true;
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value;
      document.execCommand('fontSize', false, value);
      this.editor.focus();
    });

    return select;
  }

  private createInsertCommandButton(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'command-dropdown-container';
    container.style.position = 'relative';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'wysiwyg-insert-cmd-btn';
    btn.innerHTML = '+ Insert Command';
    btn.title = 'Insert dynamic command';

    // Create dropdown menu
    const menu = document.createElement('div');
    menu.className = 'command-dropdown-menu';
    menu.style.display = 'none';

    // Basic Commands
    menu.innerHTML = `
      <div class="command-category">
        <div class="command-category-title">Basic Commands</div>
        <button type="button" class="command-menu-item" data-cmd="date">
          <span class="cmd-icon">📅</span>
          <div>
            <div class="cmd-name">Date/Time</div>
            <div class="cmd-desc">Insert current date</div>
          </div>
        </button>
        <button type="button" class="command-menu-item" data-cmd="time">
          <span class="cmd-icon">🕐</span>
          <div>
            <div class="cmd-name">Time</div>
            <div class="cmd-desc">Insert current time</div>
          </div>
        </button>
        <button type="button" class="command-menu-item" data-cmd="clipboard">
          <span class="cmd-icon">📋</span>
          <div>
            <div class="cmd-name">Clipboard</div>
            <div class="cmd-desc">Insert clipboard content</div>
          </div>
        </button>
        <button type="button" class="command-menu-item" data-cmd="cursor">
          <span class="cmd-icon">|</span>
          <div>
            <div class="cmd-name">Cursor</div>
            <div class="cmd-desc">Set cursor position</div>
          </div>
        </button>
      </div>
      <div class="command-category">
        <div class="command-category-title">Keyboard</div>
        <button type="button" class="command-menu-item" data-cmd="enter">
          <span class="cmd-icon">⏎</span>
          <div>
            <div class="cmd-name">Enter</div>
            <div class="cmd-desc">Press Enter key</div>
          </div>
        </button>
        <button type="button" class="command-menu-item" data-cmd="tab">
          <span class="cmd-icon">⇥</span>
          <div>
            <div class="cmd-name">Tab</div>
            <div class="cmd-desc">Press Tab key</div>
          </div>
        </button>
      </div>
      <div class="command-category">
        <div class="command-category-title">Forms</div>
        <button type="button" class="command-menu-item" data-cmd="formtext">
          <span class="cmd-icon">📝</span>
          <div>
            <div class="cmd-name">Text Field</div>
            <div class="cmd-desc">Single line input</div>
          </div>
        </button>
        <button type="button" class="command-menu-item" data-cmd="formlist">
          <span class="cmd-icon">📋</span>
          <div>
            <div class="cmd-name">Dropdown</div>
            <div class="cmd-desc">Select from options</div>
          </div>
        </button>
      </div>
    `;

    // Toggle menu
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isVisible = menu.style.display === 'block';
      menu.style.display = isVisible ? 'none' : 'block';
    });

    // Handle command clicks
    menu.querySelectorAll('.command-menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const cmd = (e.currentTarget as HTMLElement).getAttribute('data-cmd');
        if (cmd) {
          this.insertCommand(cmd);
          menu.style.display = 'none';
        }
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target as Node)) {
        menu.style.display = 'none';
      }
    });

    container.appendChild(btn);
    container.appendChild(menu);
    this.commandMenu = menu;

    return container;
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
    editor.setAttribute('data-placeholder', 'Type your snippet expansion here...');

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

    // Update toolbar button states
    this.editor.addEventListener('mouseup', () => this.updateToolbarState());
    this.editor.addEventListener('keyup', () => this.updateToolbarState());
    this.editor.addEventListener('focus', () => this.updateToolbarState());

    // Keyboard shortcuts
    this.editor.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch(e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            document.execCommand('bold');
            this.updateToolbarState();
            break;
          case 'i':
            e.preventDefault();
            document.execCommand('italic');
            this.updateToolbarState();
            break;
          case 'u':
            e.preventDefault();
            document.execCommand('underline');
            this.updateToolbarState();
            break;
        }
      }
    });

    // Drag and drop for command pills
    this.setupDragAndDrop();
  }

  private setupDragAndDrop() {
    let draggedElement: HTMLElement | null = null;

    // Make pills draggable when they're created
    this.editor.addEventListener('dragstart', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('command-pill')) {
        draggedElement = target;
        target.classList.add('dragging');
        e.dataTransfer!.effectAllowed = 'move';
        e.dataTransfer!.setData('text/html', target.outerHTML);
      }
    });

    this.editor.addEventListener('dragend', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('command-pill')) {
        target.classList.remove('dragging');
        draggedElement = null;
      }
    });

    this.editor.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'move';
    });

    this.editor.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!draggedElement) return;

      const range = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (range) {
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);

        // Remove old position
        draggedElement.remove();

        // Insert at new position
        range.insertNode(draggedElement);

        // Move cursor after pill
        range.setStartAfter(draggedElement);
        range.setEndAfter(draggedElement);
        selection?.removeAllRanges();
        selection?.addRange(range);

        if (this.onChangeCallback) {
          this.onChangeCallback(this.getContent());
        }
      }
    });
  }

  private updateToolbarState() {
    const buttons = this.toolbar.querySelectorAll('.wysiwyg-btn');
    buttons.forEach((button) => {
      const btn = button as HTMLButtonElement;
      const command = btn.getAttribute('data-command');
      if (!command) return;

      const isActive = document.queryCommandState(command);
      if (isActive) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
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
    pill.draggable = true;
    pill.textContent = commandText;
    pill.setAttribute('data-command', commandText);

    // Insert at cursor position
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(pill);

      // Add space after pill for easier typing
      const space = document.createTextNode(' ');
      range.setStartAfter(pill);
      range.insertNode(space);

      // Move cursor after space
      range.setStartAfter(space);
      range.setEndAfter(space);
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
      return `<span class="command-pill" contenteditable="false" draggable="true" data-command="${this.escapeHtml(match)}">${this.escapeHtml(match)}</span>`;
    });

    return escaped;
  }

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
