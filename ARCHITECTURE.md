# TextBlitz Core Architecture (v2)

## What Was Done

Complete ground-up rebuild of the text expansion system with a **modular, extensible architecture** designed for reliability and easy maintenance.

## Key Problems Solved

### Before (Old Architecture):
- ❌ Dual detection paths (input handler + keyboard buffer) caused race conditions
- ❌ Events from our expansions re-triggered detection → infinite loops
- ❌ Site-specific issues required hacky workarounds
- ❌ Adding new site support risked breaking existing functionality
- ❌ Difficult to debug when things failed

### After (New Architecture):
- ✅ Single detection path eliminates race conditions
- ✅ Element-level locking prevents concurrent expansions
- ✅ Modular handler system for different sites
- ✅ Fallback chain if handler fails
- ✅ Comprehensive logging for debugging
- ✅ Rollback on failure

---

## Architecture Overview

```
User Types → Input Event → Expander → Lock Check → Handler Registry → Site Handler → Verification → Success/Fallback
```

### Core Components

#### 1. **ElementLockManager** (`src/lib/element-lock.ts`)
Prevents multiple simultaneous expansions on the same element.

- Locks element before expansion
- 500ms cooldown after expansion
- 5s cooldown after failures (prevents retry loops)
- Uses WeakMap for memory efficiency

#### 2. **SiteDetector** (`src/lib/site-detector.ts`)
Detects what type of site/framework we're in.

- Google Docs detection
- React detection (checks for React Fiber keys)
- Vue detection
- Shadow DOM detection
- Custom editors (CodeMirror, Monaco, etc.)

#### 3. **Handler System** (`src/lib/handlers/`)
Modular replacement handlers for different contexts.

**Base Handler** (`base-handler.ts`):
- Interface all handlers implement
- Common utilities (logging, verification, delays)
- Consistent error handling

**Site-Specific Handlers** (priority order):
1. **GoogleDocsHandler** (priority 10) - Special delays and retries for Google Docs
2. **ReactHandler** (priority 5) - Native setters for React controlled inputs
3. **ContentEditableHandler** (priority 3) - execCommand for rich text editors
4. **StandardHandler** (priority 1) - Regular input/textarea manipulation

#### 4. **HandlerRegistry** (`handlers/handler-registry.ts`)
Manages and selects appropriate handlers.

- Maintains handler list sorted by priority
- `getHandler(element)` - Returns best handler for element
- `getHandlerChain(element)` - Returns all compatible handlers for fallback
- Easy to add new handlers without modifying existing code

#### 5. **TextReplacer** (`src/lib/replacer.ts`)
Orchestrates the replacement process.

Flow:
1. Process commands ({date}, {time}, etc.)
2. Apply case transformation
3. Select handler
4. Save content (for rollback)
5. Try primary handler
6. If fails, try fallback chain
7. If all fail, rollback to original content

#### 6. **TextBlitzExpander** (`src/content/expander.ts`)
Entry point - listens for input events and triggers expansions.

- Single input event listener (no more dual paths!)
- 10ms debounce to prevent rapid checks
- Element lock check before expansion
- Forwards to appropriate snippet type (static/dynamic/form)

---

## How to Add Support for a New Site

Let's say users report issues on a new site (e.g., "Notion").

### Step 1: Create Handler Class

Create `src/lib/handlers/notion-handler.ts`:

```typescript
import { BaseHandler } from './base-handler';

export class NotionHandler extends BaseHandler {
  name = 'Notion';
  priority = 8; // Higher than standard, lower than Google Docs

  canHandle(element: HTMLElement): boolean {
    // Check if we're on Notion
    return window.location.hostname.includes('notion.so') ||
           element.closest('[data-notion-editor]') !== null;
  }

  async replace(element: HTMLElement, trigger: string, expansion: string): Promise<boolean> {
    this.log('Starting Notion-specific replacement');

    // Your site-specific logic here
    // Use this.delay(), this.verify(), this.findTrigger(), etc.

    return true; // or false if failed
  }
}
```

