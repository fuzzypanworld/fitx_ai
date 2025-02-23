
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { AlertTriangle, Check, Loader2 } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"

interface FoodAnalysis {
  foods: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isHealthy: boolean;
  healthyAlternative?: string;
  explanation: string;
  exerciseRecommendations: {
    name: string;
    duration: number;
    intensity: string;
  }[];
}

export const FoodAnalyzer = () => {
  const [query, setQuery] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null)
  const { toast } = useToast()

  const analyzeFood = async () => {
    if (!query.trim()) {
      toast({
        title: "Error",
        description: "Please enter a food to analyze",
        variant: "destructive"
      })
      return
    }

    try {
      setIsAnalyzing(true)
      
      const { data: analysisData, error: analysisError } = await supabase.functions
        .invoke('analyze-food', {
          body: { query: query.trim() }
        })

      if (analysisError) throw analysisError

      console.log('Analysis data:', analysisData)
      setAnalysis(analysisData)
      
      toast({
        title: "Analysis Complete! 🎉",
        description: "Check out the nutritional breakdown below.",
      })
    } catch (error) {
      console.error('Error analyzing food:', error)
      toast({
        title: "Error",
        description: "Failed to analyze the food. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const resetAnalysis = () => {
    setQuery("")
    setAnalysis(null)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          AI Food Analyzer 🍽️
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter a food (e.g., chicken breast, pizza, salad)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && analyzeFood()}
            />
            <Button
              onClick={analyzeFood}
              disabled={isAnalyzing || !query.trim()}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Analyze'
              )}
            </Button>
          </div>

          {analysis && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h3 className="font-semibold">Analyzed Food</h3>
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
                
                <div className="mt-4">
                  <h4 className="font-semibold text-sm">Exercise Recommendations</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    To burn {analysis.calories} calories, you can do any of these exercises:
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {analysis.exerciseRecommendations.map((exercise, index) => (
                      <li key={index} className="flex justify-between items-center">
                        <span>{exercise.name}</span>
                        <span>{exercise.duration} minutes ({exercise.intensity} intensity)</span>
                      </li>
                    ))}
                  </ul>
                </div>
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
      </CardContent>
    </Card>
  )
}
