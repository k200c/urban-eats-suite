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
  postType: 'single' | 'carousel' | 'video';
  files: File[];
  scheduledDate?: Date;
  scheduledTime?: string;
  // New AI-powered fields
  aiPreference: 'generate_ai' | 'upload_media';
  visualPrompt?: string;
  referenceFile?: File;
}

const N8N_GENERATE_WEBHOOK = 'https://kyle2000.app.n8n.cloud/webhook-test/street-eatz-generate';

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

  // Generate draft mutation (no date selected) - WITH LOUD DEBUGGING
  const generateDraftMutation = useMutation({
    mutationFn: async ({ contentIdea, brief, postType, files, aiPreference, visualPrompt, referenceFile }: CreatePostParams) => {
      console.log("%c 🚀 STARTING DRAFT GENERATION...", "background: #222; color: #bada55", { 
        contentIdea, brief, postType, filesCount: files.length, aiPreference, visualPrompt 
      });

      // VALIDATION: Check required fields
      if (!contentIdea || contentIdea.trim() === '') {
        toast.error('Content idea is required!');
        throw new Error('Content idea is required');
      }

      // Upload files first (media files OR reference image)
      let mediaUrls: string[] = [];
      let referenceUrl: string | null = null;

      if (aiPreference === 'upload_media' && files.length > 0) {
        console.log("📤 Uploading", files.length, "media files...");
        mediaUrls = await uploadFiles(files);
        console.log("✅ Media files uploaded:", mediaUrls);
      }

      if (aiPreference === 'generate_ai' && referenceFile) {
        console.log("📤 Uploading reference image...");
        const [refUrl] = await uploadFiles([referenceFile]);
        referenceUrl = refUrl;
        console.log("✅ Reference image uploaded:", referenceUrl);
      }

      // 1. INSERT INTO DATABASE FIRST
      console.log("💾 Inserting post into database...");
      const { data: newPost, error: dbError } = await supabase
        .from('social_media_posts')
        .insert({
          content_idea: contentIdea.trim(),
          brief: brief?.trim() || null,
          post_type: postType,
          media_urls: mediaUrls,
          status: 'generating',
        })
        .select()
        .single();

      if (dbError) {
        console.error("❌ DB Error:", dbError);
        toast.error("Failed to save draft to database.");
        throw dbError;
      }

      console.log("✅ Post saved to DB with ID:", newPost.id);

      // 2. CONSTRUCT THE EXACT PAYLOAD FOR N8N
      const payload = {
        post_id: newPost.id,
        idea: newPost.content_idea,
        brief: newPost.brief || "",
        post_type: postType, // "single", "carousel", or "video"
        ai_preference: aiPreference, // "generate_ai" or "upload_media"
        // If uploading:
        media_urls: mediaUrls,
        // If generating:
        visual_prompt: aiPreference === 'generate_ai' ? (visualPrompt || "") : null,
        reference_image_url: referenceUrl,
      };

      // EXPLICIT DEBUG LOG - Print exact payload before sending
      const payloadString = JSON.stringify(payload);
      console.log("📦 Payload:", payloadString);
      console.log("%c 📦 PAYLOAD TO N8N:", "background: #333; color: #00ff00", JSON.stringify(payload, null, 2));

      // 3. TRIGGER WEBHOOK WITH EXPLICIT FETCH
      try {
        const response = await fetch(N8N_GENERATE_WEBHOOK, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: payloadString
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ N8N Error (${response.status}):`, errorText);
          toast.error(`AI request failed: ${response.status}`);
        } else {
          console.log("✅ N8N webhook triggered successfully!");
          toast.success("✨ AI is writing your caption...");
        }
      } catch (netError) {
        console.error("🚨 Network/Webhook Error:", netError);
        toast.error(`Draft saved, but AI failed: ${netError instanceof Error ? netError.message : 'Unknown error'}`);
      }

      return newPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-media-drafts'] });
    },
    onError: (error) => {
      console.error('❌ Generate draft mutation error:', error);
      toast.error('Failed to create draft');
    },
  });

  // Schedule post mutation (date selected) - skips AI generation
  const schedulePostMutation = useMutation({
    mutationFn: async ({ contentIdea, brief, postType, files, scheduledDate, scheduledTime, aiPreference, visualPrompt, referenceFile }: CreatePostParams) => {
      console.log("📅 Scheduling post directly...", { postType, aiPreference });
      
      // Upload files first (media files OR reference image depending on mode)
      let mediaUrls: string[] = [];
      
      if (aiPreference === 'upload_media' && files.length > 0) {
        mediaUrls = await uploadFiles(files);
      }
      
      // Note: If AI mode is selected but scheduling directly, we still save the visual prompt
      // for potential future AI processing (or manual image creation)

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
          brief: aiPreference === 'generate_ai' ? `${brief || ''}\n\n[AI Visual: ${visualPrompt || 'No prompt'}]` : (brief || null),
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
