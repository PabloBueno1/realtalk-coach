import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Camera, CameraOff } from 'lucide-react';

// Mapping from module ID to title
const moduleTitles: { [key: string]: string } = {
  '1': 'Formal Conversations',
  '2': 'Informal Conversations',
  '3': 'Presentations',
  '4': 'Networking',
};

const ConversationPractice: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pageTitle = moduleId ? moduleTitles[moduleId] || 'Practice' : 'Practice';

  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);

  // Effect to set the document title
  useEffect(() => {
    const originalTitle = document.title;
    document.title = `RealTalk | ${pageTitle}`;
    // Optional: Reset title on unmount
    // return () => {
    //   document.title = originalTitle;
    // };
  }, [pageTitle]);

  useEffect(() => {
    const getMediaPermissions = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setStream(mediaStream);
        setPermissionError(null);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setIsCameraOn(mediaStream.getVideoTracks().length > 0 && mediaStream.getVideoTracks()[0].enabled);
        setIsMicOn(mediaStream.getAudioTracks().length > 0 && mediaStream.getAudioTracks()[0].enabled);
      } catch (err) {
        console.error('Error accessing media devices.', err);
        if (err instanceof Error) {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setPermissionError('Permission denied. Please allow camera and microphone access in your browser settings.');
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                 setPermissionError('No camera or microphone found. Please ensure they are connected and enabled.');
            } else {
                setPermissionError(`An error occurred: ${err.message}`);
            }
        } else {
             setPermissionError('An unknown error occurred while accessing media devices.');
        }
        setStream(null);
        setIsCameraOn(false);
        setIsMicOn(false);
      }
    };

    getMediaPermissions();

    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const toggleCamera = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
        setIsCameraOn(track.enabled);
      });
    }
  };

  const toggleMic = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
        setIsMicOn(track.enabled);
      });
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div 
        onClick={() => navigate('/home')} 
        className="absolute top-4 left-4 cursor-pointer z-10"
        aria-label="Go back to dashboard"
      >
        <div 
          className="w-8 h-8 flex items-center justify-center text-gray-800 dark:text-gray-200 hover:text-black dark:hover:text-white transition-colors"
          style={{
            width: '0',
            height: '0',
            borderTop: '12px solid transparent',
            borderRight: '24px solid currentColor',
            borderBottom: '12px solid transparent'
          }}
        ></div>
      </div>

      <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-200 pt-8">Practice Session: {pageTitle}</h1>
      
      {permissionError && (
        <div className="message error mb-4 p-4 bg-red-100 text-red-800 rounded-lg">
          <p>Error: {permissionError}</p>
          <p className="mt-2 text-sm">You might need to adjust permissions in your browser's settings for this site.</p>
        </div>
      )}

      <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        {stream ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-md aspect-video bg-black"></video>
        ) : (
          <div className="w-full rounded-md aspect-video bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">
              {permissionError ? 'Camera unavailable' : 'Requesting camera access...'}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center space-x-4 mt-6">
        <button
          onClick={toggleCamera}
          disabled={!stream || !!permissionError}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md transition-colors ${isCameraOn ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-400 hover:bg-gray-500'} text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${isCameraOn ? 'focus:ring-gray-500' : 'focus:ring-gray-300'} disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
        >
          {isCameraOn ? <Camera size={24} /> : <CameraOff size={24} />}
        </button>

        <button
          disabled={!stream || !!permissionError} 
          className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-colors ${!stream || !!permissionError ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2'} `}
          aria-label="Start Recording"
        >
        </button>

        <button
          onClick={toggleMic}
          disabled={!stream || !!permissionError}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md transition-colors ${isMicOn ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-400 hover:bg-gray-500'} text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${isMicOn ? 'focus:ring-gray-500' : 'focus:ring-gray-300'} disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label={isMicOn ? 'Turn Microphone Off' : 'Turn Microphone On'}
        >
          {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
        </button>
      </div>
    </div>
  );
};

export default ConversationPractice;