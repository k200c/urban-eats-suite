

# Multi-File Reference Uploads for AI Mode

## Summary

Enable multi-file reference image uploads when "Use AI to Generate Visuals" is active. This allows AI to maintain consistent styling across carousel frames using multiple reference images.

---

## Current State

- `referenceFile: File | null` - only supports single file
- Single reference file uploads to `references/` folder
- Webhook sends `reference_image_url: string | null` (single URL)

---

## Implementation Plan

### 1. Update State in SocialMediaManager.tsx

**Replace single file state with array:**

```typescript
// Line 46: Change from
const [referenceFile, setReferenceFile] = useState<File | null>(null);

// To
const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
```

**Define reference limits per post type:**

```typescript
// Add after FILE_LIMITS (line 34)
const REFERENCE_LIMITS: Record<PostType, { max: number; hint: string }> = {
  single: { max: 3, hint: 'Upload 1-3 reference images (optional)' },
  carousel: { max: 10, hint: 'Upload 2-10 reference images for consistent style' },
  video: { max: 1, hint: 'Upload 1 reference image (optional)' },
};
```

---

### 2. Update Reset Form & Toggle Handler

**Reset form (line 82):**

```typescript
setReferenceFiles([]);
```

**AI toggle handler (line 294):**

```typescript
setReferenceFiles([]);
```

---

### 3. Add Reference File Handler

**Replace handleReferenceFileChange:**

```typescript
const handleReferenceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files) {
    const files = Array.from(e.target.files);
    const limits = REFERENCE_LIMITS[postType];
    
    if (files.length > limits.max) {
      toast.error(`Maximum ${limits.max} reference images for ${postType}`);
      setReferenceFiles(files.slice(0, limits.max));
    } else {
      setReferenceFiles(files);
    }
  }
};
```

---

### 4. Add Validation in handleSubmit

**Add after existing validation (around line 130):**

```typescript
// Validate reference file count when using AI visuals
if (useAiVisuals && referenceFiles.length > 0) {
  const refLimits = REFERENCE_LIMITS[postType];
  if (referenceFiles.length > refLimits.max) {
    toast.error(`Maximum ${refLimits.max} reference images for ${postType}`);
    return;
  }
}
```

---

### 5. Update Form Submission Calls

**Update generateDraft and schedulePost calls to pass array:**

```typescript
// Line 144 & 154: Change referenceFile to referenceFiles
referenceFiles: useAiVisuals ? referenceFiles : [],
```

---

### 6. Redesign AI Mode Reference Upload UI

**Replace lines 371-390 with multi-file UI:**

```tsx
{/* Reference Pack (Optional) */}
<div className="space-y-2">
  <Label htmlFor="reference" className="font-medium flex items-center gap-2 text-muted-foreground">
    <ImagePlus className="w-4 h-4" />
    Reference Pack (Optional)
  </Label>
  <p className="text-xs text-muted-foreground">
    {REFERENCE_LIMITS[postType].hint}
  </p>
  <Input
    id="reference"
    type="file"
    accept="image/*"
    multiple={postType !== 'video'}
    onChange={handleReferenceFileChange}
    className="bg-background/50 border-border/50 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-secondary file:text-secondary-foreground cursor-pointer"
  />
  {referenceFiles.length > 0 && (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Check className="w-4 h-4 text-success" />
        {referenceFiles.length} reference image(s) selected
      </div>
      
      {/* File list with remove buttons */}
      <div className="flex flex-wrap gap-2">
        {referenceFiles.map((file, index) => (
          <div 
            key={`ref-${file.name}-${index}`}
            className="flex items-center gap-1 px-2 py-1 bg-violet-500/10 border border-violet-500/20 rounded-md text-xs"
          >
            <span className="max-w-[120px] truncate">{file.name}</span>
            <button
              type="button"
              onClick={() => {
                setReferenceFiles(prev => prev.filter((_, i) => i !== index));
              }}
              className="text-muted-foreground hover:text-destructive p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )}
</div>
```

