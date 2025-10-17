import { StorageManager } from '../../lib/storage';
import { logger } from '../../lib/logger';

// Configure this URL after deploying the serverless proxy
const BUG_REPORT_API_URL = 'https://YOUR_VERCEL_FUNCTION_URL/api/create-issue';

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

    // Bug report modal
    document.getElementById('report-bug')?.addEventListener('click', () => {
      this.showBugReportModal();
    });

    document.getElementById('cancel-bug-report')?.addEventListener('click', () => {
      this.hideBugReportModal();
    });

    document.getElementById('submit-bug-report')?.addEventListener('click', () => {
      this.submitBugReport();
    });

    // Update log preview when checkbox changes
    document.getElementById('bug-include-logs')?.addEventListener('change', (e) => {
      const checkbox = e.target as HTMLInputElement;
      const preview = document.getElementById('log-preview');
      if (preview) {
        preview.style.display = checkbox.checked ? 'block' : 'none';
      }
    });
  }

  private showBugReportModal() {
    const modal = document.getElementById('bug-report-modal');
    modal?.classList.add('active');

    // Load log preview
    this.loadLogPreview();

    // Reset form
    (document.getElementById('bug-what-happened') as HTMLTextAreaElement).value = '';
    (document.getElementById('bug-what-doing') as HTMLTextAreaElement).value = '';
    (document.getElementById('bug-include-logs') as HTMLInputElement).checked = true;
    (document.getElementById('bug-include-snippet') as HTMLInputElement).checked = false;

    const statusDiv = document.getElementById('bug-status');
    if (statusDiv) {
      statusDiv.style.display = 'none';
      statusDiv.className = 'status-message';
    }
  }

  private hideBugReportModal() {
    document.getElementById('bug-report-modal')?.classList.remove('active');
  }

  private loadLogPreview() {
    const preview = document.getElementById('log-preview');
    if (!preview) return;

    const logs = logger.getLogsPreview();
    preview.textContent = logs;
  }

  private async submitBugReport() {
    const whatHappened = (document.getElementById('bug-what-happened') as HTMLTextAreaElement).value.trim();
    const whatDoing = (document.getElementById('bug-what-doing') as HTMLTextAreaElement).value.trim();
    const includeLogs = (document.getElementById('bug-include-logs') as HTMLInputElement).checked;
    const includeSnippet = (document.getElementById('bug-include-snippet') as HTMLInputElement).checked;
    const statusDiv = document.getElementById('bug-status');
    const submitBtn = document.getElementById('submit-bug-report') as HTMLButtonElement;

    if (!whatHappened || !whatDoing) {
      this.showStatus('error', 'Please fill in both description fields');
      return;
    }

    try {
      submitBtn.disabled = true;
      this.showStatus('error', '⏳ Submitting bug report...');

      // Build report
      let report = `## User Description\n\n`;
      report += `**What happened:** ${whatHappened}\n\n`;
      report += `**What were you doing:** ${whatDoing}\n\n`;
      report += `---\n\n`;

      // Get most recently used snippet if requested
      let snippetData = null;
      if (includeSnippet) {
        const snippets = await StorageManager.getSnippets();
        const recentSnippets = Object.values(snippets)
          .filter(s => s.lastUsed)
          .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));

        if (recentSnippets.length > 0) {
          snippetData = {
            trigger: recentSnippets[0].trigger,
            label: recentSnippets[0].label,
            expansion: recentSnippets[0].expansion,
            type: recentSnippets[0].type,
          };
        }
      }

      // Add formatted logs
      report += logger.formatForGitHub(includeSnippet, snippetData);

      // Submit to serverless proxy
      const response = await fetch(BUG_REPORT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Bug: ${whatHappened.substring(0, 60)}...`,
          body: report,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const result = await response.json();

      this.showStatus('success', `✅ Bug report submitted! Issue #${result.issueNumber || 'created'}`);

      // Close modal after 2 seconds
      setTimeout(() => {
        this.hideBugReportModal();
      }, 2000);

    } catch (error) {
      console.error('Bug report submission failed:', error);
      this.showStatus('error', `❌ Failed to submit: ${error instanceof Error ? error.message : 'Unknown error'}. You can report directly at github.com/martiantux/TextBlitz/issues`);
    } finally {
      submitBtn.disabled = false;
    }
  }

  private showStatus(type: 'success' | 'error', message: string) {
    const statusDiv = document.getElementById('bug-status');
    if (statusDiv) {
      statusDiv.className = `status-message ${type}`;
      statusDiv.textContent = message;
      statusDiv.style.display = 'block';
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

new PopupUI();
