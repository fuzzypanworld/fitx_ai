
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
const MIN_CONFIDENCE = 0.3;

const WorkoutTracker = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([
    { name: 'Push-ups', count: 0 }
  ]);
  const [detector, setDetector] = useState<posenet.PoseNet | null>(null);
  const [calibrating, setCalibrating] = useState(false);
  const { toast } = useToast();

  // Initialize PoseNet with better settings
  useEffect(() => {
    const initPoseNet = async () => {
      try {
        await tf.setBackend('webgl');
        console.log('Using backend:', tf.getBackend());
        
        const net = await posenet.load({
          architecture: 'ResNet50',
          outputStride: 32,
          inputResolution: { width: 640, height: 480 },
          quantBytes: 2
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

  const drawPose = (ctx: CanvasRenderingContext2D, pose: posenet.Pose) => {
    // Draw keypoints with higher visibility
    pose.keypoints.forEach(keypoint => {
      if (keypoint.score > MIN_CONFIDENCE) {
        ctx.beginPath();
        ctx.arc(keypoint.position.x, keypoint.position.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = POINTS_COLOR;
        ctx.fill();
      }
    });

    // Draw skeleton with thicker lines
    posenet.getAdjacentKeyPoints(pose.keypoints, MIN_CONFIDENCE).forEach(([start, end]) => {
      ctx.beginPath();
      ctx.moveTo(start.position.x, start.position.y);
      ctx.lineTo(end.position.x, end.position.y);
      ctx.strokeStyle = CONNECTIONS_COLOR;
      ctx.lineWidth = LINE_WIDTH;
      ctx.stroke();
    });
  };

  // Enhanced push-up detection
  let armAngle = 180;
  let isGoingDown = true;
  let lastPushUpTime = 0;
  const PUSH_UP_COOLDOWN = 1000; // 1 second cooldown between push-ups

  const calculateAngle = (a: posenet.Keypoint, b: posenet.Keypoint, c: posenet.Keypoint) => {
    const ab = Math.sqrt(Math.pow(b.position.x - a.position.x, 2) + Math.pow(b.position.y - a.position.y, 2));
    const bc = Math.sqrt(Math.pow(b.position.x - c.position.x, 2) + Math.pow(b.position.y - c.position.y, 2));
    const ac = Math.sqrt(Math.pow(c.position.x - a.position.x, 2) + Math.pow(c.position.y - a.position.y, 2));
    return Math.acos((ab * ab + bc * bc - ac * ac) / (2 * ab * bc)) * (180 / Math.PI);
  };

  const detectPushUp = (keypoints: posenet.Keypoint[]) => {
    const shoulder = keypoints.find(kp => kp.part === 'rightShoulder');
    const elbow = keypoints.find(kp => kp.part === 'rightElbow');
    const wrist = keypoints.find(kp => kp.part === 'rightWrist');

    if (shoulder && elbow && wrist &&
        shoulder.score > MIN_CONFIDENCE &&
        elbow.score > MIN_CONFIDENCE &&
        wrist.score > MIN_CONFIDENCE) {

      const currentArmAngle = calculateAngle(shoulder, elbow, wrist);
      const currentTime = Date.now();

      // Down phase of push-up
      if (isGoingDown && currentArmAngle < 90 && armAngle >= 90) {
        isGoingDown = false;
      }
      // Up phase of push-up
      else if (!isGoingDown && currentArmAngle > 160 && 
               currentTime - lastPushUpTime > PUSH_UP_COOLDOWN) {
        setExercises(prev => 
          prev.map(ex => 
            ex.name === 'Push-ups' 
              ? { ...ex, count: ex.count + 1 } 
              : ex
          )
        );
        lastPushUpTime = currentTime;
        isGoingDown = true;
        
        // Provide visual feedback
        toast({
          title: "Push-up counted! 💪",
          description: `Keep going! You're doing great!`,
        });
      }

      armAngle = currentArmAngle;
    }
  };

  const detectPose = async () => {
    if (!detector || !videoRef.current || !canvasRef.current || !isRecording) return;

    try {
      const video = videoRef.current;
      const pose = await detector.estimateSinglePose(video, {
        flipHorizontal: false
      });

      if (pose.score > 0.3) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          drawPose(ctx, pose);
          detectPushUp(pose.keypoints);
        }
      }

      if (isRecording) {
        requestAnimationFrame(detectPose);
      }
    } catch (error) {
      console.error('Error detecting pose:', error);
    }
  };

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

      // Add a short calibration period
      setCalibrating(true);
      toast({
        title: "Calibrating...",
        description: "Please stand in position for push-ups",
      });

      setTimeout(() => {
        setCalibrating(false);
        setIsRecording(true);
        detectPose();
        toast({
          title: "Ready!",
          description: "Start your push-ups now",
        });
      }, 3000);

    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

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
            {calibrating && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                <p className="text-xl font-semibold">Calibrating...</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-center">
            <Button 
              onClick={isRecording ? stopCamera : startCamera}
              variant={isRecording ? "destructive" : "default"}
              disabled={calibrating}
            >
              {calibrating ? "Calibrating..." : isRecording ? "Stop Recording" : "Start Recording"}
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
