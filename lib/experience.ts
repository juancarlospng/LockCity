export const DESKTOP_EXPERIENCE_QUERY = '(min-width: 48rem) and (pointer: fine)';
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
export type Quality = 'HIGH' | 'MEDIUM' | 'LOW' | 'STATIC';
export const QUALITY_DPR: Record<Quality, number> = { HIGH: 1.5, MEDIUM: 1.25, LOW: 1, STATIC: 1 };
