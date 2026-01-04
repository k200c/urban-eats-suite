import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Send, Image, Loader2, Mail, DollarSign, Users, Vote, Calendar, Trophy } from 'lucide-react';
import { useBroadcasts, useSendBroadcast, useCommunityVotes, useCreateVote } from '@/hooks/useBroadcasts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

export function MarketingHub() {
  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastImageUrl, setBroadcastImageUrl] = useState('');

  // Vote state
  const [voteTitle, setVoteTitle] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [closingDate, setClosingDate] = useState<Date>();

  const { data: broadcasts, isLoading: broadcastsLoading } = useBroadcasts();
  const { data: votes, isLoading: votesLoading } = useCommunityVotes();
  const sendBroadcast = useSendBroadcast();
  const createVote = useCreateVote();

  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    
    await sendBroadcast.mutateAsync({
      title: broadcastTitle,
      message: broadcastMessage,
      image_url: broadcastImageUrl || undefined,
    });

    setBroadcastTitle('');
    setBroadcastMessage('');
    setBroadcastImageUrl('');
  };

  const handleCreateVote = async () => {
    if (!voteTitle.trim() || !optionA.trim() || !optionB.trim() || !closingDate) return;

    await createVote.mutateAsync({
      title: voteTitle,
      option_a: optionA,
      option_b: optionB,
      closing_date: closingDate.toISOString(),
    });

    setVoteTitle('');
    setOptionA('');
    setOptionB('');
    setClosingDate(undefined);
  };

  // Aggregate broadcast stats
  const broadcastStats = broadcasts?.reduce(
    (acc, b) => ({
      totalSent: acc.totalSent + 1,
      totalRecipients: acc.totalRecipients + (b.recipients_count || 0),
      avgOpenRate: acc.avgOpenRate + (b.open_rate || 0),
      totalRevenue: acc.totalRevenue + (b.revenue_generated || 0),
    }),
    { totalSent: 0, totalRecipients: 0, avgOpenRate: 0, totalRevenue: 0 }
  ) || { totalSent: 0, totalRecipients: 0, avgOpenRate: 0, totalRevenue: 0 };

  if (broadcastStats.totalSent > 0) {
    broadcastStats.avgOpenRate = broadcastStats.avgOpenRate / broadcastStats.totalSent;
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Broadcasts Sent</p>
                <p className="text-2xl font-bold">{broadcastStats.totalSent}</p>
              </div>
              <Mail className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Reach</p>
                <p className="text-2xl font-bold">{broadcastStats.totalRecipients}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Open Rate</p>
                <p className="text-2xl font-bold text-green-400">{broadcastStats.avgOpenRate.toFixed(0)}%</p>
              </div>
              <Mail className="w-8 h-8 text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue Generated</p>
                <p className="text-2xl font-bold text-primary">€{broadcastStats.totalRevenue.toFixed(0)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Broadcast Hub */}
        <Card className="bg-card border-border">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent border-b border-border">
            <CardTitle className="flex items-center gap-2">
              📢 Savage Sunday Broadcast
            </CardTitle>
            <CardDescription>Send marketing messages to your customer base</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="broadcast-title">Title</Label>
              <Input
                id="broadcast-title"
                placeholder="e.g., 🔥 SAVAGE SUNDAY DEAL!"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="broadcast-message">Message</Label>
              <Textarea
                id="broadcast-message"
                placeholder="Write your promotional message here..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="min-h-[100px] bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="broadcast-image" className="flex items-center gap-2">
                <Image className="w-4 h-4" />
                Image URL (optional)
              </Label>
              <Input
                id="broadcast-image"
                placeholder="https://..."
                value={broadcastImageUrl}
                onChange={(e) => setBroadcastImageUrl(e.target.value)}
                className="bg-background/50"
              />
            </div>

            <Button
              onClick={handleSendBroadcast}
              disabled={sendBroadcast.isPending || !broadcastTitle.trim() || !broadcastMessage.trim()}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {sendBroadcast.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Now
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Community Vote */}
        <Card className="bg-card border-border">
          <CardHeader className="bg-gradient-to-r from-violet-500/10 to-transparent border-b border-border">
            <CardTitle className="flex items-center gap-2">
              <Vote className="w-5 h-5 text-violet-400" />
              Community Vote
            </CardTitle>
            <CardDescription>Let your customers decide the next special!</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Vote Title</Label>
              <Input
                placeholder="e.g., Next Week's Special Fries"
                value={voteTitle}
                onChange={(e) => setVoteTitle(e.target.value)}
                className="bg-background/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-red-400">🅰️ Option A</Label>
                <Input
                  placeholder="e.g., Taco Fries"
                  value={optionA}
                  onChange={(e) => setOptionA(e.target.value)}
                  className="bg-background/50 border-red-500/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-blue-400">🅱️ Option B</Label>
                <Input
                  placeholder="e.g., Curry Fries"
                  value={optionB}
                  onChange={(e) => setOptionB(e.target.value)}
                  className="bg-background/50 border-blue-500/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Closing Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-background/50",
                      !closingDate && "text-muted-foreground"
                    )}
                  >
                    {closingDate ? format(closingDate, "PPP") : "Pick a closing date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={closingDate}
                    onSelect={setClosingDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button
              onClick={handleCreateVote}
              disabled={createVote.isPending || !voteTitle.trim() || !optionA.trim() || !optionB.trim() || !closingDate}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              {createVote.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Vote className="w-4 h-4 mr-2" />
                  Start Vote
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* History Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Broadcast History */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Broadcast History</CardTitle>
          </CardHeader>
          <CardContent>
            {broadcastsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-secondary/30 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : broadcasts?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No broadcasts sent yet
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                {broadcasts?.map((broadcast) => (
                  <motion.div
                    key={broadcast.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 rounded-lg bg-secondary/20 border border-border"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">{broadcast.title}</h4>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(broadcast.sent_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{broadcast.message}</p>
                    <div className="flex gap-4 text-xs">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {broadcast.recipients_count} reached
                      </span>
                      <span className="flex items-center gap-1 text-green-400">
                        <Mail className="w-3 h-3" />
                        {broadcast.open_rate}% opened
                      </span>
                      <span className="flex items-center gap-1 text-primary">
                        <DollarSign className="w-3 h-3" />
                        €{broadcast.revenue_generated}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Votes */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Active Votes</CardTitle>
          </CardHeader>
          <CardContent>
            {votesLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-24 bg-secondary/30 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : votes?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No votes created yet
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                {votes?.map((vote) => {
                  const totalVotes = vote.votes_a + vote.votes_b;
                  const percentA = totalVotes > 0 ? (vote.votes_a / totalVotes) * 100 : 50;
                  const isEnded = new Date(vote.closing_date) < new Date();

                  return (
                    <motion.div
                      key={vote.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`p-4 rounded-lg border ${
                        isEnded ? 'bg-muted/20 border-muted' : 'bg-secondary/20 border-border'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-semibold">{vote.title}</h4>
                        <Badge variant={isEnded ? 'secondary' : 'default'}>
                          {isEnded ? 'Ended' : 'Active'}
                        </Badge>
                      </div>

                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-red-400">🅰️ {vote.option_a}</span>
                          <span>{vote.votes_a} votes</span>
                        </div>
                        <Progress value={percentA} className="h-2 bg-blue-500/30" />
                        <div className="flex justify-between text-sm">
                          <span className="text-blue-400">🅱️ {vote.option_b}</span>
                          <span>{vote.votes_b} votes</span>
                        </div>
                      </div>

                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{totalVotes} total votes</span>
                        <span>Closes: {format(new Date(vote.closing_date), 'MMM d')}</span>
                      </div>

                      {isEnded && vote.winner && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-yellow-400">
                          <Trophy className="w-4 h-4" />
                          Winner: {vote.winner}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
