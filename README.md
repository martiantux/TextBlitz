# ⚡ TextBlitz

> Lightning-fast text expansion for Chrome. Free and open source.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-yellow)](https://developer.chrome.com/docs/extensions/)

**Free. Fast. Privacy-first. Open source.**

---

## 🎯 Why TextBlitz?

**TextBlitz** is a free, open-source text expansion tool for Chrome. We're building full-featured text expansion with dynamic content, forms, variables, and LLM-generated text.

**Your snippets, your data, your computer.** No accounts, no servers, no tracking.

Built for anyone who types the same things repeatedly.

**Privacy-first AI:** Optional LLM features use your own API keys, stored locally. Code is open source and auditable. You control what gets sent, if anything.

---

## ✨ Current Features (v0.8.0)

### What Works Now
- ⚡ **Text expansion** - Works in all input types (text, email, search, textarea, etc.)
- 🎯 **3 trigger modes** - Word start, word both ends, or anywhere
- 📍 **{cursor} positioning** - Place cursor anywhere in expanded text
- 📅 **{date} command** - Insert dates with custom formats (YYYY-MM-DD, MM/DD/YYYY, MMMM D, YYYY)
- 🗓️ **Date arithmetic** - {date shift +3M} add/subtract days, months, years
- 🔢 **Ordinal dates** - {date:MMMM Do YYYY} → "October 13th, 2025"
- ⏰ **{time} command** - Insert times with 12h/24h formats
- 📋 **{clipboard} command** - Insert clipboard content into snippets
- ⌨️ **{enter} & {tab}** - Simulate keyboard presses for form automation
- ⏱️ **{delay}** - Pause between actions ({delay +0.3s} or {delay +300ms})
- 🤖 **LLM-powered snippets** - 4 providers (Groq, OpenAI, Anthropic, Gemini), 8 models
- ✨ **Snippet generator** - Create snippets from natural language descriptions
- 💰 **Usage & cost tracking** - Monitor API usage, tokens, and estimated costs per provider
- 🚦 **Rate limiting** - Tier-aware protection with visual alerts (green/orange/red)
- 🎨 **Modern UI** - Clean two-panel layout with sidebar navigation
- ✏️ **WYSIWYG snippet editor** - Full-page rich text editor with formatting toolbar and drag-and-drop command pills
- 📁 **Custom folders** - Create/delete/organize with emoji icons
- 🌙 **Dark mode** - Light/dark/system theme support
- 🔍 **Search & filter** - Real-time search by label, trigger, or expansion
- 📊 **Sort options** - By recent, most used, or alphabetical
- 🏷️ **Labels & triggers** - Separate friendly names from shortcut text
- 📝 **Interactive forms** - {formtext}, {formmenu}, {formdate}, {formtoggle}, {formparagraph}
- 💾 **Import/Export** - Backup and restore your snippets (including individual folders)
- 🚀 **Fast matching** - Trie data structure for O(m) lookup time
- 🔒 **Privacy-first** - Your snippets never leave your computer, API keys stored locally
- 📈 **Usage tracking** - See which snippets you use most
- 🐛 **Debug mode** - Optional verbose logging for troubleshooting
- 📋 **Snippet duplication** - Clone existing snippets with one click
- ⌨️ **Keyboard shortcuts** - Ctrl+Shift+S to quickly add new snippets
- 🗂️ **Smart folder management** - Remembers last used folder, rename with double-click or edit button
- 📤 **Context-aware export** - Export all snippets or just current folder
- 🔄 **Case transformation** - 6 modes including match trigger case (btw → "by the way", BTW → "BY THE WAY")
- 📦 **Snippet Packs** - Curated collections for developers, customer service, ADHD productivity, and more

### Current Status (v0.8.0)
- ✅ **Cross-site compatibility** - Works on Google Docs, ChatGPT, Discord, Gmail, GitHub, Reddit, and all standard inputs
- ✅ **Reliable expansion** - Clean trigger deletion, no doubling, proper cursor positioning
- ✅ **Professional editor** - Full-page WYSIWYG editor with drag-and-drop command pills
- ✅ **Production ready** - Tested on major sites, defensive error handling

### Coming Soon (see ROADMAP.md)
- 💡 **Inline tooltips** - Contextual help without cluttering UI (v0.9.0+)
- ⚙️ **Power features** - Conditionals, formulas (v1.1.0+ post-launch)

---

## 📦 Installation

### Option 1: Install from Chrome Web Store
*Coming soon - publishing in progress*

### Option 2: Install from Source

**Prerequisites:**
- Node.js 18+ and npm
- Chrome browser

**Steps:**

1. **Clone the repository**
   ```bash
   git clone https://github.com/martiantux/TextBlitz.git
   cd TextBlitz
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `dist` folder from the project directory

5. **Verify installation**
   - Look for the TextBlitz icon in your extensions
   - Right-click the icon → Options to configure

📖 See [INSTALL.md](./INSTALL.md) for detailed installation instructions and troubleshooting.

---

## 🚀 Quick Start

### Try the Example Snippets

TextBlitz comes with 3 example snippets pre-installed:

| Trigger | Expands to        |
|---------|-------------------|
| `btw`   | by the way        |
| `thx`   | thank you         |
| `brb`   | be right back     |

**Test it:**
1. Open any website with a text input (Gmail, Google Docs, Twitter, etc.)
2. Type `btw` followed by a space
3. Watch it instantly expand to "by the way"!

### Add Your Own Snippets

**Static snippet (fixed text):**
1. Right-click the TextBlitz icon → **Options**
2. Click **"+ Add Snippet"**
3. Enter your trigger (e.g., `myemail`)
4. Enter your expansion (e.g., `your.email@example.com`)
5. Click **Save**
6. Start typing!

**Dynamic snippet (LLM-generated variations):**
1. Get a free Groq API key at https://console.groq.com/
2. Click **"🤖 LLM Settings"** and paste your key
3. Create a new snippet, set Type to **"Dynamic"**
4. Enter LLM prompt (e.g., `Write a friendly greeting, 5 words or less`)
5. Test it - you'll get different greetings each time!

### Use Snippet Packs

TextBlitz includes 3 curated starter packs:
- 💬 **Essential Communication** - Professional templates
- 🧑‍💻 **Developer Essentials** - Git, code snippets, PR templates
- 📧 **Customer Service Pro** - Empathy, de-escalation, support

**To install a starter pack:**
1. Go to **Options** → **📦 Snippet Packs**
2. Browse available packs and click **"Preview & Install"**
3. Review the snippets in the pack
4. Choose conflict resolution (skip/rename/replace duplicates)
5. Optionally create a dedicated folder for the pack
6. Click **Install Pack**

**Create your own pack:**
1. Export your snippets as JSON
2. Share with others or keep as backup
3. Pack format includes metadata (name, description, author, icon)

### Common Use Cases

**Current capabilities (v0.7.0):**
- **Email templates**: `followup` → "Hi [name], just following up on..."
- **Date stamps**: `td` → `{date}` → "2025-10-13"
- **Signatures with dates**: `sig` → "Best regards,\n{cursor}\nSent on {date:MMMM D, YYYY}"
- **Clipboard insertion**: `dear` → "Dear {clipboard}, thank you for..."
- **Form automation**: `sss` → `out {enter} {delay +0.3s} {tab} left {enter}` - Navigate through form fields
- **Future dates**: `followup` → "Contact on {date:MMMM Do YYYY shift +3M}" → "Contact on January 13th, 2026"
- **Interactive forms**: `contact` → Popup asks for Name, Email, Message → Fills template with values
- **Case matching**: `btw` → "by the way", `BTW` → "BY THE WAY" (with match mode)
- **Code snippets**: `arrow` → `() => {}`
- **URLs**: `gh` → `https://github.com/yourusername`
- **Customer service**: `csempathy` → Empathy-driven support responses (from CS Pro pack)
- **Developer workflows**: `gitfix` → Properly formatted commit messages (from Developer pack)

**Coming next (v0.9.0):**
- **Better site compatibility**: Rock-solid Gmail, Google Docs, Slack support

**Coming later (v1.1.0+):**
- **Conditionals & formulas**: Advanced logic and calculations in snippets

---

## 🏗️ Architecture

```
TextBlitz/
├── src/
│   ├── content/
│   │   └── expander.ts             # Main content script - text detection & expansion
│   ├── background/
│   │   └── service-worker.ts       # Background worker - lifecycle management
│   ├── lib/
│   │   ├── types.ts                # TypeScript type definitions & defaults
│   │   ├── storage.ts              # Chrome storage abstraction with caching
│   │   ├── trie.ts                 # Trie data structure for fast matching
│   │   ├── replacer.ts             # Text replacement engine (multi-node, execCommand)
│   │   ├── command-parser.ts       # Parse {date}, {clipboard}, {cursor}, etc.
│   │   ├── form-popup.ts           # Interactive form popup UI
│   │   ├── case-transform.ts       # Case transformation (upper, lower, match, etc.)
│   │   ├── word-boundaries.ts      # Word boundary detection utilities
│   │   ├── pack-manager.ts         # Snippet pack import/export/conflict resolution
│   │   ├── starter-packs.ts        # Curated starter pack definitions
│   │   └── llm/                    # LLM integration
│   │       ├── types.ts            # LLM types and configs
│   │       ├── providers.ts        # Base LLM provider class
│   │       ├── manager.ts          # LLM provider manager
│   │       ├── usage-tracker.ts    # Token usage and cost tracking
│   │       ├── groq.ts             # Groq provider
│   │       ├── openai.ts           # OpenAI provider
│   │       ├── anthropic.ts        # Anthropic provider
│   │       └── gemini.ts           # Google Gemini provider
│   └── ui/
│       ├── options/                # Options page for snippet management
│       │   ├── options.html
│       │   ├── options.ts
│       │   └── options.css
│       ├── snippet-editor/         # Full-page WYSIWYG snippet editor
│       │   ├── snippet-editor.html
│       │   ├── snippet-editor.ts
│       │   └── snippet-editor.css
│       └── popup/                  # Extension popup UI
│           ├── popup.html
│           └── popup.ts
├── public/
│   ├── manifest.json               # Chrome extension manifest (V3)
│   └── icons/
└── vite.config.ts                  # Build configuration
```

### How It Works

1. **Content Script** (expander.ts) loads on every page
2. **Event listeners** detect typing in input fields (regular inputs + contenteditable)
3. **Buffer** tracks last 50 characters typed
4. **Trie search** finds matching snippets in O(m) time
5. **Command parser** processes {date}, {cursor}, {clipboard}, {formtext}, etc.
6. **Replacement engine** handles text insertion (multi-node support, execCommand fallback)
7. **LLM manager** generates dynamic content via configured providers
8. **Form popup** displays interactive forms for variable input
9. **Pack manager** handles importing/exporting snippet collections

---

## 🛠️ Development

### Setup Development Environment

```bash
# Install dependencies
npm install

# Start development build with watch mode
npm run dev

# Build for production
npm run build

# After changes, reload the extension:
# Go to chrome://extensions/ and click the refresh icon
```

### Project Scripts

| Command        | Description                           |
|----------------|---------------------------------------|
| `npm run dev`  | Build with watch mode for development |
| `npm run build`| Production build                      |
| `npm run preview` | Preview build output              |

### Tech Stack

- **TypeScript** - Type safety and better DX
- **Vite** - Fast builds and hot module replacement
- **Chrome Extension API** - Manifest V3
- **Vanilla JS/CSS** - No framework overhead in content scripts

---

## 🗺️ Roadmap

See [ROADMAP.md](./ROADMAP.md) for detailed feature plans and version milestones.

**v0.8.0 - Complete! ✅ WYSIWYG Editor**
- **Full-page snippet editor:** Dedicated editing page with rich formatting tools
- **WYSIWYG toolbar:** Bold, italic, underline, strikethrough, font sizes
- **Drag-and-drop command pills:** Reorder commands by dragging within editor
- **Command insertion dropdown:** Organized categories (Basic, Keyboard, Forms)
- **Professional UI:** Consistent design system matching options page theme
- **Dark mode support:** Editor inherits theme preference automatically
- **All previous features:** Reliability improvements, structured logging, error reporting

**Next Up - v0.9.0: Beta Testing & Site Compatibility**
- Better contenteditable support (Gmail, Google Docs, Slack)
- Multi-node text handling and execCommand fallback
- Friend beta testing for real-world validation
- Performance testing with 100+ snippets
- Bug fixes and edge cases

**Road to v1.0.0 Chrome Web Store:**
- **v0.9.0 Beta**: ContentEditable improvements, friend testing, bug fixes
- **v1.0.0**: Final polish & Chrome Web Store launch 🚀

**Post-Launch Power Features:**
- **v1.1.0+**: Conditionals, formulas, snippet chaining

---

## 📝 License

[MIT License](./LICENSE) - Use it, modify it, share it. Just keep it open and free.

---

## 📞 Support & Feedback

- **Found a bug?** [Report it on GitHub Issues](https://github.com/martiantux/TextBlitz/issues)
- **Feature requests?** [Start a discussion](https://github.com/martiantux/TextBlitz/discussions)
- **Want to support development?** [Sponsor on GitHub](https://github.com/sponsors/martiantux)

---

## ⚠️ Known Limitations

- Password fields are intentionally excluded for security
- Number/date/time input fields not compatible with text expansion
- Some custom editors (CodeMirror, Monaco, Lexical) may have limited support
- Works best with Chromium browsers (Chrome, Edge, Brave)

---

**Made with ⚡ and ❤️ for everyone who's tired of repetitive typing.**
