
import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Video } from 'lucide-react';
import * as tf from '@tensorflow/tfjs';
import * as posenet from '@tensorflow-models/posenet';

interface Exercise {
  name: string;
  count: number;
}

const WorkoutTracker = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([
    { name: 'Push-ups', count: 0 }
  ]);
  const [net, setNet] = useState<posenet.PoseNet | null>(null);
  const { toast } = useToast();

  // Initialize TensorFlow.js and PoseNet model
  useEffect(() => {
    const initTF = async () => {
      try {
        // Set the backend to WebGL
        await tf.setBackend('webgl');
        console.log('Using backend:', tf.getBackend());
        
        // Load PoseNet model
        const loadedNet = await posenet.load({
          architecture: 'MobileNetV1',
          outputStride: 16,
          inputResolution: { width: 640, height: 480 },
          multiplier: 0.75
        });
        setNet(loadedNet);
        console.log('PoseNet model loaded successfully');
      } catch (error) {
        console.error('Error initializing TensorFlow.js:', error);
        toast({
          title: "Model Loading Error",
          description: "Unable to initialize workout detection. Please try again.",
          variant: "destructive",
        });
      }
    };
    
    initTF();
  }, [toast]);

  // Initialize camera stream
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640,
          height: 480,
          facingMode: 'user' 
        },
        audio: false 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      setIsRecording(true);
      detectPose();
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  };

  // Detect push-ups based on pose
  const isPushUpPosition = (keypoints: posenet.Keypoint[]) => {
    const shoulders = keypoints.filter(kp => 
      kp.part === 'leftShoulder' || kp.part === 'rightShoulder'
    );
    const elbows = keypoints.filter(kp => 
      kp.part === 'leftElbow' || kp.part === 'rightElbow'
    );
    
    if (shoulders.length === 2 && elbows.length === 2) {
      // Calculate average y positions
      const shoulderY = (shoulders[0].position.y + shoulders[1].position.y) / 2;
      const elbowY = (elbows[0].position.y + elbows[1].position.y) / 2;
      
      // If elbows are lower than shoulders, likely in push-up position
      return elbowY > shoulderY;
    }
    return false;
  };

  let lastPushUpState = false;
  
  // Main pose detection loop
  const detectPose = async () => {
    if (!net || !videoRef.current || !isRecording) return;

    try {
      const pose = await net.estimateSinglePose(videoRef.current);
      const isPushUp = isPushUpPosition(pose.keypoints);
      
      // Count push-up when transitioning from down to up position
      if (isPushUp && !lastPushUpState) {
        setExercises(prev => 
          prev.map(ex => 
            ex.name === 'Push-ups' 
              ? { ...ex, count: ex.count + 1 } 
              : ex
          )
        );
      }
      lastPushUpState = isPushUp;

      // Continue detection loop
      if (isRecording) {
        requestAnimationFrame(detectPose);
      }
    } catch (error) {
      console.error('Error detecting pose:', error);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Workout Mirror
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative aspect-video bg-black/5 rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-cover mirror"
              autoPlay
              playsInline
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full"
            />
          </div>
          
          <div className="flex justify-between items-center">
            <Button 
              onClick={isRecording ? stopCamera : startCamera}
              variant={isRecording ? "destructive" : "default"}
            >
              {isRecording ? "Stop Recording" : "Start Recording"}
            </Button>
            
            <div className="text-lg font-semibold">
              Push-ups: {exercises[0].count}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkoutTracker;
