import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Crown, Clock, Sparkles, User, Phone, TrendingUp, Heart, X, Edit2, Save } from 'lucide-react';
import { useCRMCustomers, useCustomerFavoriteItem, useUpdateDietaryNotes, CustomerWithStats } from '@/hooks/useCRMData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { format, formatDistanceToNow } from 'date-fns';

type FilterType = 'all' | 'vip' | 'lapsed' | 'new';

const tierColors = {
  Bronze: 'bg-amber-700/20 text-amber-500 border-amber-700/30',
  Silver: 'bg-slate-400/20 text-slate-300 border-slate-400/30',
  Gold: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Platinum: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
};

function GuestCard({ customer, onClose }: { customer: CustomerWithStats; onClose: () => void }) {
  const { data: favoriteItem } = useCustomerFavoriteItem(customer.phone_number);
  const updateNotes = useUpdateDietaryNotes();
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(customer.dietary_notes || '');

  const handleSaveNotes = async () => {
    await updateNotes.mutateAsync({ phone: customer.phone_number, notes });
    setIsEditingNotes(false);
  };

  const nextTier = customer.loyalty_tier === 'Platinum' ? null : 
    customer.loyalty_tier === 'Gold' ? 'Platinum' :
    customer.loyalty_tier === 'Silver' ? 'Gold' : 'Silver';

  const spendToNextTier = customer.loyalty_tier === 'Bronze' ? 50 - customer.total_spend :
    customer.loyalty_tier === 'Silver' ? 150 - customer.total_spend :
    customer.loyalty_tier === 'Gold' ? 300 - customer.total_spend : 0;

  return (
    <Sheet open onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span>{customer.name || 'Guest'}</span>
                {customer.is_vip && <Crown className="w-4 h-4 text-yellow-400" />}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground font-normal">
                <Phone className="w-3 h-3" />
                {customer.phone_number}
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Loyalty Tier */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Loyalty Status</h4>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${tierColors[customer.loyalty_tier]}`}>
              <Sparkles className="w-4 h-4" />
              <span className="font-bold">{customer.loyalty_tier}</span>
            </div>
            {nextTier && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress to {nextTier}</span>
                  <span className="font-medium">{customer.tier_progress.toFixed(0)}%</span>
                </div>
                <Progress value={customer.tier_progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  €{spendToNextTier.toFixed(2)} more to unlock {nextTier}
                </p>
              </div>
            )}
          </div>

          {/* Dining History */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Dining History</h4>
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-secondary/30 border-border">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-primary">€{customer.total_spend.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">Lifetime Spend</p>
                </CardContent>
              </Card>
              <Card className="bg-secondary/30 border-border">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{customer.visit_count}</p>
                  <p className="text-xs text-muted-foreground">Total Visits</p>
                </CardContent>
              </Card>
              <Card className="bg-secondary/30 border-border">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    €{customer.visit_count > 0 ? (customer.total_spend / customer.visit_count).toFixed(0) : '0'}
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Order</p>
                </CardContent>
              </Card>
            </div>
            {customer.last_order_date && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Last order {formatDistanceToNow(new Date(customer.last_order_date), { addSuffix: true })}
              </p>
            )}
          </div>

          {/* Preferences */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Preferences</h4>
            
            {/* Favorite Item */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
              <Heart className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-xs text-muted-foreground">Favorite Item</p>
                <p className="font-medium">{favoriteItem || 'Not enough data'}</p>
              </div>
            </div>

            {/* Dietary Notes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Dietary Notes</span>
                {!isEditingNotes ? (
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(true)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={handleSaveNotes} disabled={updateNotes.isPending}>
                    <Save className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {isEditingNotes ? (
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add dietary preferences, allergies, etc..."
                  className="min-h-[80px] bg-background/50"
                />
              ) : (
                <p className="text-sm p-3 rounded-lg bg-secondary/30 border border-border">
                  {customer.dietary_notes || 'No notes added'}
                </p>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function CRMDashboard() {
  const { data: customers, isLoading } = useCRMCustomers();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStats | null>(null);

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];

    return customers.filter(customer => {
      // Search filter
      const matchesSearch = !searchQuery || 
        customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone_number.includes(searchQuery);

      // Segment filter
      const matchesFilter = filter === 'all' ||
        (filter === 'vip' && customer.is_vip) ||
        (filter === 'lapsed' && customer.is_lapsed) ||
        (filter === 'new' && customer.is_new);

      return matchesSearch && matchesFilter;
    });
  }, [customers, searchQuery, filter]);

  const stats = useMemo(() => {
    if (!customers) return { total: 0, vips: 0, lapsed: 0, newThisWeek: 0, totalRevenue: 0 };
    return {
      total: customers.length,
      vips: customers.filter(c => c.is_vip).length,
      lapsed: customers.filter(c => c.is_lapsed).length,
      newThisWeek: customers.filter(c => c.is_new).length,
      totalRevenue: customers.reduce((sum, c) => sum + c.total_spend, 0),
    };
  }, [customers]);

  const filters: { label: string; value: FilterType; count: number; color: string }[] = [
    { label: 'All Guests', value: 'all', count: stats.total, color: 'bg-secondary' },
    { label: 'VIPs', value: 'vip', count: stats.vips, color: 'bg-yellow-500/20' },
    { label: 'Lapsed (30d)', value: 'lapsed', count: stats.lapsed, color: 'bg-red-500/20' },
    { label: 'New This Week', value: 'new', count: stats.newThisWeek, color: 'bg-green-500/20' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Guests</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <User className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">VIP Guests</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.vips}</p>
              </div>
              <Crown className="w-8 h-8 text-yellow-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lifetime Revenue</p>
                <p className="text-2xl font-bold text-primary">€{stats.totalRevenue.toFixed(0)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">At Risk</p>
                <p className="text-2xl font-bold text-red-400">{stats.lapsed}</p>
              </div>
              <Clock className="w-8 h-8 text-red-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {filters.map((f) => (
                <Button
                  key={f.value}
                  variant={filter === f.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f.value)}
                  className="whitespace-nowrap"
                >
                  {f.label}
                  <Badge variant="secondary" className="ml-2 bg-background/20">
                    {f.count}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Guest Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-secondary/30 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No guests found matching your criteria
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
              <AnimatePresence>
                {filteredCustomers.map((customer, index) => (
                  <motion.div
                    key={customer.phone_number}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => setSelectedCustomer(customer)}
                    className={`flex items-center gap-4 p-4 rounded-lg border border-border cursor-pointer transition-all hover:border-primary/50 ${
                      customer.is_vip ? 'bg-yellow-500/5' : 'bg-secondary/20'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      {customer.is_vip ? (
                        <Crown className="w-5 h-5 text-yellow-400" />
                      ) : (
                        <User className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{customer.name || 'Guest'}</span>
                        <Badge variant="outline" className={`text-xs ${tierColors[customer.loyalty_tier]}`}>
                          {customer.loyalty_tier}
                        </Badge>
                        {customer.is_lapsed && (
                          <Badge variant="destructive" className="text-xs">Lapsed</Badge>
                        )}
                        {customer.is_new && (
                          <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">New</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{customer.phone_number}</p>
                    </div>

                    <div className="text-right hidden sm:block">
                      <p className="font-bold text-primary">€{customer.total_spend.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">{customer.visit_count} visits</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guest Card Sheet */}
      {selectedCustomer && (
        <GuestCard customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />
      )}
    </div>
  );
}
