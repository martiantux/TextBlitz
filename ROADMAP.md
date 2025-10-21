# 🗺️ TextBlitz Roadmap

Building full-featured text expansion for Chrome. Focus on practical features that solve real problems.

**Guiding Principles:**
- Privacy first - no data collection, no accounts
- Performance matters - keep it fast and lightweight
- Solve real problems - features people actually use
- Open source forever

---

## 🎯 v0.1.0 - Basic Expansion

**Status:** ✅ Complete (2025-10-10)

### Completed
- [x] Basic text expansion (delimiter mode only)
- [x] Works in regular inputs & textareas
- [x] Basic contenteditable support
- [x] Local storage with caching
- [x] Trie-based matching (O(m) time)
- [x] Chrome Manifest V3 compliance
- [x] Usage statistics tracking
- [x] Event delegation for performance

---

## 🚀 v0.2.0 - Trigger Modes & UI Overhaul

**Status:** ✅ Complete (2025-10-12)

### Completed
- [x] **3 trigger modes** (per-snippet setting):
  - **Word**: Trigger must start a new word (`btw` works, `xbtw` doesn't)
  - **Word Both**: Must start AND end with boundary (`btw ` works, `btw` alone doesn't)
  - **Anywhere**: Works mid-word (`btw` expands anywhere)
- [x] **Per-snippet trigger mode** - Each snippet can have own mode
- [x] **Update storage schema** - Add `triggerMode` field to Snippet type
- [x] **Complete UI overhaul** - Modern two-panel layout with sidebar
- [x] **Folder organization** - All Snippets, Work, Personal folders
- [x] **Search & filter** - Real-time search by label/trigger/expansion
- [x] **Sort options** - Recent, Most Used, Alphabetical
- [x] **Enhanced snippet editor** - Label, trigger, expansion, folder, trigger mode, settings
- [x] **Card-based display** - Clean snippet cards with hover actions
- [x] **Backward compatible** - Auto-adds label/triggerMode to old snippets
- [x] **Fix email input bug** - Now works with selectionStart fallback

### Testing Status
- [x] All 3 modes in regular inputs
- [x] All 3 modes in textareas
- [x] Email/number/search/url/tel inputs
- [ ] Contenteditable (basic works, needs more testing)
- [ ] Test on Gmail, Google Docs, Slack (pending)

---

## 🚀 v0.3.0 - Dynamic Content (LLM + Commands)

**Status:** ✅ Complete (2025-10-13)

### Goal
LLM-powered snippets + dynamic content commands

### Features Completed ✅
- [x] **{cursor} support** - Position cursor after expansion
  - Parse `{cursor}` from expansion text
  - Calculate cursor position after replacement
  - Support for inputs/textareas
  - Support for contenteditable
  - Only one {cursor} per snippet
- [x] **Debug mode** - Optional verbose logging toggle
- [x] **LLM-powered snippets** - AI-generated text variations ✅ **TESTED & WORKING**
  - Snippet type selector (Static/Dynamic)
  - Groq provider (llama-3.1-8b-instant) - tested with real API
  - Anthropic provider (Claude Sonnet 4.5)
  - Rate limiting (25/min Groq, 50/min Anthropic) - validated
  - Usage tracking (tokens, costs, requests) - working
  - Cost calculation per provider - accurate
  - Fallback text on error - working
  - Timeout handling (5s default)
  - API key management UI
  - Usage stats display
- [x] **Date/time commands**:
  - `{date}` - Current date with format options
  - `{time}` - Current time with 12h/24h formats
  - Format options: `{date:YYYY-MM-DD}`, `{date:MM/DD/YYYY}`, `{date:MMMM D, YYYY}`
- [x] **{clipboard}** - Insert current clipboard content
- [x] **Command parser** - Detect and process `{...}` patterns

### Testing Status
- [x] Cursor positioning in all input types
- [x] LLM expansion with Groq - fast (~0.5-1s)
- [x] Rate limiting enforcement - works at 25/min
- [x] Usage stats tracking - accurate
- [x] Fallback on API error - working
- [x] Date/time formatting implemented
- [x] Clipboard command working
- [x] Multiple commands in one snippet supported
- [x] Cursor + date combo snippets working

---

## 🚀 v0.4.0 - Keyboard Automation & Snippet Generator

**Status:** ✅ Complete (2025-10-13)

### Goal
Form automation with keyboard commands, date arithmetic, and LLM-powered snippet generation

### Features Completed ✅
- [x] **Keyboard automation commands**:
  - `{enter}` - Simulate Enter/Return key press
  - `{tab}` - Simulate Tab key press
  - `{delay}` or `{delay +Xs}` - Pause execution with chunked text insertion
  - Combine for form navigation: `field1 {tab} field2 {enter}`
- [x] **Date arithmetic**:
  - `{date shift +3M}` - Add 3 months to current date
  - `{date shift -1Y}` - Subtract 1 year from current date
  - `{date shift +7d}` - Add 7 days to current date
  - Support units: `d` (days), `M` (months), `Y` (years)
  - Combine with formatting: `{date:MMMM Do YYYY shift +3M}`
- [x] **Ordinal date formats**:
  - `Do` format → 1st, 2nd, 3rd, 21st, 22nd, 23rd
  - Example: `{date:MMMM Do, YYYY}` → "October 13th, 2025"
- [x] **Snippet Generator**:
  - LLM-powered snippet creation from natural language descriptions
  - Auto-generates trigger, label, and expansion
  - Modal UI with provider selection (Groq/Anthropic)
  - Pre-fills snippet editor for review before saving

### Real-World Examples
```
// Form automation with delays
out {enter} {delay +.3s} {tab} left {enter} {tab} money {enter} {tab} OUTBOUND

// Future date calculation
{clipboard} REASSESS IN 3 MONTHS - NEXT POSSIBLE ASSESSMENT DATE {date:MMMM Do YYYY shift +3M}

// Delay visualization
Before delay{delay +3s}After 3 seconds
```

### Testing Status
- [x] Enter key simulation in forms
- [x] Tab key navigation between fields
- [x] Delay timing accuracy (chunked text insertion working)
- [x] Date arithmetic for days/months/years
- [x] Ordinal suffix correctness (1st vs 21st)
- [x] Combined commands (keyboard + date + clipboard)
- [x] Snippet generator with Groq and Anthropic providers

### Technical Implementation
- Refactored text replacement to support chunked insertion
- Added `splitTextByKeyboardActions()` to command parser
- Delays now execute between text chunks, not after all text
- All keyboard commands work with both regular inputs and contenteditable

---

## 🚀 v0.5.0 - Interactive Forms & Organization

**Status:** ✅ Complete (2025-10-13)

### Goal
Interactive forms with popup UI + advanced organization features

### Features Completed ✅
- [x] **Form popup system** - Modal appears when snippet has form fields
- [x] **Basic form commands**:
  - `{formtext: label=Customer Name}` - Single line input
  - `{formparagraph: label=Notes}` - Multi-line input
  - `{formmenu: label=Status; options=Active,Inactive}` - Dropdown
  - `{formdate: label=Due Date}` - Date picker
  - `{formtoggle: label=Include Footer}` - Toggle switch
- [x] **Variable substitution** - Use form values in expansion
- [x] **Form validation** - Required fields, format checking
- [x] **Default values** - Pre-fill form fields
- [x] **Custom folders** - Create/delete custom folders with emoji icons
- [x] **Dark mode** - System-aware theme toggle (light/dark/system)
- [x] **Snippet counter** - "X/∞" unlimited indicator
- [x] **LLM configuration** - 4 providers (Groq, OpenAI, Anthropic, Gemini), 8 models, tier config
- [x] **Visual usage alerts** - Color-coded rate limit warnings

### Deferred to v0.6.0
- [ ] **Bulk operations** - Select multiple, export, delete (nice-to-have)
- [ ] **Drag-and-drop** - Reorder snippets and folders (nice-to-have)
- [ ] **Folder rename** - Edit folder name/icon in-place (nice-to-have)

### Testing Status
- [x] Build compiles successfully (35.55 kB options, 34.44 kB content)
- [x] TypeScript types complete
- [ ] Manual testing pending (see HANDOVER.md for test checklist)
- [ ] Form testing on Gmail, Google Docs, Slack (deferred)
- [ ] LLM providers with real API keys (deferred)
- [ ] Performance with 500+ snippets (deferred)

---

## 🚀 v0.6.0 - UI Polish & Case Transformation

**Status:** ✅ Complete (2025-10-13)

### Features Completed
- [x] **Default folder persistence** - Remembers last used folder for new snippets
- [x] **Snippet duplication** - Clone snippets with 📋 button (adds "(copy)" suffix)
- [x] **Keyboard shortcut** - Ctrl+Shift+S to quickly add new snippet
- [x] **Context-aware export** - Export individual folders or all snippets
- [x] **Folder rename** - Double-click or ✏️ edit button to rename custom folders
- [x] **Case transformation** - 6 modes including match trigger case (btw/BTW/Btw)
  - none, upper, lower, title, capitalize, match
- [x] **Snippet Packs** - Curated collections with 3 starter packs
  - 💬 Essential Communication (5 snippets)
  - 🧑‍💻 Developer Essentials (9 snippets)
  - 📧 Customer Service Pro (6 snippets)
- [x] **Pack Manager** - Import/export, conflict resolution, folder creation

### Testing Status
- [x] TypeScript build successful
- [x] Case transformation implementation complete
- [x] Snippet pack system implemented (manager, import/export, conflict resolution)
- [x] 3 curated starter packs created
- [x] LLM system prompt improved for clean output
- [x] Pack browser UI in options page with preview and install functionality
- [x] Manual testing complete

**🎯 Milestone Reached**: TextBlitz v0.6.0 is feature-complete with pack browser UI, curated snippet packs, case transformation, and improved LLM output quality

---

## 🚀 v0.7.0 - Reliability & Error Handling

**Status:** ✅ Complete (2025-10-14)

### Features Completed
- [x] **Auto-retry logic** - 1 retry after 200ms if expansion fails
- [x] **Structured logging** - Session tracking, error context, debugging capabilities
- [x] **Error reporting** - Run `getTextBlitzDebugReport()` in console to generate GitHub issue reports
- [x] **Edge case handling** - Element validity checks, cursor movement detection, focus tracking
- [x] **Production-ready** - Comprehensive error handling for beta testing

---

## 🚀 v0.8.0 - WYSIWYG Snippet Editor

**Status:** ✅ Complete (2025-10-16)

### Features Completed
- [x] **Full-page snippet editor** - Dedicated editing page replacing cramped modal
- [x] **Rich text toolbar** - Bold, italic, underline, strikethrough, font sizes (10-36px)
- [x] **Command insertion dropdown** - Organized categories (Basic, Keyboard, Forms)
- [x] **Drag-and-drop command pills** - Reorder commands by dragging within editor
- [x] **Professional UI** - Consistent design system using CSS variables matching options page
- [x] **Dark mode support** - Editor automatically inherits theme preference
- [x] **2-column layout** - Left: form fields, Right: WYSIWYG editor
- [x] **URL-based navigation** - Create new (`snippet-editor.html`) or edit (`?id=snippet-123`)
- [x] **Command pill serialization** - Converts HTML to plain text with `{command}` syntax

### Technical Implementation
- Created dedicated snippet-editor page with full-page layout
- Implemented ContentEditable WYSIWYG with `document.execCommand` for formatting
- HTML5 Drag & Drop API for command pill reordering
- CSS variables for consistent theming (`--color-primary`, `--bg-card`, `--text-primary`)
- Command pills display as styled elements with `contenteditable="false"`
- Vite config updated to build and copy editor files

---

## 🚀 v0.9.0 - Beta Release

**Status:** ✅ Complete (2025-10-20)

### Goal
Consolidated beta release combining site compatibility, testing, and polish. Ready for friend beta testing, then Chrome Web Store submission as v1.0.0.

### Completed Features ✅
- [x] **Test infrastructure:**
  - [x] 230 unit tests passing (8 test files)
  - [x] Vitest + vitest-chrome setup
  - [x] Playwright config for future E2E tests
  - [x] Test coverage: trie, word-boundaries, case-transform, command-parser, storage, element-lock
  - [x] New command tests: note-command, site-command

- [x] **New commands implemented:**
  - [x] {note} - Internal comments ({note: text} or {note}...{endnote})
  - [x] {site} - Webpage context ({site: domain|title|url|selection})
  - [x] {key: X} - Keyboard events (24 keys: Escape, ArrowDown, F5, etc.)
  - [x] {clipboardh1-10} - Clipboard history (access last 10 copied items)

- [x] **Bug reporting system:**
  - [x] Built-in debug report generator (getTextBlitzDebugReport())
  - [x] Popup UI with log preview and clipboard copy
  - [x] PII sanitization and user consent
  - [x] Manual GitHub link fallback

- [x] **Cross-origin iframe support:**
  - [x] Added `match_origin_as_fallback` and `match_about_blank` manifest flags
  - [x] Added clipboard permissions
  - [x] Tested on Google Docs, ChatGPT, Claude.ai, Discord, Gmail, GitHub, Reddit ✅ WORKING

- [x] **Snippet Pack System:**
  - [x] 3 curated starter packs (Essential Communication, Developer Essentials, Customer Service Pro)
  - [x] Pack manager (import/export/conflicts)
  - [x] Pack browser UI in options page

- [x] **Architecture improvements:**
  - [x] Deleted backup files (expander-old-backup.ts, replacer-old-backup.ts)
  - [x] Modular handler system documented
  - [x] Element locking prevents race conditions
  - [x] Comprehensive error handling with rollback

- [x] **Feature validation:**
  - [x] All trigger modes work (word, word-both, anywhere)
  - [x] All commands work (date, time, clipboard, clipboardh1-10, cursor, enter, tab, delay, key, note, site)
  - [x] Forms work (formtext, formmenu, formdate, formtoggle, formparagraph)
  - [x] Case transformation works (6 modes including match)
  - [x] LLM features work (4 providers, 8 models, usage tracking)
  - [x] Import/Export works
  - [x] Snippet packs work (3 starter packs)

### Remaining Work
- [ ] **{key} command tests** - Implementation complete, needs ~20 unit tests
- [ ] **Performance validation:**
  - [ ] Test with 100+ snippets
  - [ ] Check expansion latency (<100ms target for static snippets)
  - [ ] Memory usage check (<100MB target)
- [ ] **Integration tests** (20-30 tests for full expansion flow)
- [ ] **Pack installation workflow testing**

### Phase 2: UI Improvements (Nice-to-Have)
- [x] **WYSIWYG snippet editor** - ✅ COMPLETE (v0.8.0)
  - Full-page dedicated editor with rich text toolbar
  - Drag-and-drop command pills for reordering
  - Command insertion dropdown with categories
  - Professional UI matching options page theme
- [ ] **Inline tooltips** - Contextual help without clutter
  - Trigger mode explanations (hover ⓘ icon)
  - Command syntax examples
  - LLM provider comparison
- [ ] **Snippet preview** - Show how expansion will render
  - Render {date} → actual date
  - Show {cursor} position visually
  - Preview case transformation

### Phase 3: Bug Fixes
- [ ] Complete systematic testing checklist
- [ ] Fix any critical bugs from testing
- [ ] Address console errors
- [ ] Improve error messages

### Phase 4: Beta Testing (Friend)
- [ ] Version bump to v0.9.0
- [ ] Create beta installation guide
- [ ] Friend tests in real-world usage
- [ ] Gather feedback and bug reports
- [ ] Fix reported issues

### Phase 5: Final Polish
- [ ] Address beta feedback
- [ ] Final bug fixes
- [ ] Performance optimization if needed
- [ ] Documentation updates

### Success Criteria
- [x] Works on Google Docs (body + title) ✅
- [x] Works on Gmail ✅
- [x] Works on ChatGPT ✅
- [x] Works on Claude.ai ✅
- [x] Works on Discord ✅
- [x] Works on GitHub (comments + gists) ✅
- [x] Works on Reddit ✅
- [x] Clean expansion (no partial deletion or doubling) ✅
- [x] Test infrastructure established (230 tests) ✅
- [x] Bug reporting system functional ✅
- [ ] {key} command tests added
- [ ] Integration tests added
- [ ] Friend beta testing complete
- [ ] No critical bugs from beta testers
- [ ] Performance validated with heavy usage

**🎯 Ready for beta distribution - See BETA_INSTALL.md**

---

## 🚀 v1.0.0 - Chrome Web Store Launch 🎉

**Status:** 📋 Planned

### Goal
Stable, polished, Chrome Web Store ready - **Free, open-source text expansion with LLM support**

### Features
- [ ] **User documentation**:
  - Complete user guide
  - Quick start tutorial
  - Snippet pack guide (how to use, create, share)
  - LLM setup walkthrough
  - Video demo
- [ ] **Chrome Web Store preparation**:
  - Store listing copy (highlighting snippet packs)
  - 5 screenshots (including pack browser)
  - Promotional images (1400x560, 440x280)
  - Privacy policy (LLM/API key handling)
  - Category selection and keywords
- [ ] **Final QA & launch**:
  - Full regression test
  - Cross-browser testing (Chrome, Edge, Brave)
  - Test all 3 starter packs
  - Version bump to 1.0.0
  - Submit to Chrome Web Store
  - Create launch announcement

### Performance Targets
- Works reliably on 10+ major sites
- Handles 1000+ snippets smoothly
- <50ms expansion latency (static snippets)
- <2s latency for LLM snippets (with Groq)
- <10MB memory usage

### Marketing Position
**"TextBlitz: Lightning-fast text expansion with LLM support. Open source. Privacy-first. Free forever."**

**🎯 LAUNCH MILESTONE**: TextBlitz v1.0.0 on Chrome Web Store!

---

## 🚀 v1.1.0 - Community Packs & Advanced Features (POST-LAUNCH)

**Status:** 💭 Planned (After v1.0.0 is stable in production)

### Goal
Community-driven pack repository and advanced snippet features

### Pack Repository Features
- [ ] **GitHub-based pack registry** - Central repository for community packs
- [ ] **Pack submission system** - Pull request workflow for new packs
- [ ] **Pack discovery** - Search, filter, and browse by tags
- [ ] **Rating & reviews** - Community feedback on packs
- [ ] **Pack updates** - Auto-notification when packs have new versions
- [ ] **Installation from URL** - `textblitz://install/pack-id` links
- [ ] **Community-driven packs** - Based on user needs and submissions

### Conditional Logic
Add conditional logic for dynamic snippet behavior based on context

### Features
- [ ] **Conditional parser** (`src/lib/conditional-parser.ts`):
  - Parse `{if: expression}...{elseif: expr}...{else}...{endif}` syntax
  - Support comparison operators: `=`, `<>`, `<`, `>`, `<=`, `>=`
  - Support logical operators: `and`, `or`, `not`
  - Variables: form values, date comparisons, text matching
  - Integrate with CommandParser
- [ ] **Examples and documentation**:
  - Conditional greetings based on time of day
  - Form-based conditional templates
  - Date-based conditional content

### Why After Launch
- High complexity
- Current features sufficient for v1.0.0
- Better to debug with real user feedback
- Not critical for most workflows

---

## 🚀 v1.2.0 - Formula Evaluation (POST-LAUNCH)

**Status:** 💭 Planned (After v1.1.0)

### Goal
Add expression evaluation for calculations and text manipulation

### Features
- [ ] **Formula evaluator** (`src/lib/formula-evaluator.ts`):
  - Parse `{=expression}` syntax
  - Math operations: `+`, `-`, `*`, `/`, `%`, `^`
  - String functions: `length()`, `upper()`, `lower()`, `trim()`, `contains()`, `split()`, `join()`
  - Date arithmetic (extend existing system)
  - List operations: `[1,2,3]`, indexing, `size()`
  - Safe evaluation (NO `eval()` - use expression parser)
- [ ] **Examples and documentation**:
  - Invoice calculations
  - Text transformations
  - Date calculations

### Why After Launch
- Medium-high complexity
- Requires safe expression parser
- Better to gather user needs first
- Most use cases covered by existing commands

---

## 🚀 v1.3.0+ - Advanced Features (POST-LAUNCH)

**Status:** 💭 Ideas for future consideration

### Snippet Enhancement
- [ ] **Snippet chaining** - Reference other snippets with `{snippet:trigger}`
- [ ] **Regex transformations** - Advanced text pattern matching
- [ ] **Multi-line improvements** - Better newline/paragraph handling
- [ ] **Variable persistence** - Save values between expansions

### Site Integrations
- [ ] **URL loading** - Fetch data from APIs
- [ ] **Data extraction** - Pull data from current page
- [ ] **Click simulation** - Advanced form automation

---

## 🌍 v2.0+ - Future Considerations

**Status:** 💭 Long-term possibilities

### Cross-Platform
- [ ] Firefox extension port
- [ ] Edge extension (likely works with Chrome version)
- [ ] Safari extension (requires WebKit approach)

### Cloud Features
- [ ] Encrypted cloud sync (user's own storage)
- [ ] GitHub Gist backup integration
- [ ] Team collaboration features (snippet sharing)

### Mobile
- [ ] Android keyboard integration (complex)
- [ ] iOS keyboard extension (limited by iOS)

### Enterprise
- [ ] Self-hosted LLM support
- [ ] Team admin dashboard
- [ ] Usage analytics (opt-in, privacy-preserved)

---

---

## 🎯 Principles

Things we won't do:
- Collect user data or telemetry
- Add user accounts or logins
- Charge for features
- Add advertisements
- Track usage remotely
- Require internet connection

**TextBlitz stays free, private, and open source.**

---

**Last updated:** October 2025
