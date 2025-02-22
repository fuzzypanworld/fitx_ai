
import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Video } from 'lucide-react';
import * as tf from '@tensorflow/tfjs';
import * as posenet from '@tensorflow-models/posenet';

const WorkoutTracker = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [pushUpCount, setPushUpCount] = useState(0);
  const [detector, setDetector] = useState<posenet.PoseNet | null>(null);
  const { toast } = useToast();

  // Initialize PoseNet
  useEffect(() => {
    const loadModel = async () => {
      try {
        const net = await posenet.load();
        setDetector(net);
        console.log('PoseNet loaded');
      } catch (error) {
        console.error('Failed to load PoseNet:', error);
        toast({
          title: "Error",
          description: "Failed to load movement detection",
          variant: "destructive",
        });
      }
    };

    loadModel();
  }, [toast]);

  // Track push-up state
  const pushUpState = useRef({ 
    isDown: false,
    lastCount: Date.now() 
  });

  const detectPushUps = async () => {
    if (!detector || !videoRef.current || !canvasRef.current || !isRecording) return;

    try {
      const pose = await detector.estimateSinglePose(videoRef.current);
      
      // Get key body points
      const leftShoulder = pose.keypoints.find(k => k.part === 'leftShoulder');
      const leftElbow = pose.keypoints.find(k => k.part === 'leftElbow');
      const leftWrist = pose.keypoints.find(k => k.part === 'leftWrist');

      if (leftShoulder?.score > 0.5 && leftElbow?.score > 0.5 && leftWrist?.score > 0.5) {
        // Calculate arm angle
        const shoulderY = leftShoulder.position.y;
        const elbowY = leftElbow.position.y;
        
        // Simple push-up detection based on elbow position relative to shoulder
        const now = Date.now();
        const timeSinceLastCount = now - pushUpState.current.lastCount;
        
        if (elbowY > shoulderY + 30 && !pushUpState.current.isDown && timeSinceLastCount > 1000) {
          // Going down
          pushUpState.current.isDown = true;
          console.log('Down position detected');
        } else if (elbowY < shoulderY + 10 && pushUpState.current.isDown && timeSinceLastCount > 1000) {
          // Coming up - count the push-up
          setPushUpCount(prev => prev + 1);
          pushUpState.current.isDown = false;
          pushUpState.current.lastCount = now;
          
          toast({
            title: "Push-up counted! 💪",
            description: "Keep going!",
          });
          console.log('Push-up counted');
        }
      }

      // Continue detection
      if (isRecording) {
        requestAnimationFrame(detectPushUps);
      }
    } catch (error) {
      console.error('Error in pose detection:', error);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsRecording(true);
        detectPushUps();
        
        toast({
          title: "Camera Started",
          description: "Start doing push-ups!",
        });
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Please check camera permissions",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsRecording(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Push-up Counter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative aspect-video bg-black/5 rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
            />
          </div>
          
          <div className="flex justify-between items-center">
            <Button 
              onClick={isRecording ? stopCamera : startCamera}
              variant={isRecording ? "destructive" : "default"}
            >
              {isRecording ? "Stop" : "Start"}
            </Button>
            
            <div className="text-2xl font-bold">
              Push-ups: {pushUpCount}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkoutTracker;
