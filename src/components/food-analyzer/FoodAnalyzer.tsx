import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { AlertTriangle, Camera, Check, Image, Loader2, Upload, X } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { supabase } from "@/integrations/supabase/client"
import { cn } from "@/lib/utils"

interface FoodAnalysis {
  foods: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isHealthy: boolean;
  healthyAlternative?: string;
  explanation: string;
}

export const FoodAnalyzer = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const { toast } = useToast()

  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      })
      return
    }

    setSelectedImage(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleImageSelect(file)
    }
  }

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) {
      handleImageSelect(file)
    }
  }, [])

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }, [])

  const analyzeImage = async () => {
    if (!selectedImage) return

    try {
      setIsAnalyzing(true);
      
      // Upload image to Supabase Storage
      const fileName = `${Date.now()}-${selectedImage.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('food-images')
        .upload(fileName, selectedImage);

      if (uploadError) throw uploadError;

      // Get public URL of the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('food-images')
        .getPublicUrl(fileName);

      // Analyze the image using our edge function
      const { data: analysisData, error: analysisError } = await supabase.functions
        .invoke('analyze-food', {
          body: { imageUrl: publicUrl }
        });

      if (analysisError) throw analysisError;

      console.log('Analysis data:', analysisData); // Debug log
      setAnalysis(analysisData);
      
      toast({
        title: "Analysis Complete! 🎉",
        description: "Check out the nutritional breakdown below.",
      });
    } catch (error) {
      console.error('Error analyzing image:', error);
      toast({
        title: "Error",
        description: "Failed to analyze the image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  }

  const resetAnalysis = () => {
    setSelectedImage(null)
    setImagePreview("")
    setAnalysis(null)
  }

  const startCamera = () => {
    setShowCamera(true)
  }

  const handleCameraCapture = async (stream: MediaStream) => {
    const video = document.createElement('video')
    video.srcObject = stream
    await video.play()

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext('2d')
    if (context) {
      context.drawImage(video, 0, 0)
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' })
          handleImageSelect(file)
        }
      }, 'image/jpeg')
    }

    stream.getTracks().forEach(track => track.stop())
    setShowCamera(false)
  }

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            AI Food Analyzer 🍽️
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!selectedImage ? (
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center space-y-4"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <div className="flex justify-center gap-4">
                <Button onClick={() => document.getElementById('file-upload')?.click()}>
                  <Upload className="mr-2" />
                  Upload Image
                </Button>
                <Button onClick={startCamera}>
                  <Camera className="mr-2" />
                  Take Photo
                </Button>
              </div>
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <p className="text-sm text-muted-foreground">
                Drag and drop an image, or click to upload
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Food preview"
                  className="w-full rounded-lg"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-background/50 hover:bg-background/80"
                  onClick={resetAnalysis}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {!analysis && (
                <Button
                  className="w-full"
                  onClick={analyzeImage}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>Analyze Food</>
                  )}
                </Button>
              )}

              {analysis && (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <h3 className="font-semibold">Detected Foods</h3>
                      <ul className="list-disc list-inside text-sm">
                        {analysis.foods.map((food, i) => (
                          <li key={i}>{food}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold">Nutritional Info</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Calories:</div>
                        <div>{analysis.calories} kcal</div>
                        <div>Protein:</div>
                        <div>{analysis.protein}g</div>
                        <div>Carbs:</div>
                        <div>{analysis.carbs}g</div>
                        <div>Fat:</div>
                        <div>{analysis.fat}g</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">Health Rating</h3>
                      {analysis.isHealthy ? (
                        <div className="flex items-center text-green-500">
                          <Check className="h-4 w-4" />
                          <span className="text-sm">Healthy Choice!</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-yellow-500">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm">Could Be Healthier</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {analysis.explanation}
                    </p>
                    {analysis.healthyAlternative && (
                      <div className="mt-4">
                        <h4 className="font-semibold text-sm">Healthier Alternative</h4>
                        <p className="text-sm text-muted-foreground">
                          {analysis.healthyAlternative}
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={resetAnalysis}
                  >
                    Analyze Another Food
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCamera} onOpenChange={setShowCamera}>
        <DialogContent className="sm:max-w-md">
          <div className="relative aspect-video">
            <video
              id="camera-preview"
              autoPlay
              playsInline
              className="w-full h-full object-cover rounded-lg"
            />
            <Button
              variant="secondary"
              className="absolute bottom-4 left-1/2 -translate-x-1/2"
              onClick={() => {
                const video = document.getElementById('camera-preview') as HTMLVideoElement
                if (video.srcObject instanceof MediaStream) {
                  handleCameraCapture(video.srcObject)
                }
              }}
            >
              <Camera className="mr-2 h-4 w-4" />
              Take Photo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
