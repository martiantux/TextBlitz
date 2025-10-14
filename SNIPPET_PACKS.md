# 📦 Snippet Packs System

## Overview

Snippet Packs are curated collections of snippets designed for specific workflows, roles, or needs. They're composable and stackable - install multiple packs that reflect what you actually do.

## Philosophy

**People aren't one-dimensional.** Someone might be:
- A developer who also freelances (needs both code snippets AND customer service templates)
- A parent who works in collections (needs professional scripts for multiple contexts)
- Someone who juggles multiple roles throughout the day

Packs should:
- ✅ Be discoverable by tags and descriptions
- ✅ Work well together (compatible packs recommended)
- ✅ Handle conflicts gracefully (skip/rename/replace)
- ✅ Be shareable (export as JSON, share with team)

---

## Included Starter Packs (v0.6.0)

TextBlitz ships with 3 carefully curated starter packs. Additional packs will be driven by community needs in v1.1.0+.

### 💬 Essential Communication (5 snippets)
**For:** Everyone
**Tags:** communication, professional, personal, beginner

Basic professional and personal communication templates that work everywhere.

**Highlights:**
- `thx` → Professional thank you
- `fup` → Follow-up email with form fields
- `meetconfirm` → Meeting confirmation with date/time
- `ooo` → Out of office responder
- `apologize` → Professional apology template

---

### 🧑‍💻 Developer Essentials (9 snippets)
**For:** Developers, programmers, engineers
**Tags:** developer, programming, git, code
**Compatible with:** Customer Service Pro (for freelancers)

Code snippets, git messages, debugging templates, and dev workflows.

**Highlights:**
- `arrow` → Arrow function `() => {}`
- `clog` → Console log with cursor
- `gitfix` / `gitfeat` → Conventional commit messages
- `asyncfn` → Async function template
- `tryc` → Try/catch block
- `prdesc` → Pull request description template

---

### 📧 Customer Service Pro (6 snippets)
**For:** Support agents, customer service, freelancers
**Tags:** customer-service, support, empathy, professional

Empathy-driven responses, de-escalation, and professional support templates.

**Highlights:**
- `csempathy` → Empathy opening (customizable emotion)
- `csinvest` → "Looking into this now..." response
- `csescalate` → Escalation to specialist
- `csrefund` → Refund processing template
- `csfollowup` → Resolution follow-up
- `csdelay` → Delay explanation with apology

---

## Pack Management

### Installing a Pack

1. **Browse available packs** in Options → "📦 Snippet Packs"
2. **Preview snippets** before installing
3. **Choose installation mode:**
   - "Import all" - Get every snippet in the pack
   - "Pick & choose" - Select only what you need
4. **Handle conflicts:**
   - **Skip** - Don't import if trigger exists
   - **Rename** - Append pack prefix (e.g., `thx_dev`)
   - **Replace** - Overwrite existing snippet
5. **Optionally create folder** - Organize pack snippets together

### Creating Your Own Pack

1. **Select snippets** you want to include
2. **Click "Export as Pack"**
3. **Add metadata:**
   - Name and description
   - Icon (emoji)
   - Tags for discovery
   - Compatible packs (optional)
4. **Download JSON file** to share with others

### Sharing Packs

**Option 1: Direct share**
- Export as JSON
- Send file to colleagues/friends
- They import via "Import Pack from File"

**Option 2: GitHub (future)**
- Community pack repository
- Submit via pull request
- Rated/voted by community

---

## Pack Stacking Examples

### "Developer + Customer Service"
```
Developer pack: git, code snippets, PR templates
CS pack: empathy, de-escalation, professional responses

COMBINED USE CASE (Freelance developer):
- `gitfeat` → Commit feature work
- `prdesc` → Write pull request description
- `csfollowup` → Follow up with client professionally
- `csempathy` → Handle client concerns with empathy
```

### "Essential + Developer"
```
Essential pack: basic professional templates
Developer pack: code and git workflows

COMBINED USE CASE:
- `meetconfirm` → Confirm standup meeting
- `gitfix` → Commit bug fix
- `fup` → Follow up on code review
- `thx` → Thank teammate for help
```

---

## Technical Implementation

### Pack Structure
```typescript
interface SnippetPack {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji
  author: string;
  version: string;
  tags: string[]; // For discovery
  snippets: Snippet[];
  folders?: CustomFolder[]; // Optional folder structure
  compatibleWith?: string[]; // Pack IDs that work well together
  createdAt: number;
  updatedAt: number;
}
```

### Storage
```typescript
interface InstalledPack {
  packId: string;
  version: string;
  installedAt: number;
  enabled: boolean;
  snippetIds: string[]; // Track which snippets came from this pack
}

// Stored in chrome.storage.local
installedPacks: Record<string, InstalledPack>
```

---

## Future Enhancements (v1.1.0+)

### Community Pack Repository
- [ ] GitHub-based pack registry
- [ ] Pack submission via pull request
- [ ] Community ratings and reviews
- [ ] Pack search and discovery by tags
- [ ] Installation from URL (`textblitz://install/pack-id`)
- [ ] Auto-update notifications for installed packs
- [ ] Pack dependency system

---

## Design Principles

1. **Composable, not exclusive** - Install multiple packs that reflect your real life
2. **Discoverable** - Clear tags, descriptions, and search
3. **Conflict-aware** - Handle trigger collisions gracefully
4. **Shareable** - Easy to export and send to others
5. **Real-world tested** - Snippets that actually solve problems
6. **No bloat** - Each pack is focused and purposeful

---

**Made with ❤️ for everyone who types the same things repeatedly.**
