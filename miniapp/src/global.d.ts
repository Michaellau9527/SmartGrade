/**
 * Taro defineConstant 在编译期通过 webpack DefinePlugin 注入为自由标识符，
 * 运行时直接以 `API_BASE_URL` 形式引用即可被替换为对应字符串字面量。
 * 此处仅补充 TypeScript 类型声明，不产生运行时代码。
 */
declare const API_BASE_URL: string;
