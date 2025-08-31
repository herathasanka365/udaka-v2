import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassModal } from "@/components/ui/glass-modal";
import { Button } from "@/components/ui/button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  ArrowLeft, 
  User, 
  MapPin, 
  Calendar, 
  Check, 
  X, 
  Trash2,
  Eye,
  FileText,
  ExternalLink
} from "lucide-react";

interface Application {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message: string;
  applied_at: string;
  event: {
    id: string;
    title: string;
    client_id: string;
  };
  creator: {
    id: string;
    name: string;
    category: string;
    bio: string;
  };
}

export default function ManageRequests() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedCreator, setSelectedCreator] = useState<Application['creator'] | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("pending");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/clients/login");
        return;
      }
      setUser(session.user);
    };
    
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchApplications = async () => {
      try {
        const { data, error } = await supabase
          .from('applications')
          .select(`
            id,
            status,
            message,
            applied_at,
            event:events!inner(
              id,
              title,
              client_id
            ),
            creator:creator_profiles!creator_id(
              id,
              name,
              category,
              bio
            )
          `)
          .eq('event.client_id', user.id)
          .order('applied_at', { ascending: false });

        if (error) throw error;
        setApplications(data || []);
      } catch (error) {
        console.error('Error fetching applications:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load applications. Please refresh the page.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();

    // Set up real-time updates for applications
    const channel = supabase
      .channel('applications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications'
        },
        () => {
          fetchApplications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const handleStatusUpdate = async (applicationId: string, newStatus: 'accepted' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', applicationId);

      if (error) throw error;

      // Update local state
      setApplications(applications.map(app => 
        app.id === applicationId 
          ? { ...app, status: newStatus }
          : app
      ));

      toast({
        title: `Application ${newStatus}`,
        description: `Application has been ${newStatus} successfully.`,
      });
    } catch (error) {
      console.error('Error updating application:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update application. Please try again.",
      });
    }
  };

  const handleBulkReject = async () => {
    if (selectedApplications.length === 0) return;

    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: 'rejected' })
        .in('id', selectedApplications);

      if (error) throw error;

      // Update local state
      setApplications(applications.map(app => 
        selectedApplications.includes(app.id)
          ? { ...app, status: 'rejected' as const }
          : app
      ));

      setSelectedApplications([]);

      toast({
        title: "Applications Rejected",
        description: `${selectedApplications.length} application(s) have been rejected.`,
      });
    } catch (error) {
      console.error('Error bulk rejecting applications:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reject applications. Please try again.",
      });
    }
  };

  const handleSelectApplication = (applicationId: string, checked: boolean) => {
    if (checked) {
      setSelectedApplications([...selectedApplications, applicationId]);
    } else {
      setSelectedApplications(selectedApplications.filter(id => id !== applicationId));
    }
  };

  const handleSelectAll = (applications: Application[], checked: boolean) => {
    if (checked) {
      const newSelected = applications.map(app => app.id);
      setSelectedApplications([...selectedApplications, ...newSelected]);
    } else {
      const appIds = applications.map(app => app.id);
      setSelectedApplications(selectedApplications.filter(id => !appIds.includes(id)));
    }
  };

  const viewProfile = (creator: Application['creator']) => {
    setSelectedCreator(creator);
    setIsProfileModalOpen(true);
  };

  const getApplicationsByStatus = (status: string) => {
    return applications.filter(app => app.status === status);
  };

  const getStatusCounts = () => {
    return {
      pending: applications.filter(app => app.status === 'pending').length,
      accepted: applications.filter(app => app.status === 'accepted').length,
      rejected: applications.filter(app => app.status === 'rejected').length,
    };
  };

  const renderApplicationCard = (application: Application) => {
    const isSelected = selectedApplications.includes(application.id);

    return (
      <GlassCard key={application.id} className="p-6">
        <div className="flex items-start gap-4">
          {/* Checkbox for bulk actions (only on pending tab) */}
          {application.status === 'pending' && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => 
                handleSelectApplication(application.id, checked as boolean)
              }
              className="mt-1"
            />
          )}

          {/* Avatar/Thumbnail */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-glass bg-muted flex items-center justify-center">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-foreground text-lg">
                  {application.creator.name}
                </h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{application.creator.category}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(application.applied_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <Badge variant="secondary" className="flex-shrink-0">
                {application.event.title}
              </Badge>
            </div>

            {/* Creator Category */}
            <div className="mb-3">
              <Badge variant="outline" className="text-xs">
                {application.creator.category}
              </Badge>
            </div>

            {/* Description */}
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
              {application.creator.bio || "No bio provided."}
            </p>

            {/* Application Message */}
            {application.message && (
              <div className="bg-background/50 rounded-glass p-3 mb-4">
                <p className="text-sm text-foreground">
                  <span className="font-medium">Message: </span>
                  {application.message}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => viewProfile(application.creator)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Profile
              </Button>

              {application.status === 'pending' && (
                <>
                  <SecondaryButton
                    size="sm"
                    onClick={() => handleStatusUpdate(application.id, 'accepted')}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Accept
                  </SecondaryButton>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusUpdate(application.id, 'rejected')}
                    className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </GlassCard>
    );
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading applications...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/client/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Manage Applications</h1>
              <p className="text-muted-foreground">Review and manage creator applications for your events</p>
            </div>
          </div>
        </div>

        {/* Applications Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-6">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="pending" className="relative">
                Pending
                {statusCounts.pending > 0 && (
                  <Badge className="ml-2 h-5 w-5 p-0 text-xs">
                    {statusCounts.pending}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="accepted" className="relative">
                Accepted
                {statusCounts.accepted > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                    {statusCounts.accepted}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="rejected" className="relative">
                Rejected
                {statusCounts.rejected > 0 && (
                  <Badge variant="outline" className="ml-2 h-5 w-5 p-0 text-xs">
                    {statusCounts.rejected}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Bulk Actions for Pending */}
            {activeTab === "pending" && getApplicationsByStatus("pending").length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={
                    getApplicationsByStatus("pending").length > 0 &&
                    getApplicationsByStatus("pending").every(app => 
                      selectedApplications.includes(app.id)
                    )
                  }
                  onCheckedChange={(checked) => 
                    handleSelectAll(getApplicationsByStatus("pending"), checked as boolean)
                  }
                />
                <span className="text-sm text-muted-foreground mr-2">
                  Select All ({selectedApplications.length} selected)
                </span>
                
                {selectedApplications.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Bulk Reject ({selectedApplications.length})
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reject Applications</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to reject {selectedApplications.length} application(s)? 
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleBulkReject}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Reject All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}
          </div>

          {/* Tab Contents */}
          <TabsContent value="pending">
            <div className="space-y-4">
              {getApplicationsByStatus("pending").length === 0 ? (
                <GlassCard className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Pending Applications</h3>
                  <p className="text-muted-foreground">
                    You don't have any pending applications at the moment.
                  </p>
                </GlassCard>
              ) : (
                getApplicationsByStatus("pending").map(renderApplicationCard)
              )}
            </div>
          </TabsContent>

          <TabsContent value="accepted">
            <div className="space-y-4">
              {getApplicationsByStatus("accepted").length === 0 ? (
                <GlassCard className="text-center py-12">
                  <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Accepted Applications</h3>
                  <p className="text-muted-foreground">
                    You haven't accepted any applications yet.
                  </p>
                </GlassCard>
              ) : (
                getApplicationsByStatus("accepted").map(renderApplicationCard)
              )}
            </div>
          </TabsContent>

          <TabsContent value="rejected">
            <div className="space-y-4">
              {getApplicationsByStatus("rejected").length === 0 ? (
                <GlassCard className="text-center py-12">
                  <X className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Rejected Applications</h3>
                  <p className="text-muted-foreground">
                    You haven't rejected any applications yet.
                  </p>
                </GlassCard>
              ) : (
                getApplicationsByStatus("rejected").map(renderApplicationCard)
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Creator Profile Modal */}
        <GlassModal 
          isOpen={isProfileModalOpen} 
          onClose={() => setIsProfileModalOpen(false)}
          title="Creator Profile"
          size="lg"
        >
          {selectedCreator && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 rounded-glass bg-muted flex items-center justify-center">
                  <User className="h-12 w-12 text-muted-foreground" />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {selectedCreator.name}
                  </h3>
                  <div className="flex items-center gap-1 text-muted-foreground mb-3">
                    <User className="h-4 w-4" />
                    <span>{selectedCreator.category}</span>
                  </div>
                  
                  <Badge variant="secondary">
                    {selectedCreator.category}
                  </Badge>
                </div>
              </div>

              {selectedCreator.bio && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">About</h4>
                  <p className="text-muted-foreground">{selectedCreator.bio}</p>
                </div>
              )}
            </div>
          )}
        </GlassModal>
      </div>
    </div>
  );
}