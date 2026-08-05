import { View, Text, Image } from '@tarojs/components';
import './index.scss';

export interface TeacherHeaderProps {
  /** 教师姓名 */
  name: string;
  /** 角色标签（如"班主任"），可传多个，按顺序展示 */
  roles: string[];
  /** 所属班级/年级/部门等副标题 */
  affiliation?: string;
  /** 自定义头像（不传则用首字母占位） */
  avatarUrl?: string;
  /** 右侧额外信息（如今日日期、教学周） */
  meta?: {
    date?: string;
    week?: string;
    semesterWeek?: number;
  };
  /** 点击整体的事件（可选） */
  onClick?: () => void;
}

/** 把"刘明"变成"L"，"张老师"变成"张" */
function pickAvatarText(name: string): string {
  const v = (name || '').trim();
  if (!v) return 'T';
  // ASCII 名字取首字母
  if (/^[A-Za-z]/.test(v)) {
    return v.charAt(0).toUpperCase();
  }
  return v.charAt(0);
}

/**
 * 教师身份卡
 * 顶部：蓝色渐变背景 + 校徽暗纹 + 头像 + 姓名 + 角色 + 所属班级/年级
 */
export default function TeacherHeader(props: TeacherHeaderProps) {
  const { name, roles, affiliation, avatarUrl, meta, onClick } = props;
  const avatarText = pickAvatarText(name);

  return (
    <View className='teacher-header' onClick={onClick}>
      {/* 校徽暗纹：纯 CSS 绘制的低透明度圆形徽章 */}
      <View className='teacher-header__emblem' />
      <View className='teacher-header__emblem teacher-header__emblem--right' />

      <View className='teacher-header__inner'>
        <View className='teacher-header__avatar'>
          {avatarUrl ? (
            <Image className='teacher-header__avatar-img' src={avatarUrl} />
          ) : (
            <Text className='teacher-header__avatar-text'>{avatarText}</Text>
          )}
        </View>

        <View className='teacher-header__info'>
          <View className='teacher-header__name-row'>
            <Text className='teacher-header__name'>{name || '老师'}</Text>
            {roles && roles.length > 0 ? (
              <View className='teacher-header__roles'>
                {roles.map((r) => (
                  <Text key={r} className='teacher-header__role-tag'>
                    {r}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
          {affiliation ? (
            <Text className='teacher-header__aff'>{affiliation}</Text>
          ) : null}
        </View>

        {meta && (meta.date || meta.week || meta.semesterWeek) ? (
          <View className='teacher-header__meta'>
            {meta.date ? (
              <Text className='teacher-header__meta-date'>{meta.date}</Text>
            ) : null}
            {meta.week ? (
              <Text className='teacher-header__meta-week'>{meta.week}</Text>
            ) : null}
            {meta.semesterWeek ? (
              <Text className='teacher-header__meta-sw'>第 {meta.semesterWeek} 周</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
