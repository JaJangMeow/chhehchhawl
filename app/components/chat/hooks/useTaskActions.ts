import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/app/lib/supabase';
import { taskService } from '@/app/services/taskService';
import { logger } from '@/app/utils/logger';
import { taskAcceptanceService } from '@/app/services/taskAcceptanceService';

interface Task {
  id: string;
  status: string;
  created_by: string;
  assigned_to?: string;
  title: string;
  description?: string;
  budget?: number;
  location?: {
    address?: string;
    lat?: number;
    lng?: number;
    display_name?: string;
  };
  building_name?: string;
  locality?: string;
  category?: string;
  categories?: string[];
  deadline?: string;
  created_at?: string;
}

const useTaskActions = (
  taskId: string | undefined, 
  conversationId: string, 
  currentUserId: string | null,
  // Function to add system messages - uses special UUID '00000000-0000-0000-0000-000000000000' for system
  addSystemMessage: (content: string) => void,
  setToastMessage: (message: string) => void,
  setShowToast: (show: boolean) => void,
  loadMessages: () => void
) => {
  const [task, setTask] = useState<Task | null>(null);
  const [taskActionLoading, setTaskActionLoading] = useState(false);
  
  // Load task details if taskId is provided
  useEffect(() => {
    if (!taskId) return;
    
    const fetchTaskDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('id, status, created_by, assigned_to, title, description, budget, location, building_name, locality, category, categories, deadline, created_at')
          .eq('id', taskId)
          .maybeSingle();
          
        if (error) throw error;
        
        if (!data) {
          logger.warn(`Task with ID ${taskId} not found`);
          return;
        }
        
        setTask(data);
      } catch (err) {
        logger.error('Error fetching task details:', err);
      }
    };
    
    fetchTaskDetails();
    
    // Subscribe to task changes
    const taskSubscription = supabase
      .channel(`task:${taskId}`)
      .on('postgres_changes', {
        event: '*', 
        schema: 'public',
        table: 'tasks',
        filter: `id=eq.${taskId}`
      }, payload => {
        setTask(payload.new as Task);
      })
      .subscribe();
      
    return () => {
      taskSubscription.unsubscribe();
    };
  }, [taskId]);
  
  // Add a separate function to reload task details
  const reloadTaskDetails = async () => {
    if (!taskId) return;
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, status, created_by, assigned_to, title, description, budget, location, building_name, locality, category, categories, deadline, created_at')
        .eq('id', taskId)
        .maybeSingle();
        
      if (error) throw error;
      
      if (!data) {
        logger.warn(`Task with ID ${taskId} not found when reloading`);
        return;
      }
      
      setTask(data);
    } catch (err) {
      logger.error('Error fetching task details:', err);
    }
  };
  
  // Handle task completion by tasker
  const handleMarkFinished = async () => {
    if (!task || !taskId) return;
    
    Alert.alert(
      "Mark Task as Finished?",
      "Are you sure you want to mark this task as finished? This will notify the task poster to confirm completion. The task will remain pending until they confirm.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, I'm Done", 
          onPress: async () => {
            setTaskActionLoading(true);
            try {
              const result = await taskService.markTaskFinished(taskId);
              
              if (result.success) {
                // Show toast notification
                setToastMessage("Task marked as finished! Waiting for confirmation from task owner.");
                setShowToast(true);
                
                // Add system message with more emphasis
                addSystemMessage("✅ Task marked as finished! The task owner will review and confirm completion. Please wait for their confirmation.");
                
                // Refresh task details
                reloadTaskDetails();
                
                // Refresh messages immediately
                loadMessages();
                
                // Add real-time update to notify task owner
                await supabase
                  .from('task_notifications')
                  .insert({
                    task_id: taskId,
                    user_id: task.created_by,
                    type: 'task_finished',
                    content: 'A tasker has marked your task as finished. Please confirm completion in the chat.',
                    is_read: false,
                    created_at: new Date().toISOString()
                  });
              } else {
                Alert.alert("Error", result.error || "Failed to mark task as finished");
              }
            } catch (err) {
              logger.error('Error marking task as finished:', err);
              Alert.alert("Error", "Failed to mark task as finished. Please try again.");
            } finally {
              setTaskActionLoading(false);
            }
          }
        }
      ]
    );
  };
  
  // Handle task confirmation by poster
  const handleConfirmComplete = async () => {
    if (!task || !taskId) return;
    
    Alert.alert(
      "Confirm Task Completion?",
      "Are you sure you want to confirm this task is complete? This will mark the task as completed and move it to your Task History page.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Confirm Completion", 
          onPress: async () => {
            setTaskActionLoading(true);
            try {
              const result = await taskService.confirmTaskComplete(taskId);
              
              if (result.success) {
                // Show toast notification
                setToastMessage("Task marked as completed and moved to history!");
                setShowToast(true);
                
                // Add system message
                addSystemMessage("🎉 Task has been completed successfully! This task has been moved to your Task History page.");
                
                // Refresh task details
                reloadTaskDetails();
                
                // Refresh messages immediately
                loadMessages();
                
                // Add real-time update to notify the tasker
                if (task.assigned_to) {
                  await supabase
                    .from('task_notifications')
                    .insert({
                      task_id: taskId,
                      user_id: task.assigned_to,
                      type: 'task_completed',
                      content: 'The task owner has confirmed task completion! The task has been moved to your Task History.',
                      is_read: false,
                      created_at: new Date().toISOString()
                    });
                }
              } else {
                Alert.alert("Error", result.error || "Failed to confirm task completion");
              }
            } catch (err) {
              logger.error('Error confirming task completion:', err);
              Alert.alert("Error", "Failed to confirm task completion. Please try again.");
            } finally {
              setTaskActionLoading(false);
            }
          }
        }
      ]
    );
  };
  
  // Handle task acceptance status updates
  const handleAcceptanceStatusUpdate = async (acceptanceId: string, status: 'confirmed' | 'rejected') => {
    if (!taskId || !currentUserId) return;
    
    setTaskActionLoading(true);
    try {
      const result = await taskAcceptanceService.updateAcceptanceStatus(acceptanceId, status);
      
      if (result.success) {
        // Show toast notification
        setToastMessage(`Task acceptance ${status}!`);
        setShowToast(true);
        
        // Add system message
        const messageText = status === 'confirmed' 
          ? "✅ Task acceptance confirmed! You can now start working on this task."
          : "❌ Task acceptance rejected.";
        
        addSystemMessage(messageText);
        
        // Refresh task details
        reloadTaskDetails();
        
        // Refresh messages immediately
        loadMessages();
      } else {
        Alert.alert("Error", result.error || `Failed to ${status} task acceptance`);
      }
    } catch (err) {
      logger.error(`Error ${status} task acceptance:`, err);
      Alert.alert("Error", `Failed to ${status} task acceptance. Please try again.`);
    } finally {
      setTaskActionLoading(false);
    }
  };
  
  // Handle task cancellation by either party
  const handleCancelTask = async () => {
    if (!task || !taskId || !currentUserId) return;
    
    // Check if user is allowed to cancel
    const isOwner = task.created_by === currentUserId;
    const isTasker = task.assigned_to === currentUserId;
    
    if (!isOwner && !isTasker) {
      Alert.alert("Error", "You don't have permission to cancel this task.");
      return;
    }
    
    // Different messaging based on role
    const title = isOwner ? "Cancel Your Task?" : "Cancel Task Assignment?";
    const message = isOwner 
      ? "Are you sure you want to cancel this task? This cannot be undone."
      : "Are you sure you want to cancel your assignment to this task? This cannot be undone.";
    
    Alert.alert(
      title,
      message,
      [
        { text: "No", style: "cancel" },
        { 
          text: "Yes, Cancel", 
          style: "destructive",
          onPress: async () => {
            setTaskActionLoading(true);
            try {
              let result;
              
              if (isOwner) {
                // Owner cancelling the task entirely
                result = await taskService.cancelTask(taskId);
              } else {
                // Tasker cancelling their assignment
                result = await taskService.cancelTaskAssignment(taskId);
              }
              
              if (result.success) {
                // Show toast notification
                setToastMessage(isOwner ? "Task cancelled" : "Task assignment cancelled");
                setShowToast(true);
                
                // Add system message
                const messageText = isOwner 
                  ? "⚠️ The task owner has cancelled this task."
                  : "⚠️ The tasker has cancelled their assignment to this task.";
                
                addSystemMessage(messageText);
                
                // Refresh task details
                reloadTaskDetails();
                
                // Refresh messages immediately
                loadMessages();
                
                // Notify the other party
                const notifyUserId = isOwner ? task.assigned_to : task.created_by;
                
                if (notifyUserId) {
                  await supabase
                    .from('task_notifications')
                    .insert({
                      task_id: taskId,
                      user_id: notifyUserId,
                      type: 'task_cancelled',
                      content: isOwner 
                        ? 'The task owner has cancelled this task.'
                        : 'The tasker has cancelled their assignment to this task.',
                      is_read: false,
                      created_at: new Date().toISOString()
                    });
                }
              } else {
                Alert.alert("Error", result.error || "Failed to cancel task");
              }
            } catch (err) {
              logger.error('Error cancelling task:', err);
              Alert.alert("Error", "Failed to cancel task. Please try again.");
            } finally {
              setTaskActionLoading(false);
            }
          }
        }
      ]
    );
  };
  
  return {
    task,
    taskActionLoading,
    handleMarkFinished,
    handleConfirmComplete,
    handleAcceptanceStatusUpdate,
    handleCancelTask
  };
};

export { useTaskActions };
export default useTaskActions; 