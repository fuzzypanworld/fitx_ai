
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
    // Get relevant keypoints
    const nose = keypoints.find(kp => kp.part === 'nose');
    const shoulders = keypoints.filter(kp => 
      kp.part === 'leftShoulder' || kp.part === 'rightShoulder'
    );
    const elbows = keypoints.filter(kp => 
      kp.part === 'leftElbow' || kp.part === 'rightElbow'
    );
    const wrists = keypoints.filter(kp => 
      kp.part === 'leftWrist' || kp.part === 'rightWrist'
    );
    
    if (!nose || shoulders.length !== 2 || elbows.length !== 2 || wrists.length !== 2) {
      return false;
    }

    // Calculate average positions
    const shoulderY = (shoulders[0].position.y + shoulders[1].position.y) / 2;
    const elbowY = (elbows[0].position.y + elbows[1].position.y) / 2;
    const wristY = (wrists[0].position.y + wrists[1].position.y) / 2;
    
    // Check if nose is near shoulder level (down position)
    const isNoseNearShoulders = Math.abs(nose.position.y - shoulderY) < 100;
    
    // Check if arms are in proper push-up position
    const areArmsProperlyPositioned = 
      Math.abs(elbowY - wristY) < 50 && // Elbows and wrists roughly same height
      shoulders.every(s => s.score > 0.5) && // High confidence in shoulder detection
      elbows.every(e => e.score > 0.5); // High confidence in elbow detection
    
    // Log positions for debugging
    console.log('Pose Detection:', {
      noseY: nose.position.y,
      shoulderY,
      elbowY,
      wristY,
      isNoseNearShoulders,
      areArmsProperlyPositioned
    });

    return isNoseNearShoulders && areArmsProperlyPositioned;
  };

  let lastPushUpState = false;
  let pushUpStartTime = 0;
  
  // Main pose detection loop
  const detectPose = async () => {
    if (!net || !videoRef.current || !isRecording) return;

    try {
      const pose = await net.estimateSinglePose(videoRef.current);
      const isPushUp = isPushUpPosition(pose.keypoints);
      
      // Count push-up with timing check
      const currentTime = Date.now();
      if (isPushUp && !lastPushUpState && (!pushUpStartTime || currentTime - pushUpStartTime > 1000)) {
        setExercises(prev => 
          prev.map(ex => 
            ex.name === 'Push-ups' 
              ? { ...ex, count: ex.count + 1 } 
              : ex
          )
        );
        pushUpStartTime = currentTime;
        console.log('Push-up counted!');
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