---

### 7. Update useSocialMediaPosts.ts Interface

**Update CreatePostParams (lines 18-29):**

```typescript
interface CreatePostParams {
  contentIdea: string;
  brief: string;
  postType: 'single' | 'carousel' | 'video';
  files: File[];
  scheduledDate?: Date;
  scheduledTime?: string;
  aiPreference: 'generate_ai' | 'upload_media';
  visualPrompt?: string;
  referenceFiles?: File[]; // Changed from referenceFile?: File
}
```

---

### 8. Update uploadFiles Function

**Add folder parameter (line 144):**

```typescript
const uploadFiles = async (
  files: File[], 
  postId: string, 
  folder: 'posts' | 'references' = 'posts'
): Promise<string[]> => {
  const urls: string[] = [];
  
  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    const fileExt = file.name.split('.').pop();
    const prefix = folder === 'references' ? 'ref-' : '';
    const fileName = `${prefix}${postId}-${index}-${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('social-media-content')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data: urlData } = supabase.storage
      .from('social-media-content')
      .getPublicUrl(filePath);

    urls.push(urlData.publicUrl);
  }

  return urls;
};
```

---

### 9. Update generateDraftMutation

**Replace single reference upload with array (lines 209-214):**

```typescript
// Upload reference files array
let finalReferenceUrls: string[] = [];

if (aiPreference === 'generate_ai' && referenceFiles && referenceFiles.length > 0) {
  console.log("📤 STEP 3b: Uploading", referenceFiles.length, "reference images...");
  const uploadResult = await uploadFiles(referenceFiles, newId, 'references');
  finalReferenceUrls = Array.isArray(uploadResult) ? uploadResult : [];
  console.log("✅ STEP 3b COMPLETE - finalReferenceUrls:", JSON.stringify(finalReferenceUrls));
}
```

**Update webhook payload (lines 238-248):**

```typescript
const webhookPayload = {
  post_id: newId,
  idea: contentIdea.trim(),
  brief: brief?.trim() || "",
  post_type: postType,
  ai_preference: aiPreference,
  media_urls: safeMediaUrls,
  visual_prompt: aiPreference === 'generate_ai' ? (visualPrompt || "") : null,
  reference_image_urls: finalReferenceUrls, // Changed from reference_image_url
};
```

---

### 10. Update schedulePostMutation

**Add reference file handling if needed for AI-generated scheduled posts.**

---

## Summary of Changes

| File | Changes |
|------|---------|
| `SocialMediaManager.tsx` | Replace `referenceFile` with `referenceFiles[]`, add `REFERENCE_LIMITS`, update UI with multi-file input and file list with remove buttons, add validation |
| `useSocialMediaPosts.ts` | Change `referenceFile` to `referenceFiles[]` in interface, add `folder` param to `uploadFiles`, upload array to `references/`, send `reference_image_urls[]` in webhook |

---

## Webhook Payload (Updated)

```json
{
  "post_id": "uuid-here",
  "idea": "Content idea text",
  "brief": "Brief text",
  "post_type": "carousel",
  "ai_preference": "generate_ai",
  "media_urls": [],
  "visual_prompt": "Describe the vibe...",
  "reference_image_urls": [
    "https://storage.url/references/ref-uuid-0-timestamp.jpg",
    "https://storage.url/references/ref-uuid-1-timestamp.jpg",
    "https://storage.url/references/ref-uuid-2-timestamp.jpg"
  ]
}
```

---

## Reference Limits by Post Type

| Post Type | Max References | Helper Text |
|-----------|----------------|-------------|
| Single | 3 | "Upload 1-3 reference images (optional)" |
| Carousel | 10 | "Upload 2-10 reference images for consistent style" |
| Video | 1 | "Upload 1 reference image (optional)" |

---

## Validation Rules

1. Reference images are always optional (can be 0)
2. If provided, must not exceed post type limit
3. Hard block with toast if limit exceeded
4. UI shows hint text for recommended counts