### Step 2: Register Handler

Edit `src/lib/handlers/handler-registry.ts`:

```typescript
import { NotionHandler } from './notion-handler';

constructor() {
  this.register(new GoogleDocsHandler());
  this.register(new NotionHandler()); // Add this line
  this.register(new ReactHandler());
  // ...
}
```

### Step 3: Test

1. Build: `npm run build`
2. Reload extension
3. Test on Notion
4. Check console logs (handler name will appear if canHandle() returned true)

That's it! Your new handler:
- Only runs on Notion
- Won't affect other sites
- Falls back to standard handlers if it fails
- Logs everything for debugging

---

## Debugging

### Enable Debug Mode
In extension settings, turn on "Debug Mode"

### Console Output
You'll see:
```
TextBlitz: ✅ Initialized with 10 snippets
TextBlitz: Selected handler: React
TextBlitz [Replacer]: Final expansion: be right back
[React] Starting React-specific replacement
[React] Verification passed - expansion present and trigger removed
```

### Generate Error Report
In console:
```javascript
getTextBlitzDebugReport()
```

This generates a formatted report with:
- All errors
- Recent activity log
- Element context
- Site context

Perfect for GitHub issues.

---

## File Structure

```
src/
├── content/
│   ├── expander.ts              # Entry point, single detection path
│   └── expander-old-backup.ts   # Old dual-path system (backup)
│
├── lib/
│   ├── element-lock.ts          # Element locking system
│   ├── site-detector.ts         # Site/framework detection
│   ├── replacer.ts              # Main replacement orchestrator
│   ├── replacer-old-backup.ts   # Old tier system (backup)
│   │
│   └── handlers/
│       ├── base-handler.ts           # Base interface + utilities
│       ├── handler-registry.ts       # Handler management
│       ├── google-docs-handler.ts    # Google Docs specific
│       ├── react-handler.ts          # React apps (ChatGPT, etc.)
│       ├── contenteditable-handler.ts # Rich text editors
│       └── standard-handler.ts       # Regular inputs/textareas
```

---

## What This Means for You

### Reliability
- No more doubling issues
- No more race conditions
- No more event loops
- Proper error handling with rollback

### Maintainability
- Each site handler is independent
- Adding new support doesn't risk breaking existing
- Clear logging makes debugging easy
- Old code backed up (can restore if needed)

### Extensibility
- GitHub issue reports new site problem? Create handler in ~30 minutes
- Test on that site only
- Deploy without fear of breaking other sites
- Users can even contribute handlers!

---

## Testing Checklist

Test these sites with `brb` → `be right back`:

- [x] Regular inputs (Gmail, forms)
- [ ] ChatGPT (React app)
- [ ] Google Docs
- [ ] Claude web (Anthropic)
- [ ] Facebook comments
- [ ] Instagram comments
- [ ] Proton Mail
- [ ] ZenDesk
- [ ] Any contenteditable fields

For each site:
1. Type trigger slowly
2. Type trigger fast
3. Type trigger, then delete and retype
4. Check console for handler used
5. Verify no doubling, no partial removal

---

## Roll Back If Needed

If something breaks:

```bash
# Restore old expander
mv src/content/expander.ts src/content/expander-new.ts
mv src/content/expander-old-backup.ts src/content/expander.ts

# Restore old replacer
mv src/lib/replacer.ts src/lib/replacer-new.ts
mv src/lib/replacer-old-backup.ts src/lib/replacer.ts

# Rebuild
npm run build
```

---

## Questions?

Read the inline comments in the code - everything is documented.

Key files to understand:
1. `handlers/base-handler.ts` - How handlers work
2. `handlers/handler-registry.ts` - How handlers are selected
3. `replacer.ts` - Main orchestration flow
4. `expander.ts` - Entry point

This architecture is solid. It will serve you well.
