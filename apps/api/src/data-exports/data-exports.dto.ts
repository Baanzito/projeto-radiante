import { IsIn, IsObject } from 'class-validator';

export const CSV_DATASETS = [
  'matches',
  'reflections',
  'sessions',
  'weekly-plans',
  'coach-feedbacks',
  'weekly-reviews',
] as const;
export type CsvDataset = (typeof CSV_DATASETS)[number];

export class CsvDatasetDto {
  @IsIn(CSV_DATASETS) dataset!: CsvDataset;
}

export class RestoreBackupDto {
  @IsObject() backup!: Record<string, unknown>;
}
