import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, ExternalLink, Users } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function BillModal({ bill, onClose }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isTracked, setIsTracked] = useState(false);

  const { data: votes = [] } = useQuery({
    queryKey: ['votes', bill.id],
    queryFn: async () => {
      // Mock votes for now as we don't have a votes table populated
      return [];
    },
    initialData: [],
  });

  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;
      setUser(currentUser);

      if (currentUser) {
        const { data } = await supabase
          .from('tracked_bills')
          .select('*')
          .eq('user_email', currentUser.email)
          .eq('bill_id', bill.id);

        setIsTracked(data && data.length > 0);
      }
    };
    loadUser();
  }, [bill.id]);

  const toggleTrackMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;

      if (isTracked) {
        const { error } = await supabase
          .from('tracked_bills')
          .delete()
          .eq('user_email', user.email)
          .eq('bill_id', bill.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tracked_bills')
          .insert({
            user_email: user.email,
            bill_id: bill.id
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setIsTracked(!isTracked);
      queryClient.invalidateQueries({ queryKey: ['tracked-bills'] });
      toast.success(isTracked ? 'Bill untracked' : 'Bill tracked');
    },
    onError: (error) => {
      toast.error("Error updating tracked status");
      console.error(error);
    }
  });

  const partyColors = {
    Liberal: 'text-red-600',
    Conservative: 'text-blue-600',
    NDP: 'text-orange-600',
    'Bloc Québécois': 'text-blue-400',
    Green: 'text-green-600'
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Badge variant="outline" className="border-black text-black font-bold text-base">
                  {bill.bill_number}
                </Badge>
                {bill.status && (
                  <span className="text-sm text-gray-600">{bill.status}</span>
                )}
              </div>
              <DialogTitle className="text-3xl font-bold text-black mb-3 pr-8">
                {bill.title}
              </DialogTitle>
              {bill.introduced_date && (
                <div className="text-sm text-gray-600">
                  Introduced: {format(new Date(bill.introduced_date), 'MMM d, yyyy')}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="flex items-center gap-3">
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleTrackMutation.mutate()}
                className={isTracked ? 'border-black bg-black text-white' : 'border-black'}
              >
                <Bookmark className="w-4 h-4 mr-2" />
                {isTracked ? 'Tracking' : 'Track Bill'}
              </Button>
            )}
            {bill.openparliament_url && (
              <a
                href={bill.openparliament_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="border-black">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  OpenParliament
                </Button>
              </a>
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold text-black mb-3">What This Bill Does</h3>
            <p className="text-gray-700 leading-relaxed">
              {bill.summary}
            </p>
          </div>

          {bill.why_it_matters && (
            <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
              <h3 className="text-lg font-bold text-black mb-2">Why It Matters</h3>
              <p className="text-gray-700 leading-relaxed">
                {bill.why_it_matters}
              </p>
            </div>
          )}

          {bill.historical_context && (
            <div>
              <h3 className="text-lg font-bold text-black mb-3">Context</h3>
              <p className="text-gray-700 leading-relaxed">
                {bill.historical_context}
              </p>
            </div>
          )}

          {bill.party_positions && Object.keys(bill.party_positions).length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-black mb-3">Party Positions</h3>
              <div className="space-y-3">
                {Object.entries(bill.party_positions).map(([party, position]) => (
                  <div key={party} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className={`font-bold mb-1 ${partyColors[party] || 'text-black'}`}>
                      {party}
                    </div>
                    <p className="text-sm text-gray-700">{position}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {votes.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-black mb-3 flex items-center gap-2">
                <Users className="w-5 h-5" />
                MP Votes ({votes.length})
              </h3>
              <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-bold">MP Name</TableHead>
                      <TableHead className="font-bold">Party</TableHead>
                      <TableHead className="font-bold">Vote</TableHead>
                      <TableHead className="font-bold">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {votes.slice(0, 20).map((vote) => (
                      <TableRow key={vote.id}>
                        <TableCell className="font-medium">{vote.mp_name}</TableCell>
                        <TableCell className={partyColors[vote.party] || ''}>
                          {vote.party}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={vote.vote_value === 'Yea' ? 'border-green-600 text-green-600' : 'border-red-600 text-red-600'}
                          >
                            {vote.vote_value}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {vote.vote_date && format(new Date(vote.vote_date), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {votes.length > 20 && (
                <p className="text-sm text-gray-600 mt-2 text-center">
                  Showing 20 of {votes.length} votes
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}