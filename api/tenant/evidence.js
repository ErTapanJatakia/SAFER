import {listTenantEvidence,registerTenantEvidence,TenantEvidenceError} from '../../src/server/tenant-evidence.mjs';
import {resolveTenantAuthorization,TenantAuthorizationError} from '../../src/server/tenant-authorization.mjs';
function bearer(req){const h=req.headers?.authorization;if(typeof h!=='string'||!h.startsWith('Bearer '))return null;const t=h.slice(7).trim();return t&&!/\s/.test(t)?t:null;}
function status(error){
 if(error?.code==='unauthenticated')return 401;
 if(['invalid_request','invalid_authorization_request','invalid_evidence_data'].includes(error?.code))return 400;
 if(['role_permission_denied','active_tenant_membership_required','active_organisation_required','tenant_membership_required'].includes(error?.code))return 403;
 if(error?.code==='incident_not_found')return 404;
 return 503;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('Pragma','no-cache');res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'method_not_allowed'});}
 const token=bearer(req);if(!token)return res.status(401).json({error:'unauthenticated'});
 try{
  const [{platformAuth,platformDb},{FieldValue}]=await Promise.all([import('../../src/server/firebase-admin.js'),import('firebase-admin/firestore')]);
  let decoded;try{decoded=await platformAuth.verifyIdToken(token,true);}catch{return res.status(401).json({error:'unauthenticated'});}
  if(!decoded?.uid)return res.status(401).json({error:'unauthenticated'});
  const orgId=req.method==='GET'?req.query?.orgId:req.body?.orgId;
  const authorization=await resolveTenantAuthorization({token,orgId,action:req.method==='GET'?'evidence:read':'evidence:register',auth:platformAuth,database:platformDb});
  if(req.method==='GET')return res.status(200).json(await listTenantEvidence({orgId:authorization.orgId,database:platformDb}));
  const result=await registerTenantEvidence({orgId,actorUid:authorization.uid,input:req.body,database:platformDb,serverTimestamp:()=>FieldValue.serverTimestamp()});
  return res.status(201).json(result);
 }catch(error){
  if(error instanceof TenantEvidenceError||error instanceof TenantAuthorizationError)return res.status(status(error)).json({error:error.code});
  return res.status(503).json({error:'tenant_evidence_service_unavailable'});
 }
}

// Bound parsed JSON payloads before authorization or business logic runs.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '64kb',
    },
  },
};
