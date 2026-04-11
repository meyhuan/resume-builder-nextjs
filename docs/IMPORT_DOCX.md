**准备NodeJs SDK环境，安装SDK依赖包：**

```
npm install @alicloud/docmind-api20220711 -S
npm install @alicloud/tea-util -S
```

## 配置身份认证

1.  创建AccessKey。
    
    详细介绍，请参见[创建AccessKey](https://help.aliyun.com/zh/ram/user-guide/create-an-accesskey-pair)。
    
    **重要**
    
    阿里云账号AccessKey拥有所有API的访问权限，建议您使用RAM用户进行API访问或日常运维。使用RAM用户时，需授予RAM用户文档智能相关的访问权限，再使用RAM用户的AccessKey调用SDK。详情请参见[通过RAM用户控制文档智能使用权限](https://help.aliyun.com/zh/document-mind/getting-started/service-authentication-guide#570c9da02di8j)。
    
    强烈建议不要把AccessKey ID和AccessKey Secret保存到工程代码里，否则可能导致AccessKey泄露，威胁您账号下所有资源的安全。
    
    如果担心RAM用户的AccessKey泄露，可以考虑通过创建RAM角色并使用STS临时授权的账号调用服务，详情请参见[通过STS临时授权的账号调用服务](https://help.aliyun.com/zh/document-mind/developer-reference/call-a-service-by-using-sts-token)。
    
2.  添加阿里云SDK Credentials依赖。
    
    ```
    npm install @alicloud/credentials
    ```
    
3.  配置身份认证。
    
    本文以配置文件的方式为例。详细操作，请参见[管理访问凭据](https://help.aliyun.com/zh/sdk/developer-reference/v2-manage-access-credentials)。
    

## 调用接口提交文档处理任务

文档智能提供异步任务接口，Nodejs SDK提供了本地文档上传和传入文档URL这两种调用方式。

若您需要识别的文件为大文件,耗时较长。您可对config对象设置以下属性。

```
// 建立连接超时时间
connectTimeout: 60000,
// 读取资源超时时间
readTimeout: 60000
```

关于文档智能提供的所有OpenAPI，请参见[API概览](https://help.aliyun.com/zh/document-mind/developer-reference/api-overview-1)。

### 使用本地文档提交异步任务

图片转Word、图片转Excel、图片转PDF接口不支持文件上传方式。

以下代码示例表示通过本地文件上传方式调用异步任务提交类API。

```
const Client = require('@alicloud/docmind-api20220711');
const Credential = require('@alicloud/credentials');
const Util = require('@alicloud/tea-util');
const fs = require('fs');


const getResult = async () => {
  // 调用接口时，程序直接访问凭证，读取您的访问密钥（即AccessKey）并自动完成鉴权。
  // 运行本示例前，请先完成步骤二：配置身份认证。
  // 本示例使用默认配置文件方式，通过配置Credentials文件创建默认的访问凭证。
  // 使用默认凭证初始化Credentials Client。
  const cred = new Credential.default();
  const client = new Client.default({
    // 访问的域名，支持IPv4和IPv6两种方式，IPv6请使用docmind-api-dualstack.cn-hangzhou.aliyuncs.com。
    endpoint: 'docmind-api.cn-hangzhou.aliyuncs.com',
    // 通过credentials获取配置中的AccessKey ID。
    accessKeyId: cred.credential.accessKeyId,
    // 通过credentials获取配置中的AccessKey Secret。
    accessKeySecret: cred.credential.accessKeySecret,
    type: 'access_key',
    regionId: 'cn-hangzhou'
  });
  
  const advanceRequest = new Client.SubmitDocStructureJobAdvanceRequest();
  const file = fs.createReadStream('./example.pdf');
  advanceRequest.fileUrlObject = file;
  advanceRequest.fileName = 'example.pdf';
  const runtimeObject = new Util.RuntimeOptions({});
  const response = await client.submitDocStructureJobAdvance(advanceRequest, runtimeObject);
	return response.body;
}
```

返回结果如下所示。

```
{
  "requestId": "43A29C77-405E-4CC0-BC55-EE694AD0****",
  "data": {
    "id": "docmind-20220712-b15f****"
  }
}
```

### 传入文档URL提交任务

您传入的文档URL必须为公网可访问下载的公网URL地址，无跨域限制，URL不带特殊转义字符。

以下代码示例表示通过文档URL方式调用异步任务提交类API。

```
const Client = require('@alicloud/docmind-api20220711');
const Credential = require('@alicloud/credentials');

const getResult = async () => {
  // 调用接口时，程序直接访问凭证，读取您的访问密钥（即AccessKey）并自动完成鉴权。
  // 运行本示例前，请先完成步骤二：配置身份认证。
  // 本示例使用默认配置文件方式，通过配置Credentials文件创建默认的访问凭证。
  // 使用默认凭证初始化Credentials Client。
  const cred = new Credential.default();
  const client = new Client.default({
    // 访问的域名，支持IPv4和IPv6两种方式，IPv6请使用docmind-api-dualstack.cn-hangzhou.aliyuncs.com。
    endpoint: 'docmind-api.cn-hangzhou.aliyuncs.com',
    // 通过credentials获取配置中的AccessKey ID。
    accessKeyId: cred.credential.accessKeyId,
    // 通过credentials获取配置中的AccessKey Secret。
    accessKeySecret: cred.credential.accessKeySecret,
    // 若您需要识别的文件为大文件,耗时较长。您可设置以下connectTimeout和readTimeout属性
    // 建立连接超时时间
    connectTimeout: 60000,
    // 读取资源超时时间
    readTimeout: 60000,
    type: 'access_key',
    regionId: 'cn-hangzhou'
  });
  
  const request = new Client.SubmitDocStructureJobRequest();
  request.fileName = 'example.pdf';
  request.fileUrl = 'https://example.com/example.pdf';
  const response = await client.submitDocStructureJob(request);
  
  return response.body;
}
```

返回结果如下所示。

```
{
  "requestId": "43A29C77-405E-4CC0-BC55-EE694AD0****",
  "data": {
    "id": "docmind-20220712-b15f****"
  }
}
```

## **调用结果查询类API**

针对结果查询类API，查询结果有处理中、处理成功、处理失败三种情况。

以下代码示例表示调用结果查询类API。

```
const Client = require('@alicloud/docmind-api20220711');
const Credential = require('@alicloud/credentials');

const getResult = async () => {
  // 调用接口时，程序直接访问凭证，读取您的访问密钥（即AccessKey）并自动完成鉴权。
  // 运行本示例前，请先完成步骤二：配置身份认证。
  // 本示例使用默认配置文件方式，通过配置Credentials文件创建默认的访问凭证。
  // 使用默认凭证初始化Credentials Client。
  const cred = new Credential.default();
  const client = new Client.default({
    // 访问的域名，支持IPv4和IPv6两种方式，IPv6请使用docmind-api-dualstack.cn-hangzhou.aliyuncs.com。
    endpoint: 'docmind-api.cn-hangzhou.aliyuncs.com',
    // 通过credentials获取配置中的AccessKey ID。
    accessKeyId: cred.credential.accessKeyId,
    // 通过credentials获取配置中的AccessKey Secret。
    accessKeySecret: cred.credential.accessKeySecret,
    type: 'access_key',
    regionId: 'cn-hangzhou'
  });
  
  const resultRequest = new Client.GetDocStructureResultRequest();
  resultRequest.id = "docmind-20220902-824b****";
  const response = await client.getDocStructureResult(resultRequest);
  
  return response.body;
}
```

返回结果分为处理中、处理成功、处理失败三种情况。

处理中的返回结果如下所示，Completed会返回false，表示任务没有处理结束，仍在处理中。这种需要继续轮询，直到明确返回Completed为true或者超过轮询最大时间。

```
{
  "requestId": "2AABD2C2-D24F-12F7-875D-683A27C3****",
  "completed": false,
  "code": "DocProcessing",
  "message": "Document processing",
  "hostId": "ocr-api.cn-hangzhou.aliyuncs.com",
  "recommend": "https://next.api.aliyun.com/troubleshoot?q=DocProcessing&product=docmind-api"
}
```

处理成功的返回结果如下所示，Completed会返回true，表示任务处理结束，同时会返回Status为字符串的Success，表示处理成功。具体的处理结果在Data节点中。

```
{
  "Status": "Success",
  "RequestId": "73134E1A-E281-1B2C-A105-D0EF****",
  "Completed": true,
	"Data": {
		"styles": [{
				"styleId": 0,
				"underline": false,
				"deleteLine": false,
				"bold": true,
				"italic": false,
				"fontSize": 15,
				"fontName": "黑体",
				"color": "000000",
				"charScale": 0.95
			},
			{
				"styleId": 1,
				"underline": false,
				"deleteLine": false,
				"bold": false,
				"italic": false,
				"fontSize": 12,
				"fontName": "微软雅黑",
				"color": "000000",
				"charScale": 1
			}
		],
		"layouts": [{
			"text": "测试标题",
			"index": 0,
			"uniqueId": "xxxx9816e77caea338df554b80ab95c7",
			"alignment": "center",
			"pageNum": [
				0
			],
			"pos": [{
					"x": 405,
					"y": 192
				},
				{
					"x": 860,
					"y": 191
				},
				{
					"x": 860,
					"y": 236
				},
				{
					"x": 406,
					"y": 237
				}
			],
			"type": "title",
      "subType":"doc_title"
		}, {
			"text": "本段为测试内容",
			"index": 1,
			"uniqueId": "xxxx8606c213c01c12d70f98dcfb2525",
			"alignment": "left",
			"pageNum": [
				0
			],
			"pos": [{
					"x": 187,
					"y": 311
				},
				{
					"x": 1075,
					"y": 311
				},
				{
					"x": 1076,
					"y": 373
				},
				{
					"x": 187,
					"y": 373
				}
			],
			"type": "text",
      "subType":"para",
			"lineHeight": 7,
			"firstLinesChars": 30,
			"blocks": [{
					"text": "本段",
					"pos": null,
					"styleId": 0
				},
				{
					"text": "为测试内容",
					"pos": null,
					"styleId": 1
				}
			]
		}],
		"logics": {
			"docTree": [{
				"uniqueId": "xxxx9816e77caea338df554b80ab95c7",
				"level": 0,
				"link": {
					"下级": [

					],
					"包含": [

					]
				},
				"backlink": {
					"上级": [
						"ROOT"
					]
				}
			}],
			"paragraphKVs": null,
			"tableKVs": null
		},
		"docInfo": {
			"docType": "pdf",
			"orignalDocName": "1.pdf",
			"pages": [{
				"imageType": "JPEG",
				"imageUrl": "http://test.moshi.aliyuncs.com/docMind/image/xxxx3cccbfec45b48d3a8081c9c9659e/0",
				"angle": null,
				"imageWidth": 1273,
				"imageHeight": 1801,
				"pageIdCurDoc": 1,
				"pageIdAllDocs": 1
			}]
		}
	}
}
```

处理失败的返回结果如下所示，处理失败Completed会返回true，表示任务处理结束，同时会返回Status为字符串的Fail，表示处理成功失败，同时会返回失败Code和详细原因Message。访问[错误码](https://help.aliyun.com/zh/document-mind/developer-reference/description-of-error-codes#85f5a7702dbcd)可以查看错误码详细介绍。

```
{
  "requestId": "A8EF3A36-1380-1116-A39E-B377BE27****",
  "completed": true,
   "status": "Fail"
  "code": "UrlNotLegal",
  "message": "Failed to process the document.  The document url you provided is not legal.",
  "hostId": "docmind-api.cn-hangzhou.aliyuncs.com",
  "recommend": "https://next.api.aliyun.com/troubleshoot?q=IDP.UrlNotLegal&product=docmind-api"
}
```