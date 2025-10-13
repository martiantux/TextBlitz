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

## 🚀 v0.4.0 - Keyboard Automation & Date Arithmetic

**Status:** ✅ Complete (2025-10-13)

### Goal
Complete form automation - keyboard commands and date arithmetic

### Why This Priority
Real-world use case: Form automation for data entry requires Enter/Tab key simulation and future date calculations. This is more immediately useful than interactive forms (which require complex UI development).

### Features Completed ✅
- [x] **Keyboard automation commands**:
  - `{enter}` - Simulate Enter/Return key press
  - `{tab}` - Simulate Tab key press
  - `{delay}` or `{delay +Xs}` - Pause execution (e.g., `{delay +0.3s}`)
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

### Real-World Examples
```
// Form automation with delays
out {enter} {delay +.3s} {tab} left {enter} {tab} money {enter} {tab} OUTBOUND

// Future date calculation
{clipboard} REASSESS IN 3 MONTHS - NEXT POSSIBLE ASSESSMENT DATE {MMMM Do YYYY shift +3M}
```

### Testing Status
- [ ] Enter key simulation in forms
- [ ] Tab key navigation between fields
- [ ] Delay timing accuracy
- [ ] Date arithmetic for days/months/years
- [ ] Ordinal suffix correctness (1st vs 21st)
- [ ] Combined commands (keyboard + date)

*Implementation complete, testing pending*

---

## 🚀 v0.5.0 - Interactive Forms & Organization

**Status:** 📋 Planned

### Goal
Interactive forms with popup UI + advanced organization features

### Features
- [ ] **Form popup system** - Modal appears when snippet has form fields
- [ ] **Basic form commands**:
  - `{formtext: label=Customer Name}` - Single line input
  - `{formparagraph: label=Notes}` - Multi-line input
  - `{formmenu: label=Status; options=Active,Inactive}` - Dropdown
  - `{formdate: label=Due Date}` - Date picker
  - `{formtoggle: label=Include Footer}` - Toggle switch
- [ ] **Variable substitution** - Use form values in expansion
- [ ] **Form validation** - Required fields, format checking
- [ ] **Default values** - Pre-fill form fields
- [ ] **Custom folders** - Create/delete/rename custom folders
- [ ] **Bulk operations** - Select multiple, export, delete
- [ ] **Drag-and-drop** - Reorder snippets and folders
- [ ] **Dark mode** - System-aware theme toggle

### Testing
- [ ] Form popup appearance/styling
- [ ] Form submission and cancellation
- [ ] Variable replacement accuracy
- [ ] Multiple forms in one snippet
- [ ] Custom folder CRUD operations
- [ ] Search performance with 500+ snippets
- [ ] Drag-and-drop reliability

---

## 🚀 v0.6.0 - Power Features & Site Compatibility

**Status:** 📋 Planned

### Goal
Power user features + robust site compatibility

### Features
- [ ] **Case transformation**:
  - Match trigger case (BTW → BY THE WAY)
  - Transform options: upper, lower, title, capitalize
- [ ] **Conditional logic** - `{if: condition}...{endif}`
- [ ] **Formula support** - `{=2+2}`, `{=date+7days}`
- [ ] **Snippet chaining** - Reference other snippets
- [ ] **Multi-line snippets** - Proper newline handling
- [ ] **Regex transformations** - Advanced text manipulation
- [ ] **Better contenteditable** - Robust Gmail/Docs support
  - Improved Selection API handling
  - Rich text preservation
  - Framework compatibility (React, Vue, etc.)
- [ ] **Real-world site testing** - Test and fix issues on major sites
  - Gmail (compose, reply, all views)
  - Google Docs (editing, comments)
  - Slack (messages, threads, DMs)

### Testing
- [ ] Case matching accuracy
- [ ] Formula evaluation
- [ ] Conditional logic edge cases
- [ ] Performance with complex snippets
- [ ] Gmail compose and replies
- [ ] Google Docs editing
- [ ] Slack message composition

**🎯 Feature Complete Checkpoint**: After v0.6.0, TextBlitz will have comprehensive text expansion functionality including conditionals, formulas, and site compatibility.

---

## 🚀 v0.7.0 - Polish & Refinement

**Status:** 📋 Planned

### Goal
UI polish, performance optimization, and preparation for beta testing

### Features
- [ ] **Extended site compatibility**:
  - LinkedIn (posts, messages, comments)
  - Twitter/X (tweets, replies)
  - Salesforce (various input fields)
  - Notion (blocks, pages)
- [ ] **Performance optimization**:
  - Bundle size optimization
  - Memory usage profiling
  - Expansion latency testing
  - Trie rebuild optimization
- [ ] **Bug fixes** from real-world usage
- [ ] **Documentation updates**
- [ ] **User testing feedback** incorporation
- [ ] **Keyboard shortcuts** - Quick add snippet (Ctrl+Shift+S), popup assistant (Ctrl+Shift+Space)

### Testing
- [ ] 1000+ snippets performance test
- [ ] Memory leak detection
- [ ] Extension lifecycle testing
- [ ] Chrome/Edge/Brave compatibility

---

## 🚀 v0.8.0 - Beta Testing

**Status:** 📋 Planned

### Goal
Feature-complete with LLM-powered snippets ready for real-world testing

### Features
- [ ] All v0.3-v0.7 features complete (full feature set + LLM)
- [ ] Test with friend/beta users
- [ ] Document bugs and issues
- [ ] Performance testing with 500+ snippets
- [ ] Works reliably on Gmail, Google Docs, Slack
- [ ] Gather feedback on LLM features

### Success Criteria
- ✅ All core features working (expansion, commands, automation)
- ✅ LLM providers tested and functional (Groq ✅, Anthropic pending)
- ✅ No critical bugs reported by beta testers
- ✅ Performance targets met (< 50ms expansion latency)
- ✅ Documentation complete

---

## 🚀 v1.0.0 - Production Ready

**Status:** 📋 Planned

### Goal
Stable, polished, Chrome Web Store ready - **The first free, open-source text expander with AI**

### Features
- [ ] **Comprehensive testing** - All features tested on major sites
- [ ] **Performance optimization** - Memory, CPU, latency targets met
- [ ] **Documentation** - Full user guide, examples, tutorials
- [ ] **Video tutorials** - Getting started, advanced features, LLM setup
- [ ] **Snippet library** - Pre-built packs (Customer Service, Development, etc.)
- [ ] **LLM prompt library** - Example dynamic snippet prompts
- [ ] **Chrome Web Store** - Published and discoverable
- [ ] **GitHub presence** - Clean repo, good README, active issues
- [ ] **Privacy policy** - Clear documentation of data handling (especially LLM features)

### Targets
- Works reliably on Gmail, Google Docs, Slack, Salesforce
- Handles 1000+ snippets smoothly
- < 50ms expansion latency (static snippets)
- < 2s latency for LLM snippets (with Groq)
- < 10MB memory usage
- 5-star reviews on Chrome Web Store

### Marketing Position
**"TextBlitz: Lightning-fast text expansion with LLM-generated variations. Open source. Privacy-first."**

---

## 🌍 v2.0+ - Future Considerations

**Status:** 💭 Ideas

Exploring but not committed to:

### Cross-Platform
- [ ] Firefox extension port
- [ ] Edge extension (may work with Chrome version)
- [ ] Safari extension (requires different approach)

### Advanced Integrations
- [ ] Encrypted cloud sync (user's own storage)
- [ ] GitHub Gist backup integration
- [ ] Team collaboration features (snippet sharing)
- [ ] Advanced LLM features (context-aware expansions, snippet generation)

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
