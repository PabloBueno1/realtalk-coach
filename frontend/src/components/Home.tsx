import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { LogOut, User, Settings, Sun, Moon, MessageSquare, BookOpen } from 'lucide-react'; // Added BookOpen

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
      setMessage('Successfully signed out. Redirecting...');
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 1000);
    } catch (error) {
      setMessage('Error signing out. Please try again.');
      setIsSuccess(false);
    }
  };

  // Updated learning path with conversation types
  const learningPath = [
    { id: 1, title: 'Formal' },
    { id: 2, title: 'Informal' },
    { id: 3, title: 'Presentations' },
    { id: 4, title: 'Networking' },
    // Add more modules as needed
  ];

  // Initialize offsets state based on learning path length
  useEffect(() => {
    const initialOffsets = learningPath.map(() => ({ x: 0, y: 0 }));
    setModuleOffsets(initialOffsets);
    moduleOffsetsRef.current = initialOffsets;
    
    // Set initial positions in a square at 45-degree angle (diamond pattern)
    const positionDistance = 300; // Further increase distance for better separation
    
    // Log the modules to ensure they're in the expected order
    console.log("Learning path modules:", learningPath.map(m => m.title));
    
    // Assign specific positions based on the module index to force correct placement
    const initialPositions = [
      { x: 0, y: -positionDistance }, // Top (Formal)
      { x: positionDistance, y: 0 },  // Right (Informal)
      { x: 0, y: positionDistance },  // Bottom (Presentations)
      { x: -positionDistance, y: 0 }  // Left (Networking)
    ];
    
    // Ensure we only use as many positions as we have modules
    const positionsToUse = initialPositions.slice(0, learningPath.length);
    
    console.log("Initial positions:", positionsToUse);
    
    setBasePositions(positionsToUse);
    setManuallyPositioned(learningPath.map(() => true)); // Mark as manually positioned
    
    // Force a recalculation of the lines after positions are set
    setTimeout(() => {
      calculateLines();
    }, 100);
  }, [learningPath.length]);

  // Memoized function to calculate line positions
  const calculateLines = useCallback(() => {
    if (!gridRef.current || learningPath.length < 1) return;
    const gridRect = gridRef.current.getBoundingClientRect();
    const newCoords = [];

    // Sequential connections
    for (let i = 0; i < learningPath.length - 1; i++) {
      const startNode = moduleRefs.current[i];
      const endNode = moduleRefs.current[i + 1];
      if (startNode && endNode) {
        const startRect = startNode.getBoundingClientRect(); // getBoundingClientRect includes transforms
        const endRect = endNode.getBoundingClientRect();
        const x1 = startRect.left + startRect.width / 2 - gridRect.left;
        const y1 = startRect.top + startRect.height / 2 - gridRect.top;
        const x2 = endRect.left + endRect.width / 2 - gridRect.left;
        const y2 = endRect.top + endRect.height / 2 - gridRect.top;
        newCoords.push({ x1, y1, x2, y2 });
      }
    }
    
    // Direct 1 -> 4 connection
    if (learningPath.length >= 4) {
        const startNode1 = moduleRefs.current[0]; 
        const endNode4 = moduleRefs.current[3];
        if (startNode1 && endNode4) {
          const startRect = startNode1.getBoundingClientRect();
          const endRect = endNode4.getBoundingClientRect();
          const x1 = startRect.left + startRect.width / 2 - gridRect.left;
          const y1 = startRect.top + startRect.height / 2 - gridRect.top;
          const x2 = endRect.left + endRect.width / 2 - gridRect.left;
          const y2 = endRect.top + endRect.height / 2 - gridRect.top;
          newCoords.push({ x1, y1, x2, y2 });
        }
    }
    
    setLineCoords(newCoords);
  }, [learningPath.length]); // Dependency on length

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
      
      setBasePositions(prev => {
        const newBasePositions = [...prev];
        newBasePositions[draggedModule] = { ...currentOffset };
        return newBasePositions;
      });
      
      // Reset the current offset to 0 since the base position now includes the dragged offset
      const newOffsets = [...moduleOffsetsRef.current];
      newOffsets[draggedModule] = { x: 0, y: 0 };
      moduleOffsetsRef.current = newOffsets;
      setModuleOffsets(newOffsets);
    }
    
    setDraggedModule(null);
    setDragStartPos(null);
    setIsDragging(false);
    
    // Force a final line calculation after drag ends
    calculateLines();
  }, [calculateLines, draggedModule]);

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
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* Main Content - Now comes first */}
      <main ref={mainRef} className="flex-1 p-8 overflow-y-auto bg-gray-100 dark:bg-gray-900 relative">
        <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-gray-200">Dashboard</h1>

        {message && (
          <div className={`message ${isSuccess ? 'success' : 'error'} mb-6`}>
            {message}
          </div>
        )}

        {/* Changed to use absolute positioning with more height */}
        <div ref={gridRef} className="relative w-full h-[600px] flex items-center justify-center m-auto">
          {/* SVG Layer for Lines - Positioned absolutely behind the grid items */}
          <svg className="absolute top-0 left-0 w-full h-full overflow-visible z-0" style={{ pointerEvents: 'none' }}>
            {lineCoords.map((coords, index) => {
              // Calculate midpoint between the two points
              const midX = (coords.x1 + coords.x2) / 2;
              const midY = (coords.y1 + coords.y2) / 2;
              
              // Calculate the perpendicular offset for the control point
              // Direction varies based on whether it's the direct 1->4 connection (last line) or sequential
              const isDirectConnection = index === lineCoords.length - 1 && learningPath.length >= 4;
              const offsetDirection = isDirectConnection ? -1 : 1; // Opposite curve for direct connection
              
              // Calculate the perpendicular vector to the line
              const dx = coords.x2 - coords.x1;
              const dy = coords.y2 - coords.y1;
              const len = Math.sqrt(dx * dx + dy * dy);
              
              // Determine curve intensity based on line length
              const curveIntensity = Math.min(len * 0.3, 50); // Limit max curve
              
              // Calculate control point by offsetting the midpoint perpendicular to the line
              const controlX = midX + offsetDirection * (-dy / len) * curveIntensity;
              const controlY = midY + offsetDirection * (dx / len) * curveIntensity;
              
              return (
                <path
                  key={index}
                  d={`M ${coords.x1} ${coords.y1} Q ${controlX} ${controlY} ${coords.x2} ${coords.y2}`}
                  fill="none"
                  stroke="#6b7280"
                  strokeWidth="3"
                  strokeDasharray="6, 6"
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
          
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
              <a href="#" className="flex items-center p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                <User className="w-5 h-5 mr-2" /> Profile
              </a>
            </li>
            <li>
              <Link 
                to="/chat" 
                className="flex items-center p-2 text-gray-700 hover:bg-gray-100 rounded-lg dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                <span>Chat</span>
              </Link>
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
  );
};

export default Home; 