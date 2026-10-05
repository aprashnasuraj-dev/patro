import connectedWorker from "./connected-entry";
import { calendarTierResponse } from "./calendar-tier";
type Env=Record<string,unknown>&{DB?:any;CALENDAR_BACKUP?:any;CALENDAR_COVERAGE_START?:string;CALENDAR_COVERAGE_END?:string;CALENDAR_SOURCE_VERSION?:string};
const worker={...connectedWorker,async fetch(request:Request,env:Env,ctx:ExecutionContext){const calendar=await calendarTierResponse(request,env);if(calendar)return calendar;return connectedWorker.fetch(request,env as any,ctx)}};
export default worker;
