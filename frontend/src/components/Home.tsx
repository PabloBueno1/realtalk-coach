import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { LogOut, User, Settings, Sun, Moon, BookOpen, BarChart2 } from 'lucide-react'; // Removed MessageSquare

const Home: React.FC = () => {
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check local storage or default to light mode
    const savedMode = localStorage.getItem('darkMode');
    return savedMode === 'true';
  });
  const [lineCoords, setLineCoords] = useState<{ x1: number; y1: number; x2: number; y2: number; }[]>([]);
  
  // Use ref for position tracking to avoid re-renders during animations
  const moduleOffsetsRef = useRef<{ x: number; y: number }[]>([]);
  const [moduleOffsets, setModuleOffsets] = useState<{ x: number; y: number }[]>([]);
  const [basePositions, setBasePositions] = useState<{ x: number; y: number }[]>([]);
  const [manuallyPositioned, setManuallyPositioned] = useState<boolean[]>([]);
  const moduleRefs = useRef<(HTMLDivElement | null)[]>([]);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  
  // New state for tracking dragging
  const [draggedModule, setDraggedModule] = useState<number | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number, y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [recentlyDragged, setRecentlyDragged] = useState(false);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lineUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cachedBoundsRef = useRef<any>(null);
  const rafDragRef = useRef<number | null>(null);

  // Apply theme class to <html> element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', isDarkMode.toString());
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  const handleSignOut = async () => {
    try {
      await axios.post('http://localhost:8000/auth/signout');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      
      // Show success message with better styling
      setMessage('Successfully signed out. Redirecting...');
      setIsSuccess(true);
      
      // Add a nice transition effect
      const messageElement = document.getElementById('signout-message');
      if (messageElement) {
        messageElement.classList.add('animate-fade-in');
      }
      
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (error) {
      setMessage('Error signing out. Please try again.');
      setIsSuccess(false);
    }
  };

  // Updated learning path with conversation types
  const learningPath = [
    { id: 1, title: 'Start' }
  ];

  // Initialize offsets state based on learning path length
  useEffect(() => {
    const initialOffsets = learningPath.map(() => ({ x: 0, y: 0 }));
    setModuleOffsets(initialOffsets);
    moduleOffsetsRef.current = initialOffsets;
    
    // Set initial position in the center
    const initialPositions = [
      { x: 0, y: 0 }  // Center position
    ];
    
    setBasePositions(initialPositions);
    setManuallyPositioned(learningPath.map(() => true));
    
    // Force a recalculation of the lines after positions are set
    setTimeout(() => {
      calculateLines();
    }, 100);
  }, [learningPath.length]);

  // Memoized function to calculate line positions
  const calculateLines = useCallback(() => {
    // No lines needed for single bubble
    setLineCoords([]);
  }, []);

  // Handle drag start
  const handleDragStart = (index: number, event: React.MouseEvent | React.TouchEvent) => {
    // Prevent module navigation when dragging
    event.preventDefault();
    event.stopPropagation();
    
    // Get client coordinates
    const clientX = 'touches' in event 
      ? event.touches[0].clientX 
      : (event as React.MouseEvent).clientX;
    const clientY = 'touches' in event 
      ? event.touches[0].clientY 
      : (event as React.MouseEvent).clientY;
    
    // Cancel any existing animation frame
    if (rafDragRef.current) {
      cancelAnimationFrame(rafDragRef.current);
    }
    
    setDraggedModule(index);
    setDragStartPos({ x: clientX, y: clientY });
    setIsDragging(true);
  };

  // Handle drag move - using requestAnimationFrame for smoother dragging
  const handleDragMove = useCallback((event: MouseEvent | TouchEvent) => {
    if (draggedModule === null || !dragStartPos || !isDragging || !mainRef.current) return;
    
    // Cancel any pending animation frame
    if (rafDragRef.current) {
      cancelAnimationFrame(rafDragRef.current);
    }
    
    // Process drag in an animation frame for smoother performance
    rafDragRef.current = requestAnimationFrame(() => {
      // Get client coordinates
      const clientX = 'touches' in event 
        ? event.touches[0].clientX 
        : (event as MouseEvent).clientX;
      const clientY = 'touches' in event 
        ? event.touches[0].clientY 
        : (event as MouseEvent).clientY;
      
      // Calculate the delta from the start position
      const deltaX = clientX - dragStartPos.x;
      const deltaY = clientY - dragStartPos.y;
      
      // Get module dimensions and main container bounds
      const moduleEl = moduleRefs.current[draggedModule];
      if (!moduleEl || !mainRef.current) return;
      
      // Use cached bounds for smoother dragging
      if (!cachedBoundsRef.current) {
        const mainRect = mainRef.current.getBoundingClientRect();
        const moduleRect = moduleEl.getBoundingClientRect();
        const padding = moduleRect.width / 2;
        
        cachedBoundsRef.current = {
          left: mainRect.left + padding,
          right: mainRect.right - padding,
          top: mainRect.top + padding,
          bottom: mainRect.bottom - padding,
          moduleWidth: moduleRect.width,
          moduleHeight: moduleRect.height
        };
      }
      
      // Update the module positions directly in the ref first
      const newOffsets = [...moduleOffsetsRef.current];
      const startOffset = newOffsets[draggedModule];
      
      // Apply the drag offset
      const newX = startOffset.x + deltaX;
      const newY = startOffset.y + deltaY;
      
      // Update within the ref (no render triggered)
      newOffsets[draggedModule] = {
        x: newX, 
        y: newY
      };
      moduleOffsetsRef.current = newOffsets;
      
      // Then update the state to trigger a render (this batches with other state updates)
      setModuleOffsets(newOffsets);
      
      // Update drag start position for continuous dragging
      setDragStartPos({ x: clientX, y: clientY });
      
      // Throttle line updates during dragging for better performance
      if (!lineUpdateTimeoutRef.current) {
        lineUpdateTimeoutRef.current = setTimeout(() => {
          calculateLines();
          lineUpdateTimeoutRef.current = null;
        }, 60); // Update lines at ~16fps instead of on every frame
      }
    });
  }, [draggedModule, dragStartPos, isDragging, calculateLines]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    // Cancel any pending animation frame
    if (rafDragRef.current) {
      cancelAnimationFrame(rafDragRef.current);
      rafDragRef.current = null;
    }
    
    // Set recently dragged flag to prevent navigation on mouse up
    setRecentlyDragged(true);
    
    // Clear any existing timeouts
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
    if (lineUpdateTimeoutRef.current) {
      clearTimeout(lineUpdateTimeoutRef.current);
      lineUpdateTimeoutRef.current = null;
    }
    
    // Clear cached bounds when drag ends
    cachedBoundsRef.current = null;
    
    // Reset recently dragged after a short delay
    dragTimeoutRef.current = setTimeout(() => {
      setRecentlyDragged(false);
    }, 300); // 300ms is enough to prevent click but not noticeable to users
    
    // Save the current offset as the new base position
    if (draggedModule !== null) {
      // Only finalize position changes when drag ends
      const currentOffset = moduleOffsetsRef.current[draggedModule];
      
      // Calculate the new base position
      const newBasePositions = [...basePositions];
      newBasePositions[draggedModule] = { 
        x: (basePositions[draggedModule]?.x || 0) + currentOffset.x,
        y: (basePositions[draggedModule]?.y || 0) + currentOffset.y
      };
      
      // Apply all changes in a single batch to prevent visual snapping
      const newOffsets = [...moduleOffsetsRef.current];
      newOffsets[draggedModule] = { x: 0, y: 0 };
      
      // Update the refs before the state to ensure consistency
      moduleOffsetsRef.current = newOffsets;
      
      // Update both states together to minimize visual jumps
      setBasePositions(newBasePositions);
      setModuleOffsets(newOffsets);
    }
    
    setDraggedModule(null);
    setDragStartPos(null);
    setIsDragging(false);
    
    // Force a final line calculation after drag ends
    calculateLines();
  }, [calculateLines, draggedModule, basePositions]);

  // Set up global event listeners for drag
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchend', handleDragEnd);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Animation loop effect - optimize to avoid too many state updates
  useEffect(() => {
    const maxOffset = 10.5;
    const stepFactor = 0.084;
    let animating = true;

    const animate = () => {
      if (!animating) return;
      
      // Use the ref for calculations to avoid render churn
      const prevOffsets = moduleOffsetsRef.current;
      const newOffsets = prevOffsets.map((offset, index) => {
        // Skip animation only for the module being actively dragged
        if (index === draggedModule) {
          return offset;
        }
        
        // Generate small random change
        const dx = (Math.random() - 0.5) * 2 * stepFactor;
        const dy = (Math.random() - 0.5) * 2 * stepFactor;

        let newX = offset.x + dx;
        let newY = offset.y + dy;

        // Boundary check with smoother handling
        const distance = Math.sqrt(newX * newX + newY * newY);
        if (distance > maxOffset) {
           // Move back towards the center with a rubber-band effect
           const pullFactor = 1 + ((distance - maxOffset) / maxOffset) * 0.1;
           newX -= (newX / distance) * stepFactor * pullFactor; 
           newY -= (newY / distance) * stepFactor * pullFactor; 
        }
        
        // Clamp to prevent extreme jumps
        newX = Math.max(-maxOffset, Math.min(maxOffset, newX));
        newY = Math.max(-maxOffset, Math.min(maxOffset, newY));

        return { x: newX, y: newY };
      });

      // Update ref immediately for smooth animation continuity
      moduleOffsetsRef.current = newOffsets;
      
      // Update state less frequently to avoid excessive renders
      // We use a 2-frame cycle to update state (~30 state updates per second at 60fps)
      if (animationFrameId.current && animationFrameId.current % 2 === 0) {
        setModuleOffsets(newOffsets);
        
        // Only recalculate lines when not actively dragging
        if (!isDragging) {
          calculateLines();
        }
      }
      
      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      animating = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [calculateLines, draggedModule, isDragging]);

  // Effect for resize handling / Initial line calculation
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      // Recalculate lines on resize (will use last known offsets if animation isn't running)
      resizeTimeout = setTimeout(calculateLines, 100); 
    };
    // Calculate initial lines once refs are likely set
    const initialTimeout = setTimeout(calculateLines, 0);
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(initialTimeout);
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateLines]);

  // Clean up any timeouts on unmount
  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
      if (lineUpdateTimeoutRef.current) {
        clearTimeout(lineUpdateTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Signout Message */}
      {message && (
        <div 
          id="signout-message"
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 ${
            isSuccess 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}
        >
          <div className="flex items-center space-x-2">
            {isSuccess ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span>{message}</span>
          </div>
        </div>
      )}
      
      <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
        {/* Main Content - Now comes first */}
        <main ref={mainRef} className="flex-1 p-8 overflow-y-auto bg-gray-100 dark:bg-gray-900 relative">
          <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-gray-200">Dashboard</h1>

          {/* Changed to use absolute positioning with more height */}
          <div ref={gridRef} className="relative w-full h-[600px] flex items-center justify-center m-auto">
            {/* Map learning path modules - Moved outside of SVG for better positioning */}
            {learningPath.map((module, index) => (
              <div
                key={module.id}
                ref={el => { moduleRefs.current[index] = el; }}
                className={`absolute z-10 w-48 h-48 rounded-full p-4 shadow-md flex flex-col items-center justify-center text-center 
                  bg-green-200 dark:bg-green-700 hover:bg-green-300 dark:hover:bg-green-600 cursor-pointer
                  ${draggedModule === index ? 'ring-4 ring-blue-500 shadow-lg' : ''}
                `}
                onMouseDown={(e) => handleDragStart(index, e)}
                onTouchStart={(e) => handleDragStart(index, e)}
                onClick={(e) => {
                  // Only navigate if not dragging and not recently dragged
                  if (!isDragging && !recentlyDragged) {
                    navigate(`/practice/${module.id}`);
                  }
                }}
                style={{ 
                  transform: `translate(${(basePositions[index]?.x ?? 0) + (moduleOffsets[index]?.x ?? 0)}px, ${(basePositions[index]?.y ?? 0) + (moduleOffsets[index]?.y ?? 0)}px)`,
                  cursor: isDragging && draggedModule === index ? 'grabbing' : 'grab'
                }}
              >
                <h3 className={`font-bold text-2xl mb-3 text-green-800 dark:text-green-100`}>{module.title}</h3>
                <button 
                  className="mt-3 px-3 py-1 w-16 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-full shadow-sm transition-colors dark:bg-green-600 dark:hover:bg-green-500"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent event bubbling to parent
                    navigate(`/practice/${module.id}`);
                  }}
                  aria-label={`Start ${module.title} module`}
                >
                  Start
                </button>
              </div>
            ))}
          </div>
        </main>

        {/* Bottom Bar (formerly Sidebar) */}
        <aside className="w-full bg-white dark:bg-gray-800 p-3 shadow-md flex flex-row justify-between items-center">
          <h2 className="text-xl font-bold text-primary-600 dark:text-primary-400">Fidupia</h2>
          
          <nav className="flex-grow mx-4">
            <ul className="flex flex-row justify-center space-x-6">
              <li>
                <a href="#" className="flex items-center p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                  <BookOpen className="w-5 h-5 mr-2" /> Learn
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/profile');
                  }}
                  className="flex items-center p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                >
                  <User className="w-5 h-5 mr-2" /> Profile
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/scores');
                  }}
                  className="flex items-center p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                >
                  <BarChart2 className="w-5 h-5 mr-2" /> Scores
                </a>
              </li>
            </ul>
          </nav>

          <div className="flex items-center space-x-2">
            {/* Dark Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button
              onClick={handleSignOut}
              className="p-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Home; 