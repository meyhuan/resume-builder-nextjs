import { expect, it } from "vitest";
import { summarizeFillEvents } from "./report";
it("groups by domain and version without turning existing values into fill success",()=>{
  const events=[
    {properties:{sourceDomain:"site.test",extensionVersion:"0.5.0",status:"partial",filledCount:2,failedCount:3,alreadyFilledCount:20,missingProfileCount:4,unmatchedCount:5,durationMs:100}},
    {properties:{sourceDomain:"site.test",extensionVersion:"0.5.0",status:"success",filledCount:3,durationMs:300}},
    {properties:{sourceDomain:"site.test",extensionVersion:"0.4.4",status:"partial",alreadyFilledCount:20}},
  ];
  const groups=summarizeFillEvents(events);
  expect(groups).toHaveLength(2);
  expect(groups[0]).toMatchObject({runs:2,filled:5,failed:3,existing:20,missing:4,unmatched:5,averageDurationMs:200,writableSuccessRate:5/8});
  expect(groups[1].writableSuccessRate).toBeNull();
});
