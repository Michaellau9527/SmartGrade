import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import './index.scss';

/** Excel 模板字段说明 */
const TEMPLATE_FIELDS = [
  { key: 'name', label: '姓名', required: true, example: '张三' },
  { key: 'gender', label: '性别', required: true, example: '男' },
  { key: 'studentNo', label: '学号', required: true, example: '20250101' },
  { key: 'boardingType', label: '学生类型', required: true, example: '住宿生／走读生' },
  { key: 'dormNo', label: '宿舍号', required: false, example: '301' },
  { key: 'bedNo', label: '床位号', required: false, example: '5' },
  { key: 'phone', label: '手机号', required: false, example: '13800138000' }
];

export default function StudentImport() {
  const [step, setStep] = useState<'guide' | 'upload' | 'done'>('guide');

  const handleChooseFile = () => {
    Taro.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx', 'xls'],
      success: (res) => {
        setStep('done');
        // TODO: 调 POST /students/import 上传文件
        // 后端接口尚未实现，先 mock 完成状态
        setTimeout(() => {
          Taro.showToast({ title: '文件已选择，接口开发中', icon: 'none' });
        }, 500);
      },
      fail: () => {
        Taro.showToast({ title: '请选择 Excel 文件', icon: 'none' });
      }
    });
  };

  const handleDownloadTemplate = () => {
    // TODO: 提供真实模板下载 URL
    Taro.showToast({ title: '模板下载功能开发中', icon: 'none' });
  };

  return (
    <View className='import-page'>
      {/* 步骤指示 */}
      <View className='steps'>
        <View className={`step ${step === 'guide' ? 'step--active' : 'step--done'}`}>
          <View className='step-dot'>1</View>
          <Text className='step-label'>下载模板</Text>
        </View>
        <View className='step-line' />
        <View className={`step ${step === 'upload' ? 'step--active' : step === 'done' ? 'step--done' : ''}`}>
          <View className='step-dot'>2</View>
          <Text className='step-label'>上传文件</Text>
        </View>
        <View className='step-line' />
        <View className={`step ${step === 'done' ? 'step--done' : ''}`}>
          <View className='step-dot'>3</View>
          <Text className='step-label'>确认导入</Text>
        </View>
      </View>

      {/* 内容区 */}
      <View className='import-content'>
        <View className='import-title'>Excel 批量导入学生</View>
        <View className='import-desc'>
          下载标准模板，按格式填写学生信息后上传，系统将自动校验并导入。
        </View>

        {/* 模板字段说明 */}
        <View className='field-table'>
          <View className='field-header'>
            <Text className='field-col field-col--name'>字段</Text>
            <Text className='field-col field-col--req'>必填</Text>
            <Text className='field-col field-col--ex'>示例</Text>
          </View>
          {TEMPLATE_FIELDS.map((f) => (
            <View key={f.key} className='field-row'>
              <Text className='field-col field-col--name'>{f.label}</Text>
              <Text className='field-col field-col--req'>{f.required ? '是' : '否'}</Text>
              <Text className='field-col field-col--ex'>{f.example}</Text>
            </View>
          ))}
        </View>

        {/* 注意事项 */}
        <View className='notice-box'>
          <View className='notice-title'>注意事项</View>
          <View className='notice-item'>· 学生类型只能填写「住宿生」或「走读生」</View>
          <View className='notice-item'>· 学号不能与系统中已有学号重复</View>
          <View className='notice-item'>· 姓名字段不能为空</View>
          <View className='notice-item'>· 支持 .xlsx 和 .xls 格式文件</View>
        </View>
      </View>

      {/* 底部操作 */}
      <View className='import-actions'>
        <View className='import-btn outline' onClick={handleDownloadTemplate}>
          下载模板
        </View>
        <View className='import-btn filled' onClick={handleChooseFile}>
          上传 Excel 文件
        </View>
      </View>
    </View>
  );
}
