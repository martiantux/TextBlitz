# Next Session - Quick Start

**Version:** v0.8.0-WIP (DO NOT RELEASE)
**Status:** 🚨 Google Docs doubling bug still present

---

## 🔥 CRITICAL: Fix Google Docs Doubling Bug

### The Problem:
Type "btw" in Google Docs → expands to "by the by the way"

### Why It's Happening:
Race condition between keyboard buffer path and input event path:
1. Keyboard buffer detects trigger
2. Sets `lastExpansionTime`
3. Calls expansion in `setTimeout(..., 0)`
4. Google Docs fires input event BEFORE expansion completes
5. Input event path ALSO tries to expand same trigger
6. Result: double expansion

### What Was Tried (Failed):
- Set `isExpanding = true` immediately in `checkBufferForMatch()` (line 261)
- Still doubles - flag isn't preventing input event path

---

## 🛠️ Debug Steps for Next Session:

### Step 1: Add Logging
```typescript
// In src/content/expander.ts

// Line 254 (keyboard buffer path):
setTimeout(async () => {
  console.log('[BUFFER] Starting expansion, isExpanding:', this.isExpanding, 'lastExpansionTime:', Date.now() - this.lastExpansionTime);
  // ... existing code
});

// Line 132 (input event path):
private handleInput(event: Event) {
  console.log('[INPUT] Event fired, isExpanding:', this.isExpanding, 'timeSinceLastExpansion:', Date.now() - this.lastExpansionTime);
  // ... existing code
}
```

**Test:** Type "btw" in Google Docs, check which path runs twice

---

### Step 2: Try Increasing Time Window
```typescript
// Line 149 in handleInput:
if (Date.now() - this.lastExpansionTime < 500) { // Changed from 100ms
  if (this.settings?.debugMode) console.log('TextBlitz: Keyboard buffer just handled expansion, skipping input event');
  return;
}
```

**Test:** See if 500ms window prevents double expansion

---

### Step 3: Add Expansion ID Tracking
```typescript
// Add to class properties (line 18):
private lastExpandedTrigger = '';
private lastExpandedTime = 0;

// In checkBufferForMatch() before expansion (line 260):
const expandKey = `${snippet.trigger}-${recentBuffer}`;
if (this.lastExpandedTrigger === expandKey && Date.now() - this.lastExpandedTime < 1000) {
  console.log('TextBlitz: Skipping duplicate expansion for same trigger');
  return;
}
this.lastExpandedTrigger = expandKey;
this.lastExpandedTime = Date.now();

// In checkForMatch() before expansion (line 120):
const expandKey = `${snippet.trigger}-${textBeforeCursor}`;
if (this.lastExpandedTrigger === expandKey && Date.now() - this.lastExpandedTime < 1000) {
  console.log('TextBlitz: Skipping duplicate expansion for same trigger');
  return false;
}
this.lastExpandedTrigger = expandKey;
this.lastExpandedTime = Date.now();
```

**Test:** See if tracking prevents same trigger from expanding twice

---

### Step 4: Nuclear Option - Disable Input Handler During Keyboard Expansion
```typescript
// Add flag (line 18):
private keyboardExpansionInProgress = false;

// In checkBufferForMatch() line 250:
this.keyboardExpansionInProgress = true;
this.lastExpansionTime = Date.now();

// In setTimeout callback (line 290):
this.keyboardExpansionInProgress = false;

// In handleInput() line 143:
if (this.keyboardExpansionInProgress) {
  console.log('TextBlitz: Keyboard expansion in progress, blocking input event');
  return;
}
```

**Test:** See if completely blocking input events prevents doubling

---

## ✅ What's Working (Don't Touch):

- CKEditor 5 handler (untested but implemented)
- Retry logic and logging
- All other sites (Gmail, Discord, ChatGPT, etc.)
- Dynamic snippets
- Form commands
- LLM integration

---

## 📋 After Doubling Bug Fixed:

1. **Test Zendesk:**
   - Open Zendesk ticket composer
   - Type "btw" + space
   - Check console for "CKEditor detected"
   - Verify expansion works

2. **WYSIWYG Editor:**
   ```bash
   npm install @blocknote/core @blocknote/react @blocknote/mantine
   ```
   - Create `src/ui/components/SnippetEditor.tsx`
   - Drag-drop blocks
   - Rich text formatting
   - Slash commands

3. **Version Update:**
   - Bump to v0.8.0 when all bugs fixed
   - Update README.md and HANDOVER.md

---

## 🔍 Files Changed This Session:

```
Modified:
- src/content/expander.ts (isExpanding flag + doubling bug)
- src/lib/replacer.ts (CKEditor Tier 5)
- src/background/service-worker.ts (MAIN world injection)
- public/manifest.json (scripting permission)
- HANDOVER.md (extensive updates)

New:
- src/lib/editors/ckeditor.ts (CKEditor handler)
- NEXT_SESSION.md (this file)

Built:
- dist/* (all rebuilt)
```

---

## 🎯 Success Criteria:

✅ "btw" in Google Docs → "by the way" (NOT "by the by the way")
✅ Works 10/10 times consistently
✅ No regressions on other sites
✅ Zendesk works with CKEditor handler

---

## 💡 Quick Commands:

```bash
# Rebuild
npm run build

# Check what's modified
git status

# Test in Google Docs
# 1. chrome://extensions/ → Reload
# 2. Open Google Docs
# 3. Enable debug mode in settings
# 4. Type "btw" + space multiple times
# 5. Check console logs

# Get debug report
# In console: getTextBlitzDebugReport()
```

---

**Start here next session. Good luck! 🚀**
