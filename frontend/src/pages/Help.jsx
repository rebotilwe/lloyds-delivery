import React, { useState, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Play, 
  Truck, 
  Store, 
  HelpCircle,
  Download,
  Video,
  Loader2,
  AlertCircle,
  Info
} from 'lucide-react';

// ── YOUR CLOUDINARY VIDEO URLS ──
const VIDEO_URLS = {
  driver: 'https://res.cloudinary.com/xfibrl4d/video/upload/v1783515018/How_to_become_a_Driver_on_Lloyd_s_Delivery_hzd243.mp4',
  vendor: 'https://res.cloudinary.com/xfibrl4d/video/upload/v1783514981/How_to_become_a_Vendor_on_Lloyd_s_Delivery__20260623_165913_0000_gtzasb.mp4',
};

// ── Video Data ──
const tutorials = [
  {
    id: 'driver-1',
    role: 'Driver',
    title: 'How to become a Driver',
    description: 'Complete guide for drivers: onboarding, accepting orders, navigation, and earnings.',
    icon: Truck,
    videoSrc: VIDEO_URLS.driver,
    duration: '5:30',
    fileSize: '~15MB',
    category: 'driver',
  },
  {
    id: 'vendor-1',
    role: 'Vendor',
    title: 'How to become a Vendor',
    description: 'Complete guide for vendors: restaurant setup, menu management, orders, and payouts.',
    icon: Store,
    videoSrc: VIDEO_URLS.vendor,
    duration: '4:15',
    fileSize: '~8MB',
    category: 'vendor',
  },
];

// ── Video Card Component ──
function VideoCard({ video, onPlay }) {
  const Icon = video.icon;
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
      onClick={() => onPlay(video)}
    >
      <CardContent className="p-4">
        <div className="relative aspect-video bg-gradient-to-br from-green-100 to-blue-100 rounded-lg overflow-hidden group">
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-green/20 flex items-center justify-center group-hover:bg-green/30 transition">
              <Play className="w-10 h-10 text-green fill-green/10 ml-1" />
            </div>
          </div>
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
            {video.duration}
          </div>
          <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
            {video.role}
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-green" />
            <h3 className="font-semibold text-sm">{video.title}</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{video.description}</p>
          <p className="text-xs text-gray-400 mt-1">
            Hosted on Cloudinary ☁️
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Video Player Component ──
function VideoPlayer({ video, isOpen, onClose }) {
  const videoRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoadedData = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setError(true);
    setIsLoading(false);
  };

  if (!video) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-green" />
            {video.title}
          </DialogTitle>
        </DialogHeader>
        <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
              <div className="text-center">
                <Loader2 className="w-10 h-10 text-white animate-spin mx-auto mb-2" />
                <p className="text-white text-sm">Loading video...</p>
              </div>
            </div>
          )}
          {error ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                <p className="text-gray-600">Failed to load video</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => {
                    setError(false);
                    setIsLoading(true);
                    videoRef.current?.load();
                  }}
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <video
              ref={videoRef}
              src={video.videoSrc}
              className="w-full h-full"
              controls
              playsInline
              preload="metadata"
              onLoadedData={handleLoadedData}
              onError={handleError}
            >
              Your browser does not support the video tag.
            </video>
          )}
        </div>
        <div className="flex justify-between items-center flex-wrap gap-2">
          <p className="text-sm text-gray-600">{video.description}</p>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>Duration: {video.duration}</span>
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => window.open(video.videoSrc, '_blank')}
          >
            <Download className="w-4 h-4 mr-1" />
            Download Video
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Help Component ──
export default function Help() {
  const { user } = useAuth();
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [activeRole, setActiveRole] = useState('all');

  const roles = [
    { id: 'all', label: 'All Tutorials', icon: HelpCircle },
    { id: 'driver', label: 'Drivers', icon: Truck },
    { id: 'vendor', label: 'Vendors', icon: Store },
  ];

  const filteredTutorials = activeRole === 'all' 
    ? tutorials 
    : tutorials.filter(t => t.category === activeRole);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-2 mb-3">
          <HelpCircle className="w-8 h-8 text-green" />
          <h1 className="text-3xl font-bold">Video Tutorials</h1>
        </div>
        <p className="text-gray-500 max-w-2xl mx-auto">
          Learn how to use Lloyd's Delivery with these step-by-step video guides.
        </p>
      </div>

      {/* Role Tabs */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {roles.map((role) => {
          const Icon = role.icon;
          const isActive = activeRole === role.id;
          return (
            <Button
              key={role.id}
              variant={isActive ? 'default' : 'outline'}
              className={`flex items-center gap-2 ${
                isActive ? 'bg-green text-white hover:bg-green/90' : ''
              }`}
              onClick={() => setActiveRole(role.id)}
            >
              <Icon className="w-4 h-4" />
              {role.label}
            </Button>
          );
        })}
      </div>

      {/* Tutorial Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {filteredTutorials.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            onPlay={setSelectedVideo}
          />
        ))}
      </div>

      {/* Video Info Card */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">Video Information</p>
            <p className="text-xs text-blue-700 mt-1">
              • Videos are hosted on <strong>Cloudinary</strong> for fast loading.
              <br />
              • Click the play button to watch the tutorial.
              <br />
              • Videos can be downloaded for offline viewing.
            </p>
          </div>
        </div>
      </div>

      {/* Video Player Modal */}
      <VideoPlayer
        video={selectedVideo}
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </div>
  );
}