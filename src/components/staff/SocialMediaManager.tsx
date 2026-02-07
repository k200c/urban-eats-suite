import { useState } from 'react';
import { format } from 'date-fns';
import { 
  Trash2, Upload, Calendar, Image, Film, Layers, Sparkles, 
  AlertCircle, RefreshCw, Loader2, Check, Clock, Wand2, ImagePlus, X
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useSocialMediaPosts, SocialMediaPost } from '@/hooks/useSocialMediaPosts';

type PostType = 'single' | 'carousel' | 'video';
type AIPreference = 'generate_ai' | 'upload_media';

const POST_TYPES: { value: PostType; label: string; icon: React.ElementType; emoji: string }[] = [
  { value: 'single', label: 'Single Post', icon: Image, emoji: '📷' },
  { value: 'carousel', label: 'Carousel', icon: Layers, emoji: '🎠' },
  { value: 'video', label: 'Reel / Video', icon: Film, emoji: '🎥' },
];

// File limits based on post type
const FILE_LIMITS: Record<PostType, { min: number; max: number; label: string }> = {
  single: { min: 1, max: 1, label: '1 image' },
  carousel: { min: 2, max: 10, label: '2-10 images' },
  video: { min: 1, max: 1, label: '1 video' },
};

// Reference image limits based on post type (for AI generation mode)
const REFERENCE_LIMITS: Record<PostType, { max: number; hint: string }> = {
  single: { max: 3, hint: 'Upload 1-3 reference images (optional)' },
  carousel: { max: 10, hint: 'Upload 2-10 reference images for consistent style' },
  video: { max: 1, hint: 'Upload 1 reference image (optional)' },
};

