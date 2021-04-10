import { Position } from './Position';

export interface Route {
  _id: string;
  title: string;
  startPosition: Position;
  endPosition: Position;
}
