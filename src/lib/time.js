export function availabilityOverlapRatio(startISO, endISO, availability, dayKey){
  if(!startISO||!endISO||!availability) return 0;
  const total = Math.max(0,(endISO-startISO)/60000);
  if(total<=0) return 0;
  const key = dayKey || ['sun','mon','tue','wed','thu','fri','sat'][startISO.getUTCDay()];
  const windows = availability?.[key] || [];
  let overlap=0;
  for(const w of windows){
    const [sh,sm]=(w.start||'00:00').split(':').map(Number);
    const [eh,em]=(w.end||'00:00').split(':').map(Number);
    const ws=new Date(startISO); ws.setUTCHours(sh,sm||0,0,0);
    const we=new Date(startISO); we.setUTCHours(eh,em||0,0,0);
    const s=Math.max(startISO,ws), e=Math.min(endISO,we);
    overlap += Math.max(0,(e-s)/60000);
  }
  return Math.max(0, Math.min(1, overlap/total));
}