export function SocialMediaManager() {
  // Form state - Strategy
  const [contentIdea, setContentIdea] = useState('');
  const [brief, setBrief] = useState('');
  
  // Form state - Format & Assets
  const [postType, setPostType] = useState<PostType>('single');
  const [useAiVisuals, setUseAiVisuals] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [visualPrompt, setVisualPrompt] = useState('');
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  
  // Scheduling
  const [scheduleForLater, setScheduleForLater] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState('12:00');
  const [uploading, setUploading] = useState(false);

  const {
    drafts,
    scheduled,
    isLoadingDrafts,
    isLoadingScheduled,
    draftsError,
    scheduledError,
    refetchDrafts,
    refetchScheduled,
    generateDraft,
    schedulePost,
    approveDraft,
    updateCaption,
    deletePost,
    postNow,
    isGenerating,
    isScheduling,
    isApproving,
    isPostingNow,
  } = useSocialMediaPosts();

  const resetForm = () => {
    setContentIdea('');
    setBrief('');
    setPostType('single');
    setUseAiVisuals(false);
    setUploadedFiles([]);
    setVisualPrompt('');
    setReferenceFiles([]);
    setScheduleForLater(false);
    setScheduledDate(undefined);
    setScheduledTime('12:00');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const limits = FILE_LIMITS[postType];
      
      if (files.length > limits.max) {
        setUploadedFiles(files.slice(0, limits.max));
      } else {
        setUploadedFiles(files);
      }
    }
  };

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

  const aiPreference: AIPreference = useAiVisuals ? 'generate_ai' : 'upload_media';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentIdea.trim()) return;

    // Validate file count based on post type (only when not using AI visuals)
    if (!useAiVisuals) {
      if (postType === 'carousel') {
        if (uploadedFiles.length < 2) {
          toast.error('Carousel needs at least 2 images');
          return;
        }
        if (uploadedFiles.length > 10) {
          toast.error('Maximum 10 images allowed for carousel');
          return;
        }
      } else if (postType === 'single' || postType === 'video') {
        if (uploadedFiles.length === 0) {
          toast.error(`Please upload a ${postType === 'video' ? 'video' : 'image'}`);
          return;
        }
      }
    }

    // Validate reference file count when using AI visuals
    if (useAiVisuals && referenceFiles.length > 0) {
      const refLimits = REFERENCE_LIMITS[postType];
      if (referenceFiles.length > refLimits.max) {
        toast.error(`Maximum ${refLimits.max} reference images for ${postType}`);
        return;
      }
    }

    setUploading(true);
    try {
      if (scheduleForLater && scheduledDate) {
        await schedulePost({
          contentIdea,
          brief,
          postType,
          files: uploadedFiles,
          scheduledDate,
          scheduledTime,
          aiPreference,
          visualPrompt: useAiVisuals ? visualPrompt : undefined,
          referenceFiles: useAiVisuals ? referenceFiles : [],
        });
      } else {
        await generateDraft({
          contentIdea,
          brief,
          postType,
          files: uploadedFiles,
          aiPreference,
          visualPrompt: useAiVisuals ? visualPrompt : undefined,
          referenceFiles: useAiVisuals ? referenceFiles : [],
        });
      }
      resetForm();
    } finally {
      setUploading(false);
    }
  };

  const isSubmitting = isGenerating || isScheduling || uploading;
  const fileLimits = FILE_LIMITS[postType];

  // Error state UI
  if (draftsError && scheduledError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-lg bg-destructive/10 border border-destructive/20">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Unable to load Social Dashboard
        </h3>
        <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
          {draftsError instanceof Error ? draftsError.message : 'Something went wrong loading posts.'}
        </p>
        <Button onClick={() => { refetchDrafts(); refetchScheduled(); }} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Smart Content Studio */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent border-b border-border">
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            Smart Content Studio
          </CardTitle>
          <CardDescription>Create AI-powered social content in seconds</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* SECTION 1: Strategy */}
            <div className="space-y-4 p-4 rounded-xl bg-secondary/10 border border-border">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">1</span>
                Strategy
              </div>
              
              {/* Content Idea */}
              <div className="space-y-2">
                <Label htmlFor="content-idea" className="font-medium">What's the hook?</Label>
                <Textarea
                  id="content-idea"
                  placeholder="e.g., 🍔 The Urban Legend is BACK and better than ever..."
                  value={contentIdea}
                  onChange={(e) => setContentIdea(e.target.value)}
                  className="min-h-[100px] bg-background/50 border-border resize-none"
                />
              </div>

              {/* Brief */}
              <div className="space-y-2">
                <Label htmlFor="brief" className="font-medium">Brief / Context</Label>
                <Textarea
                  id="brief"
                  placeholder="e.g., Mention limited time offer, tag @streeteatzwaterford, use hashtags..."
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  className="min-h-[60px] bg-background/50 border-border resize-none"
                />
              </div>
            </div>

            {/* SECTION 2: Format & Assets */}
            <div className="space-y-4 p-4 rounded-xl bg-secondary/10 border border-border">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">2</span>
                Format & Assets
              </div>

              {/* Post Type Segmented Control */}
              <div className="space-y-2">
                <Label className="font-medium">Post Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {POST_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        const prevType = postType;
                        setPostType(type.value);
                        
                        // Smart file handling on type change
                        if (type.value === 'single' || type.value === 'video') {
                          // Keep only first file for single/video
                          setUploadedFiles(prev => prev.length > 0 ? [prev[0]] : []);
                        }
                        
                        // Clear if switching to/from video (format change)
                        if ((prevType === 'video' && type.value !== 'video') || 
                            (prevType !== 'video' && type.value === 'video')) {
                          setUploadedFiles([]);
                        }
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
                        postType === type.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background/50 text-muted-foreground hover:border-primary/50 hover:bg-primary/5"
                      )}
                    >
                      <span className="text-xl">{type.emoji}</span>
                      <span className="text-xs font-medium">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Magic Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-violet-500/10 to-primary/10 border border-violet-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-primary flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <Label htmlFor="ai-toggle" className="font-semibold cursor-pointer">✨ Use AI to Generate Visuals</Label>
                    <p className="text-xs text-muted-foreground">Let AI create stunning images for your post</p>
                  </div>
                </div>
                <Switch
                  id="ai-toggle"
                  checked={useAiVisuals}
                  onCheckedChange={(checked) => {
                    setUseAiVisuals(checked);
                    setUploadedFiles([]);
                    setVisualPrompt('');
                    setReferenceFiles([]);
                  }}
                />
              </div>

              {/* Dynamic Input Area */}
              {!useAiVisuals ? (
                /* UPLOAD MODE */
                <div className="space-y-3">
                  <Label htmlFor="media" className="font-medium flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Media
                    <span className="text-xs text-muted-foreground font-normal">({fileLimits.label})</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="media"
                      type="file"
                      multiple={postType === 'carousel'}
                      accept={postType === 'video' ? 'video/*' : 'image/*'}
                      onChange={handleFileChange}
                      className="bg-background/50 border-border file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-primary file:text-primary-foreground cursor-pointer"
                    />
                  </div>
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-success">
                        <Check className="w-4 h-4" />
                        {uploadedFiles.length} file(s) selected
                        {uploadedFiles.length < fileLimits.min && (
                          <span className="text-amber-500 ml-2">(Need at least {fileLimits.min})</span>
                        )}
                        {uploadedFiles.length > fileLimits.max && (
                          <span className="text-destructive ml-2">(Max {fileLimits.max})</span>
                        )}
                      </div>
                      
                      {/* File list with remove buttons */}
                      <div className="flex flex-wrap gap-2">
                        {uploadedFiles.map((file, index) => (
                          <div 
                            key={`${file.name}-${index}`}
                            className="flex items-center gap-1 px-2 py-1 bg-secondary/50 rounded-md text-xs"
                          >
                            <span className="max-w-[120px] truncate">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setUploadedFiles(prev => prev.filter((_, i) => i !== index));
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
              ) : (
                /* AI GENERATION MODE */
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="visual-prompt" className="font-medium flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-violet-500" />
                      Visual Direction
                    </Label>
                    <Textarea
                      id="visual-prompt"
                      placeholder="Describe the vibe, lighting, and subject for the AI photographer...&#10;&#10;e.g., 'Close-up shot of a juicy smash burger with melting cheese, dramatic lighting, steam rising, dark moody background, food photography style'"
                      value={visualPrompt}
                      onChange={(e) => setVisualPrompt(e.target.value)}
                      className="min-h-[100px] bg-background/50 border-violet-500/30 focus:border-violet-500 resize-none"
                    />
                  </div>
                  
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
                </div>
              )}
            </div>

            {/* SECTION 3: Scheduling */}
            <div className="space-y-4 p-4 rounded-xl bg-secondary/10 border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">3</span>
                  Scheduling
                </div>
                <Switch
                  id="schedule-switch"
                  checked={scheduleForLater}
                  onCheckedChange={setScheduleForLater}
                />
              </div>

              {scheduleForLater && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Date Picker */}
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal bg-background/50",
                            !scheduledDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={scheduledDate}
                          onSelect={setScheduledDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Time Picker */}
                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="bg-background/50 border-border"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || !contentIdea.trim()}
              className="w-full bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90 text-primary-foreground font-bold py-6 text-lg shadow-lg"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {uploading ? 'Uploading...' : 'Processing...'}
                </span>
              ) : scheduleForLater && scheduledDate ? (
                <span className="flex items-center gap-2">
                  📅 Schedule Post
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Generate Draft
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Content Queue with Tabs */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Content Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="drafts" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="drafts" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Drafts
                {drafts.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary/20 text-primary">
                    {drafts.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="gap-2">
                <Clock className="w-4 h-4" />
                Scheduled
                {scheduled.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary/20 text-primary">
                    {scheduled.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Drafts Tab */}
            <TabsContent value="drafts">
              <DraftsTab
                drafts={drafts}
                isLoading={isLoadingDrafts}
                onApprove={approveDraft}
                onUpdateCaption={updateCaption}
                onDelete={deletePost}
                onPostNow={postNow}
                isApproving={isApproving}
                isPostingNow={isPostingNow}
              />
            </TabsContent>

            {/* Scheduled Tab */}
            <TabsContent value="scheduled">
              <ScheduledTab
                posts={scheduled}
                isLoading={isLoadingScheduled}
                onDelete={deletePost}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Drafts Tab Component
interface DraftsTabProps {
  drafts: SocialMediaPost[];
  isLoading: boolean;
  onApprove: (params: { postId: string; scheduledFor: string; caption?: string }) => Promise<void>;
  onUpdateCaption: (params: { postId: string; caption: string }) => void;
  onDelete: (postId: string) => void;
  onPostNow: (postId: string) => Promise<unknown>;
  isApproving: boolean;
  isPostingNow: boolean;
}

function DraftsTab({ drafts, isLoading, onApprove, onUpdateCaption, onDelete, onPostNow, isApproving, isPostingNow }: DraftsTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-32 bg-secondary/30 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">No drafts yet</p>
        <p className="text-sm">Generate a draft above to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {drafts.map((post) => (
        <DraftCard
          key={post.id}
          post={post}
          onApprove={onApprove}
          onUpdateCaption={onUpdateCaption}
          onDelete={onDelete}
          onPostNow={onPostNow}
          isApproving={isApproving}
          isPostingNow={isPostingNow}
        />
      ))}
    </div>
  );
}

// Draft Card Component
interface DraftCardProps {
  post: SocialMediaPost;
  onApprove: (params: { postId: string; scheduledFor: string; caption?: string }) => Promise<void>;
  onUpdateCaption: (params: { postId: string; caption: string }) => void;
  onDelete: (postId: string) => void;
  onPostNow: (postId: string) => Promise<unknown>;
  isApproving: boolean;
  isPostingNow: boolean;
}

function DraftCard({ post, onApprove, onUpdateCaption, onDelete, onPostNow, isApproving, isPostingNow }: DraftCardProps) {
  const [caption, setCaption] = useState(post.generated_caption || '');
  const [approveDate, setApproveDate] = useState<Date | undefined>();
  const [approveTime, setApproveTime] = useState('12:00');
  const [showScheduler, setShowScheduler] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const isGenerating = post.status === 'generating';

  const handleApprove = async () => {
    if (!approveDate) return;
    
    const [hours, minutes] = approveTime.split(':').map(Number);
    const dateTime = new Date(approveDate);
    dateTime.setHours(hours, minutes, 0, 0);

    await onApprove({
      postId: post.id,
      scheduledFor: dateTime.toISOString(),
      caption: caption !== post.generated_caption ? caption : undefined,
    });
    setShowScheduler(false);
  };

  const handlePostNow = async () => {
    setIsPublishing(true);
    try {
      await onPostNow(post.id);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCaptionBlur = () => {
    if (caption !== post.generated_caption && caption.trim()) {
      onUpdateCaption({ postId: post.id, caption });
    }
  };

  return (
    <div className="p-4 rounded-lg bg-secondary/20 border border-border space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Thumbnail */}
        <div className="w-16 h-16 rounded-lg bg-secondary/50 flex items-center justify-center overflow-hidden flex-shrink-0">
          {post.media_urls && post.media_urls.length > 0 ? (
            <img
              src={post.media_urls[0]}
              alt="Post thumbnail"
              className="w-full h-full object-cover"
            />
          ) : (
            <Image className="w-6 h-6 text-muted-foreground" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm line-clamp-2">{post.content_idea}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">
              {post.post_type}
            </span>
            {isGenerating && (
              <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-500 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                AI Generating...
              </span>
            )}
            {post.status === 'draft' && (
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-500">
                Ready for Review
              </span>
            )}
          </div>
        </div>

        {/* Delete */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(post.id)}
          className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Caption Editor - Only show when draft is ready */}
      {post.status === 'draft' && (
        <>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">AI Generated Caption</Label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onBlur={handleCaptionBlur}
              placeholder="Caption will appear here once AI generates it..."
              className="min-h-[80px] bg-background/50 border-border text-sm"
            />
          </div>

          {/* Publishing Loading State */}
          {isPublishing && (
            <div className="flex items-center justify-center gap-3 p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
              <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
              <span className="text-sm font-medium text-orange-500">Publishing to Socials...</span>
            </div>
          )}

          {/* Action Buttons - Only show when not publishing */}
          {!isPublishing && (
            <>
              {!showScheduler ? (
                <div className="flex gap-2">
                  {/* Post Now Button */}
                  <Button
                    onClick={handlePostNow}
                    disabled={isPostingNow}
                    className="flex-1 gap-2 bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {isPostingNow ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Post Now
                  </Button>

                  {/* Schedule Button */}
                  <Button
                    onClick={() => setShowScheduler(true)}
                    className="flex-1 gap-2"
                    variant="secondary"
                  >
                    <Calendar className="w-4 h-4" />
                    Schedule
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 p-3 rounded-lg bg-background/50 border border-border">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !approveDate && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-3 w-3" />
                            {approveDate ? format(approveDate, "MMM d") : "Pick date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={approveDate}
                            onSelect={setApproveDate}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Time</Label>
                      <Input
                        type="time"
                        value={approveTime}
                        onChange={(e) => setApproveTime(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleApprove}
                      disabled={!approveDate || isApproving}
                      className="flex-1 gap-2"
                      size="sm"
                    >
                      {isApproving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Confirm
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowScheduler(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// Scheduled Tab Component
interface ScheduledTabProps {
  posts: SocialMediaPost[];
  isLoading: boolean;
  onDelete: (postId: string) => void;
}

function ScheduledTab({ posts, isLoading, onDelete }: ScheduledTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-secondary/30 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">No scheduled posts</p>
        <p className="text-sm">Approve a draft to schedule it!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <div
          key={post.id}
          className="flex items-start gap-4 p-4 rounded-lg bg-secondary/20 border border-border hover:border-primary/30 transition-colors"
        >
          {/* Thumbnail */}
          <div className="w-16 h-16 rounded-lg bg-secondary/50 flex items-center justify-center overflow-hidden flex-shrink-0">
            {post.media_urls && post.media_urls.length > 0 ? (
              <img
                src={post.media_urls[0]}
                alt="Post thumbnail"
                className="w-full h-full object-cover"
              />
            ) : (
              <Image className="w-6 h-6 text-muted-foreground" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm line-clamp-2">{post.content_idea}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">
                {post.post_type}
              </span>
              {post.scheduled_for && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(post.scheduled_for), "MMM d, h:mm a")}
                </span>
              )}
            </div>
          </div>

          {/* Delete Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(post.id)}
            className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
