import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { GlassModal } from '@/components/ui/glass-modal';
import { Button } from '@/components/ui/button';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { Upload, X, Check, User, Camera, FileText, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  'Actor', 'Cinematographer', 'Director', 'Producer', 'Editor', 
  'Makeup Artist', 'Sound Engineer', 'Lighting Technician', 
  'Voice Actor', 'Stunt Performer', 'Costume Designer'
];

const COMMON_KEYWORDS = [
  'drama', 'comedy', 'action', 'horror', 'documentary', 'indie', 
  'commercial', 'music video', 'theater', 'voiceover', 'dance'
];

interface FormData {
  email: string;
  password: string;
  name: string;
  age: number;
  location: string;
  description: string;
  categories: string[];
  keywords: string[];
  portfolioFiles: File[];
}

const PasswordStrengthMeter = ({ password }: { password: string }) => {
  const getStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strength = getStrength();
  const percentage = (strength / 5) * 100;
  
  const getStrengthText = () => {
    if (strength <= 1) return 'Very Weak';
    if (strength <= 2) return 'Weak';
    if (strength <= 3) return 'Fair';
    if (strength <= 4) return 'Good';
    return 'Strong';
  };

  const getColor = () => {
    if (strength <= 1) return 'bg-destructive';
    if (strength <= 2) return 'bg-yellow-500';
    if (strength <= 3) return 'bg-orange-500';
    if (strength <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Password Strength</span>
        <span className={cn(
          "font-medium",
          strength <= 2 ? "text-destructive" : strength <= 4 ? "text-yellow-500" : "text-green-500"
        )}>
          {getStrengthText()}
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div 
          className={cn("h-2 rounded-full transition-all duration-300", getColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const FileUploadArea = ({ 
  files, 
  onFilesChange, 
  maxFiles = 5 
}: { 
  files: File[]; 
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const totalFiles = files.length + selectedFiles.length;
    
    if (totalFiles > maxFiles) {
      toast({
        title: "Too many files",
        description: `Maximum ${maxFiles} files allowed`,
        variant: "destructive"
      });
      return;
    }
    
    onFilesChange([...files, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-border rounded-glass p-8 text-center hover:border-primary/50 transition-colors">
        <input
          type="file"
          accept="image/*,video/*,.pdf"
          multiple
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-foreground font-medium mb-2">Upload Portfolio Files</p>
          <p className="text-sm text-muted-foreground">
            Images, videos, or PDFs • Max {maxFiles} files • 10MB each
          </p>
        </label>
      </div>
      
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-glass">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({(file.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function CreatorRegister() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    name: '',
    age: 18,
    location: '',
    description: '',
    categories: [],
    keywords: [],
    portfolioFiles: []
  });

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const handleClose = () => {
    setIsOpen(false);
    navigate(-1);
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const addCategory = (category: string) => {
    if (!formData.categories.includes(category)) {
      setFormData(prev => ({
        ...prev,
        categories: [...prev.categories, category]
      }));
    }
  };

  const removeCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c !== category)
    }));
  };

  const addKeyword = (keyword: string) => {
    if (!formData.keywords.includes(keyword)) {
      setFormData(prev => ({
        ...prev,
        keywords: [...prev.keywords, keyword]
      }));
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }));
  };

  const uploadPortfolioFiles = async (userId: string): Promise<string[]> => {
    const uploadPromises = formData.portfolioFiles.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('portfolios')
        .upload(fileName, file);
      
      if (error) throw error;
      
      const { data } = supabase.storage
        .from('portfolios')
        .getPublicUrl(fileName);
      
      return data.publicUrl;
    });

    return Promise.all(uploadPromises);
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: formData.name,
            role: 'creator'
          }
        }
      });

      if (authError) throw authError;
      
      if (!authData.user) {
        throw new Error('User creation failed');
      }

      // Upload portfolio files
      const portfolioUrls = formData.portfolioFiles.length > 0 
        ? await uploadPortfolioFiles(authData.user.id)
        : [];

      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: formData.email,
          name: formData.name,
          age: formData.age,
          location: formData.location,
          description: formData.description,
          keywords: formData.keywords,
          portfolio_urls: portfolioUrls,
          role: 'creator'
        });

      if (profileError) throw profileError;

      toast({
        title: "Registration successful!",
        description: "Please check your email to verify your account.",
      });

      navigate('/');
      
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Registration failed",
        description: error.message || "An error occurred during registration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const canProceedFromStep1 = formData.email && formData.password.length >= 8;
  const canProceedFromStep2 = formData.name && formData.categories.length > 0 && formData.age >= 18;
  const canProceedFromStep3 = true; // Portfolio is optional

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <User className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold text-foreground">Account Setup</h3>
              <p className="text-muted-foreground">Create your creator account</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jane.doe@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
                {formData.password && (
                  <div className="mt-2">
                    <PasswordStrengthMeter password={formData.password} />
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <User className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold text-foreground">Profile Details</h3>
              <p className="text-muted-foreground">Tell us about yourself</p>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Jane Doe"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    min="18"
                    max="100"
                    value={formData.age}
                    onChange={(e) => setFormData(prev => ({ ...prev, age: parseInt(e.target.value) || 18 }))}
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Los Angeles, CA"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
              
              <div>
                <Label>Categories</Label>
                <Select onValueChange={addCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your specialties" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {formData.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.categories.map(category => (
                      <Badge
                        key={category}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => removeCategory(category)}
                      >
                        {category} <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <Label>Keywords</Label>
                <Select onValueChange={addKeyword}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add relevant keywords" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_KEYWORDS.map(keyword => (
                      <SelectItem key={keyword} value={keyword}>
                        {keyword}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {formData.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.keywords.map(keyword => (
                      <Badge
                        key={keyword}
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => removeKeyword(keyword)}
                      >
                        {keyword} <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="description">Bio</Label>
                <Textarea
                  id="description"
                  placeholder="Passionate performer with theater background..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Camera className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold text-foreground">Portfolio Upload</h3>
              <p className="text-muted-foreground">Showcase your best work</p>
            </div>
            
            <FileUploadArea
              files={formData.portfolioFiles}
              onFilesChange={(files) => setFormData(prev => ({ ...prev, portfolioFiles: files }))}
              maxFiles={5}
            />
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Eye className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold text-foreground">Review & Submit</h3>
              <p className="text-muted-foreground">Confirm your information</p>
            </div>
            
            <div className="space-y-4 bg-muted/20 rounded-glass p-6">
              <div>
                <h4 className="font-medium text-foreground mb-2">Account</h4>
                <p className="text-sm text-muted-foreground">{formData.email}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-foreground mb-2">Profile</h4>
                <p className="text-sm text-muted-foreground">
                  {formData.name} • Age {formData.age} • {formData.location}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-foreground mb-2">Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {formData.categories.map(category => (
                    <Badge key={category} variant="secondary">{category}</Badge>
                  ))}
                </div>
              </div>
              
              {formData.keywords.length > 0 && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.keywords.map(keyword => (
                      <Badge key={keyword} variant="outline">{keyword}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {formData.portfolioFiles.length > 0 && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Portfolio</h4>
                  <p className="text-sm text-muted-foreground">
                    {formData.portfolioFiles.length} file(s) ready for upload
                  </p>
                </div>
              )}
              
              {formData.description && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Bio</h4>
                  <p className="text-sm text-muted-foreground">{formData.description}</p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Join as Creator"
      size="lg"
      className="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Step {currentStep} of {totalSteps}</span>
            <span className="text-muted-foreground">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t border-border">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            Previous
          </Button>
          
          <div className="flex gap-2">
            {currentStep === totalSteps ? (
              <PrimaryButton
                onClick={handleSubmit}
                disabled={loading}
                className="min-w-[120px]"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </div>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Create Account
                  </>
                )}
              </PrimaryButton>
            ) : (
              <PrimaryButton
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && !canProceedFromStep1) ||
                  (currentStep === 2 && !canProceedFromStep2)
                }
              >
                Next
              </PrimaryButton>
            )}
          </div>
        </div>
      </div>
    </GlassModal>
  );
}