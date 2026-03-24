// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { TaskStatus, TaskPriority } from '../../types';

// ============================================================================
// MOCKS
// ============================================================================

const mockAddTask = vi.hoisted(() => vi.fn());
const mockUpdateTask = vi.hoisted(() => vi.fn());
const mockDeleteTask = vi.hoisted(() => vi.fn());
const mockAddLog = vi.hoisted(() => vi.fn());
const mockToggleSubTask = vi.hoisted(() => vi.fn());
const mockPlayClick = vi.hoisted(() => vi.fn());
const mockPlaySuccess = vi.hoisted(() => vi.fn());

const mockTasks = vi.hoisted(() => [
  {
    id: 'task-1',
    title: 'Test Task Alpha',
    description: 'First test task',
    status: 'TODO' as const,
    priority: 'HIGH' as const,
    tags: ['TEST'],
    subtasks: [],
    timestamp: Date.now(),
  },
  {
    id: 'task-2',
    title: 'Test Task Beta',
    description: 'Second test task',
    status: 'DONE' as const,
    priority: 'LOW' as const,
    tags: ['TEST'],
    subtasks: [
      { id: 'sub-1', title: 'Subtask One', completed: true },
      { id: 'sub-2', title: 'Subtask Two', completed: false },
    ],
    timestamp: Date.now() - 10000,
  },
  {
    id: 'task-3',
    title: 'Test Task Gamma',
    description: 'Third test task',
    status: 'IN_PROGRESS' as const,
    priority: 'MEDIUM' as const,
    tags: ['DEV'],
    subtasks: [],
    timestamp: Date.now() - 5000,
  },
]);

const mockStoreState = vi.hoisted(() => ({
  tasks: mockTasks,
  actions: {
    addTask: mockAddTask,
    updateTask: mockUpdateTask,
    deleteTask: mockDeleteTask,
    addLog: mockAddLog,
    toggleSubTask: mockToggleSubTask,
  },
}));

vi.mock('../../store', () => ({
  useAppStore: () => mockStoreState,
}));

vi.mock('../../services/audioService', () => ({
  audio: {
    playClick: mockPlayClick,
    playSuccess: mockPlaySuccess,
  },
}));

vi.mock('../../services/apiKeyService', () => ({
  apiKeyService: {
    hasGeminiKey: () => false,
  },
}));

vi.mock('../../services/geminiService', () => ({
  decomposeTaskToSubtasks: vi.fn(),
  promptSelectKey: vi.fn(),
}));

vi.mock('motion/react', () => ({
  motion: {
    form: React.forwardRef(({ children, className, onSubmit, ...props }: any, ref: any) => (
      <form ref={ref} className={className} onSubmit={onSubmit}>{children}</form>
    )),
    div: React.forwardRef(({ children, className, style, ...props }: any, ref: any) => (
      <div ref={ref} className={className} style={style}>{children}</div>
    )),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('lucide-react', () => {
  const icon = (name: string) => (props: any) => <span data-testid={`icon-${name}`} className={props.className}>{name}</span>;
  return {
    Plus: icon('Plus'),
    Tag: icon('Tag'),
    ChevronDown: icon('ChevronDown'),
    ChevronRight: icon('ChevronRight'),
    CheckCircle: icon('CheckCircle'),
    Trash2: icon('Trash2'),
    Filter: icon('Filter'),
    SortAsc: icon('SortAsc'),
    AlertCircle: icon('AlertCircle'),
    GripVertical: icon('GripVertical'),
    Check: icon('Check'),
    ListTodo: icon('ListTodo'),
    MoreVertical: icon('MoreVertical'),
    X: icon('X'),
    Archive: icon('Archive'),
    Zap: icon('Zap'),
    Play: icon('Play'),
    CheckCircle2: icon('CheckCircle2'),
    ListChecks: icon('ListChecks'),
    Activity: icon('Activity'),
    BarChart3: icon('BarChart3'),
    Hash: icon('Hash'),
    Clock: icon('Clock'),
    Sparkles: icon('Sparkles'),
    Loader2: icon('Loader2'),
    SignalHigh: icon('SignalHigh'),
    SignalMedium: icon('SignalMedium'),
    SignalLow: icon('SignalLow'),
    Circle: icon('Circle'),
  };
});

import TaskBoard from '../TaskBoard';

// ============================================================================
// TESTS
// ============================================================================

describe('TaskBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState.tasks = [...mockTasks];
  });

  it('renders without crashing', () => {
    const { container } = render(<TaskBoard />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders the Operational Backlog title', () => {
    render(<TaskBoard />);
    expect(screen.getByText('Operational Backlog')).toBeTruthy();
  });

  it('renders all task titles', () => {
    render(<TaskBoard />);
    expect(screen.getByText('Test Task Alpha')).toBeTruthy();
    expect(screen.getByText('Test Task Beta')).toBeTruthy();
    expect(screen.getByText('Test Task Gamma')).toBeTruthy();
  });

  it('renders New Protocol button', () => {
    render(<TaskBoard />);
    expect(screen.getByText('New Protocol')).toBeTruthy();
  });

  it('shows create form when New Protocol is clicked', () => {
    render(<TaskBoard />);
    fireEvent.click(screen.getByText('New Protocol'));
    expect(screen.getByPlaceholderText('Enter task title...')).toBeTruthy();
  });

  it('creates a task on form submit', () => {
    render(<TaskBoard />);
    fireEvent.click(screen.getByText('New Protocol'));
    const input = screen.getByPlaceholderText('Enter task title...');
    fireEvent.change(input, { target: { value: 'New Task X' } });
    fireEvent.click(screen.getByText('Add'));
    expect(mockAddTask).toHaveBeenCalledWith(expect.objectContaining({
      title: 'New Task X',
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.TODO,
    }));
    expect(mockAddLog).toHaveBeenCalledWith('INFO', expect.stringContaining('TASK_CREATE'));
  });

  it('does not create a task with empty title', () => {
    render(<TaskBoard />);
    fireEvent.click(screen.getByText('New Protocol'));
    fireEvent.click(screen.getByText('Add'));
    expect(mockAddTask).not.toHaveBeenCalled();
  });

  it('cancels task creation form', () => {
    render(<TaskBoard />);
    fireEvent.click(screen.getByText('New Protocol'));
    expect(screen.getByPlaceholderText('Enter task title...')).toBeTruthy();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByPlaceholderText('Enter task title...')).toBeNull();
  });

  it('shows empty state when no tasks match filter', () => {
    mockStoreState.tasks = [];
    render(<TaskBoard />);
    expect(screen.getByText('No active tasks match the current filter.')).toBeTruthy();
  });

  it('renders subtasks for tasks that have them', () => {
    render(<TaskBoard />);
    expect(screen.getByText('Subtask One')).toBeTruthy();
    expect(screen.getByText('Subtask Two')).toBeTruthy();
  });

  it('sorts tasks by priority by default (HIGH first)', () => {
    render(<TaskBoard />);
    const titles = screen.getAllByText(/Test Task/);
    // HIGH priority task should come first
    expect(titles[0].textContent).toBe('Test Task Alpha');
  });

  it('renders Complete Cycle button for TODO tasks', () => {
    render(<TaskBoard />);
    expect(screen.getAllByText('Complete Cycle').length).toBeGreaterThan(0);
  });

  it('renders Re-Open Protocol button for DONE tasks', () => {
    render(<TaskBoard />);
    expect(screen.getAllByText('Re-Open Protocol').length).toBeGreaterThan(0);
  });
});
