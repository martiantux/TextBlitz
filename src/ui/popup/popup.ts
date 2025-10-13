import { StorageManager } from '../../lib/storage';

class PopupUI {
  constructor() {
    this.initialize();
  }

  private async initialize() {
    await StorageManager.initialize();
    await this.loadStatus();
    this.setupEventListeners();
  }

  private async loadStatus() {
    const settings = await StorageManager.getSettings();
    const snippets = await StorageManager.getSnippets();
    const snippetArray = Object.values(snippets);

    const statusEl = document.getElementById('status');
    const statusTextEl = document.getElementById('status-text');
    const statsEl = document.getElementById('stats');

    if (settings.enabled) {
      statusEl?.classList.remove('disabled');
      if (statusTextEl) statusTextEl.textContent = '✓ TextBlitz is active';
    } else {
      statusEl?.classList.add('disabled');
      if (statusTextEl) statusTextEl.textContent = '✗ TextBlitz is disabled';
    }

    if (statsEl) {
      statsEl.textContent = `${snippetArray.length} snippet${snippetArray.length !== 1 ? 's' : ''} configured`;
    }

    // Show recent snippets
    const recentList = document.getElementById('recent-list');
    if (recentList) {
      const recentSnippets = snippetArray
        .filter(s => s.lastUsed)
        .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
        .slice(0, 5);

      if (recentSnippets.length === 0) {
        recentList.innerHTML = '<div class="empty">No snippets used yet</div>';
      } else {
        recentList.innerHTML = recentSnippets.map(s => `
          <div class="recent-item">
            <span class="trigger">${this.escapeHtml(s.trigger)}</span>
            <span class="expansion">→ ${this.escapeHtml(s.expansion.substring(0, 30))}${s.expansion.length > 30 ? '...' : ''}</span>
          </div>
        `).join('');
      }
    }
  }

  private setupEventListeners() {
    document.getElementById('open-options')?.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    document.getElementById('toggle-enabled')?.addEventListener('click', async () => {
      const settings = await StorageManager.getSettings();
      settings.enabled = !settings.enabled;
      await StorageManager.saveSettings(settings);
      await this.loadStatus();
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

new PopupUI();
