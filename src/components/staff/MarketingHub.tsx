import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Send, Image, Loader2, Mail, DollarSign, Users, Vote, Calendar, Trophy, Tag, Percent, Trash2, Plus, X } from 'lucide-react';
import { useBroadcasts, useSendBroadcast, useCommunityVotes, useCreateVote } from '@/hooks/useBroadcasts';
import { usePromotions, useCreatePromotion, useUpdatePromotion, useDeletePromotion } from '@/hooks/usePromotions';
import { useAppSettings, useUpdateAppSettings } from '@/hooks/useAppSettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function MarketingHub() {
  const [activeTab, setActiveTab] = useState('broadcasts');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="broadcasts">📢 Broadcasts</TabsTrigger>
          <TabsTrigger value="coupons">🏷️ Coupons</TabsTrigger>
          <TabsTrigger value="banner">🖼️ Banner</TabsTrigger>
        </TabsList>

        <TabsContent value="broadcasts" className="mt-4">
          <BroadcastsTab />
        </TabsContent>
        <TabsContent value="coupons" className="mt-4">
          <CouponsTab />
        </TabsContent>
        <TabsContent value="banner" className="mt-4">
          <BannerTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BroadcastsTab() {
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastImageUrl, setBroadcastImageUrl] = useState('');
  const [voteTitle, setVoteTitle] = useState('');
  const [voteMessage, setVoteMessage] = useState('');
  const [voteOptions, setVoteOptions] = useState<string[]>(['', '']);
  const [isStartingVote, setIsStartingVote] = useState(false);
  const [closingDate, setClosingDate] = useState<Date>();

  const { data: broadcasts, isLoading: broadcastsLoading } = useBroadcasts();
  const { data: votes, isLoading: votesLoading } = useCommunityVotes();
  const sendBroadcast = useSendBroadcast();
  const createVote = useCreateVote();

  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    await sendBroadcast.mutateAsync({ title: broadcastTitle, message: broadcastMessage, image_url: broadcastImageUrl || undefined });
    setBroadcastTitle(''); setBroadcastMessage(''); setBroadcastImageUrl('');
  };

  const updateVoteOption = (index: number, value: string) => {
    setVoteOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  };
  const addVoteOption = () => {
    setVoteOptions((prev) => (prev.length >= 6 ? prev : [...prev, '']));
  };
  const removeVoteOption = (index: number) => {
    setVoteOptions((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));
  };

  const startCommunityVote = async () => {
    const cleanOptions = voteOptions
      .map((option) => String(option).trim())
      .filter(Boolean)
      .slice(0, 6);

    if (!voteTitle.trim()) {
      toast.error('Please enter a vote title.');
      return;
    }
    if (!voteMessage.trim()) {
      toast.error('Please enter a vote message.');
      return;
    }
    if (cleanOptions.length < 2) {
      toast.error('Please add at least two vote options.');
      return;
    }

    const payload = {
      title: voteTitle.trim(),
      message: voteMessage.trim(),
      options: cleanOptions,
      send_sms: true,
      send_email: true,
      audience: 'demo',
      vote_link: '',
    };

    setIsStartingVote(true);
    try {
      const response = await fetch('https://kyle2000.app.n8n.cloud/webhook/Voting-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Voting webhook failed with status ${response.status}`);
      }

      let result: unknown = {};
      try {
        result = await response.json();
      } catch {
        result = {};
      }

      toast.success('Community vote started. Demo SMS/email triggered.');
      console.log('Community vote webhook result:', result);

      setVoteTitle('');
      setVoteMessage('');
      setVoteOptions(['', '']);
      setClosingDate(undefined);
    } catch (error) {
      console.error('Community vote start failed:', error);
      toast.error('Community vote could not be started. Check the voting workflow and try again.');
    } finally {
      setIsStartingVote(false);
    }
  };

  const broadcastStats = broadcasts?.reduce(
    (acc, b) => ({ totalSent: acc.totalSent + 1, totalRecipients: acc.totalRecipients + (b.recipients_count || 0), avgOpenRate: acc.avgOpenRate + (b.open_rate || 0), totalRevenue: acc.totalRevenue + (b.revenue_generated || 0) }),
    { totalSent: 0, totalRecipients: 0, avgOpenRate: 0, totalRevenue: 0 }
  ) || { totalSent: 0, totalRecipients: 0, avgOpenRate: 0, totalRevenue: 0 };
  if (broadcastStats.totalSent > 0) broadcastStats.avgOpenRate = broadcastStats.avgOpenRate / broadcastStats.totalSent;

  return (
    <>
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

            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="e.g., Help us pick next week's Street Eatz special."
                value={voteMessage}
                onChange={(e) => setVoteMessage(e.target.value)}
                className="bg-background/50 min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Vote Options ({voteOptions.filter((o) => o.trim()).length}/6)</Label>
              <div className="space-y-2">
                {voteOptions.map((option, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder={`Option ${index + 1} (e.g., Taco Fries)`}
                      value={option}
                      onChange={(e) => updateVoteOption(index, e.target.value)}
                      className="bg-background/50 border-violet-500/30"
                    />
                    {voteOptions.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeVoteOption(index)}
                        className="shrink-0"
                        aria-label={`Remove option ${index + 1}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {voteOptions.length < 6 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addVoteOption}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add option
                </Button>
              )}
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
              onClick={startCommunityVote}
              disabled={
                isStartingVote ||
                !voteTitle.trim() ||
                !voteMessage.trim() ||
                voteOptions.filter((o) => o.trim()).length < 2
              }
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              {isStartingVote ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting vote...
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
    </>
  );
}

function CouponsTab() {
  const { data: promotions, isLoading } = usePromotions();
  const createPromotion = useCreatePromotion();
  const updatePromotion = useUpdatePromotion();
  const deletePromotion = useDeletePromotion();
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [expiryDate, setExpiryDate] = useState<Date>();

  const handleCreate = () => {
    if (!code || !discountValue) { toast.error('Fill in code and value'); return; }
    createPromotion.mutate({ code, discount_type: discountType, discount_value: parseFloat(discountValue), expiry_date: expiryDate?.toISOString() });
    setCode(''); setDiscountValue(''); setExpiryDate(undefined);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" />Create Coupon</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input placeholder="e.g., STREET10" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={discountType} onValueChange={(v) => setDiscountType(v as 'percentage' | 'flat')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage"><Percent className="w-4 h-4 inline mr-2" />Percentage</SelectItem>
                  <SelectItem value="flat"><DollarSign className="w-4 h-4 inline mr-2" />Flat Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Input type="number" placeholder={discountType === 'percentage' ? '10' : '5.00'} value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Expiry (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start"><Calendar className="mr-2 h-4 w-4" />{expiryDate ? format(expiryDate, 'PPP') : 'No expiry'}</Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><CalendarComponent mode="single" selected={expiryDate} onSelect={setExpiryDate} initialFocus /></PopoverContent>
              </Popover>
            </div>
          </div>
          <Button className="w-full" onClick={handleCreate} disabled={createPromotion.isPending}><Tag className="w-4 h-4 mr-2" />{createPromotion.isPending ? 'Creating...' : 'Create Coupon'}</Button>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle>Active Coupons</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-center text-muted-foreground py-4">Loading...</p> : promotions && promotions.length > 0 ? (
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Discount</TableHead><TableHead>Expiry</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {promotions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono font-bold">{p.code}</TableCell>
                    <TableCell>{p.discount_type === 'percentage' ? `${p.discount_value}%` : `€${p.discount_value.toFixed(2)}`}</TableCell>
                    <TableCell>{p.expiry_date ? format(new Date(p.expiry_date), 'MMM d, yyyy') : 'Never'}</TableCell>
                    <TableCell><Switch checked={p.is_active} onCheckedChange={(c) => updatePromotion.mutate({ id: p.id, is_active: c })} /></TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => deletePromotion.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : <p className="text-center text-muted-foreground py-4">No coupons yet</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function BannerTab() {
  const { data: settings } = useAppSettings();
  const updateSettings = useUpdateAppSettings();
  const [bannerText, setBannerText] = useState(settings?.marketing_banner_text || '');
  const [bannerEnabled, setBannerEnabled] = useState(settings?.marketing_banner_enabled || false);

  const handleSave = () => {
    updateSettings.mutate({ marketing_banner_text: bannerText, marketing_banner_enabled: bannerEnabled });
    toast.success('Banner settings saved');
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader><CardTitle className="flex items-center gap-2"><Image className="w-5 h-5" />Marketing Banner</CardTitle><CardDescription>Display a promo banner on the customer menu</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
          <div><Label>Enable Banner</Label><p className="text-sm text-muted-foreground">Show on customer menu</p></div>
          <Switch checked={bannerEnabled} onCheckedChange={setBannerEnabled} />
        </div>
        <div className="space-y-2"><Label>Banner Text</Label><Textarea placeholder="e.g., 10% off today with code BASH 🔥" value={bannerText} onChange={(e) => setBannerText(e.target.value)} rows={2} /></div>
        {bannerEnabled && bannerText && <div className="bg-primary text-primary-foreground py-2 px-4 rounded-lg text-center text-sm font-medium">{bannerText}</div>}
        <Button className="w-full" onClick={handleSave} disabled={updateSettings.isPending}>{updateSettings.isPending ? 'Saving...' : 'Save Banner Settings'}</Button>
      </CardContent>
    </Card>
  );
}
