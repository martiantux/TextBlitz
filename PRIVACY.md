# Privacy Policy for TextBlitz

**Last Updated:** October 13, 2025

## Overview

TextBlitz is committed to protecting your privacy. This extension operates entirely on your local machine and does not collect, transmit, or store any of your personal data on external servers.

## Data Collection

**We do not collect any data.** Period.

- No analytics
- No tracking
- No user accounts
- No telemetry
- No remote servers
- No data transmission

## Local Data Storage

TextBlitz stores data locally using Chrome's built-in storage API:

### What is Stored Locally:
- **Snippets**: Your text expansion shortcuts and their expansions
- **Settings**: Your preferences (theme, trigger modes, etc.)
- **Usage Statistics**: Local counters for which snippets you use most (never leaves your device)
- **LLM API Keys**: If you choose to use LLM features, your API keys are stored locally in Chrome's encrypted storage

### Where it's Stored:
- All data is stored in Chrome's local storage on your device
- Chrome handles encryption and security
- Data syncs via Chrome Sync only if you have Chrome Sync enabled (controlled by your Google account settings)
- We have no access to this data

## LLM Features (Optional)

TextBlitz offers optional integration with third-party LLM providers:

### How it Works:
- You provide your own API keys (Groq, OpenAI, Anthropic, Gemini)
- API keys are stored locally in Chrome's storage (never sent to us)
- When you use a dynamic snippet, YOUR browser makes a direct API call to the provider YOU chose
- We never see, store, or transmit your API keys or the content you generate

### What Gets Sent to LLM Providers:
- Only the prompt you define in your dynamic snippet
- Subject to that provider's privacy policy (not ours - we're not involved)
- You control what data gets sent by choosing what prompts to create

**You are in complete control. We never see any of this data.**

## Clipboard Access

TextBlitz requests clipboard read permission to support the `{clipboard}` command:

- Only accessed when you use a snippet with `{clipboard}` command
- Read-only access (we don't write to clipboard)
- Content is inserted directly into your text - never stored or transmitted
- You control when this happens by creating snippets that use this feature

## Open Source

TextBlitz is fully open source:

- Source code available at: https://github.com/martiantux/TextBlitz
- You can audit exactly what the code does
- No hidden behavior
- Community can verify our privacy claims

## Third-Party Services

TextBlitz does not use any third-party services except:

- **Chrome Web Store** (for distribution)
- **Optional LLM providers** (only if you configure them, using your own API keys)

We do not integrate with analytics services, crash reporters, or any other third-party tracking.

## Children's Privacy

TextBlitz does not knowingly collect information from children under 13. Since we don't collect any information from anyone, this is not a concern.

## Changes to This Policy

If we change this privacy policy, we will:
- Update the "Last Updated" date above
- Notify users via the extension update notes
- Maintain the same core principle: no data collection

## Contact

Questions about privacy?
- Open an issue: https://github.com/martiantux/TextBlitz/issues
- Email: bradley@hammond.im

## Summary

**Your data stays on your device. Always.**

We built TextBlitz because we believe productivity tools should respect your privacy. Your snippets, your data, your computer. That's it.
