import { View, Text, Image } from '@tarojs/components';
import './index.scss';

export interface TeacherHeaderProps {
  /** 教师姓名 */
  name: string;
  /** 角色中文标签 */
  roles: string[];
  /** 所属班级/年级/部门 */
  affiliation?: string;
  /** 自定义头像 */
  avatarUrl?: string;
  /** 右侧日期信息 */
  meta?: {
    date?: string;
    week?: string;
    semesterWeek?: number;
  };
  /** 欢迎语（如"用心教育，用爱陪伴每一个学生成长"） */
  welcomeQuote?: string;
  /** 底部副信息（如教学周、节气）—— 与 welcomeQuote 互斥 */
  footer?: string;
  /** 整体点击事件 */
  onClick?: () => void;
}

function pickAvatarText(name: string): string {
  const v = (name || '').trim();
  if (!v) return 'T';
  if (/^[A-Za-z]/.test(v)) return v.charAt(0).toUpperCase();
  return v.charAt(0);
}

/**
 * 教师身份卡 2.1
 * 层次：渐变背景 → 校园建筑线稿（SVG，低透明度）→ 校徽暗纹（圆形）→ 内容
 * 左侧：圆形头像 + 姓名 + 角色 chip + 所属
 * 右侧：日期 / 星期 / 教学周
 * 底部：装饰性 footer（可选）
 */
export default function TeacherHeader(props: TeacherHeaderProps) {
  const { name, roles, affiliation, avatarUrl, meta, welcomeQuote, footer, onClick } = props;
  const avatarText = pickAvatarText(name);

  return (
    <View className='teacher-header' onClick={onClick}>
      {/* 第一层：校园建筑线稿背景（内联 SVG，绝对定位） */}
      <View className='teacher-header__campus' aria-hidden>
        <view className='teacher-header__svg-host'>
          {/* 校园：教学楼 + 树 + 云 */}
          <svg
            className='teacher-header__svg'
            viewBox='0 0 750 320'
            preserveAspectRatio='xMaxYMax slice'
            xmlns='http://www.w3.org/2000/svg'
          >
            {/* 教学楼（左） */}
            <g fill='none' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round'>
              <rect x='60' y='180' width='140' height='100' />
              <rect x='78' y='196' width='24' height='24' />
              <rect x='108' y='196' width='24' height='24' />
              <rect x='138' y='196' width='24' height='24' />
              <rect x='78' y='226' width='24' height='24' />
              <rect x='108' y='226' width='24' height='24' />
              <rect x='138' y='226' width='24' height='24' />
              <line x1='50' y1='280' x2='220' y2='280' />
              {/* 旗杆 */}
              <line x1='130' y1='140' x2='130' y2='180' />
              <path d='M130 144 L160 152 L130 160 Z' fill='currentColor' />
              {/* 主楼尖顶 */}
              <path d='M110 180 L130 150 L150 180' />
            </g>

            {/* 树（中间） */}
            <g fill='none' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round'>
              <line x1='320' y1='280' x2='320' y2='220' />
              <circle cx='320' cy='200' r='32' />
              <line x1='370' y1='280' x2='370' y2='240' />
              <circle cx='370' cy='224' r='22' />
              <line x1='280' y1='280' x2='280' y2='250' />
              <circle cx='280' cy='238' r='16' />
            </g>

            {/* 钟楼（右） */}
            <g fill='none' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round'>
              <rect x='540' y='170' width='110' height='110' />
              <polygon points='540,170 595,130 650,170' />
              <circle cx='595' cy='210' r='14' />
              <line x1='595' y1='210' x2='595' y2='198' />
              <line x1='595' y1='210' x2='605' y2='214' />
              <rect x='560' y='240' width='20' height='40' />
              <rect x='610' y='240' width='20' height='40' />
            </g>

            {/* 云 */}
            <g fill='none' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round'>
              <path d='M180 90 q20 -22 42 -10 q8 -18 30 -10 q22 0 22 18 q-2 14 -22 12 q-10 14 -32 6 q-22 4 -40 -16 Z' />
              <path d='M460 60 q14 -16 30 -6 q10 -12 24 -2 q14 4 12 18 q-8 8 -24 6 q-12 10 -28 0 q-14 -2 -14 -16 Z' />
            </g>

            {/* 地平线 */}
            <line x1='0' y1='295' x2='750' y2='295' />
            <line x1='0' y1='300' x2='750' y2='300' opacity='0.5' />
          </svg>
        </view>
      </View>

      {/* 第二层：校徽暗纹（双圆） */}
      <View className='teacher-header__emblem' aria-hidden />
      <View className='teacher-header__emblem teacher-header__emblem--small' aria-hidden />

      {/* 第三层：内容 */}
      <View className='teacher-header__inner'>
        <View className='teacher-header__avatar'>
          {avatarUrl ? (
            <Image className='teacher-header__avatar-img' src={avatarUrl} />
          ) : (
            <Text className='teacher-header__avatar-text'>{avatarText}</Text>
          )}
          <View className='teacher-header__avatar-ring' />
        </View>

        <View className='teacher-header__info'>
          <View className='teacher-header__name-row'>
            <Text className='teacher-header__name'>{name || '老师'}</Text>
            {roles && roles.length > 0 ? (
              <View className='teacher-header__roles'>
                {roles.slice(0, 2).map((r) => (
                  <Text key={r} className='teacher-header__role-tag'>
                    {r}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
          {affiliation ? (
            <View className='teacher-header__aff-row'>
              <View className='teacher-header__aff-dot' />
              <Text className='teacher-header__aff'>{affiliation}</Text>
            </View>
          ) : null}
        </View>

        {meta && (meta.date || meta.week) ? (
          <View className='teacher-header__meta'>
            {meta.date ? (
              <Text className='teacher-header__meta-date'>{meta.date}</Text>
            ) : null}
            <View className='teacher-header__meta-row'>
              {meta.week ? <Text className='teacher-header__meta-week'>{meta.week}</Text> : null}
              {meta.semesterWeek ? (
                <Text className='teacher-header__meta-sw'>· 第 {meta.semesterWeek} 周</Text>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>

      {welcomeQuote ? (
        <View className='teacher-header__quote'>{welcomeQuote}</View>
      ) : null}

      {footer ? (
        <View className='teacher-header__footer'>
          <View className='teacher-header__footer-line' />
          <Text className='teacher-header__footer-text'>{footer}</Text>
        </View>
      ) : null}
    </View>
  );
}
