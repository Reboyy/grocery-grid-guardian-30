
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

interface Shift {
  id: string;
  start_time: string;
  end_time: string | null;
  starting_cash: number;
  ending_cash: number | null;
  total_sales: number | null;
  status: string;
  notes: string | null;
}

export default function Shifts() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
    };

    const fetchShifts = async () => {
      const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .order("start_time", { ascending: false });
      
      if (error) {
        toast({
          title: "Error fetching shifts",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setShifts(data);
      const active = data.find(shift => shift.status === "open");
      if (active) setActiveShift(active);
      setLoading(false);
    };

    checkAuth();
    fetchShifts();
  }, [navigate, toast]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Shift Management</h1>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>

      {activeShift ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Active Shift</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Started</p>
                <p className="font-medium">{format(new Date(activeShift.start_time), "PPp")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Starting Cash</p>
                <p className="font-medium">${activeShift.starting_cash.toFixed(2)}</p>
              </div>
              <div>
                <Button className="w-full">End Shift</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Start New Shift</CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full md:w-auto">Start Shift</Button>
          </CardContent>
        </Card>
      )}

      <h2 className="text-xl font-semibold mb-4">Previous Shifts</h2>
      <div className="grid gap-4">
        {shifts
          .filter(shift => shift.status !== "open")
          .map((shift) => (
            <Card key={shift.id}>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Shift Period</p>
                    <p className="font-medium">
                      {format(new Date(shift.start_time), "PPp")} - 
                      {shift.end_time ? format(new Date(shift.end_time), "PPp") : "Ongoing"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cash Handling</p>
                    <p className="font-medium">
                      Start: ${shift.starting_cash.toFixed(2)}
                      {shift.ending_cash && ` / End: $${shift.ending_cash.toFixed(2)}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Sales</p>
                    <p className="font-medium">
                      {shift.total_sales ? `$${shift.total_sales.toFixed(2)}` : "N/A"}
                    </p>
                  </div>
                  <div>
                    <Button variant="outline" className="w-full">View Details</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
