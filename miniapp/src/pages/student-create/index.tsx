import { View, Text, Input, Picker, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCallback, useState } from 'react';
import { createStudent } from '../../api/student';
import './index.scss';

const GENDER_OPTIONS = ['男', '女'];
const BOARDING_OPTIONS = ['走读', '住宿'];

export default function StudentCreate() {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    gender: 'MALE' as string,
    genderIndex: 0,
    studentNo: '',
    boardingType: 'DAY_STUDENT' as string,
    boardingIndex: 0,
    phone: '',
    dormNo: '',
    bedNo: '',
    parentName: '',
    parentPhone: ''
  });

  const setField = useCallback((key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim()) {
      Taro.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }
    if (!form.studentNo.trim()) {
      Taro.showToast({ title: '请输入学号', icon: 'none' });
      return;
    }
    setSubmitting(true);
    try {
      await createStudent({
        studentNo: form.studentNo.trim(),
        name: form.name.trim(),
        gender: form.gender,
        classId: '1', // TODO: 从上下文获取当前班级ID
        boardingType: form.boardingType,
        phone: form.phone || undefined,
        dorm_room_id: form.boardingType === 'BOARDING' && form.dormNo ? form.dormNo : undefined,
        bedNo: form.boardingType === 'BOARDING' ? form.bedNo : undefined,
        parent_name: form.parentName || undefined,
        parent_phone: form.parentPhone || undefined
      });
      Taro.showToast({ title: '添加成功', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Taro.showToast({ title: `添加失败：${msg}`, icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  }, [form]);

  return (
    <View className='create-page'>
      {/* 基础信息 */}
      <View className='section'>
        <View className='section-title'>基础信息</View>

        <View className='form-item'>
          <Text className='form-label'>姓名 *</Text>
          <Input
            className='form-input'
            placeholder='输入学生姓名'
            value={form.name}
            onInput={(e) => setField('name', e.detail.value)}
          />
        </View>

        <View className='form-item'>
          <Text className='form-label'>性别</Text>
          <Picker
            mode='selector'
            range={GENDER_OPTIONS}
            value={form.genderIndex}
            onChange={(e) => {
              const idx = Number(e.detail.value);
              setForm((prev) => ({
                ...prev,
                genderIndex: idx,
                gender: idx === 0 ? 'MALE' : 'FEMALE'
              }));
            }}
          >
            <View className='form-picker'>{GENDER_OPTIONS[form.genderIndex]}</View>
          </Picker>
        </View>

        <View className='form-item'>
          <Text className='form-label'>学号 *</Text>
          <Input
            className='form-input'
            placeholder='输入学号（如 20250101）'
            value={form.studentNo}
            onInput={(e) => setField('studentNo', e.detail.value)}
          />
        </View>

        <View className='form-item'>
          <Text className='form-label'>学生类型</Text>
          <Picker
            mode='selector'
            range={BOARDING_OPTIONS}
            value={form.boardingIndex}
            onChange={(e) => {
              const idx = Number(e.detail.value);
              setForm((prev) => ({
                ...prev,
                boardingIndex: idx,
                boardingType: idx === 0 ? 'DAY_STUDENT' : 'BOARDING'
              }));
            }}
          >
            <View className='form-picker'>{BOARDING_OPTIONS[form.boardingIndex]}</View>
          </Picker>
        </View>

        <View className='form-item'>
          <Text className='form-label'>联系电话</Text>
          <Input
            className='form-input'
            type='number'
            placeholder='手机号（选填）'
            value={form.phone}
            onInput={(e) => setField('phone', e.detail.value)}
          />
        </View>
      </View>

      {/* 住宿信息（仅住宿生显示） */}
      {form.boardingType === 'BOARDING' && (
        <View className='section'>
          <View className='section-title'>住宿信息</View>
          <View className='form-item'>
            <Text className='form-label'>宿舍号</Text>
            <Input
              className='form-input'
              placeholder='如 B栋-301'
              value={form.dormNo}
              onInput={(e) => setField('dormNo', e.detail.value)}
            />
          </View>
          <View className='form-item'>
            <Text className='form-label'>床位号</Text>
            <Input
              className='form-input'
              placeholder='如 5号床'
              value={form.bedNo}
              onInput={(e) => setField('bedNo', e.detail.value)}
            />
          </View>
        </View>
      )}

      {/* 家长信息 */}
      <View className='section'>
        <View className='section-title'>家长信息（选填）</View>
        <View className='form-item'>
          <Text className='form-label'>家长姓名</Text>
          <Input
            className='form-input'
            placeholder='家长姓名'
            value={form.parentName}
            onInput={(e) => setField('parentName', e.detail.value)}
          />
        </View>
        <View className='form-item'>
          <Text className='form-label'>家长电话</Text>
          <Input
            className='form-input'
            type='number'
            placeholder='家长联系电话'
            value={form.parentPhone}
            onInput={(e) => setField('parentPhone', e.detail.value)}
            maxlength={11}
          />
        </View>
      </View>

      {/* 提交按钮 */}
      <View className='submit-bar'>
        <View className='submit-btn cancel' onClick={() => Taro.navigateBack()}>取消</View>
        <View
          className={`submit-btn primary ${submitting ? 'disabled' : ''}`}
          onClick={() => { if (!submitting) handleSubmit(); }}
        >
          {submitting ? '保存中…' : '保存'}
        </View>
      </View>
    </View>
  );
}
