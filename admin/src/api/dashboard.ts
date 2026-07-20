import { request } from '@/utils/request';
import type {
  DashboardOverview,
  RecentLeaveItem,
  RecentNoticeItem,
  RecentTimelineItem,
} from '@/types/dashboard';

export function getOverview(): Promise<DashboardOverview> {
  return request.get('/statistics/overview');
}

export function getRecentLeaves(): Promise<RecentLeaveItem[]> {
  return request.get('/statistics/recent-leaves');
}

export function getRecentNotices(): Promise<RecentNoticeItem[]> {
  return request.get('/statistics/recent-notices');
}

export function getRecentTimeline(): Promise<RecentTimelineItem[]> {
  return request.get('/statistics/recent-timeline');
}
