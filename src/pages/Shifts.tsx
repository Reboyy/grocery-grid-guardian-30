import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";

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
  const [startShiftOpen, setStartShiftOpen] = useState(false);
  const [endShiftOpen, setEndShiftOpen] = useState(false);
  const [viewShiftOpen, setViewShiftOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [startingCash, setStartingCash] = useState("");
  const [endingCash, setEndingCash] = useState("");
  const [shiftNotes, setShiftNotes] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null);

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

  const startShift = async () => {
    try {
      const cashAmount = parseFloat(startingCash);
      if (isNaN(cashAmount) || cashAmount < 0) {
        toast({
          title: "Invalid amount",
          description: "Please enter a valid starting cash amount",
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to start a shift",
          variant: "destructive",
        });
        return;
      }

      const { data: newShift, error } = await supabase
        .from("shifts")
        .insert({
          cashier_id: user.id,
          start_time: new Date().toISOString(),
          starting_cash: cashAmount,
          status: "open"
        })
        .select()
        .single();

      if (error) throw error;

      setActiveShift(newShift);
      setShifts(current => [newShift, ...current]);
      setStartShiftOpen(false);
      setStartingCash("");

      toast({
        title: "Shift started",
        description: "Your shift has been started successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error starting shift",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const endShift = async () => {
    try {
      if (!activeShift) return;

      const endingCashAmount = parseFloat(endingCash);
      if (isNaN(endingCashAmount) || endingCashAmount < 0) {
        toast({
          title: "Invalid amount",
          description: "Please enter a valid ending cash amount",
          variant: "destructive",
        });
        return;
      }

      // Calculate total sales by summing all sales during the shift
      const { data: shiftSales, error: salesError } = await supabase
        .from("sales")
        .select("total_amount")
        .gte("created_at", activeShift.start_time)
        .lte("created_at", new Date().toISOString());

      if (salesError) throw salesError;

      const totalSales = shiftSales.reduce((sum, sale) => sum + sale.total_amount, 0);

      const { data: updatedShift, error: updateError } = await supabase
        .from("shifts")
        .update({
          end_time: new Date().toISOString(),
          ending_cash: endingCashAmount,
          total_sales: totalSales,
          notes: shiftNotes || null,
          status: "closed"
        })
        .eq("id", activeShift.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setActiveShift(null);
      setShifts(current => 
        current.map(shift => 
          shift.id === activeShift.id ? updatedShift : shift
        )
      );
      setEndShiftOpen(false);
      setEndingCash("");
      setShiftNotes("");

      toast({
        title: "Shift ended",
        description: "Your shift has been ended successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error ending shift",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (shift: Shift) => {
    setSelectedShift(shift);
    setViewShiftOpen(true);
  };

  const handleDeleteShift = async (shift: Shift) => {
    setShiftToDelete(shift);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!shiftToDelete) return;

    try {
      const { error } = await supabase
        .from("shifts")
        .delete()
        .eq("id", shiftToDelete.id);

      if (error) throw error;

      setShifts(shifts.filter(s => s.id !== shiftToDelete.id));
      setDeleteDialogOpen(false);
      setShiftToDelete(null);

      toast({
        title: "Shift deleted",
        description: "The shift has been successfully deleted",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting shift",
        description: error.message,
        variant: "destructive",
      });
    }
  };

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
                <p className="font-medium">Rp{activeShift.starting_cash.toFixed(2)}</p>
              </div>
              <div>
                <Button 
                  className="w-full"
                  onClick={() => setEndShiftOpen(true)}
                >
                  End Shift
                </Button>
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
            <Button 
              className="w-full md:w-auto"
              onClick={() => setStartShiftOpen(true)}
            >
              Start Shift
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={startShiftOpen} onOpenChange={setStartShiftOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Shift</DialogTitle>
            <DialogDescription>
              Enter the starting cash amount for this shift.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="startingCash">Starting Cash Amount (Rp)</Label>
              <Input
                id="startingCash"
                type="number"
                step="0.01"
                min="0"
                value={startingCash}
                onChange={(e) => setStartingCash(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <Button className="w-full" onClick={startShift}>
              Start Shift
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={endShiftOpen} onOpenChange={setEndShiftOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Shift</DialogTitle>
            <DialogDescription>
              Enter the ending cash amount and any notes for this shift.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="endingCash">Ending Cash Amount (Rp)</Label>
              <Input
                id="endingCash"
                type="number"
                step="0.01"
                min="0"
                value={endingCash}
                onChange={(e) => setEndingCash(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Shift Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={shiftNotes}
                onChange={(e) => setShiftNotes(e.target.value)}
                placeholder="Enter any notes about this shift..."
              />
            </div>
            <Button className="w-full" onClick={endShift}>
              End Shift
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={viewShiftOpen} onOpenChange={setViewShiftOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Shift Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected shift
            </DialogDescription>
          </DialogHeader>
          {selectedShift && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <p className="text-sm mt-1">
                    {format(new Date(selectedShift.start_time), "PPp")}
                  </p>
                </div>
                <div>
                  <Label>End Time</Label>
                  <p className="text-sm mt-1">
                    {selectedShift.end_time
                      ? format(new Date(selectedShift.end_time), "PPp")
                      : "Ongoing"}
                  </p>
                </div>
                <div>
                  <Label>Starting Cash</Label>
                  <p className="text-sm mt-1">
                    Rp{selectedShift.starting_cash.toFixed(2)}
                  </p>
                </div>
                <div>
                  <Label>Ending Cash</Label>
                  <p className="text-sm mt-1">
                    {selectedShift.ending_cash
                      ? `Rp${selectedShift.ending_cash.toFixed(2)}`
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <Label>Total Sales</Label>
                  <p className="text-sm mt-1">
                    {selectedShift.total_sales
                      ? `Rp${selectedShift.total_sales.toFixed(2)}`
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <Label>Status</Label>
                  <p className="text-sm mt-1 capitalize">{selectedShift.status}</p>
                </div>
              </div>
              {selectedShift.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">
                    {selectedShift.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the shift record
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <h2 className="text-xl font-semibold mb-4">Previous Shifts</h2>
      <div className="grid gap-4">
        {shifts
          .filter(shift => shift.status !== "open")
          .map((shift) => (
            <Card key={shift.id}>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                      Start: Rp{shift.starting_cash.toFixed(2)}
                      {shift.ending_cash && ` / End: Rp${shift.ending_cash.toFixed(2)}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Sales</p>
                    <p className="font-medium">
                      {shift.total_sales ? `Rp${shift.total_sales.toFixed(2)}` : "N/A"}
                    </p>
                  </div>
                  <div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleViewDetails(shift)}
                    >
                      View Details
                    </Button>
                  </div>
                  <div>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => handleDeleteShift(shift)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
