// src/types/task.ts
export type Task = {
  id: string;
  text: string;
  done: boolean;
  reminderAt?: string;
  completedAt?: string;
};
