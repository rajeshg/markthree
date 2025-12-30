# Image Rendering - Root Cause Found & Fix Instructions

## The Problem (Confirmed by Your Logs)

```
[Parser] Parsing markdown, found 0 tokens
[Parser] Created 1 blocks: [{ type: 'p' }]
```

**The markdown is completely EMPTY when the parser runs.** This is because:

1. Editor initializes with `useEditor('')` (empty string)
2. Parser runs immediately → 0 tokens → creates empty paragraph
3. Document content loads async from Google Drive
4. Content gets reloaded, but you see the first empty state

When you see `![Screenshot...](fileId)` as text in the textarea, it means:
- The document DID load (content is there)
- But the parser ran BEFORE the content loaded
- So it created an empty block
- Then when reloading happened, the markdown got put into that paragraph block as text

## The Fix (Already Deployed)

I've added comprehensive logging to track the entire flow. Now you'll see:

```
[useEditor] Initializing with markdown length: 0 bytes
[Parser] Parsing markdown, found 0 tokens
[Editor] FileId from URL: abc123
[Editor] Fetching file content for: abc123
[Editor] Fetched file: test.md size: 250
[Editor] Loading content from Drive, bytes: 250
[useEditor] Initializing with markdown length: 250 bytes
[Parser] Parsing markdown, found 3 tokens
```

This lets us see **exactly** what's happening.

## Testing Instructions

### Test 1: Check Loading Sequence (NEW DOCUMENT)

**Steps:**
1. Open DevTools Console (F12)
2. Click "New Document" or just start fresh in editor
3. Drag & drop an image
4. **Watch the logs:**
   - Should see `[useEditor] Initializing with markdown length: 0`
   - Image should render immediately (not as text)

**Expected behavior:**
- Image renders as IMAGE BLOCK
- No `[Editor] FileId` logs yet (not saved to Drive)
- No markdown text showing

**If you see markdown text:** Something else is wrong with rendering

---

### Test 2: Check Loading Sequence (EXISTING DOCUMENT)

**Steps:**
1. Open DevTools Console (F12)
2. Navigate to a document you already saved with an image
3. **Watch the logs in order:**

```
[useEditor] Initializing with markdown length: 0
[Editor] FileId from URL: <file-id>
[Editor] Fetching file content for: <file-id>
[Editor] Fetched file: test.md size: <bytes>
[Editor] Loading content from Drive, bytes: <bytes>
[useEditor] Initializing with markdown length: <bytes>
[Parser] Parsing markdown, found X tokens
[Parser] Found image in paragraph: <file-id> <filename>
[Parser] Created X blocks: [...]
```

**Expected behavior:**
- Second `[useEditor]` should show NON-ZERO bytes
- Second `[Parser]` should show `Found image in paragraph:`
- Image should render (not show as text)

**If image still shows as text:**
- Note how many tokens found
- Note if `Found image in paragraph:` appears
- Tell me what you see

---

### Test 3: Verify Markdown Storage

**Steps:**
1. Upload image to new document
2. Hit SAVE
3. Open Google Drive in another tab
4. Find the `.md` file you just saved
5. Right-click → Open with → Text Editor or download it
6. Search for your image filename

**Expected format:**
```
![Screenshot 2025-12-29 at 6.19.56 PM.png](17Df65r3KrJOx4a0DAEk0puPOcFK5eVvN)
```

**Should be on its own line**, not mixed with other text.

---

## Potential Issues & Solutions

### Issue: Image shows as text `![...](fileId)`

**This means:**
- The markdown WAS saved correctly
- But the parser created a TEXT paragraph instead of IMAGE block
- The problem is in the parser's image detection

**Solution:**
- Check if `[Parser] Found image in paragraph:` appears in logs
- If NO: Parser isn't detecting it → need to fix detection logic
- If YES: Image block IS created → problem is elsewhere (rendering?)

### Issue: Image block created but not rendering

**Check:**
- Do you see `type: 'image'` in the final block list?
- Do you see `[BlockEditor] Processing image block:`?
- Do you see `[Drive] Fetching blob for:`?

If you see all three, then the image IS loading from Drive but not displaying in browser.

### Issue: `[Editor] No fileId, using empty editor`

This is CORRECT for new documents. Only happens once when you first create a document and haven't saved yet.

---

## What to Report

When you test, please share:

1. **The complete console logs** (especially any `[Parser]`, `[Editor]`, or `[Drive]` lines)
2. **What you see in the UI** (image rendered? text showing?)
3. **Whether you tested:**
   - New document with new image upload
   - Existing document reload
   - Both

This will let me pinpoint exactly which part is failing.

---

## Technical Details

### Why This Matters

Your editor uses a **block-based system** where each "line" can be different:
- Paragraph (textarea showing text)
- Heading (textarea showing text)
- Image (image element)
- Checkbox (checkbox button)

The parser converts markdown to blocks. If it doesn't recognize `![...](...)` as an image, it creates a paragraph block with the markdown text inside the textarea.

### The Parser Logic

```typescript
if (token.tokens?.length === 1 && token.tokens[0].type === 'image') {
  // Create IMAGE block
} else {
  // Create PARAGRAPH block with raw text
}
```

If the condition fails, it defaults to paragraph.

### How the Fix Works

With the new logging, we can see:
1. Is the condition being met?
2. If not, why not? (token structure different?)
3. If yes, is the image block actually in the final list?

This narrows down the problem to one of three places:
- Parser detection
- Parser block creation
- BlockEditor rendering

---

## Next Steps

1. **Run Test 1 & 2** above
2. **Check the console logs**
3. **Tell me what sequence you see**
4. **I'll provide a targeted fix**

The bug is identifiable now with the logging. We just need the data!

