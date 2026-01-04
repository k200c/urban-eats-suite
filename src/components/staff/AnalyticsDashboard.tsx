import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Users, ShoppingBag, BarChart3, Flame } from 'lucide-react';
import { useOrdersHeatmap, useItemLeaderboard, useRevenueKPIs } from '@/hooks/useAnalyticsData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Heatmap color scale
function getHeatColor(value: number, max: number): string {
  if (max === 0) return 'hsl(var(--secondary))';
  const intensity = value / max;
  if (intensity === 0) return 'hsl(var(--secondary))';
  if (intensity < 0.25) return 'hsl(25 70% 20%)';
  if (intensity < 0.5) return 'hsl(25 80% 35%)';
  if (intensity < 0.75) return 'hsl(25 90% 45%)';
  return 'hsl(25 100% 50%)';
}

function HeatmapChart() {
  const { data: heatmapData, isLoading } = useOrdersHeatmap();

  if (isLoading) {
    return <div className="h-[200px] bg-secondary/30 rounded-lg animate-pulse" />;
  }

  const maxCount = Math.max(...(heatmapData?.map(d => d.count) || [0]), 1);

  // Group by day for display
  const gridData = DAYS.map((dayName, dayIndex) => {
    const dayData = heatmapData?.filter(d => d.day === dayIndex) || [];
    return {
      day: dayName,
      hours: HOURS.map(hour => {
        const cell = dayData.find(d => d.hour === hour);
        return cell?.count || 0;
      }),
    };
  });

  // Find peak hours (focus on business hours 10-22)
  const businessHours = heatmapData?.filter(d => d.hour >= 10 && d.hour <= 22) || [];
  const peakHour = businessHours.reduce((max, curr) => curr.count > max.count ? curr : max, { hour: 12, day: 0, count: 0 });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">Peak Time:</span>
        <span className="font-bold text-primary">
          {DAYS[peakHour.day]} @ {peakHour.hour}:00
        </span>
        <span className="text-muted-foreground">({peakHour.count} orders)</span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hour labels */}
          <div className="flex mb-1">
            <div className="w-12" />
            {[10, 12, 14, 16, 18, 20, 22].map(hour => (
              <div key={hour} className="flex-1 text-center text-xs text-muted-foreground">
                {hour}:00
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="space-y-1">
            {gridData.map((row) => (
              <div key={row.day} className="flex items-center gap-1">
                <div className="w-12 text-xs text-muted-foreground font-medium">{row.day}</div>
                <div className="flex-1 flex gap-0.5">
                  {row.hours.slice(10, 23).map((count, hourIdx) => (
                    <div
                      key={hourIdx}
                      className="flex-1 h-6 rounded-sm transition-colors cursor-pointer hover:ring-1 hover:ring-primary"
                      style={{ backgroundColor: getHeatColor(count, maxCount) }}
                      title={`${row.day} ${10 + hourIdx}:00 - ${count} orders`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-3">
            <span className="text-xs text-muted-foreground">Less</span>
            <div className="flex gap-0.5">
              {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: getHeatColor(intensity * maxCount, maxCount) }}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">More</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemLeaderboardChart() {
  const [mealPeriod, setMealPeriod] = useState<'all' | 'lunch' | 'dinner'>('all');
  const { data: leaderboard, isLoading } = useItemLeaderboard(mealPeriod);

  if (isLoading) {
    return <div className="h-[300px] bg-secondary/30 rounded-lg animate-pulse" />;
  }

  const chartConfig = {
    count: {
      label: 'Orders',
      color: 'hsl(var(--primary))',
    },
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['all', 'lunch', 'dinner'] as const).map((period) => (
          <Button
            key={period}
            variant={mealPeriod === period ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMealPeriod(period)}
          >
            {period === 'all' ? 'All Day' : period.charAt(0).toUpperCase() + period.slice(1)}
          </Button>
        ))}
      </div>

      {leaderboard?.length === 0 ? (
        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
          No order data available
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={leaderboard} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={120}
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload?.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg bg-popover p-3 shadow-lg border border-border">
                        <p className="font-semibold">{data.name}</p>
                        <p className="text-sm text-primary">{data.count} orders</p>
                        <p className="text-sm text-muted-foreground">€{data.revenue.toFixed(0)} revenue</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {leaderboard?.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={index === 0 ? 'hsl(var(--primary))' : `hsl(var(--primary) / ${1 - index * 0.08})`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      )}
    </div>
  );
}

export function AnalyticsDashboard() {
  const { data: kpis, isLoading: kpisLoading } = useRevenueKPIs();

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Week Revenue</p>
                <p className="text-2xl font-bold text-primary">
                  {kpisLoading ? '...' : `€${kpis?.totalRevenue.toFixed(0)}`}
                </p>
                {!kpisLoading && kpis && (
                  <div className={`flex items-center gap-1 text-xs ${
                    kpis.weekOverWeekChange >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {kpis.weekOverWeekChange >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {kpis.weekOverWeekChange >= 0 ? '+' : ''}{kpis.weekOverWeekChange.toFixed(1)}% vs last week
                  </div>
                )}
              </div>
              <DollarSign className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold">
                  {kpisLoading ? '...' : `€${kpis?.averageOrderValue.toFixed(2)}`}
                </p>
                <p className="text-xs text-muted-foreground">per transaction</p>
              </div>
              <ShoppingBag className="w-8 h-8 text-blue-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">
                  {kpisLoading ? '...' : kpis?.totalCustomers}
                </p>
                <p className="text-xs text-muted-foreground">all time</p>
              </div>
              <Users className="w-8 h-8 text-violet-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Returning Rate</p>
                <p className="text-2xl font-bold text-green-400">
                  {kpisLoading ? '...' : `${kpis?.returningCustomerRate.toFixed(0)}%`}
                </p>
                <p className="text-xs text-muted-foreground">repeat customers</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heatmap */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Flame className="w-5 h-5 text-primary" />
              Peak Performance Heatmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HeatmapChart />
          </CardContent>
        </Card>

        {/* Item Leaderboard */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5 text-primary" />
              Item Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ItemLeaderboardChart />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
