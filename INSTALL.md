# Installation Guide

## Load TextBlitz into Chrome

1. **Build the extension** (if you haven't already)
   ```bash
   npm run build
   ```

2. **Open Chrome Extensions Page**
   - Go to `chrome://extensions/` in your Chrome browser
   - Or click the puzzle piece icon → "Manage Extensions"

3. **Enable Developer Mode**
   - Toggle "Developer mode" in the top-right corner

4. **Load the Extension**
   - Click "Load unpacked"
   - Navigate to the TextBlitz folder
   - Select the `dist` folder
   - Click "Select"

5. **Verify Installation**
   - You should see TextBlitz appear in your extensions list
   - Click the puzzle piece icon and pin TextBlitz for easy access

6. **Configure Your Snippets**
   - Right-click the TextBlitz icon → "Options"
   - Or go to `chrome://extensions/` and click "Details" → "Extension options"
   - Add your snippets!

## Testing It Out

The extension comes with 3 example snippets:
- `btw` → `by the way`
- `thx` → `thank you`
- `brb` → `be right back`

Try it:
1. Go to any website with a text input (e.g., Gmail, Google Docs, or any form)
2. Type `btw` followed by a space
3. Watch it expand to "by the way"!

## Troubleshooting

**Extension not loading?**
- Make sure you selected the `dist` folder, not the root project folder
- Check that `npm run build` completed successfully

**Snippets not expanding?**
- Check that TextBlitz is enabled in the options page
- Open the browser console (F12) and look for "TextBlitz: Initialized" message
- Make sure you're typing in a valid input field (not a password field)

**Need to reload after changes?**
- After running `npm run build` again, go to `chrome://extensions/`
- Click the refresh icon on the TextBlitz card
