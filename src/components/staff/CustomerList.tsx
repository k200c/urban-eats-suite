import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Users, TrendingUp, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';

interface Customer {
  phone_number: string;
  name: string | null;
  total_spend: number;
  last_order_date: string | null;
  visit_count: number;
}

export function CustomerList() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('total_spend', { ascending: false });

      if (error) throw error;
      return data as Customer[];
    },
  });

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    if (!searchQuery.trim()) return customers;

    const query = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(query) ||
        c.phone_number.includes(query)
    );
  }, [customers, searchQuery]);

  const totalRevenue = customers?.reduce((sum, c) => sum + Number(c.total_spend), 0) || 0;
  const totalCustomers = customers?.length || 0;
  const vipCount = customers?.filter((c) => Number(c.total_spend) >= 50).length || 0;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5 text-primary" />
          Customer CRM
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-secondary/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Customers</p>
            <p className="text-xl font-bold">{totalCustomers}</p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-xl font-bold text-green-400">€{totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">VIPs (€50+)</p>
            <p className="text-xl font-bold text-primary">{vipCount}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-secondary/30 rounded animate-pulse" />
            ))}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? 'No customers found' : 'No customers yet'}
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto rounded-lg border border-border">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">
                    <span className="flex items-center justify-end gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Total Spend
                    </span>
                  </TableHead>
                  <TableHead className="text-center">Visits</TableHead>
                  <TableHead className="text-right">Last Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer, index) => {
                  const isVIP = Number(customer.total_spend) >= 50;
                  return (
                    <TableRow
                      key={customer.phone_number}
                      className={isVIP ? 'bg-primary/5' : ''}
                    >
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isVIP && <Crown className="w-4 h-4 text-primary" />}
                          <div>
                            <p className="font-medium">{customer.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">
                              {customer.phone_number}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-bold ${isVIP ? 'text-primary' : 'text-green-400'}`}>
                          €{Number(customer.total_spend).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="bg-secondary/50 px-2 py-1 rounded text-sm">
                          {customer.visit_count}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {customer.last_order_date
                          ? formatDistanceToNow(new Date(customer.last_order_date), {
                              addSuffix: true,
                            })
                          : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
