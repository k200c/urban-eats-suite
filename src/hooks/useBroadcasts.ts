import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  image_url: string | null;
  sent_at: string;
  open_rate: number;
  revenue_generated: number;
  recipients_count: number;
  created_at: string;
}

export interface CommunityVote {
  id: string;
  title: string;
  option_a: string;
  option_b: string;
  votes_a: number;
  votes_b: number;
  closing_date: string;
  is_active: boolean;
  winner: string | null;
  created_at: string;
}

const BROADCAST_WEBHOOK_URL = "https://kyle2000.app.n8n.cloud/webhook-test/af8d316c-01bb-4b81-af97-adffa310d8e3";

export function useBroadcasts() {
  return useQuery({
    queryKey: ["broadcasts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broadcasts")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as Broadcast[];
    },
  });
}

export function useSendBroadcast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (broadcast: { title: string; message: string; image_url?: string }) => {
      // First, send to n8n webhook
      const response = await fetch(BROADCAST_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: broadcast.title,
          message: broadcast.message,
          image_url: broadcast.image_url || null,
          sent_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send broadcast");
      }

      // Simulated metrics (in production, n8n would return these)
      const simulatedRecipients = Math.floor(Math.random() * 200) + 50;
      const simulatedOpenRate = Math.floor(Math.random() * 40) + 30;
      const simulatedRevenue = Math.floor(Math.random() * 500) + 100;

      // Save to database
      const { error } = await supabase.from("broadcasts").insert({
        title: broadcast.title,
        message: broadcast.message,
        image_url: broadcast.image_url || null,
        recipients_count: simulatedRecipients,
        open_rate: simulatedOpenRate,
        revenue_generated: simulatedRevenue,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
      toast.success("📢 Broadcast sent successfully!");
    },
    onError: (error) => {
      toast.error("Failed to send broadcast");
      console.error(error);
    },
  });
}

export function useCommunityVotes() {
  return useQuery({
    queryKey: ["community-votes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_votes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CommunityVote[];
    },
  });
}

export function useCreateVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vote: { title: string; option_a: string; option_b: string; closing_date: string }) => {
      const { error } = await supabase.from("community_votes").insert({
        title: vote.title,
        option_a: vote.option_a,
        option_b: vote.option_b,
        closing_date: vote.closing_date,
        is_active: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-votes"] });
      toast.success("🗳️ Community vote created!");
    },
    onError: () => {
      toast.error("Failed to create vote");
    },
  });
}
