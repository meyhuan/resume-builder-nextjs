import { afterEach, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({request:vi.fn(),enqueue:vi.fn(async()=>{}),flush:vi.fn(async()=>{}),clear:vi.fn(async()=>{})}));
vi.mock("../lib/api-request",()=>({apiRequest:mocks.request}));
vi.mock("../lib/telemetry-queue",()=>({createTelemetryQueue:()=>mocks}));
afterEach(()=>{vi.unstubAllGlobals();vi.resetAllMocks();vi.resetModules();});
it("preserves verified fill counts and reports partial status if draft synchronization fails",async()=>{
  let listener!: (message:unknown,sender:unknown,reply:(value:unknown)=>void)=>void;
  const local:Record<string,unknown>={accessToken:"test",onboardingAccepted:true};
  const session:Record<string,unknown>={};
  const area=(values:Record<string,unknown>)=>({
    get:async(keys:string|string[])=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(key=>[key,values[key]])),
    set:async(next:Record<string,unknown>)=>{Object.assign(values,next);}, remove:async()=>{},clear:async()=>{},
  });
  const tab={id:1,url:"https://careers.example/resume"};
  const event={addListener:vi.fn()};
  const nativeSetAccessLevel=vi.fn(async()=>{});
  vi.stubGlobal("chrome",{storage:{local:{setAccessLevel:nativeSetAccessLevel}}});
  vi.stubGlobal("browser",{
    storage:{local:area(local),session:area(session)},
    runtime:{onMessage:{addListener:(fn:typeof listener)=>{listener=fn;}},onStartup:event,getManifest:()=>({version:"0.5.0"})},
    alarms:{onAlarm:event},sidePanel:{setPanelBehavior:async()=>{}},
    tabs:{query:async()=>[tab],get:async()=>tab,onRemoved:event,onUpdated:event},
    scripting:{executeScript:async({func}:{func:Function})=>[{result:func.name==="collectPageSnapshot" ? {
      fields:[{fieldId:"name",tag:"input",type:"text",context:"姓名",options:[],optionText:"",labelSource:"label"}],
      job:{companyName:"合成测试",jobTitle:"工程师",location:"",jobUrl:tab.url,applicationUrl:tab.url,sourceDomain:"careers.example"},
    } : {filled:1,alreadyFilled:0,failedCount:0,failed:[]}}]},
  });
  vi.stubGlobal("defineBackground",(callback:()=>void)=>callback());
  mocks.request.mockImplementation(async(url:string)=>{
    if (url.endsWith("/profile")) return Response.json({profile:{personal:{fullName:"测试姓名"}},defaultResumeId:null,updatedAt:new Date().toISOString()});
    throw new Error("offline");
  });
  await import("../entrypoints/background");
  expect(nativeSetAccessLevel).toHaveBeenCalledWith({accessLevel:"TRUSTED_CONTEXTS"});
  const result=await new Promise<unknown>(resolve=>listener({type:"fill",page:{tabId:tab.id,url:tab.url}},{},resolve));
  expect(result).toMatchObject({filled:1,failedCount:0,recordingError:expect.stringContaining("投递记录同步未完成")});
  expect(mocks.enqueue).toHaveBeenCalledWith("extension_fill_result",expect.objectContaining({status:"partial",filledCount:1,recordingFailed:true}));
});
