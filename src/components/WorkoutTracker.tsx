
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

const POINTS_COLOR = '#FF0000';
const CONNECTIONS_COLOR = '#00FF00';
const LINE_WIDTH = 2;

const WorkoutTracker = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([
    { name: 'Push-ups', count: 0 }
  ]);
  const [detector, setDetector] = useState<posenet.PoseNet | null>(null);
  const { toast } = useToast();

  // Initialize PoseNet
  useEffect(() => {
    const initPoseNet = async () => {
      try {
        await tf.setBackend('webgl');
        console.log('Using backend:', tf.getBackend());
        
        const net = await posenet.load({
          architecture: 'MobileNetV1',
          outputStride: 16,
          inputResolution: { width: 640, height: 480 },
          multiplier: 0.75
        });
        setDetector(net);
        console.log('PoseNet model loaded successfully');
      } catch (error) {
        console.error('Error initializing PoseNet:', error);
        toast({
          title: "Model Loading Error",
          description: "Unable to initialize movement detection. Please try again.",
          variant: "destructive",
        });
      }
    };
    
    initPoseNet();
  }, [toast]);

  // Draw pose on canvas
  const drawPose = (ctx: CanvasRenderingContext2D, pose: posenet.Pose) => {
    // Draw keypoints
    pose.keypoints.forEach(keypoint => {
      if (keypoint.score > 0.3) {
        ctx.beginPath();
        ctx.arc(keypoint.position.x, keypoint.position.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = POINTS_COLOR;
        ctx.fill();
      }
    });

    // Draw skeleton
    posenet.getAdjacentKeyPoints(pose.keypoints, 0.3).forEach(([start, end]) => {
      ctx.beginPath();
      ctx.moveTo(start.position.x, start.position.y);
      ctx.lineTo(end.position.x, end.position.y);
      ctx.strokeStyle = CONNECTIONS_COLOR;
      ctx.lineWidth = LINE_WIDTH;
      ctx.stroke();
    });
  };

  // Track push-up state
  let lowestY = Infinity;
  let highestY = -Infinity;
  let lastPushUpTime = 0;
  let isInLowPosition = false;

  // Detect push-ups
  const detectPushUp = (keypoints: posenet.Keypoint[]) => {
    const shoulders = keypoints.filter(kp => 
      kp.part === 'leftShoulder' || kp.part === 'rightShoulder'
    );
    const nose = keypoints.find(kp => kp.part === 'nose');

    if (nose && shoulders.length === 2 && 
        shoulders.every(s => s.score > 0.3) && 
        nose.score > 0.3) {
      
      const shoulderY = (shoulders[0].position.y + shoulders[1].position.y) / 2;
      const currentY = nose.position.y;

      // Update vertical range
      if (currentY < highestY) highestY = currentY;
      if (currentY > lowestY) lowestY = currentY;

      const verticalRange = lowestY - highestY;
      const currentTime = Date.now();

      // Reset tracking periodically
      if (currentTime - lastPushUpTime > 3000) {
        highestY = Infinity;
        lowestY = -Infinity;
      }

      // Detect push-up movement
      const isNearBottom = Math.abs(currentY - shoulderY) < 50;
      
      if (verticalRange > 100 && isNearBottom && !isInLowPosition && 
          currentTime - lastPushUpTime > 1000) {
        setExercises(prev => 
          prev.map(ex => 
            ex.name === 'Push-ups' 
              ? { ...ex, count: ex.count + 1 } 
              : ex
          )
        );
        lastPushUpTime = currentTime;
        isInLowPosition = true;
        console.log('Push-up counted!', { verticalRange, currentY, shoulderY });
      } else if (!isNearBottom) {
        isInLowPosition = false;
      }
    }
  };

  // Main detection loop
  const detectPose = async () => {
    if (!detector || !videoRef.current || !canvasRef.current || !isRecording) return;

    try {
      const video = videoRef.current;
      const pose = await detector.estimateSinglePose(video);

      if (pose.score > 0.2) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Clear previous frame
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Draw pose
          drawPose(ctx, pose);
          
          // Detect push-ups
          detectPushUp(pose.keypoints);
        }
      }

      // Continue detection loop
      if (isRecording) {
        requestAnimationFrame(detectPose);
      }
    } catch (error) {
      console.error('Error detecting pose:', error);
    }
  };

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
              width={640}
              height={480}
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
