import {
  listTenantPersonnel,createTenantPersonnel,updateTenantPersonnel,TenantPersonnelError,
} from '../../src/server/tenant-personnel.mjs';
import { resolveTenantAuthorization,TenantAuthorizationError } from '../../src/server/tenant-authorization.mjs';

function bearerToken(req) {
  const value=req.headers?.authorization;
  if(typeof value!=='string'||!value.startsWith('Bearer ')) return null;
  const token=value.slice(7).trim();
  return token&&!/\s/.test(token)?token:null;
}
function statusFor(error) {
  if(error?.code==='unauthenticated') return 401;
  if(['invalid_request','invalid_authorization_request','invalid_personnel_data'].includes(error?.code)) return 400;
  if(['role_permission_denied','active_tenant_membership_required','active_organisation_required','tenant_membership_required'].includes(error?.code)) return 403;
  if(error?.code==='personnel_record_not_found') return 404;
  return 503;
}
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Pragma','no-cache');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(!['GET','POST','PATCH'].includes(req.method)) {
    res.setHeader('Allow','GET, POST, PATCH');
    return res.status(405).json({error:'method_not_allowed'});
  }
  const token=bearerToken(req);
  if(!token) return res.status(401).json({error:'unauthenticated'});
  try {
    const [{platformAuth,platformDb},{FieldValue}]=await Promise.all([
      import('../../src/server/firebase-admin.js'),import('firebase-admin/firestore'),
    ]);
    let decoded;
    try { decoded=await platformAuth.verifyIdToken(token,true); }
    catch { return res.status(401).json({error:'unauthenticated'}); }
    if(!decoded?.uid) return res.status(401).json({error:'unauthenticated'});
    const orgId=req.method==='GET'?req.query?.orgId:req.body?.orgId;
    if(req.method==='GET') {
      const identity=await resolveTenantAuthorization({
        token,orgId,action:'organisation:read',auth:platformAuth,database:platformDb,
      });
      const authorization=identity.role==='tenant_employee'
        ? await resolveTenantAuthorization({
            token,orgId,action:'personnel:read:own',resourceOwnerUid:identity.uid,
            auth:platformAuth,database:platformDb,
          })
        : await resolveTenantAuthorization({
            token,orgId,action:'personnel:read',auth:platformAuth,database:platformDb,
          });
      return res.status(200).json(await listTenantPersonnel({
        orgId:authorization.orgId,actorUid:authorization.uid,role:authorization.role,database:platformDb,
      }));
    }
    if(req.method==='POST') {
      const authorization=await resolveTenantAuthorization({
        token,orgId,action:'personnel:create',auth:platformAuth,database:platformDb,
      });
      const result=await createTenantPersonnel({
        orgId,actorUid:authorization.uid,input:req.body,database:platformDb,
        serverTimestamp:()=>FieldValue.serverTimestamp(),
      });
      return res.status(201).json(result);
    }
    const authorization=await resolveTenantAuthorization({
      token,orgId,action:'personnel:update',auth:platformAuth,database:platformDb,
    });
    const result=await updateTenantPersonnel({
      orgId,actorUid:authorization.uid,recordId:req.body?.recordId,
      patch:req.body?.patch,database:platformDb,
      serverTimestamp:()=>FieldValue.serverTimestamp(),
    });
    return res.status(200).json(result);
  } catch(error) {
    if(error instanceof TenantPersonnelError||error instanceof TenantAuthorizationError) {
      return res.status(statusFor(error)).json({error:error.code});
    }
    return res.status(503).json({error:'tenant_personnel_service_unavailable'});
  }
}
