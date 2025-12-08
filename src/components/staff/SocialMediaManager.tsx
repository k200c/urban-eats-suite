import { useState } from 'react';
import { format } from 'date-fns';
import { 
  Trash2, Upload, Calendar, Image, Film, Layers, Sparkles, 
  AlertCircle, RefreshCw, Loader2, Check, Clock 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useSocialMediaPosts, SocialMediaPost } from '@/hooks/useSocialMediaPosts';

const POST_TYPES = [
  { value: 'Single', label: 'Single Post', icon: Image },
  { value: 'Carousel', label: 'Carousel', icon: Layers },
  { value: 'Reel', label: 'Reel', icon: Film },
];

export function SocialMediaManager() {
  // Form state
  const [contentIdea, setContentIdea] = useState('');
  const [brief, setBrief] = useState('');
  const [postType, setPostType] = useState<string>('Single');
  const [scheduleForLater, setScheduleForLater] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState('12:00');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
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
    isGenerating,
    isScheduling,
    isApproving,
  } = useSocialMediaPosts();

  const resetForm = () => {
    setContentIdea('');
    setBrief('');
    setPostType('Single');
    setScheduleForLater(false);
    setScheduledDate(undefined);
    setScheduledTime('12:00');
    setUploadedFiles([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentIdea.trim()) return;

    setUploading(true);
    try {
      if (scheduleForLater && scheduledDate) {
        // Schedule post directly
        await schedulePost({
          contentIdea,
          brief,
          postType,
          files: uploadedFiles,
          scheduledDate,
          scheduledTime,
        });
      } else {
        // Generate draft via AI
        await generateDraft({
          contentIdea,
          brief,
          postType,
          files: uploadedFiles,
        });
      }
      resetForm();
    } finally {
      setUploading(false);
    }
  };

  const isSubmitting = isGenerating || isScheduling || uploading;

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
      {/* Creator Studio */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Creator Studio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Content Idea */}
            <div className="space-y-2">
              <Label htmlFor="content-idea">What's the hook?</Label>
              <Textarea
                id="content-idea"
                placeholder="e.g., 🍔 The Urban Legend is BACK and better than ever..."
                value={contentIdea}
                onChange={(e) => setContentIdea(e.target.value)}
                className="min-h-[100px] bg-secondary/30 border-border"
              />
            </div>

            {/* Brief */}
            <div className="space-y-2">
              <Label htmlFor="brief">Key Details / Caption Notes</Label>
              <Input
                id="brief"
                placeholder="e.g., Mention limited time offer, tag location..."
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                className="bg-secondary/30 border-border"
              />
            </div>

            {/* Post Type & Media Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Post Type */}
              <div className="space-y-2">
                <Label>Post Type</Label>
                <Select value={postType} onValueChange={setPostType}>
                  <SelectTrigger className="bg-secondary/30 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POST_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Media Upload */}
              <div className="space-y-2">
                <Label htmlFor="media">Media Files</Label>
                <div className="relative">
                  <Input
                    id="media"
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="bg-secondary/30 border-border file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-primary file:text-primary-foreground"
                  />
                </div>
                {uploadedFiles.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {uploadedFiles.length} file(s) selected
                  </p>
                )}
              </div>
            </div>

            {/* Scheduling */}
            <div className="space-y-4 p-4 rounded-lg bg-secondary/20 border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <Label htmlFor="schedule-switch">Schedule for later?</Label>
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
                            "w-full justify-start text-left font-normal bg-secondary/30",
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
                      className="bg-secondary/30 border-border"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button - Conditional based on schedule */}
            <Button
              type="submit"
              disabled={isSubmitting || !contentIdea.trim()}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Upload className="w-4 h-4 animate-pulse" />
                  {uploading ? 'Uploading...' : 'Processing...'}
                </span>
              ) : scheduleForLater && scheduledDate ? (
                <span className="flex items-center gap-2">
                  📅 Schedule Post
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  ✨ Generate Draft
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
                isApproving={isApproving}
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
  isApproving: boolean;
}

function DraftsTab({ drafts, isLoading, onApprove, onUpdateCaption, onDelete, isApproving }: DraftsTabProps) {
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
          isApproving={isApproving}
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
  isApproving: boolean;
}

function DraftCard({ post, onApprove, onUpdateCaption, onDelete, isApproving }: DraftCardProps) {
  const [caption, setCaption] = useState(post.generated_caption || '');
  const [approveDate, setApproveDate] = useState<Date | undefined>();
  const [approveTime, setApproveTime] = useState('12:00');
  const [showScheduler, setShowScheduler] = useState(false);

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

          {/* Approve & Schedule */}
          {!showScheduler ? (
            <Button
              onClick={() => setShowScheduler(true)}
              className="w-full gap-2"
              variant="secondary"
            >
              <Check className="w-4 h-4" />
              Approve & Schedule
            </Button>
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
