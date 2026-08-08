import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCallback, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import AppIcon from '../../components/AppIcon';
import { batchImport, ImportRow, ImportResult } from '../../api/student';
import './index.scss';

/** 模板列定义 */
const TEMPLATE_COLS = [
  { key: 'name', label: '姓名', required: true, example: '张三' },
  { key: 'studentNo', label: '学号', required: true, example: '20250101' },
  { key: 'gender', label: '性别', required: true, example: '男/女' },
  { key: 'boardingType', label: '住宿类型', required: true, example: '住宿/走读' },
  { key: 'phone', label: '联系电话', required: false, example: '13800138000' },
  { key: 'bedNo', label: '床位号', required: false, example: '5' }
];

/** 本地校验行 */
interface ParsedRow extends ImportRow {
  _row: number;
  _error?: string;
}
type Step = 'guide' | 'preview' | 'result';

export default function StudentImport() {
  const [step, setStep] = useState<Step>('guide');
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);

  /** 下载模板 */
  const handleDownloadTemplate = useCallback(() => {
    const ws = XLSX.utils.json_to_sheet(
      [{ 姓名: '张三', 学号: '20250101', 性别: '男', 住宿类型: '住宿', 联系电话: '13800138000', 床位号: '5' }]
    );
    ws['!cols'] = [
      { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 16 }, { wch: 10 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '学生列表');
    const binary = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const fs = Taro.getFileSystemManager();
    const path = `${Taro.env.USER_DATA_PATH}/student_template.xlsx`;
    fs.writeFile({
      filePath: path,
      data: new Uint8Array(binary).buffer,
      success: () => {
        Taro.openDocument({ filePath: path, fileType: 'xlsx', showMenu: true });
      },
      fail: () => {
        Taro.showToast({ title: '生成模板失败', icon: 'none' });
      }
    });
  }, []);

  /** 选文件并解析 */
  const handlePickFile = useCallback(() => {
    Taro.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx', 'xls'],
      success: (res) => {
        const filePath = res.tempFiles[0].path;
        Taro.getFileSystemManager().readFile({
          filePath,
          success: (r) => {
            try {
              const wb = XLSX.read(r.data, { type: 'array' });
              const sheet = wb.Sheets[wb.SheetNames[0]];
              const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });

              if (rows.length === 0) {
                Taro.showToast({ title: '文件为空', icon: 'none' });
                return;
              }

              const result: ParsedRow[] = rows.map((r, i) => {
                const row: ParsedRow = {
                  _row: i + 1,
                  name: (r['姓名'] || '').trim(),
                  studentNo: (r['学号'] || '').trim(),
                  gender: (r['性别'] || '').trim(),
                  boardingType: (r['住宿类型'] || '').trim(),
                  classId: '1', // TODO: 从上下文获取
                  phone: (r['联系电话'] || '').trim() || undefined,
                  bedNo: (r['床位号'] || '').trim() || undefined
                };

                // 本地校验
                if (!row.name) row._error = '姓名不能为空';
                else if (!row.studentNo) row._error = '学号不能为空';
                else if (!['男', '女'].includes(row.gender)) row._error = '性别无效';
                else if (!['住宿', '走读'].includes(row.boardingType)) row._error = '住宿类型无效';

                // 标准化值
                row.gender = row.gender === '男' ? 'MALE' : row.gender === '女' ? 'FEMALE' : row.gender;
                row.boardingType = row.boardingType === '住宿' ? 'BOARDING' : row.boardingType === '走读' ? 'DAY_STUDENT' : row.boardingType;

                return row;
              });

              setParsed(result);
              setStep('preview');
            } catch {
              Taro.showToast({ title: '文件解析失败，请确认格式', icon: 'none' });
            }
          },
          fail: () => Taro.showToast({ title: '读取文件失败', icon: 'none' })
        });
      }
    });
  }, []);

  /** 有效/错误统计 */
  const stats = useMemo(() => {
    const ok = parsed.filter((r) => !r._error).length;
    const err = parsed.filter((r) => r._error).length;
    return { ok, err, total: parsed.length };
  }, [parsed]);

  /** 确认导入 */
  const handleConfirmImport = useCallback(async () => {
    const validRows: ImportRow[] = parsed
      .filter((r) => !r._error)
      .map(({ name, studentNo, gender, boardingType, classId, phone, bedNo }) => ({
        name, studentNo, gender, boardingType, classId, phone, bedNo
      }));

    if (validRows.length === 0) {
      Taro.showToast({ title: '没有有效数据可导入', icon: 'none' });
      return;
    }

    setLoading(true);
    try {
      const res = await batchImport(validRows);
      setImportResult(res);
      setStep('result');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Taro.showToast({ title: `导入失败：${msg}`, icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [parsed]);

  return (
    <View className='import-page'>
      {/* ===== 引导页 ===== */}
      {step === 'guide' && (
        <>
          <View className='import-hero'>
            <View className='hero-icon'><AppIcon name='list-todo' size={36} color='#1677ff' /></View>
            <Text className='hero-title'>Excel 批量导入</Text>
            <Text className='hero-desc'>下载标准模板，按格式填写学生信息后上传，系统将自动校验并导入</Text>
          </View>

          <View className='field-table'>
            <View className='field-header'>
              <Text className='field-col field-col--name'>字段</Text>
              <Text className='field-col field-col--req'>必填</Text>
              <Text className='field-col field-col--ex'>示例</Text>
            </View>
            {TEMPLATE_COLS.map((f) => (
              <View key={f.key} className='field-row'>
                <Text className='field-col field-col--name'>{f.label}</Text>
                <Text className='field-col field-col--req'>{f.required ? '是' : '否'}</Text>
                <Text className='field-col field-col--ex'>{f.example}</Text>
              </View>
            ))}
          </View>

          <View className='notice-box'>
            <Text className='notice-title'>注意事项</Text>
            <View className='notice-item'>· 住宿类型填写「住宿」或「走读」</View>
            <View className='notice-item'>· 性别填写「男」或「女」</View>
            <View className='notice-item'>· 学号不能重复</View>
            <View className='notice-item'>· 宿舍信息导入后可在详情页设置</View>
          </View>

          <View className='bottom-actions'>
            <View className='ba-btn outline' onClick={handleDownloadTemplate}>下载模板</View>
            <View className='ba-btn filled' onClick={handlePickFile}>选择文件</View>
          </View>
        </>
      )}

      {/* ===== 预览页 ===== */}
      {step === 'preview' && (
        <>
          <View className='preview-header'>
            <Text className='preview-title'>数据预览</Text>
            <View className='preview-stats'>
              <View className='ps-item ps-ok'>{stats.ok} 条有效</View>
              {stats.err > 0 && <View className='ps-item ps-err'>{stats.err} 条错误</View>}
            </View>
          </View>

          <ScrollView className='preview-table' scrollX scrollY>
            <View className='pt-row pt-head'>
              <View className='pt-cell pt-cell--idx'>#</View>
              <View className='pt-cell pt-cell--name'>姓名</View>
              <View className='pt-cell pt-cell--no'>学号</View>
              <View className='pt-cell pt-cell--gender'>性别</View>
              <View className='pt-cell pt-cell--type'>类型</View>
              <View className='pt-cell pt-cell--phone'>电话</View>
              <View className='pt-cell pt-cell--bed'>床位</View>
              <View className='pt-cell pt-cell--err'>状态</View>
            </View>
            {parsed.map((r) => (
              <View key={r._row} className={`pt-row ${r._error ? 'pt-row--err' : ''}`}>
                <View className='pt-cell pt-cell--idx'>{r._row}</View>
                <View className='pt-cell pt-cell--name'>{r.name || '-'}</View>
                <View className='pt-cell pt-cell--no'>{r.studentNo || '-'}</View>
                <View className='pt-cell pt-cell--gender'>{r.gender}</View>
                <View className='pt-cell pt-cell--type'>{r.boardingType}</View>
                <View className='pt-cell pt-cell--phone'>{r.phone || '-'}</View>
                <View className='pt-cell pt-cell--bed'>{r.bedNo || '-'}</View>
                <View className='pt-cell pt-cell--err'>
                  {r._error ? <Text className='pt-err-text'>{r._error}</Text> : <AppIcon name='check' size={16} color='#22c55e' />}
                </View>
              </View>
            ))}
          </ScrollView>

          <View className='bottom-actions'>
            <View className='ba-btn outline' onClick={() => { setStep('guide'); setParsed([]); }}>返回</View>
            <View className={`ba-btn filled ${loading ? 'ba-disabled' : ''}`}
              onClick={() => { if (!loading) handleConfirmImport(); }}>
              {loading ? '导入中…' : `确认导入 ${stats.ok} 条`}
            </View>
          </View>
        </>
      )}

      {/* ===== 结果页 ===== */}
      {step === 'result' && importResult && (
        <>
          <View className='result-hero'>
            <AppIcon name={importResult.failed === 0 ? 'check' : 'alert'} size={40} color={importResult.failed === 0 ? '#22c55e' : '#f59e0b'} />
            <Text className='result-title'>导入完成</Text>
          </View>

          <View className='result-stats'>
            <View className='rs-card rs-success'>
              <Text className='rs-num'>{importResult.success}</Text>
              <Text className='rs-label'>成功</Text>
            </View>
            <View className='rs-card rs-fail'>
              <Text className='rs-num'>{importResult.failed}</Text>
              <Text className='rs-label'>失败</Text>
            </View>
          </View>

          {importResult.errors.length > 0 && (
            <View className='result-errors'>
              <View className='re-title'>失败详情</View>
              {importResult.errors.map((e, i) => (
                <View key={i} className='re-item'>
                  <Text className='re-row'>第{e.row}行</Text>
                  <Text className='re-msg'>{e.message}</Text>
                </View>
              ))}
            </View>
          )}

          <View className='bottom-actions'>
            <View className='ba-btn outline' onClick={() => { setStep('guide'); setParsed([]); setImportResult(null); }}>返回</View>
            <View className='ba-btn filled' onClick={() => Taro.navigateBack()}>完成</View>
          </View>
        </>
      )}
    </View>
  );
}
