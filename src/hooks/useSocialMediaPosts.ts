import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
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

  // Realtime subscription - LIVE updates for status changes
  useEffect(() => {
    console.log("🔌 Setting up Supabase Realtime subscription for social_media_posts...");
    
    const channel = supabase
      .channel('social-media-posts-live')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'social_media_posts',
        },
        (payload) => {
          console.log("🔔 Realtime UPDATE received:", payload);
          
          const newRecord = payload.new as SocialMediaPost;
          const oldRecord = payload.old as Partial<SocialMediaPost>;
          
          // Detect status change from 'generating' to 'draft'
          if (oldRecord.status === 'generating' && newRecord.status === 'draft') {
            console.log("✨ Draft is READY! Post ID:", newRecord.id);
            toast.success("✅ Your draft is ready!", {
              description: "AI has generated your caption.",
              duration: 5000,
            });
          }
          
          // Immediately invalidate queries (no debounce for status changes)
          queryClient.invalidateQueries({ queryKey: ['social-media-drafts'] });
          queryClient.invalidateQueries({ queryKey: ['social-media-scheduled'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'social_media_posts',
        },
        (payload) => {
          console.log("🔔 Realtime INSERT received:", payload);
          queryClient.invalidateQueries({ queryKey: ['social-media-drafts'] });
          queryClient.invalidateQueries({ queryKey: ['social-media-scheduled'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'social_media_posts',
        },
        (payload) => {
          console.log("🔔 Realtime DELETE received:", payload);
          queryClient.invalidateQueries({ queryKey: ['social-media-drafts'] });
          queryClient.invalidateQueries({ queryKey: ['social-media-scheduled'] });
        }
      )
      .subscribe((status) => {
        console.log("📡 Realtime subscription status:", status);
      });

    return () => {
      console.log("🔌 Cleaning up Realtime subscription...");
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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

  // Generate draft mutation (no date selected) - REFACTORED: Sequential Upload → Payload → Dispatch
  const generateDraftMutation = useMutation({
    mutationFn: async ({ contentIdea, brief, postType, files, aiPreference, visualPrompt, referenceFile }: CreatePostParams) => {
      console.log("%c 🚀 STARTING DRAFT GENERATION v2...", "background: #222; color: #bada55", { 
        contentIdea, brief, postType, filesCount: files.length, aiPreference, visualPrompt 
      });

      // VALIDATION: Check required fields
      if (!contentIdea || contentIdea.trim() === '') {
        toast.error('Content idea is required!');
        throw new Error('Content idea is required');
      }

      // ═══════════════════════════════════════════════════════════════
      // STEP 1: UPLOAD FILES FIRST (BLOCKING - Wait for completion)
      // ═══════════════════════════════════════════════════════════════
      let finalMediaUrls: string[] = [];
      let finalReferenceUrl: string | null = null;

      if (aiPreference === 'upload_media' && files.length > 0) {
        console.log("📤 STEP 1: Uploading", files.length, "media files...");
        finalMediaUrls = await uploadFiles(files); // Direct assignment from upload result
        console.log("✅ STEP 1 COMPLETE - finalMediaUrls:", JSON.stringify(finalMediaUrls));
      }

      if (aiPreference === 'generate_ai' && referenceFile) {
        console.log("📤 STEP 1: Uploading reference image...");
        const uploadResult = await uploadFiles([referenceFile]);
        finalReferenceUrl = uploadResult[0] || null;
        console.log("✅ STEP 1 COMPLETE - finalReferenceUrl:", finalReferenceUrl);
      }

      // ═══════════════════════════════════════════════════════════════
      // STEP 2: CONSTRUCT PAYLOADS (Only AFTER Step 1 completes)
      // ═══════════════════════════════════════════════════════════════
      const newId = crypto.randomUUID();
      console.log("🆔 STEP 2: Generated UUID:", newId);

      // DB Payload - uses finalMediaUrls from Step 1
      const dbPayload = {
        id: newId,
        idea: contentIdea.trim(),
        content_idea: contentIdea.trim(),
        brief: brief?.trim() || null,
        post_type: postType,
        ai_preference: aiPreference,
        visual_prompt: aiPreference === 'generate_ai' ? (visualPrompt || null) : null,
        media_urls: finalMediaUrls, // ← FROM STEP 1
        status: 'generating',
        created_at: new Date().toISOString(),
      };

      // Webhook Payload - uses finalMediaUrls from Step 1
      const webhookPayload = {
        post_id: newId,
        idea: contentIdea.trim(),
        brief: brief?.trim() || "",
        post_type: postType,
        ai_preference: aiPreference,
        media_urls: finalMediaUrls, // ← FROM STEP 1
        visual_prompt: aiPreference === 'generate_ai' ? (visualPrompt || "") : null,
        reference_image_url: finalReferenceUrl, // ← FROM STEP 1
      };

      console.log("%c 💾 STEP 2: DB PAYLOAD:", "background: #333; color: #00ffff", JSON.stringify(dbPayload, null, 2));
      console.log("%c 📦 STEP 2: WEBHOOK PAYLOAD:", "background: #333; color: #00ff00", JSON.stringify(webhookPayload, null, 2));

      // ═══════════════════════════════════════════════════════════════
      // STEP 3: DUAL DISPATCH (DB Insert + Webhook)
      // ═══════════════════════════════════════════════════════════════
      console.log("🚀 STEP 3: Inserting to DB...");
      const { data: newPost, error: dbError } = await supabase
        .from('social_media_posts')
        .insert(dbPayload)
        .select()
        .single();

      if (dbError) {
        console.error("❌ STEP 3 DB INSERT FAILED!");
        console.error("❌ Error Code:", dbError.code);
        console.error("❌ Error Message:", dbError.message);
        console.error("❌ Error Details:", dbError.details);
        toast.error(`DB Error: ${dbError.message}`);
        throw dbError;
      }

      console.log("✅ STEP 3 DB SUCCESS - Post ID:", newPost.id);

      // CRITICAL DEBUG LOG - Verify media_urls right before fetch
      console.log("🚀 FINAL Webhook Payload:", JSON.stringify(webhookPayload));

      console.log("🚀 STEP 3: Triggering N8N webhook...");
      try {
        const response = await fetch(N8N_GENERATE_WEBHOOK, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          mode: "cors",
          credentials: "omit",
          body: JSON.stringify(webhookPayload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ N8N Error (${response.status}):`, errorText);
          toast.error(`AI request failed: ${response.status}`);
        } else {
          console.log("✅ STEP 3 WEBHOOK SUCCESS!");
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
