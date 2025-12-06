import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Trash2, Upload, Calendar, Image, Film, Layers, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SocialMediaPost {
  id: string;
  content_idea: string;
  brief: string | null;
  post_type: string;
  media_urls: string[];
  scheduled_for: string | null;
  status: string;
  created_at: string;
}

const POST_TYPES = [
  { value: 'Single', label: 'Single Post', icon: Image },
  { value: 'Carousel', label: 'Carousel', icon: Layers },
  { value: 'Reel', label: 'Reel', icon: Film },
];

export function SocialMediaManager() {
  const queryClient = useQueryClient();
  const lastInvalidationRef = useRef<number>(0);
  
  // Form state
  const [contentIdea, setContentIdea] = useState('');
  const [brief, setBrief] = useState('');
  const [postType, setPostType] = useState<string>('Single');
  const [scheduleForLater, setScheduleForLater] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState('12:00');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // Fetch scheduled posts - DISABLED FOR MAINTENANCE
  const { data: scheduledPosts, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['social-media-posts'],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .from('social_media_posts')
        .select('*')
        .eq('status', 'scheduled')
        .order('scheduled_for', { ascending: true })
        .limit(20)
        .abortSignal(signal);
      
      if (error) throw error;
      return data as SocialMediaPost[];
    },
    enabled: false, // QUARANTINE: Disabled to prevent 504 timeout
    staleTime: 1000 * 60,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // Debounced invalidation function
  const debouncedInvalidate = useCallback(() => {
    const now = Date.now();
    const MIN_INVALIDATION_INTERVAL = 2000; // 2 seconds minimum between invalidations
    
    if (now - lastInvalidationRef.current > MIN_INVALIDATION_INTERVAL) {
      lastInvalidationRef.current = now;
      queryClient.invalidateQueries({ queryKey: ['social-media-posts'] });
    }
  }, [queryClient]);

  // Realtime subscription with debounce
  useEffect(() => {
    const channel = supabase
      .channel('social-media-posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'social_media_posts',
        },
        () => {
          debouncedInvalidate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [debouncedInvalidate]);

  // Upload files to storage
  const uploadFiles = async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `posts/${fileName}`;

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

  // Create post mutation
  const createPost = useMutation({
    mutationFn: async () => {
      setUploading(true);
      
      // Upload files first
      let mediaUrls: string[] = [];
      if (uploadedFiles.length > 0) {
        mediaUrls = await uploadFiles(uploadedFiles);
      }

      // Calculate scheduled time
      let scheduledFor: string;
      if (scheduleForLater && scheduledDate) {
        const [hours, minutes] = scheduledTime.split(':').map(Number);
        const dateTime = new Date(scheduledDate);
        dateTime.setHours(hours, minutes, 0, 0);
        scheduledFor = dateTime.toISOString();
      } else {
        scheduledFor = new Date().toISOString();
      }

      const { error } = await supabase
        .from('social_media_posts')
        .insert({
          content_idea: contentIdea,
          brief: brief || null,
          post_type: postType,
          media_urls: mediaUrls,
          scheduled_for: scheduledFor,
          status: 'scheduled',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Social Post added to Queue! 📅');
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['social-media-posts'] });
    },
    onError: (error) => {
      console.error('Create post error:', error);
      toast.error('Failed to save post.');
    },
    onSettled: () => {
      setUploading(false);
    },
  });

  // Delete post mutation
  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('social_media_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Post removed from queue');
      queryClient.invalidateQueries({ queryKey: ['social-media-posts'] });
    },
    onError: () => {
      toast.error('Failed to delete post');
    },
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentIdea.trim()) {
      toast.error('Please add a content idea');
      return;
    }
    createPost.mutate();
  };

  // Error state UI
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-lg bg-destructive/10 border border-destructive/20">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Unable to load Social Dashboard
        </h3>
        <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
          {error instanceof Error ? error.message : 'Something went wrong loading posts.'}
        </p>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
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

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={createPost.isPending || uploading || !contentIdea.trim()}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6"
            >
              {createPost.isPending || uploading ? (
                <span className="flex items-center gap-2">
                  <Upload className="w-4 h-4 animate-pulse" />
                  {uploading ? 'Uploading...' : 'Saving...'}
                </span>
              ) : scheduleForLater ? (
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Schedule Post
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  🚀 Post Now
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Content Queue */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Content Queue
            {scheduledPosts && scheduledPosts.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary">
                {scheduledPosts.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-secondary/30 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : scheduledPosts && scheduledPosts.length > 0 ? (
            <div className="space-y-3">
              {scheduledPosts.map((post) => (
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
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(post.scheduled_for), "MMM d, h:mm a")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deletePost.mutate(post.id)}
                    disabled={deletePost.isPending}
                    className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No scheduled posts yet</p>
              <p className="text-sm">Create your first post above!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
