import {completeRow,makeJob,validateBatch,type BatchRecord,type BatchJob} from './batch';
export interface WorkerPort {postMessage:(job:BatchJob)=>void;terminate:()=>void;onmessage:((event:{data:any})=>void)|null;onerror:((event:any)=>void)|null;}
// One worker per queue; terminating it cancels synchronous optimization immediately.
export class BatchRunner{
 private worker:WorkerPort|null=null;private epoch=0;private serial=0;private timer:ReturnType<typeof setTimeout>|undefined;
 private record:BatchRecord|null=null;private running=false;
 constructor(private factory:()=>WorkerPort,private update:(record:BatchRecord,running:boolean)=>void,private timeoutMs=120000){}
 private emit(){if(this.record)this.update(structuredClone(this.record),this.running);}
 start(record:BatchRecord){this.cancel(false);this.record=validateBatch(record);this.running=true;this.emit();this.next(this.epoch);}
 private next(epoch:number){if(epoch!==this.epoch||!this.record)return;const row=this.record.rows.find(r=>r.status!=='completed'&&r.status!=='failed');if(!row){this.running=false;this.worker?.terminate();this.worker=null;this.emit();return;}
 row.status='running';row.stage='A';delete row.error;const job=makeJob(this.record.definition,row.circuitId,++this.serial);
 let settled=false;const fail=(reason:string)=>{if(settled||epoch!==this.epoch||!this.running)return;settled=true;clearTimeout(this.timer);row.status='failed';row.error=reason;delete row.stage;this.worker?.terminate();this.worker=null;this.emit();this.next(epoch);};
 try{if(!this.worker)this.worker=this.factory();const w=this.worker;w.onmessage=event=>{const m=event.data;if(settled||epoch!==this.epoch||!this.running||m.id!==job.id||m.key!==job.key)return;if(m.kind==='progress'){if(m.stage==='A'||m.stage==='B'){row.stage=m.stage;this.emit();}return;}clearTimeout(this.timer);if(m.error){fail(m.error);return;}try{Object.assign(row,completeRow(this.record!.definition,row.circuitId,m.baseline,m.lap));delete row.stage;settled=true;this.emit();this.next(epoch);}catch(e){fail(String(e));}};w.onerror=()=>fail('Worker failed. Retry unfinished circuits.');this.timer=setTimeout(()=>fail('Circuit timed out. Retry unfinished circuits.'),this.timeoutMs);this.emit();w.postMessage(job);}catch(e){fail(String(e));}
 }
 cancel(notify=true){++this.epoch;clearTimeout(this.timer);this.worker?.terminate();this.worker=null;this.running=false;if(this.record){for(const r of this.record.rows)if(r.status==='running'||r.status==='pending'){r.status='cancelled';delete r.stage;}if(notify)this.emit();}}
 retry(){if(!this.record)return;const next=structuredClone(this.record);for(const r of next.rows)if(r.status!=='completed'){r.status='pending';delete r.error;}this.start(next);}
}
