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

### Testing Status
- [x] TypeScript build successful
- [x] Case transformation implementation complete
- [ ] Manual testing pending

**🎯 Milestone Reached**: TextBlitz v0.6.0 is feature-complete with solid UI/UX foundation

---

## 🚀 v0.7.0 - Site Compatibility & Reliability

**Status:** 📋 Planned (Next Up!)

### Goal
Make TextBlitz work flawlessly on all major websites - the foundation for v1.0.0

### Priority Features
- [ ] **Better ContentEditable support** (CRITICAL):
  - Fix Selection API issues in Gmail compose/reply
  - Fix rich text preservation in Google Docs
  - Fix Slack message composition
  - Handle framework-wrapped contenteditable (React/Vue)
  - Test and document limitations
- [ ] **Cross-site testing and fixes** (10+ major sites):
  - Gmail ✅
  - Google Docs ✅
  - Slack ✅
  - LinkedIn (posts, messages, comments)
  - Twitter/X (tweets, replies)
  - Discord (messages)
  - Notion (blocks, pages)
  - Salesforce (various input fields)
  - WordPress admin
  - GitHub issues/PRs
- [ ] **Performance optimization**:
  - Test with 1000+ snippets
  - Bundle size optimization (<100KB target)
  - Memory leak detection
  - Expansion latency testing (<50ms static, <2s LLM)
- [ ] **Bug fixes & edge cases**:
  - Email/number input field handling
  - Multi-line snippet improvements
  - Error message clarity
  - Keyboard shortcut conflicts

### Testing
- [ ] 1000+ snippets performance test
- [ ] Memory profiling
- [ ] Extension lifecycle testing
- [ ] Chrome/Edge/Brave compatibility

**🎯 Success Criteria**: Reliable expansion on 10+ major sites, ready for beta testing

---

## 🚀 v0.8.0 - Beta Testing & Polish

**Status:** 📋 Planned

### Goal
Production-ready polish and real-world validation before Chrome Web Store launch

### Features
- [ ] **Beta testing program** (5-10 testers):
  - Recruit diverse users (various workflows)
  - Create feedback form/issue template
  - Address critical bugs
  - Gather real-world usage data
- [ ] **UI/UX polish**:
  - Onboarding flow for new users
  - Better empty states
  - Tooltip improvements
  - Loading states for LLM expansions
- [ ] **Documentation improvements**:
  - Update README with real examples
  - Create troubleshooting guide
  - Document known limitations
  - Add FAQ section
- [ ] **Final bug fixes** from beta feedback

### Success Criteria
- ✅ All core features working reliably
- ✅ No critical bugs from beta testers
- ✅ Performance targets met (<50ms static, <2s LLM)
- ✅ Documentation complete and tested
- ✅ Ready for public release

---

## 🚀 v1.0.0 - Chrome Web Store Launch 🎉

**Status:** 📋 Planned

### Goal
Stable, polished, Chrome Web Store ready - **Free, open-source text expansion with LLM support**

### Features
- [ ] **User documentation** (4-5 hours):
  - Complete user guide
  - Quick start tutorial
  - Example snippet library (10-20 useful snippets)
  - LLM setup walkthrough
  - Video demo (3-5 minutes)
- [ ] **Chrome Web Store preparation** (3-4 hours):
  - Store listing copy (compelling description)
  - 5 screenshots (showing key features)
  - Promotional images (1400x560, 440x280)
  - Privacy policy (especially LLM/API key handling)
  - Category selection and keywords
- [ ] **Final QA & launch** (2-3 hours):
  - Full regression test
  - Cross-browser testing (Chrome, Edge, Brave)
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

## 🚀 v1.1.0 - Conditional Logic (POST-LAUNCH)

**Status:** 💭 Planned (After v1.0.0 is stable in production)

### Goal
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
- High complexity (8-10 hours)
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
- Medium-high complexity (10-12 hours)
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
