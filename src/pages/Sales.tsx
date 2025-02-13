
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

interface Sale {
  id: string;
  created_at: string;
  total_amount: number;
  payment_method: string;
  status: string;
}

export default function Sales() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
    };

    const fetchSales = async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) {
        toast({
          title: "Error fetching sales",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setSales(data);
      setLoading(false);
    };

    checkAuth();
    fetchSales();
  }, [navigate, toast]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sales History</h1>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Receipt ID</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell>{format(new Date(sale.created_at), "PPp")}</TableCell>
                <TableCell className="font-medium">{sale.id.slice(0, 8)}</TableCell>
                <TableCell className="capitalize">{sale.payment_method}</TableCell>
                <TableCell className="capitalize">{sale.status}</TableCell>
                <TableCell className="text-right">Rp{sale.total_amount.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
