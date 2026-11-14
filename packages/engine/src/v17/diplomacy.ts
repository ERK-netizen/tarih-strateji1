import {nextV17Id,type V17State,type V17Proposal,type V17ProposalStatus} from './state.ts';
export function offerV17(s:V17State,from:number,to:number,clause:V17Proposal['clause'],day:number,parentId=0):V17Proposal {
  if(from===to||from<0||to<0)throw Error('hedef ülke geçersiz');
  if(s.proposals.some(x=>x.from===from&&x.to===to&&x.clause===clause&&x.status==='pending'))throw Error('aynı teklif açık');
  const p:V17Proposal={id:nextV17Id(s),from,to,clause,revision:parentId?(s.proposals.find(x=>x.id===parentId)?.revision??0)+1:1,parentId,status:'pending',createdDay:day,expiryDay:day+45,visibility:'parties'};
  s.proposals.push(p);return p;
}
export function replyV17(s:V17State,id:number,actor:number,response:'accept'|'reject'|'counter',day:number):V17Proposal|undefined {
  const p=s.proposals.find(x=>x.id===id);if(!p||p.status!=='pending')throw Error('teklif kapalı veya yok');
  if(actor!==p.to)throw Error('yalnız muhatap yanıtlar');
  if(day>p.expiryDay){p.status='expired';throw Error('teklif süresi doldu');}
  const status:V17ProposalStatus=response==='accept'?'accepted':response==='reject'?'rejected':'countered';p.status=status;
  if(response==='counter')return offerV17(s,actor,p.from,p.clause,day,id);
  if(response==='accept')s.stats.treatiesAccepted++;
  return undefined;
}
export function expireV17(s:V17State,day:number):void{for(const q of s.proposals)if(q.status==='pending'&&q.expiryDay<day)q.status='expired';}
export function proposalVisible(p:V17Proposal,viewer:number):boolean{return p.visibility==='public'||p.from===viewer||p.to===viewer;}
