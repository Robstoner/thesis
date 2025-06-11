import { useState, useEffect, useRef } from 'react';
import FoodService from '../services/FoodService';

interface ProcessingStatus {
  food_id: number;
  status: 'processing' | 'analyzing_nutrition' | 'analyzing_ingredients' | 'completed' | 'error';
  progress_message?: string;
  has_nutrition_data: boolean;
  has_ingredients_processed: boolean;
  last_updated: string;
}

interface UseProcessingStatusOptions {
  pollInterval?: number; // milliseconds
  maxRetries?: number;
  enabled?: boolean;
}

export function useProcessingStatus(
  foodId: number | null,
  options: UseProcessingStatusOptions = {}
) {
  const {
    pollInterval = 3000, // 3 seconds
    maxRetries = 30, // Increased to 90 seconds since we have OCR + AI
    enabled = true
  } = options;

  const [status, setStatus] = useState<ProcessingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const retriesRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkStatus = async () => {
    if (!foodId || !enabled) return;

    try {
      setLoading(true);
      setError(null);
      
      const statusData = await FoodService.getProcessingStatus(foodId);
      setStatus(statusData);

      // Stop polling if completed or error, or max retries reached
      if (
        statusData.status === 'completed' || 
        statusData.status === 'error' ||
        retriesRef.current >= maxRetries
      ) {
        stopPolling();
      } else {
        retriesRef.current += 1;
      }
    } catch (err: any) {
      setError(err.message);
      retriesRef.current += 1;
      
      if (retriesRef.current >= maxRetries) {
        stopPolling();
      }
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    if (intervalRef.current) return; // Already polling
    
    retriesRef.current = 0;
    checkStatus(); // Check immediately
    
    intervalRef.current = setInterval(checkStatus, pollInterval);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const resetAndPoll = () => {
    stopPolling();
    retriesRef.current = 0;
    setStatus(null);
    setError(null);
    startPolling();
  };

  useEffect(() => {
    if (foodId && enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [foodId, enabled, pollInterval]);

  const getProgressMessage = (): string => {
    // Use server-provided progress message if available
    if (status?.progress_message) {
      return status.progress_message;
    }
    
    // Fallback to status-based messages
    if (!status) return 'Starting...';
    
    switch (status.status) {
      case 'processing':
        return 'Extracting text from images...';
      case 'analyzing_nutrition':
        return 'Analyzing nutrition information...';
      case 'analyzing_ingredients':
        return 'Analyzing ingredients list...';
      case 'completed':
        return 'Analysis complete!';
      case 'error':
        return 'Analysis failed';
      default:
        return 'Processing...';
    }
  };

  const getProgressPercentage = (): number => {
    if (!status) return 0;
    
    switch (status.status) {
      case 'processing':
        return 25;  // OCR extraction phase
      case 'analyzing_nutrition':
        return 50;  // Nutrition AI analysis
      case 'analyzing_ingredients':
        return 75;  // Ingredients AI analysis
      case 'completed':
        return 100;
      case 'error':
        return 100; // Show as complete but red
      default:
        return 0;
    }
  };

  const getDetailedSteps = () => {
    const steps = [
      {
        name: 'Extract Text',
        description: 'Reading text from images using OCR',
        completed: status?.status !== 'processing' && status?.status !== undefined,
        active: status?.status === 'processing'
      },
      {
        name: 'Analyze Nutrition',
        description: 'AI analysis of nutrition information',
        completed: status && ['analyzing_ingredients', 'completed'].includes(status.status),
        active: status?.status === 'analyzing_nutrition'
      },
      {
        name: 'Analyze Ingredients',
        description: 'AI analysis of ingredients list',
        completed: status?.status === 'completed',
        active: status?.status === 'analyzing_ingredients'
      }
    ];

    return steps;
  };

  return {
    status,
    loading,
    error,
    isProcessing: status?.status && ['processing', 'analyzing_nutrition', 'analyzing_ingredients'].includes(status.status),
    isCompleted: status?.status === 'completed',
    hasError: status?.status === 'error' || !!error,
    progressMessage: getProgressMessage(),
    progressPercentage: getProgressPercentage(),
    detailedSteps: getDetailedSteps(),
    startPolling,
    stopPolling,
    resetAndPoll
  };
}