export default defineAppConfig({
  pages: [
    'pages/workbench/index',
    'pages/student/index',
    'pages/student-detail/index',
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
        text: '工作台'
      },
      {
        pagePath: 'pages/leave/index',
        text: '请假'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的'
      }
    ]
  }
});
