import type { Status } from './status';

export type Person = {
  id: number;
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  status: Status;
  photo?: string;
};
