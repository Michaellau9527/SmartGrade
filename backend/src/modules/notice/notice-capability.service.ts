/**
 * NoticeCapabilityService — 通知业务编排（C03 Skeleton）
 *
 * 上游规则：Sprint 2.2 C03 — 刘老师拍板
 *
 * Skeleton 阶段：全部返回 Mock，不接数据库。
 */

const MOCK_NOTICE = {
  id: 'notice_mock_001',
  noticeNo: 'NT20260721-0001',
  title: 'Mock 通知',
  content: 'Skeleton 阶段 Mock 数据',
  status: 'DRAFT',
  publishedAt: null,
  createdAt: '2026-07-21T00:00:00.000Z',
};

const MOCK_NOTICE_LIST = {
  items: [MOCK_NOTICE],
  total: 1,
};

export class NoticeCapabilityService {
  publish(_body?: unknown): typeof MOCK_NOTICE {
    return { ...MOCK_NOTICE, status: 'PUBLISHED', publishedAt: '2026-07-21T01:00:00.000Z' };
  }

  read(_id: string): typeof MOCK_NOTICE {
    return { ...MOCK_NOTICE, status: 'READ' };
  }

  ack(_id: string): typeof MOCK_NOTICE {
    return { ...MOCK_NOTICE, status: 'ACKNOWLEDGED' };
  }

  list(): typeof MOCK_NOTICE_LIST {
    return MOCK_NOTICE_LIST;
  }

  detail(id: string): typeof MOCK_NOTICE {
    return { ...MOCK_NOTICE, id };
  }
}
