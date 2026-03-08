declare module 'ali-oss' {
  export interface PutObjectOptions {
    readonly mime?: string;
    readonly headers?: Record<string, string>;
  }
  export interface OSSOptions {
    readonly region: string;
    readonly bucket: string;
    readonly endpoint?: string;
    readonly accessKeyId: string;
    readonly accessKeySecret: string;
  }
  export default class OSS {
    public constructor(options: OSSOptions);
    public put(name: string, file: Buffer, options?: PutObjectOptions): Promise<unknown>;
  }
}
