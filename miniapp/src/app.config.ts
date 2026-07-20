export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/workbench/index',
    'pages/student/index',
    'pages/leave/index',
    'pages/notice/index',
    'pages/mine/index'
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
        text: '工作台',
        iconPath: 'assets/icons/workbench.png',
        selectedIconPath: 'assets/icons/workbench-active.png'
      },
      {
        pagePath: 'pages/leave/index',
        text: '请假',
        iconPath: 'assets/icons/leave.png',
        selectedIconPath: 'assets/icons/leave-active.png'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的',
        iconPath: 'assets/icons/mine.png',
        selectedIconPath: 'assets/icons/mine-active.png'
      }
    ]
  }
});