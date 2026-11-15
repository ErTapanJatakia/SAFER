import {getTenantConfiguration,updateTenantConfiguration,TenantConfigurationError} from '../../src/server/tenant-configuration.mjs';
import {resolveTenantAuthorization,TenantAuthorizationError} from '../../src/server/tenant-authorization.mjs';
function bearer(req){const h=req.headers?.authorization;if(typeof h!=='string'||!h.startsWith('Bearer '))return null;const t=h.slice(7).trim();return t&&!/\s/.test(t)?t:null;}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('Pragma','no-cache');res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','PATCH'].includes(req.method)){res.setHeader('Allow','GET, PATCH');return res.status(405).json({error:'method_not_allowed'});}
 const token=bearer(req);if(!token)return res.status(401).json({error:'unauthenticated'});
 try{
  const [{platformAuth,platformDb},{FieldValue}]=await Promise.all([import('../../src/server/firebase-admin.js'),import('firebase-admin/firestore')]);
  const orgId=req.method==='GET'?req.query?.orgId:req.body?.orgId;
  const authorization=await resolveTenantAuthorization({token,orgId,action:req.method==='GET'?'organisation:read':'organisation:update',auth:platformAuth,database:platformDb});
  const result=req.method==='GET'
   ?await getTenantConfiguration({orgId:authorization.orgId,actorUid:authorization.uid,database:platformDb})
   :await updateTenantConfiguration({orgId:authorization.orgId,actorUid:authorization.uid,settings:req.body?.settings,database:platformDb,serverTimestamp:()=>FieldValue.serverTimestamp()});
  return res.status(200).json(result);
 }catch(error){
  if(error instanceof TenantConfigurationError||error instanceof TenantAuthorizationError){
   const status=error.code==='invalid_request'||error.code==='invalid_configuration'?400:error.status??403;
   return res.status(status).json({error:error.code});
  }
  return res.status(503).json({error:'tenant_configuration_unavailable'});
 }
}
