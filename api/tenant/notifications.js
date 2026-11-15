import {resolveTenantAuthorization,TenantAuthorizationError} from '../../src/server/tenant-authorization.mjs';
const ORG=/^org_[a-f0-9]{32}$/;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('Pragma','no-cache');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'method_not_allowed'});}
 const header=req.headers?.authorization;const token=typeof header==='string'&&header.startsWith('Bearer ')?header.slice(7).trim():'';
 if(!token||/\s/.test(token))return res.status(401).json({error:'unauthenticated'});
 try{
  const {platformAuth,platformDb}=await import('../../src/server/firebase-admin.js');
  const authorization=await resolveTenantAuthorization({token,orgId:req.query?.orgId,action:'organisation:read',auth:platformAuth,database:platformDb});
  const snapshot=await platformDb.collection(`organisations/${authorization.orgId}/auditEvents`).orderBy('occurredAt','desc').limit(30).get();
  const notifications=snapshot.docs.flatMap(doc=>{
   const value=doc.data();
   if(value.orgId!==authorization.orgId||typeof value.action!=='string'||typeof value.actorUid!=='string')return [];
   return [{eventId:doc.id,action:value.action,actorUid:value.actorUid,targetResourceId:typeof value.targetResourceId==='string'?value.targetResourceId:null,occurredAt:value.occurredAt?.toDate?.()?.toISOString?.()??null}];
  });
  return res.status(200).json({orgId:authorization.orgId,notifications,delivery:'in_app_activity_only'});
 }catch(error){
  if(error instanceof TenantAuthorizationError)return res.status(error.status??403).json({error:error.code});
  return res.status(503).json({error:'tenant_activity_unavailable'});
 }
}
