# Image Rendering Debug Guide

## What I Fixed

I added comprehensive logging throughout the image pipeline to help identify where the problem occurs:

1. **`drive-client.ts`** - Added logs for blob fetching and URL generation
2. **`BlockEditor.tsx`** - Added logs for image block processing and rendering
3. **`editor.tsx`** - Added logs for image upload flow

## Testing Steps

### 1. Open Browser Console
- Press `F12` (or Cmd+Option+I on Mac)
- Go to **Console** tab
- Filter by searching for `[` to see all prefixed logs

### 2. Upload an Image
1. Click in the editor
2. Drag and drop an image onto the editor
3. Check console for logs starting with:
   - `[Editor] Uploading image:` - Shows file details
   - `[Editor] Image uploaded successfully, fileId:` - Shows Drive file ID
   - `[Editor] Creating image block with id:` - Confirms block creation

### 3. Check Image Block Rendering
1. Look for logs starting with `[BlockEditor]`
2. You should see:
   - `[BlockEditor] Processing image block: <fileId>`
   - `[Drive] Fetching blob for: <fileId>`
   - `[BlockEditor] Object URL created: blob:http://...`
   - `[IMG] Image loaded successfully from: blob:http://...`

## Expected Flow

```
[Editor] Uploading image: test.png image/png 12345
  ↓
[Editor] Image uploaded successfully, fileId: 1a2b3c4d5e6f7g8h
  ↓
[Editor] Creating image block with id: 1a2b3c4d5e6f7g8h
  ↓
[BlockEditor] Processing image block: 1a2b3c4d5e6f7g8h
  ↓
[Drive] Fetching blob for: 1a2b3c4d5e6f7g8h
  ↓
[Drive] Blob fetched successfully: image/png 12345 bytes
  ↓
[BlockEditor] Object URL created: blob:http://localhost:5173/...
  ↓
[IMG] Image loaded successfully from: blob:http://localhost:5173/...
```

## Common Issues & Solutions

### Issue: `[Drive] No token available for image URL`
**Cause:** Session expired or not authenticated
**Solution:** Sign out and sign back in to refresh Google Drive token

### Issue: `[Drive] Blob fetch failed (401):`
**Cause:** Google Drive token is invalid/expired
**Solution:** Sign out and sign back in

### Issue: `[Drive] Blob fetch failed (403):`
**Cause:** Permission denied - file exists but you don't have access
**Solution:** Check if the file was deleted or permissions changed

### Issue: `[Drive] Blob fetch failed (404):`
**Cause:** File ID doesn't exist (wasn't uploaded)
**Solution:** Check if upload completed successfully (look for `[Editor] Image uploaded successfully`)

### Issue: Logs show success but image still doesn't appear
**Cause:** Image rendering in browser failed
**Solution:** 
1. Check if `[IMG] Image loaded successfully` appears
2. If not, check `[IMG] Image failed to load from:` for errors
3. The issue might be CORS or blob URL expiration

## Manual Testing

### Test 1: Upload Small PNG
```
1. Open Editor
2. Drag a small PNG (< 1MB) onto the editor
3. Check all console logs
4. Verify image appears
```

### Test 2: Verify Markdown Persistence
```
1. Upload image and save file
2. Refresh browser
3. File should load with image still visible
4. Check localStorage to verify image block is stored
```

### Test 3: Multiple Images
```
1. Upload 2-3 images in one document
2. Check that each has unique file ID
3. Verify each loads correctly
```

## Network Tab Debugging

1. Open **Network** tab in DevTools
2. Filter for `files?alt=media` to see Drive API calls
3. Check:
   - **Status**: Should be 200 (not 401/403/404)
   - **Headers**: Should show `Authorization: Bearer <token>`
   - **Response**: Should be the actual image data (binary)

## Still Stuck?

If images still don't render after checking all above:

1. **Export logs**: Copy all console logs with `[` prefix
2. **Check markdown**: Save document and inspect the `.md` file in Google Drive
   - Should contain: `![filename](file-id)`
3. **Verify upload**: Check if file appears in Google Drive folder manually
4. **Browser cache**: Try hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

---

## Quick Reference: What Each Log Means

| Log | Meaning |
|-----|---------|
| `[Editor] Uploading image:` | Upload started |
| `[Editor] Image uploaded successfully, fileId:` | Upload completed, file saved to Drive |
| `[Editor] Creating image block with id:` | Block created in editor state |
| `[BlockEditor] Processing image block:` | Component trying to render image |
| `[Drive] Fetching blob for:` | Requesting image data from Drive API |
| `[Drive] Blob fetched successfully:` | Got image data successfully |
| `[Drive] Blob fetch failed:` | ❌ Failed to get image (check status code) |
| `[BlockEditor] Object URL created:` | Converted blob to browser-accessible URL |
| `[IMG] Image loaded successfully from:` | ✅ Image rendered in browser |
| `[IMG] Image failed to load from:` | ❌ Browser couldn't display image |

