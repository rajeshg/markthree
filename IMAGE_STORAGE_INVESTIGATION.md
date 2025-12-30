# Image Storage & Rendering - Technical Investigation

## The Core Question You Asked

**"Since I see `![Screenshot...](fileId)` in the UI still, is it even possible to render another file within?"**

Great question. The answer is: **YES, absolutely possible** - but there's a disconnect between storage and rendering.

## What's Happening Now

### Scenario: You uploaded an image
1. ✅ Image uploaded to Google Drive → got file ID
2. ✅ Image block created with metadata `{ src: fileId }`
3. ✅ When saving: converted to markdown `![Caption](fileId)`
4. ✅ Stored in `.md` file on Google Drive

### Scenario: You reload the document
1. ✅ Markdown loaded: `![Caption](fileId)`
2. ⚠️ **PROBLEM**: Parser is rendering it as a TEXT paragraph showing `![Caption](fileId)` instead of as an IMAGE block

## Why This is Happening

The issue is **how the markdown is being displayed in the textarea**. 

Currently, your editor works like this:
- Each **line** = one **block** (textarea)
- When you reload, the parser creates blocks from markdown
- **But if the image markdown gets parsed as a paragraph block**, the textarea will display the raw markdown text

## The Real Problem

Looking at your screenshot showing `![Screenshot...](fileId)` as text in the editor:

**This means the parser is NOT converting the image markdown into an IMAGE block.**

### Possible causes:
1. Parser condition not being met (debug needed)
2. Markdown format is different than expected
3. Parser is creating the image block but something else is rendering it as text

## What I Added for Debugging

I added console logging to track this:

```
[Parser] Parsing markdown, found X tokens
[Parser] Found image in paragraph: fileId filename
[Parser] Created 5 blocks: [{ type: 'image', id: 'xxx' }, ...]
```

## Testing Steps to Identify Root Cause

### Test 1: Check Parser Output
1. Open DevTools Console (F12)
2. Reload editor page
3. Look for `[Parser]` logs
4. **Question**: Do you see `[Parser] Found image in paragraph:`?
   - If YES → Image IS being parsed correctly
   - If NO → Parser condition not matching

### Test 2: Check Block Types
1. Look for `[Parser] Created X blocks:`
2. Check if the list shows `type: 'image'`
3. **Question**: Is the image block in the list?
   - If YES → Parser created it
   - If NO → Parser didn't recognize it

### Test 3: Check Actual Markdown Format
1. Open Google Drive
2. Find your `.md` file
3. Download it and open in text editor
4. Search for your image filename
5. **Question**: What format do you see?
   - Expected: `![filename](fileId)` on its own line
   - Problem if: `![filename](fileId)` is in middle of paragraph text

## Hypothesis: The Root Issue

I suspect the problem is one of these:

### Hypothesis A: Markdown format broken on save
When you upload an image and SAVE, the `blocksToMarkdown()` might not be creating proper image markdown. The file might be storing something like:

```
Some text ![image](id) more text
```

Instead of:

```
Some text

![image](id)

more text
```

### Hypothesis B: Parser not detecting image blocks
The condition `token.tokens.length === 1 && token.tokens[0].type === 'image'` might not be matching because:
- The paragraph has multiple tokens
- Or the token structure is different than expected

### Hypothesis C: Image blocks are being created but rendered as textarea
The parser creates the image block correctly, but then the BlockEditor component is somehow showing it as a text paragraph

## How to Verify

**Do this test:**
1. Open DevTools Console (F12)
2. Reload the page with the image
3. **Copy-paste all logs starting with `[` into a text file**
4. Share those logs

This will tell us:
- Is the parser detecting the image?
- Is it creating an image block?
- What blocks are actually in the editor state?

## The Solution Path

Once we identify which scenario is happening, the fix is straightforward:

- **If A (save format broken)**: Fix `blocksToMarkdown()` to ensure images are on separate lines
- **If B (parser not matching)**: Fix the detection logic to handle the actual markdown format
- **If C (rendering issue)**: Ensure image blocks skip the textarea rendering and use the image UI

## Current Code Status

✅ Parser has detection logic for images in paragraphs  
✅ `blocksToMarkdown()` saves images as `![caption](fileId)`  
✅ BlockEditor has image block rendering  
✅ All logging is in place for debugging  

**What's missing**: We need to verify the logging output to see where the disconnect is.

---

## Quick Workaround (While We Debug)

If you want to test that the rendering WORKS:

1. Don't reload - keep the editor open
2. Upload a new image (via drag & drop)
3. Verify it renders as an image (not markdown text)
4. **If it works**: Problem is with reload/parsing
5. **If it doesn't work**: Problem is with image rendering itself

This would narrow down the issue significantly.

