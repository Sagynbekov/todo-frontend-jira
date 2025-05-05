"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { auth } from '../../lib/firebase';
import { authFetch } from '../../lib/auth-utils';
import { FaArrowLeft, FaUsers, FaCalendarAlt, FaUserCircle, FaTasks, FaHome, FaUserCog, FaCheckCircle, FaExclamationCircle, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register necessary components for Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

interface Project {
  id: number;
  name: string;
  user_id: string;
  members: string[];
}

interface Column {
  id: number;
  name: string;
  project: number;
  order: number;
}

interface Task {
  completed: boolean;
  id: number;
  title: string;
  description: string;
  column: number;
  order: number;
  created_at: string;
  updated_at: string;
  creator: string | null;
  creator_email: string | null;
  completed_by?: number | null;  // ID of who completed the task
  completed_by_email?: string | null; // Email of who completed the task
  deadline?: string | null; // Add deadline field
}

interface Member {
  firebase_user_id: string;
  email: string;
  profile_photo: string | null;
}

// Types for member metrics
interface MemberMetrics {
  email: string;
  tasksCreated: number;
  tasksCompleted: number;
  tasksOverdue: number; 
}

// Type of chart currently displayed
type ChartType = 'created' | 'completed' | 'overdue';

export default function ProjectDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberMetrics, setMemberMetrics] = useState<MemberMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChart, setActiveChart] = useState<ChartType>('created');
  // Add state for legend pagination
  const [legendPage, setLegendPage] = useState(0);
  
  // Determine project owner
  const isOwner = (memberId: string) => project?.user_id === memberId;

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      
      if (projectId) {
        fetchProjectDetails(parseInt(projectId));
      }
    });

    return () => unsubscribe();
  }, [projectId, router]);

  // Fetch project details
  const fetchProjectDetails = async (id: number) => {
    setLoading(true);
    setError(null);

    try {
      // Fetch project details
      const projectResponse = await authFetch(`http://localhost:8000/api/projects/${id}/`);
      if (!projectResponse.ok) {
        throw new Error(`Failed to fetch project: ${projectResponse.status}`);
      }
      const projectData = await projectResponse.json();
      setProject(projectData);

      // Initialize tasks array
      let allTasks: Task[] = [];

      // Fetch columns for this project
      const columnsResponse = await authFetch(`http://localhost:8000/api/columns/?project_id=${id}`);
      if (columnsResponse.ok) {
        const columnsData = await columnsResponse.json();
        setColumns(columnsData);

        // Fetch tasks for each column
        for (const column of columnsData) {
          const tasksResponse = await authFetch(`http://localhost:8000/api/tasks/?column_id=${column.id}`);
          if (tasksResponse.ok) {
            const columnTasks = await tasksResponse.json();
            allTasks.push(...columnTasks);
          }
        }
        setTasks(allTasks);
      }

      // Fetch members details
      // 1) first gather project member details
      const memberDetails: Member[] = [];
      for (const email of projectData.members || []) {
        const userResponse = await authFetch(
          `http://localhost:8000/api/firebase-users/?email=${email}`
        );
        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.length > 0) memberDetails.push(userData[0]);
        }
      }

      // 2) then fetch project owner
      let owner: Member | null = null;
      const ownerResp = await authFetch(
        `http://localhost:8000/api/firebase-users/?firebase_user_id=${projectData.user_id}`
      );
      if (ownerResp.ok) {
        const ownerData = await ownerResp.json();
        if (ownerData.length > 0) owner = ownerData[0];
      }

      // 3) combine into one array (owner first)
      const allMembers = owner ? [owner, ...memberDetails] : memberDetails;

      setMembers(allMembers);
      generateMemberMetrics(allMembers, allTasks);
    } catch (err) {
      console.error('Error fetching project details:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  // Function to generate member metrics with updated overdue tasks calculation
  const generateMemberMetrics = (members: Member[], tasks: Task[]) => {
    const metrics: MemberMetrics[] = members.map(member => {
      const memberEmail = member.email.toLowerCase().trim();
  
      // Tasks created by this user
      const createdTasks = tasks.filter(task =>
        task.creator_email?.toLowerCase().trim() === memberEmail
      );
  
      // Tasks completed by this user
      const completedTasks = tasks.filter(task =>
        task.completed === true && 
        task.completed_by_email?.toLowerCase().trim() === memberEmail
      );
  
      // Calculate ALL overdue tasks - tasks created by this user that have a deadline in the past
      // regardless of completion status
      const overdueTasks = tasks.filter(task => {
        // Check if task was created by this user
        const isCreator = task.creator_email?.toLowerCase().trim() === memberEmail;
        
        // Check if task has a deadline and is in the past
        const hasDeadline = !!task.deadline;
        const isPastDeadline = hasDeadline && new Date(task.deadline!) < new Date();
        
        // Task is overdue if: created by this user and has past deadline (regardless of completion)
        return isCreator && isPastDeadline;
      });
  
      return {
        email: member.email,
        tasksCreated: createdTasks.length,
        tasksCompleted: completedTasks.length,
        tasksOverdue: overdueTasks.length
      };
    });
  
    setMemberMetrics(metrics.length ? metrics : []);
  };

  // Function to prepare chart data based on selected type
  const getChartData = () => {
    // Base colors for the chart
    const backgroundColors = [
      'rgba(255, 99, 132, 0.7)',
      'rgba(54, 162, 235, 0.7)',
      'rgba(255, 206, 86, 0.7)',
      'rgba(75, 192, 192, 0.7)',
      'rgba(153, 102, 255, 0.7)',
      'rgba(255, 159, 64, 0.7)',
      'rgba(199, 199, 199, 0.7)',
    ];
    
    const borderColors = [
      'rgba(255, 99, 132, 1)',
      'rgba(54, 162, 235, 1)',
      'rgba(255, 206, 86, 1)',
      'rgba(75, 192, 192, 1)',
      'rgba(153, 102, 255, 1)',
      'rgba(255, 159, 64, 1)',
      'rgba(199, 199, 199, 1)',
    ];
    
    let labels: string[] = [];
    let data: number[] = [];
    let title = '';
    
    // Filter out members with 0 values based on selected chart type
    // This ensures we only display relevant members in the chart
    let filteredMetrics = [...memberMetrics];
    
    // Depending on the selected chart type
    switch(activeChart) {
      case 'created':
        title = 'Created Tasks';
        filteredMetrics = memberMetrics.filter(m => m.tasksCreated > 0);
        labels = filteredMetrics.map(m => m.email);
        data = filteredMetrics.map(m => m.tasksCreated);
        break;
      case 'completed':
        title = 'Completed Tasks';
        filteredMetrics = memberMetrics.filter(m => m.tasksCompleted > 0);
        labels = filteredMetrics.map(m => m.email);
        data = filteredMetrics.map(m => m.tasksCompleted);
        break;
      case 'overdue':
        title = 'Overdue Tasks';
        filteredMetrics = memberMetrics.filter(m => m.tasksOverdue > 0);
        labels = filteredMetrics.map(m => m.email);
        data = filteredMetrics.map(m => m.tasksOverdue);
        break;
    }
    
    // If no data for the selected chart type, show a message
    if (data.length === 0) {
      return {
        labels: ['No data'],
        datasets: [{
          label: title,
          data: [1],
          backgroundColor: ['rgba(200, 200, 200, 0.7)'],
          borderColor: ['rgba(200, 200, 200, 1)'],
          borderWidth: 1,
        }],
        percentages: ['100'],
        noData: true
      };
    }
    
    // Calculate percentages for each user
    const total = data.reduce((sum, value) => sum + value, 0) || 1; // Prevent division by zero
    const percentages = data.map(value => ((value / total) * 100).toFixed(1));
    
    return {
      labels,
      datasets: [
        {
          label: title,
          data,
          backgroundColor: backgroundColors.slice(0, data.length),
          borderColor: borderColors.slice(0, data.length),
          borderWidth: 1,
        },
      ],
      percentages,
      noData: false
    };
  };

  const handleBackToHome = () => {
    router.push('/home');
  };

  const handleGoToProjectPage = () => {
    router.push(`/home?projectId=${projectId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => router.push('/home')}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={handleBackToHome}
                className="hover:bg-white/10 p-2 rounded-full transition-colors"
              >
                <FaArrowLeft size={18} />
              </button>
              <h1 className="text-2xl font-bold">{project?.name || 'Project Information'}</h1>
            </div>
            
            <button
              onClick={handleGoToProjectPage}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <FaHome size={16} />
              <span>Open Project</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {project && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Information */}
            <div className="col-span-2">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
                  <h2 className="text-2xl font-bold text-white">{project.name}</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-800 mb-4">Project Statistics</h3>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                            <FaUsers size={20} />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Members</p>
                            <p className="text-lg font-semibold">{project.members.length}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="bg-purple-100 text-purple-600 p-2 rounded-lg">
                            <FaTasks size={20} />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Tasks</p>
                            <p className="text-lg font-semibold">{tasks.length}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
                            <FaCalendarAlt size={20} />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Columns</p>
                            <p className="text-lg font-semibold">{columns.length}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium text-gray-800 mb-4">Columns</h3>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {columns.length > 0 ? (
                          columns.map(column => (
                            <div 
                              key={column.id}
                              className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200"
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <h4 className="font-medium text-gray-700">{column.name}</h4>
                                  <p className="text-sm text-gray-500">
                                    {tasks.filter(t => t.column === column.id).length} tasks
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500">No columns found</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Task Analytics by Members */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6">
                  <h2 className="text-2xl font-bold text-white">Task Analytics</h2>
                </div>
                <div className="p-6">
                  {/* Chart Type Switcher */}
                  <div className="mb-6 flex justify-center">
                    <div className="bg-gray-100 p-1 rounded-lg flex">
                      <button 
                        onClick={() => setActiveChart('created')}
                        className={`px-4 py-2 rounded-md transition-all ${
                          activeChart === 'created' 
                            ? 'bg-purple-600 text-white shadow-md' 
                            : 'text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FaTasks size={16} />
                          <span>Created</span>
                        </div>
                      </button>
                      <button 
                        onClick={() => setActiveChart('completed')}
                        className={`px-4 py-2 rounded-md transition-all ${
                          activeChart === 'completed' 
                            ? 'bg-purple-600 text-white shadow-md' 
                            : 'text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FaCheckCircle size={16} />
                          <span>Completed</span>
                        </div>
                      </button>
                      <button 
                        onClick={() => setActiveChart('overdue')}
                        className={`px-4 py-2 rounded-md transition-all ${
                          activeChart === 'overdue' 
                            ? 'bg-purple-600 text-white shadow-md' 
                            : 'text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FaExclamationCircle size={16} />
                          <span>Overdue</span>
                        </div>
                      </button>
                    </div>
                  </div>
                  
                  {/* Chart */}
                  {memberMetrics.length > 0 ? (
                    <div className="flex flex-col items-center">
                      <div className="w-full max-w-md mb-8">
                        {getChartData().noData ? (
                          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                            <h3 className="text-xl font-semibold text-gray-500 mb-2">No {activeChart} tasks</h3>
                            <p className="text-gray-400">There are no {activeChart} tasks to display</p>
                          </div>
                        ) : (
                          <Pie 
                            data={getChartData()} 
                            options={{
                              plugins: {
                                legend: {
                                  position: 'bottom',
                                  display: false // Disable default ChartJS legend
                                },
                                tooltip: {
                                  callbacks: {
                                    label: function(context) {
                                      const label = context.label || '';
                                      const value = context.raw || 0;
                                      const percentage = getChartData().percentages[context.dataIndex] || 0;
                                      return `${label}: ${value} tasks (${percentage}%)`;
                                    }
                                  },
                                  bodyFont: {
                                    size: 14
                                  },
                                  titleFont: {
                                    size: 16
                                  },
                                  backgroundColor: 'rgba(0,0,0,0.8)',
                                  padding: 12,
                                  cornerRadius: 8,
                                  displayColors: true,
                                  boxPadding: 6
                                },
                                // Disable constant display of labels on the chart
                                datalabels: {
                                  display: false
                                }
                              },
                              maintainAspectRatio: true,
                              animation: {
                                animateScale: true,
                                animateRotate: true
                              },
                              // Customize hover effects
                              onHover: (event, chartElements, chart) => {
                                if (chart?.canvas) {
                                  chart.canvas.style.cursor = chartElements.length ? 'pointer' : 'default';
                                }
                              }
                            }} 
                          />
                        )}
                      </div>
                      
                      {/* Custom Legend with Pagination */}
                      {!getChartData().noData && (
                        <div className="w-full max-w-md bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="grid grid-cols-2 gap-4">
                            {getChartData().labels.slice(legendPage * 8, legendPage * 8 + 8).map((label, index) => {
                              const realIndex = legendPage * 8 + index;
                              const data = getChartData();
                              const percentage = data.percentages[realIndex];
                              return (
                                <div key={label} className="flex items-center gap-2">
                                  <div 
                                    className="w-4 h-4 rounded-full flex-shrink-0" 
                                    style={{ backgroundColor: data.datasets[0].backgroundColor[realIndex] }}
                                  ></div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-gray-700 overflow-ellipsis overflow-hidden">{label}</span>
                                      <span className="text-xs font-medium px-2 py-1 ml-2 bg-gray-200 text-gray-700 rounded-full">
                                        {percentage}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Legend Pagination */}
                          {memberMetrics.length > 8 && (
                            <div className="flex justify-center mt-6">
                              <button 
                                onClick={() => setLegendPage(prev => Math.max(0, prev - 1))}
                                disabled={legendPage === 0}
                                className={`p-2 rounded-full mr-3 ${legendPage === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-200'}`}
                              >
                                <FaChevronLeft size={16} />
                              </button>
                              <span className="text-sm text-gray-600 self-center">
                                {legendPage + 1} / {Math.ceil(memberMetrics.length / 8)}
                              </span>
                              <button 
                                onClick={() => setLegendPage(prev => prev + 1 < Math.ceil(memberMetrics.length / 8) ? prev + 1 : prev)}
                                disabled={legendPage + 1 >= Math.ceil(memberMetrics.length / 8)}
                                className={`p-2 rounded-full ml-3 ${legendPage + 1 >= Math.ceil(memberMetrics.length / 8) ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-200'}`}
                              >
                                <FaChevronRight size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {activeChart === 'overdue' && !getChartData().noData && (
                        <div className="mt-2 text-sm text-gray-500 text-center">
                          <p>Includes all tasks with deadlines in the past (both completed and incomplete)</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500">No data to display</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Project Members */}
            <div className="col-span-1">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6">
                  <h2 className="text-2xl font-bold text-white">Project Members</h2>
                </div>
                <div className="p-6">
                  {members.length > 0 ? (
                    <div className="space-y-4">
                      {members.map(member => (
                        <div 
                          key={member.firebase_user_id}
                          className={`flex items-center gap-4 p-3 rounded-lg border ${
                            isOwner(member.firebase_user_id)
                              ? 'bg-orange-50 border-orange-200'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex-shrink-0">
                            {member.profile_photo ? (
                              <img 
                                src={member.profile_photo} 
                                alt={`${member.email}'s avatar`}
                                className="w-12 h-12 rounded-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0xMiAwYzYuNjIzIDAgMTIgNS4zNzcgMTIgMTJzLTUuMzc3IDEyLTEyIDEyLTEyLTUuMzc3LTEyLTEyIDUuMzc3LTEyIDEyLTEyem04LjEyNyAxOS40MWMtLjI4Mi0uNDAxLS43NzItLjY1NC0xLjYyNC0uODUtMy44NDgtLjkwNi00LjAyNy0xLjUwMS00LjAyNy0yLjIyOCAwLS40NzguMzQ2LTEuMzE4IDEuNTc1LTEuOTguMjA0LS4xMTUuNTMyLS4zNCAxLjA0Mi0uNzY2aDEuNDExYy0uMDM0LjIwMi0uMDc2LjQwNS0uMTI5LjYwNWExMi40MyAxMi40MyAwIDAxLS4xNzYuNjA1aC0uNDUxYy4xNzUuMTUuMzUuMjk4LjUyOC40NDMgMS41NDQgMS4yNS45NzIgMS45NzQgMi4xOTcgMi42NjctMS4zNS43OC0yLjgwMSAxLjMxNi00LjMyOCAxLjU3LTEuMTk2LTEuMjc1LTEuOTM3LTIuOTU3LTEuOTM3LTQuODA4IDAtMy44MSAyLjY3Ni02LjkgNi0xLjkzOSAuMTQ1LS40MDguMjIyLS44NDEuMjIyLTEuMjg4LjAwMS0uNDQ3LS4wNzYtLjg4LS4yNzEtMS4yODctMy4wNjktMS4yNTgtNS4yNTItNC4yMDktNS4yNTItNy42OCAwLTQuNTU4IDMuNjk3LTguMjU0IDguMjU0LTguMjU0czguMjUzIDMuNjk2IDguMjUzIDguMjU0YzAgMy43MzEtMi40NyA2Ljg4OC01Ljg2MSA3Ljk1MWExMS45OSAxMS45OSAwIDAxLS4yNzIgMS4yODZjLS4yMjIuNzQ0LS41MTggMS40NC0uODc3IDIuMDcyIDIuNDU4LjU5NSA0LjUwOSAyLjA3MSA0LjUwOSA0LjY0NyAwIC4zNzItLjA1OC43MDUtLjE3MyAxaC0yLjc1NHoiLz48L3N2Zz4=';
                                }}
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                                <FaUserCircle size={24} className="text-orange-600" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-gray-800 font-medium truncate">
                              {member.email}
                              {isOwner(member.firebase_user_id) && (
                                <span className="ml-2 text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">
                                  Owner
                                </span>
                              )}
                            </p>
                            
                            {/* Member Metrics */}
                            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                              <div className="text-center">
                                <p className="text-blue-600 font-semibold">
                                  {memberMetrics.find(m => m.email === member.email)?.tasksCreated || 0}
                                </p>
                                <p className="text-gray-500">created</p>
                              </div>
                              <div className="text-center">
                                <p className="text-green-600 font-semibold">
                                  {memberMetrics.find(m => m.email === member.email)?.tasksCompleted || 0}
                                </p>
                                <p className="text-gray-500">completed</p>
                              </div>
                              <div className="text-center">
                                <p className={`font-semibold ${
                                  memberMetrics.find(m => m.email === member.email)?.tasksOverdue ?? 0 > 0
                                    ? 'text-red-600'
                                    : 'text-gray-600'
                                }`}>
                                  {memberMetrics.find(m => m.email === member.email)?.tasksOverdue || 0}
                                </p>
                                <p className="text-gray-500">overdue</p>
                                {/* Add tooltip or small text to explain that this includes both completed and pending overdue tasks */}
                                {(memberMetrics.find(m => m.email === member.email)?.tasksOverdue ?? 0) > 0 && (
                                  <div className="text-xxs text-gray-400 mt-1">
                                    (includes completed)
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No project members</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}