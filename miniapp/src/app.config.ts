export default defineAppConfig({
  pages: [
    'pages/workbench/index',
    'pages/student/index',
    'pages/student-detail/index',
    'pages/student-create/index',
    'pages/student-import/index',
    'pages/leave/index',
    'pages/notice/index',
    'pages/mine/index',
    'pages/class/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'SmartGrade',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#999',
    selectedColor: '#1677ff',
    backgroundColor: '#fff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/workbench/index',
        text: '首页',
        iconPath: 'assets/tabbar/workbench.png',
        selectedIconPath: 'assets/tabbar/workbench-active.png'
      },
      {
        pagePath: 'pages/student/index',
        text: '学生',
        iconPath: 'assets/tabbar/student.png',
        selectedIconPath: 'assets/tabbar/student-active.png'
      },
      {
        pagePath: 'pages/leave/index',
        text: '请假',
        iconPath: 'assets/tabbar/leave.png',
        selectedIconPath: 'assets/tabbar/leave-active.png'
      },
      {
        pagePath: 'pages/notice/index',
        text: '通知',
        iconPath: 'assets/tabbar/notice.png',
        selectedIconPath: 'assets/tabbar/notice-active.png'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的',
        iconPath: 'assets/tabbar/mine.png',
        selectedIconPath: 'assets/tabbar/mine-active.png'
      }
    ]
  }
});
