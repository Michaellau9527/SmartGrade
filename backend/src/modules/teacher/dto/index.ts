import { ArrayMaxSize, IsArray, IsInt, Min } from 'class-validator';

/**
 * 教师角色分配入参（POST /teachers/:id/roles）
 *
 * - 契约保持 roleIds（role 表自增主键）不变
 * - 空数组语义 = 显式清空该教师全部角色
 * - 重复 ID 在服务层去重（UNIQUE(teacher_id, role_id) 即幂等语义）
 * - 校验由全局 ValidationPipe 执行（main.ts：whitelist + forbidNonWhitelisted + transform）
 */
export class AssignRolesDto {
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  @Min(1, { each: true })
  roleIds!: number[];
}
