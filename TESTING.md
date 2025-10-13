# TextBlitz Testing Guide

Quick reference for testing TextBlitz features before releases.

## Quick Test (5 minutes)

For verifying basic functionality after changes:

### 1. Load Extension
```bash
npm run build
# Load dist/ folder in chrome://extensions/
```

### 2. Basic Expansion Test
- Open any website with a text input
- Type `btw` + space
- Should expand to "by the way"

### 3. Forms Test
- Create snippet with trigger `test` and expansion `{formtext: label=Name}`
- Type `test` + space
- Form popup should appear
- Enter "Brad" and submit
- Should insert "Brad"

### 4. LLM Test (if API key configured)
- Create dynamic snippet with trigger `hi` and prompt `Say hello`
- Type `hi` + space
- Should expand with LLM-generated greeting

**If all 4 pass: ✅ Core functionality working**

---

## Full Test Suite (30 minutes)

Before major releases (v0.7.0, v0.8.0, v1.0.0):

### Basic Text Expansion
- [ ] Regular input field expansion
- [ ] Textarea expansion
- [ ] Email input expansion
- [ ] ContentEditable expansion (basic)

### Trigger Modes
- [ ] Word mode: `btw` works, `xbtw` doesn't
- [ ] Word-both mode: `btw ` works, `btw` alone doesn't
- [ ] Anywhere mode: `btw` expands anywhere

### Commands
- [ ] `{cursor}` positions cursor correctly
- [ ] `{date}` inserts current date
- [ ] `{date:MMMM D, YYYY}` formats correctly
- [ ] `{date shift +3M}` adds 3 months
- [ ] `{time}` inserts current time
- [ ] `{clipboard}` inserts clipboard content
- [ ] `{enter}` simulates Enter key
- [ ] `{tab}` simulates Tab key
- [ ] `{delay +1s}` pauses for 1 second

### Case Transformation
- [ ] None mode: keeps original
- [ ] Upper mode: converts to UPPERCASE
- [ ] Lower mode: converts to lowercase
- [ ] Title mode: Converts To Title Case
- [ ] Capitalize mode: Capitalizes first letter
- [ ] Match mode: btw → "by the way", BTW → "BY THE WAY"

### Forms
- [ ] `{formtext}` shows input field
- [ ] `{formparagraph}` shows textarea
- [ ] `{formmenu}` shows dropdown
- [ ] `{formdate}` shows date picker
- [ ] `{formtoggle}` shows toggle switch
- [ ] Form values substitute correctly
- [ ] Cancel button works

### LLM Features (if configured)
- [ ] Groq provider works
- [ ] OpenAI provider works (if key)
- [ ] Anthropic provider works (if key)
- [ ] Gemini provider works (if key)
- [ ] Fallback text works on error
- [ ] Rate limiting prevents spam
- [ ] Usage tracking updates

### UI Features
- [ ] Add snippet works
- [ ] Edit snippet works
- [ ] Delete snippet works
- [ ] Duplicate snippet works (📋 button)
- [ ] Search/filter works
- [ ] Sort options work (Recent/Most Used/A-Z)
- [ ] Folder creation works
- [ ] Folder rename works
- [ ] Folder deletion works
- [ ] Dark mode toggle works
- [ ] Import snippets works
- [ ] Export snippets works
- [ ] Export folder works
- [ ] Keyboard shortcut (Ctrl+Shift+S) works

### Performance
- [ ] 100+ snippets: expansion < 100ms
- [ ] 1000+ snippets: expansion < 200ms
- [ ] No memory leaks after 100 expansions
- [ ] Trie rebuild completes quickly

---

## Site Compatibility Testing (v0.7.0)

Test on these sites to ensure real-world reliability:

### Priority Sites (MUST WORK)
- [ ] **Gmail** - Compose email
- [ ] **Gmail** - Reply to email
- [ ] **Google Docs** - Document editing
- [ ] **Slack** - Message composition
- [ ] **Slack** - Thread replies

### Secondary Sites (SHOULD WORK)
- [ ] **LinkedIn** - Post creation
- [ ] **LinkedIn** - Message composition
- [ ] **Twitter/X** - Tweet composition
- [ ] **Discord** - Message composition
- [ ] **Notion** - Page editing
- [ ] **Salesforce** - Any input field
- [ ] **WordPress Admin** - Post editing
- [ ] **GitHub** - Issue/PR creation

### Test on Each Site:
1. Basic expansion works
2. Form fields don't break layout
3. Cursor positioning correct
4. No console errors
5. No visual glitches

---

## Regression Testing

Before ANY release, verify these don't break:

### Core Functionality
- [ ] Basic text expansion still works
- [ ] No TypeScript errors (`npm run build`)
- [ ] No console errors in normal usage
- [ ] Settings persist after reload
- [ ] Snippets persist after reload

### Edge Cases
- [ ] Empty trigger doesn't crash
- [ ] Empty expansion works
- [ ] Very long expansion (1000+ chars) works
- [ ] Special characters in trigger work
- [ ] Unicode in expansion works
- [ ] Nested commands work (`{date} at {time}`)
- [ ] Multiple forms in one snippet work

### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Chrome (previous version)
- [ ] Edge (latest)
- [ ] Brave (latest)

---

## Bug Reporting Template

When testing finds issues:

```
**Bug:** Brief description
**Steps to Reproduce:**
1.
2.
3.
**Expected:** What should happen
**Actual:** What actually happened
**Console Errors:** Any errors in console
**Site:** Which website (if relevant)
**Version:** TextBlitz version
**Browser:** Chrome/Edge/Brave version
```

---

## Performance Benchmarks

Target metrics for v1.0.0:

| Metric | Target | Measured |
|--------|--------|----------|
| Static expansion latency | <50ms | ? |
| LLM expansion latency (Groq) | <2s | ? |
| Bundle size (total) | <100KB | 74KB ✅ |
| Memory usage (idle) | <10MB | ? |
| Snippets supported | 1000+ | ? |

---

## Debug Mode Testing

Enable debug mode in settings to see verbose logs:

1. Open Options → Toggle "Debug Mode"
2. Open DevTools Console
3. Test various features
4. Check for any unexpected errors or warnings

---

## Quick Smoke Test Checklist

Use this before ANY commit:

- [ ] `npm run build` succeeds with no errors
- [ ] Extension loads without errors
- [ ] Basic expansion (`btw` → "by the way") works
- [ ] No console errors on page load
- [ ] Settings page loads without errors

**If any fail: DO NOT COMMIT**

---

**Last Updated:** 2025-10-13
