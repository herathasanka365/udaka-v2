import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  Upload, 
  FileImage, 
  FileVideo, 
  FileText, 
  X,
  Copy,
  ExternalLink,
  Trash2,
  Download
} from "lucide-react";

interface PortfolioFile {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'document';
  size: number;
}

interface UserProfile {
  id: string;
  name: string;
  portfolio_urls: string[];
}

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function CreatorPortfolio() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [portfolioFiles, setPortfolioFiles] = useState<PortfolioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/creators/login");
        return;
      }
      await fetchUserProfile(session.user.id);
    };
    
    checkAuth();
  }, [navigate]);

  const fetchUserProfile = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, portfolio_urls')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setUser(data);
        
        // Parse portfolio URLs and create portfolio files
        const files: PortfolioFile[] = (data.portfolio_urls || []).map((url, index) => {
          const fileName = url.split('/').pop() || `file-${index}`;
          const extension = fileName.split('.').pop()?.toLowerCase() || '';
          
          let type: 'image' | 'video' | 'document' = 'document';
          if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
            type = 'image';
          } else if (['mp4', 'avi', 'mov', 'webm'].includes(extension)) {
            type = 'video';
          }

          return {
            id: `${index}`,
            name: fileName,
            url,
            type,
            size: 0, // We don't have size info from URLs
          };
        });
        
        setPortfolioFiles(files);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load portfolio. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = async (files: File[]) => {
    if (portfolioFiles.length >= MAX_FILES) {
      toast({
        variant: "destructive",
        title: "Upload limit reached",
        description: `You can only upload up to ${MAX_FILES} files.`,
      });
      return;
    }

    // Filter valid files
    const validFiles = files.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: `${file.name} is larger than 10MB.`,
        });
        return false;
      }

      const isValidType = file.type.startsWith('image/') || 
                         file.type.startsWith('video/') || 
                         file.type === 'application/pdf';
      
      if (!isValidType) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: `${file.name} is not a supported file type.`,
        });
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) return;

    // Check if adding these files would exceed the limit
    const remainingSlots = MAX_FILES - portfolioFiles.length;
    const filesToUpload = validFiles.slice(0, remainingSlots);

    if (filesToUpload.length < validFiles.length) {
      toast({
        variant: "destructive",
        title: "Some files not uploaded",
        description: `Only ${filesToUpload.length} files uploaded due to ${MAX_FILES} file limit.`,
      });
    }

    await uploadFiles(filesToUpload);
  };

  const uploadFiles = async (files: File[]) => {
    if (!user) return;

    setUploading(true);
    setUploadProgress(0);
    
    try {
      const uploadedUrls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('portfolios')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('portfolios')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
        setUploadProgress(((i + 1) / files.length) * 100);
      }

      // Update user's portfolio URLs
      const updatedUrls = [...(user.portfolio_urls || []), ...uploadedUrls];
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ portfolio_urls: updatedUrls })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update local state
      const newFiles: PortfolioFile[] = uploadedUrls.map((url, index) => {
        const file = files[index];
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        
        let type: 'image' | 'video' | 'document' = 'document';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
          type = 'image';
        } else if (['mp4', 'avi', 'mov', 'webm'].includes(extension)) {
          type = 'video';
        }

        return {
          id: Date.now().toString() + index,
          name: file.name,
          url,
          type,
          size: file.size,
        };
      });

      setPortfolioFiles(prev => [...prev, ...newFiles]);
      setUser(prev => prev ? { ...prev, portfolio_urls: updatedUrls } : null);

      toast({
        title: "Upload successful",
        description: `${files.length} file(s) uploaded successfully.`,
      });

    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload files. Please try again.",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeFile = async (fileId: string) => {
    const fileToRemove = portfolioFiles.find(f => f.id === fileId);
    if (!fileToRemove || !user) return;

    try {
      // Remove from portfolio_urls
      const updatedUrls = user.portfolio_urls.filter(url => url !== fileToRemove.url);
      
      const { error } = await supabase
        .from('users')
        .update({ portfolio_urls: updatedUrls })
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setPortfolioFiles(prev => prev.filter(f => f.id !== fileId));
      setUser(prev => prev ? { ...prev, portfolio_urls: updatedUrls } : null);

      toast({
        title: "File removed",
        description: "File has been removed from your portfolio.",
      });

    } catch (error) {
      console.error('Error removing file:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove file. Please try again.",
      });
    }
  };

  const copyPublicLink = () => {
    if (!user) return;
    
    const publicLink = `${window.location.origin}/profile/${user.id}`;
    navigator.clipboard.writeText(publicLink);
    
    toast({
      title: "Link copied",
      description: "Public portfolio link copied to clipboard.",
    });
  };

  const openPublicProfile = () => {
    if (!user) return;
    window.open(`/profile/${user.id}`, '_blank');
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <FileImage className="h-8 w-8 text-primary" />;
      case 'video':
        return <FileVideo className="h-8 w-8 text-primary" />;
      default:
        return <FileText className="h-8 w-8 text-primary" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return 'Unknown size';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const groupedFiles = {
    images: portfolioFiles.filter(f => f.type === 'image'),
    videos: portfolioFiles.filter(f => f.type === 'video'),
    documents: portfolioFiles.filter(f => f.type === 'document'),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/creator/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Portfolio Management</h1>
              <p className="text-muted-foreground">Showcase your work and share your public profile</p>
            </div>
          </div>
        </div>

        {/* Public Link Section */}
        <GlassCard className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">Public Portfolio</h2>
              <p className="text-muted-foreground text-sm">
                Share your portfolio with potential clients and collaborators
              </p>
            </div>
            <div className="flex gap-2">
              <SecondaryButton onClick={copyPublicLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </SecondaryButton>
              <Button variant="outline" onClick={openPublicProfile}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View Public Profile
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* Upload Section */}
        <GlassCard className="mb-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Upload Files</h2>
                <p className="text-muted-foreground text-sm">
                  Images, videos, and PDFs • Max {MAX_FILES} files • 10MB per file
                </p>
              </div>
              <Badge variant="secondary">
                {portfolioFiles.length} / {MAX_FILES} files
              </Badge>
            </div>

            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-glass p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {uploading ? "Uploading..." : "Drop files here or click to browse"}
              </h3>
              <p className="text-muted-foreground mb-4">
                Supports: Images (JPG, PNG, GIF), Videos (MP4, MOV), PDFs
              </p>
              
              {uploading ? (
                <div className="max-w-xs mx-auto">
                  <Progress value={uploadProgress} className="mb-2" />
                  <p className="text-sm text-muted-foreground">{Math.round(uploadProgress)}% complete</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <PrimaryButton asChild disabled={portfolioFiles.length >= MAX_FILES}>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*,.pdf"
                        onChange={handleFileInput}
                        className="sr-only"
                        disabled={portfolioFiles.length >= MAX_FILES}
                      />
                      Choose Files
                    </label>
                  </PrimaryButton>
                  {portfolioFiles.length >= MAX_FILES && (
                    <p className="text-sm text-destructive">Upload limit reached</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Portfolio Sections */}
        <div className="space-y-8">
          {/* Photos Section */}
          <GlassCard>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <FileImage className="h-5 w-5" />
                Photos ({groupedFiles.images.length})
              </h2>
            </div>
            
            {groupedFiles.images.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedFiles.images.map((file) => (
                  <div key={file.id} className="relative group">
                    <div className="aspect-video rounded-glass overflow-hidden bg-muted">
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.svg';
                        }}
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-glass flex items-center justify-center">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => window.open(file.url, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeFile(file.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileImage className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No photos uploaded yet</p>
              </div>
            )}
          </GlassCard>

          {/* Videos Section */}
          <GlassCard>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <FileVideo className="h-5 w-5" />
                Videos ({groupedFiles.videos.length})
              </h2>
            </div>
            
            {groupedFiles.videos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupedFiles.videos.map((file) => (
                  <div key={file.id} className="relative group">
                    <div className="aspect-video rounded-glass overflow-hidden bg-muted">
                      <video
                        src={file.url}
                        controls
                        className="w-full h-full object-cover"
                        preload="metadata"
                      />
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeFile(file.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="mt-2 text-sm text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileVideo className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No videos uploaded yet</p>
              </div>
            )}
          </GlassCard>

          {/* Documents Section */}
          <GlassCard>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents ({groupedFiles.documents.length})
              </h2>
            </div>
            
            {groupedFiles.documents.length > 0 ? (
              <div className="space-y-3">
                {groupedFiles.documents.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-4 rounded-glass bg-background/50 hover:bg-background/70 transition-colors">
                    <div className="flex items-center gap-3">
                      {getFileIcon(file.type)}
                      <div>
                        <p className="font-medium text-foreground">{file.name}</p>
                        <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(file.url, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeFile(file.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No documents uploaded yet</p>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}