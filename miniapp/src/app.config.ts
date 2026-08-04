export default defineAppConfig({
  pages: [
    'pages/workbench/index',
    'pages/index/index',
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
        iconPath: 'assets/icons/workbench.jpg',
        selectedIconPath: 'assets/icons/workbench-active.jpg'
      },
      {
        pagePath: 'pages/leave/index',
        text: '请假',
        iconPath: 'assets/icons/leave.jpg',
        selectedIconPath: 'assets/icons/leave-active.jpg'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的',
        iconPath: 'assets/icons/mine.jpg',
        selectedIconPath: 'assets/icons/mine-active.jpg'
      }
    ]
  }
});
