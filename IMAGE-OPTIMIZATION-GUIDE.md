# Image Optimization Guide

Your database is 85 MB, mostly due to Base64-encoded images. This guide will help you reduce it.

## Option 1: Automatic (Recommended) ⚡

**Requires installing the `sharp` library**

```bash
cd backend
npm install sharp
node auto-optimize-images.js
```

This will:
- Extract all images from the database
- Automatically resize to max 800x600px
- Convert to JPEG at 75% quality
- Re-upload to database
- Create a backup before modifying

**Expected reduction: 60-80% of image data**

---

## Option 2: Manual Control 🎨

If you want full control over optimization:

### Step 1: Extract Images
```bash
node extract-and-optimize-images.js
```

This creates `extracted-images/` folder with all project images.

### Step 2: Optimize Manually

Use any tool you prefer:

**Online Tools:**
- https://tinypng.com/ (batch resize + compress)
- https://squoosh.app/ (fine-tune quality)
- https://imageresizer.com/

**Desktop Software:**
- Adobe Photoshop
- GIMP (free)
- IrfanView (Windows)

**Command Line (ImageMagick):**
```bash
# Install ImageMagick first, then:
cd extracted-images
for file in *.{jpg,jpeg,png}; do
  magick "$file" -resize 800x600\> -quality 75 "../optimized-images/$file"
done
```

**Recommended settings:**
- Max width: 800px
- Max height: 600px
- Quality: 70-80%
- Format: JPEG (not PNG for photos)

### Step 3: Re-upload to Database
```bash
# Put optimized images in backend/optimized-images/
node optimize-and-reupload-images.js
```

---

## Option 3: Quick Check Only 🔍

Just want to see what images you have?

```bash
node extract-and-optimize-images.js
```

Check the `extracted-images/` folder and `_image_metadata.json`.

---

## After Optimization

### Compact the Database (SQLite)

After removing large data, compact the database:

```bash
sqlite3 fenwick.db "VACUUM;"
```

This will reclaim unused space.

### Verify Everything Works

```bash
cd ../frontend
npm start
```

Check that all project thumbnails still display correctly.

---

## Tips for Future Images

To keep database small:

1. **Resize before upload**: Max 800x600px
2. **Compress**: 70-80% JPEG quality is plenty for web
3. **Use JPEG for photos**: PNG is much larger
4. **Consider external hosting**: Use Cloudinary, AWS S3, or Vercel Blob Storage

### Switching to External Image Storage

If you want to avoid storing images in the database entirely:

1. Upload images to a service (e.g., Cloudinary)
2. Store only the URL in the `thumbnail` field
3. Update frontend to load from URL instead of base64

This would reduce your database to < 1 MB!

---

## Troubleshooting

**"Sharp library not found"**
```bash
npm install sharp
```

**"Database is locked"**
- Stop the backend server first
- Close any SQLite browser tools

**Images look blurry after optimization**
- Increase quality setting in script
- Increase max width/height dimensions

**Database still large after optimization**
- Run `VACUUM` command
- Consider external image storage
