import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import BillCard from "../components/bills/BillCard";
import BillModal from "../components/bills/BillModel";
import { billService } from "@/services/billService";

export default function Bills() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBill, setSelectedBill] = useState(null);

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['bills'],
    queryFn: billService.getBills,
    initialData: [],
  });

  const fetchBillsMutation = useMutation({
    mutationFn: billService.fetchAndAnalyzeBills,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast.success('Bills fetched and analyzed');
    },
    onError: (error) => {
      toast.error('Error fetching bills: ' + error.message);
    }
  });

  const filteredBills = bills.filter(bill =>
    bill.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.bill_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.summary?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-black mb-2">
              Federal Bills
            </h1>
            <p className="text-gray-600">
              Plain-language summaries of Canadian federal legislation
            </p>
          </div>
          <Button
            onClick={() => fetchBillsMutation.mutate()}
            disabled={fetchBillsMutation.isPending}
            className="bg-black hover:bg-gray-800"
          >
            {fetchBillsMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Bills
              </>
            )}
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search bills by number, title, or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-black"
            />
          </div>
        </div>

        <div className="grid gap-6">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading bills...</p>
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'No bills match your search' : 'No bills yet'}
              </p>
              {!searchTerm && (
                <Button onClick={() => fetchBillsMutation.mutate()} className="bg-black text-white">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Fetch Bills
                </Button>
              )}
            </div>
          ) : (
            filteredBills.map((bill) => (
              <BillCard
                key={bill.id}
                bill={bill}
                onClick={() => setSelectedBill(bill)}
              />
            ))
          )}
        </div>
      </div>

      {selectedBill && (
        <BillModal
          bill={selectedBill}
          onClose={() => setSelectedBill(null)}
        />
      )}
    </div>
  );
}