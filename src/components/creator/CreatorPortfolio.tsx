import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  Plus, 
  Image as ImageIcon, 
  Video, 
  FileText, 
  Trash2, 
  Upload,
  ExternalLink,
  Briefcase
} from "lucide-react";

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  media_url: string;
  media_type: 'image' | 'video' | 'document';
  tags: string[];
  created_at: string;
}

const portfolioSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  tags: z.string().optional(),
});

export default function CreatorPortfolio() {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof portfolioSchema>>({
    resolver: zodResolver(portfolioSchema),
    defaultValues: {
      title: "",
      description: "",
      tags: "",
    },
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchPortfolioItems();
    }
  }, [user]);

  const fetchPortfolioItems = async () => {
    try {
      // For this demo, we'll simulate portfolio items since we don't have a portfolio_items table
      // In a real implementation, you'd fetch from a portfolio_items table
      const mockItems: PortfolioItem[] = [];
      setPortfolioItems(mockItems);
    } catch (error) {
      console.error('Error fetching portfolio items:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load portfolio items.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime', 'application/pdf'];
      const maxSize = 50 * 1024 * 1024; // 50MB

      if (!validTypes.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload an image, video, or PDF file.",
        });
        return;
      }

      if (file.size > maxSize) {
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "File size must be less than 50MB.",
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('portfolios')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('portfolios')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const getMediaType = (file: File): 'image' | 'video' | 'document' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'document';
  };

  const onSubmit = async (values: z.infer<typeof portfolioSchema>) => {
    if (!user || !selectedFile) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a file to upload.",
      });
      return;
    }

    try {
      setUploading(true);

      // Upload file to storage
      const mediaUrl = await uploadFile(selectedFile);
      const mediaType = getMediaType(selectedFile);
      const tags = values.tags ? values.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];

      // Create new portfolio item
      const newItem: PortfolioItem = {
        id: Date.now().toString(), // In real app, this would be generated by database
        title: values.title,
        description: values.description,
        media_url: mediaUrl,
        media_type: mediaType,
        tags,
        created_at: new Date().toISOString(),
      };

      // Update local state (in real app, this would be saved to database)
      setPortfolioItems(prev => [newItem, ...prev]);

      toast({
        title: "Portfolio Item Added!",
        description: "Your portfolio item has been uploaded successfully.",
      });

      // Reset form and close dialog
      form.reset();
      setSelectedFile(null);
      setIsDialogOpen(false);

    } catch (error) {
      console.error('Error uploading portfolio item:', error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Failed to upload portfolio item. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      // Remove from local state (in real app, would delete from database)
      setPortfolioItems(prev => prev.filter(item => item.id !== itemId));
      
      toast({
        title: "Item Deleted",
        description: "Portfolio item has been removed.",
      });
    } catch (error) {
      console.error('Error deleting portfolio item:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete portfolio item.",
      });
    }
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="h-5 w-5" />;
      case 'video': return <Video className="h-5 w-5" />;
      case 'document': return <FileText className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-foreground">Loading portfolio...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Portfolio</h2>
          <p className="text-muted-foreground">Showcase your best work to potential clients</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Add Portfolio Item
            </Button>
          </DialogTrigger>
          
          <DialogContent className="rounded-glass bg-card/50 backdrop-blur-glass border border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground">Add Portfolio Item</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Upload File</label>
                  <div className="border border-dashed border-border rounded-glass p-6 text-center">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept="image/*,video/*,.pdf"
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload image, video, or PDF
                      </p>
                      {selectedFile && (
                        <p className="text-sm text-primary mt-2">{selectedFile.name}</p>
                      )}
                    </label>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Project title"
                          className="bg-background/50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your work..."
                          className="bg-background/50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Tags (comma separated)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="acting, drama, commercial"
                          className="bg-background/50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={uploading || !selectedFile}
                >
                  {uploading ? "Uploading..." : "Add to Portfolio"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Portfolio Grid */}
      {portfolioItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portfolioItems.map((item) => (
            <GlassCard key={item.id} className="rounded-glass bg-card/50 backdrop-blur-glass border border-border">
              <div className="space-y-4">
                {/* Media Preview */}
                <div className="aspect-video bg-background/50 rounded-glass flex items-center justify-center">
                  {item.media_type === 'image' ? (
                    <img 
                      src={item.media_url} 
                      alt={item.title}
                      className="w-full h-full object-cover rounded-glass"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      {getMediaIcon(item.media_type)}
                      <span className="text-sm">{item.media_type}</span>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold text-foreground">{item.title}</h4>
                  <p className="text-muted-foreground text-sm line-clamp-2 mt-1">
                    {item.description}
                  </p>
                </div>

                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => window.open(item.media_url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteItem(item.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard className="rounded-glass bg-card/50 backdrop-blur-glass border border-border">
          <div className="text-center py-12">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Build Your Portfolio</h3>
            <p className="text-muted-foreground mb-4">
              Upload your best work to showcase your talents to potential clients
            </p>
            <Button 
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Item
            </Button>
          </div>
        </GlassCard>
      )}
    </div>
  );
}