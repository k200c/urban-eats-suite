import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SocialMediaPost {
  id: string;
  content_idea: string;
  brief: string | null;
  post_type: string;
  media_urls: string[];
  scheduled_for: string | null;
  status: string;
  created_at: string;
  generated_caption: string | null;
}

interface CreatePostParams {
  contentIdea: string;
  brief: string;
  postType: string;
  files: File[];
  scheduledDate?: Date;
  scheduledTime?: string;
}

const N8N_GENERATE_WEBHOOK = 'https://kyle2000.app.n8n.cloud/webhook/street-eatz-generate';

export function useSocialMediaPosts() {
  const queryClient = useQueryClient();
  const lastInvalidationRef = useRef<number>(0);

  // Debounced invalidation function
  const debouncedInvalidate = useCallback(() => {
    const now = Date.now();
    const MIN_INVALIDATION_INTERVAL = 2000;
    
    if (now - lastInvalidationRef.current > MIN_INVALIDATION_INTERVAL) {
      lastInvalidationRef.current = now;
      queryClient.invalidateQueries({ queryKey: ['social-media-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['social-media-scheduled'] });
    }
  }, [queryClient]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('social-media-posts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'social_media_posts',
        },
        (payload) => {
          console.log('[SocialMedia] Realtime update:', payload);
          debouncedInvalidate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [debouncedInvalidate]);

  // Fetch drafts (status: 'draft' or 'generating')
  const draftsQuery = useQuery({
    queryKey: ['social-media-drafts'],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .from('social_media_posts')
        .select('*')
        .in('status', ['draft', 'generating'])
        .order('created_at', { ascending: false })
        .limit(20)
        .abortSignal(signal);
      
      if (error) throw error;
      return data as SocialMediaPost[];
    },
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  });

  // Fetch scheduled posts
  const scheduledQuery = useQuery({
    queryKey: ['social-media-scheduled'],
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
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  });

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

  // Generate draft mutation (no date selected)
  const generateDraftMutation = useMutation({
    mutationFn: async ({ contentIdea, brief, postType, files }: CreatePostParams) => {
      // Upload files first
      let mediaUrls: string[] = [];
      if (files.length > 0) {
        mediaUrls = await uploadFiles(files);
      }

      // Insert with status 'generating'
      const { data, error } = await supabase
        .from('social_media_posts')
        .insert({
          content_idea: contentIdea,
          brief: brief || null,
          post_type: postType,
          media_urls: mediaUrls,
          status: 'generating',
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger n8n webhook for AI caption generation
      try {
        console.log('[SocialMedia] Triggering n8n webhook for post:', data.id);
        const response = await fetch(N8N_GENERATE_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            post_id: data.id,
            idea: contentIdea,
            media_urls: mediaUrls,
            brief: brief || '',
          }),
        });
        
        if (!response.ok) {
          console.error('[SocialMedia] Webhook response not ok:', response.status);
        } else {
          console.log('[SocialMedia] Webhook triggered successfully');
        }
      } catch (webhookError) {
        console.error('[SocialMedia] Webhook error:', webhookError);
        // Don't throw - we still created the post, n8n will handle retry
      }

      return data;
    },
    onSuccess: () => {
      toast.success('✨ AI is writing your caption... check Drafts tab!');
      queryClient.invalidateQueries({ queryKey: ['social-media-drafts'] });
    },
    onError: (error) => {
      console.error('Generate draft error:', error);
      toast.error('Failed to create draft');
    },
  });

  // Schedule post mutation (date selected)
  const schedulePostMutation = useMutation({
    mutationFn: async ({ contentIdea, brief, postType, files, scheduledDate, scheduledTime }: CreatePostParams) => {
      // Upload files first
      let mediaUrls: string[] = [];
      if (files.length > 0) {
        mediaUrls = await uploadFiles(files);
      }

      // Calculate scheduled datetime
      let scheduledFor: string | null = null;
      if (scheduledDate) {
        const [hours, minutes] = (scheduledTime || '12:00').split(':').map(Number);
        const dateTime = new Date(scheduledDate);
        dateTime.setHours(hours, minutes, 0, 0);
        scheduledFor = dateTime.toISOString();
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
      toast.success('📅 Post scheduled successfully!');
      queryClient.invalidateQueries({ queryKey: ['social-media-scheduled'] });
    },
    onError: (error) => {
      console.error('Schedule post error:', error);
      toast.error('Failed to schedule post');
    },
  });

  // Approve and schedule a draft
  const approveDraftMutation = useMutation({
    mutationFn: async ({ postId, scheduledFor, caption }: { postId: string; scheduledFor: string; caption?: string }) => {
      const updateData: Record<string, unknown> = {
        status: 'scheduled',
        scheduled_for: scheduledFor,
      };
      
      if (caption !== undefined) {
        updateData.generated_caption = caption;
      }

      const { error } = await supabase
        .from('social_media_posts')
        .update(updateData)
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('✅ Draft approved and scheduled!');
      queryClient.invalidateQueries({ queryKey: ['social-media-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['social-media-scheduled'] });
    },
    onError: (error) => {
      console.error('Approve draft error:', error);
      toast.error('Failed to approve draft');
    },
  });

  // Update draft caption
  const updateCaptionMutation = useMutation({
    mutationFn: async ({ postId, caption }: { postId: string; caption: string }) => {
      const { error } = await supabase
        .from('social_media_posts')
        .update({ generated_caption: caption })
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-media-drafts'] });
    },
    onError: (error) => {
      console.error('Update caption error:', error);
      toast.error('Failed to update caption');
    },
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('social_media_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Post deleted');
      queryClient.invalidateQueries({ queryKey: ['social-media-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['social-media-scheduled'] });
    },
    onError: () => {
      toast.error('Failed to delete post');
    },
  });

  return {
    drafts: draftsQuery.data ?? [],
    scheduled: scheduledQuery.data ?? [],
    isLoadingDrafts: draftsQuery.isLoading,
    isLoadingScheduled: scheduledQuery.isLoading,
    draftsError: draftsQuery.error,
    scheduledError: scheduledQuery.error,
    refetchDrafts: draftsQuery.refetch,
    refetchScheduled: scheduledQuery.refetch,
    generateDraft: generateDraftMutation.mutateAsync,
    schedulePost: schedulePostMutation.mutateAsync,
    approveDraft: approveDraftMutation.mutateAsync,
    updateCaption: updateCaptionMutation.mutate,
    deletePost: deletePostMutation.mutate,
    isGenerating: generateDraftMutation.isPending,
    isScheduling: schedulePostMutation.isPending,
    isApproving: approveDraftMutation.isPending,
  };
}
