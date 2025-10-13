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

## ✨ Current Features (v0.4.0)

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
- 🤖 **LLM-powered snippets** - LLM-generated text variations with Groq or Anthropic
- ✨ **Snippet generator** - Create snippets from natural language descriptions
- 💰 **Usage & cost tracking** - Monitor API usage, tokens, and estimated costs
- 🚦 **Rate limiting** - Built-in protection against API abuse (25/min for Groq)
- 🎨 **Modern UI** - Clean two-panel layout with sidebar navigation
- 📁 **Folder organization** - Organize snippets into Work, Personal, or custom folders
- 🔍 **Search & filter** - Real-time search by label, trigger, or expansion
- 📊 **Sort options** - By recent, most used, or alphabetical
- 🏷️ **Labels & triggers** - Separate friendly names from shortcut text
- 💾 **Import/Export** - Backup and restore your snippets
- 🚀 **Fast matching** - Trie data structure for O(m) lookup time
- 🔒 **Privacy-first** - Your snippets never leave your computer, API keys stored locally
- 📈 **Usage tracking** - See which snippets you use most
- 🐛 **Debug mode** - Optional verbose logging for troubleshooting

### Current Limitations
- ⚠️ **No forms/variables** - Can't prompt for input during expansion yet (v0.5.0)
- ⚠️ **Limited contenteditable** - Gmail/Google Docs may have issues
- ⚠️ **Static folders** - Can't create/delete custom folders yet

### Coming Soon (see ROADMAP.md)
- 📝 **Interactive forms** - {formtext}, {formmenu}, {formdate} with popup (v0.5)
- 📁 **Custom folders** - Create/delete/organize folders (v0.5)
- ⚙️ **Power features** - Conditionals, formulas, case matching (v0.6)
- 🎨 **Dark mode & polish** - Better UI, drag-and-drop, bulk operations (v0.5)
- 🤝 **Snippet packs** - Import/export collections (v1.0)

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

**Dynamic snippet (AI-generated variations):**
1. Get a free Groq API key at https://console.groq.com/
2. Click **"🤖 LLM Settings"** and paste your key
3. Create a new snippet, set Type to **"Dynamic"**
4. Enter AI prompt (e.g., `Write a friendly greeting, 5 words or less`)
5. Test it - you'll get different greetings each time!

### Common Use Cases

**Current capabilities (v0.4.0):**
- **Email templates**: `followup` → "Hi [name], just following up on..."
- **Date stamps**: `td` → `{date}` → "2025-10-13"
- **Signatures with dates**: `sig` → "Best regards,\n{cursor}\nSent on {date:MMMM D, YYYY}"
- **Clipboard insertion**: `dear` → "Dear {clipboard}, thank you for..."
- **Form automation**: `sss` → `out {enter} {delay +0.3s} {tab} left {enter}` - Navigate through form fields
- **Future dates**: `followup` → "Contact on {date:MMMM Do YYYY shift +3M}" → "Contact on January 13th, 2026"
- **Code snippets**: `arrow` → `() => {}`
- **URLs**: `gh` → `https://github.com/yourusername`

**Coming in v0.5.0:**
- **Interactive forms**: Popup prompts for user input during expansion

---

## 🏗️ Architecture

```
TextBlitz/
├── src/
│   ├── content/
│   │   └── expander.ts           # Main content script - text detection & expansion
│   ├── background/
│   │   └── service-worker.ts     # Background worker - lifecycle management
│   ├── lib/
│   │   ├── types.ts              # TypeScript type definitions
│   │   ├── storage.ts            # Chrome storage abstraction with caching
│   │   ├── trie.ts               # Trie data structure for fast matching
│   │   └── replacer.ts           # Text replacement engine
│   └── ui/
│       └── options/              # Options page for snippet management
│           ├── options.html
│           └── options.ts
├── public/
│   ├── manifest.json             # Chrome extension manifest (V3)
│   └── icons/
└── vite.config.ts                # Build configuration
```

### How It Works

1. **Content Script** loads on every page
2. **Event listeners** detect typing in input fields
3. **Buffer** tracks last 50 characters typed
4. **Trie search** finds matching snippets in O(m) time
5. **Replacement engine** swaps trigger text with expansion
6. **Cursor management** maintains proper text position

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

**v0.4.0 - Complete! ✅**
- Keyboard automation (`{enter}`, `{tab}`, `{delay}`)
- Date arithmetic (`{date shift +3M}` add/subtract days/months/years)
- Ordinal date formats (`Do` → 1st, 2nd, 3rd)
- **Achievement:** Full-featured form automation!

**Next Up - v0.5.0: Interactive Forms & Organization**
- Form commands with popup UI (`{formtext}`, `{formmenu}`, `{formdate}`)
- Custom folders (create/delete/organize)
- Dark mode and UI polish
- **Goal:** Dynamic user input during expansion

**Future Highlights:**
- **v0.5**: Interactive forms with popup UI
- **v0.6**: Power features (conditionals, formulas, case matching)
- **v0.7-0.8**: Polish, testing, and refinement
- **v0.9**: Beta testing (feature-complete + AI)
- **v1.0**: Production release on Chrome Web Store

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

- Some complex web apps (Google Docs rich text, Notion) may have limited support
- Password fields are intentionally excluded for security
- Works best with Chromium browsers (Chrome, Edge, Brave)

---

**Made with ⚡ and ❤️ for everyone who's tired of repetitive typing.**
