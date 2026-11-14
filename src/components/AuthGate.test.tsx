import React, {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {AuthGate} from './AuthGate';
import {useDemoWorkspaceRepository} from './DemoGuestWorkspaceProvider';
import type {DemoWorkspaceRepository} from '../lib/demoWorkspace';
import {resolveTenantMembership} from '../lib/tenantMembership';
import {onAuthStateChanged,signOut} from 'firebase/auth';
import {auth as firebaseAuth} from '../lib/firebase.ts';
import * as sessionInvalidation from '../lib/sessionInvalidation';

vi.mock('firebase/auth',()=>({GoogleAuthProvider:vi.fn(),createUserWithEmailAndPassword:vi.fn(),onAuthStateChanged:vi.fn(),sendEmailVerification:vi.fn(),sendPasswordResetEmail:vi.fn(),signInWithEmailAndPassword:vi.fn(),signInWithPopup:vi.fn(),signOut:vi.fn()}));
vi.mock('../lib/firebase.ts',()=>({auth:{name:'test-auth',currentUser:null},db:{name:'test-db'},isFirebaseConfigured:true}));
vi.mock('../lib/tenantMembership.ts',()=>({resolveTenantMembership:vi.fn()}));
const makeUser=(uid:string)=>({uid,email:uid+'@example.test',emailVerified:true,providerData:[{providerId:'password'}]});
let retainedRepository: DemoWorkspaceRepository | null = null;
const StorageProbe=()=>{const repository=useDemoWorkspaceRepository();retainedRepository=repository;const [stored]=React.useState(()=>window.localStorage.getItem('prot_ops_personnel_v2'));return <div>Operational app shell {stored||''}</div>;};

let root:Root, host:HTMLElement, listener:((user:ReturnType<typeof makeUser>|null)=>void)|undefined, authError:((error:Error)=>void)|undefined;
const flush=async()=>{await act(async()=>{await Promise.resolve();await Promise.resolve();});};
const button=(name:string)=>{const element=[...host.querySelectorAll('button')].find(b=>b.textContent?.trim()===name) as HTMLButtonElement|undefined;if(!element)throw new Error(`Button not found: ${name}`);const nativeClick=element.click.bind(element);element.click=()=>act(()=>nativeClick());return element;};
const change=(el:HTMLInputElement,value:string)=>{const view=el.ownerDocument.defaultView;if(!view)throw new Error('Input has no owning window');const setter=Object.getOwnPropertyDescriptor(view.HTMLInputElement.prototype,'value')?.set;if(!setter)throw new Error('HTMLInputElement value setter unavailable');act(()=>{setter.call(el,value);el.dispatchEvent(new view.Event('input',{bubbles:true}));el.dispatchEvent(new view.Event('change',{bubbles:true}));});};
const submit=(form:HTMLFormElement)=>act(()=>{form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));});
const auth=(user:ReturnType<typeof makeUser>|null)=>{Object.defineProperty(firebaseAuth,'currentUser',{configurable:true,value:user});act(()=>listener?.(user));};
beforeEach(async()=>{
 window.localStorage.clear();
 host=document.createElement('div');document.body.append(host);root=createRoot(host);listener=undefined;authError=undefined;retainedRepository=null;
 vi.mocked(onAuthStateChanged).mockImplementation((_auth,cb,error)=>{listener=cb as typeof listener;authError=error as typeof authError;listener!(null);return vi.fn();});
 vi.mocked(signOut).mockImplementation(async()=>{Object.defineProperty(firebaseAuth,'currentUser',{configurable:true,value:null});listener?.(null);});
 await act(async()=>{root.render(<AuthGate><StorageProbe /></AuthGate>);});
 await flush();
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();window.localStorage.clear();vi.clearAllMocks();});

const verifiedWorkspace = () => host.querySelector('[data-testid="verified-organisation-workspace"]');

describe('AuthGate membership session handling',()=>{
 it('does not resolve membership for Demo Guest',async()=>{button('Continue as Demo Guest').click();await flush();expect(host.textContent).toContain('Demo Guest session');expect(host.querySelector('input[placeholder="Enter organisation ID"]')).toBeNull();expect(resolveTenantMembership).not.toHaveBeenCalled();});
 it('keeps the operational app shell unmounted for authenticated sessions',async()=>{auth(makeUser('user-a'));await flush();expect(host.textContent).toContain('Account verified — workspace not yet released');expect(host.textContent).not.toContain('App shell');expect(host.textContent).not.toContain('Demo Guest session');});
 it('remounts account security controls when the authenticated UID changes',async()=>{
  auth(makeUser('user-a'));await flush();
  const current=host.querySelector('input[autocomplete="current-password"]') as HTMLInputElement;
  change(current,'SensitiveOldAccountPass!123');
  expect(current.value).toBe('SensitiveOldAccountPass!123');
  auth(makeUser('user-b'));await flush();
  const next=[...host.querySelectorAll('input[autocomplete="current-password"]')][0] as HTMLInputElement;
  expect(next.value).toBe('');
  expect(host.textContent).toContain('user-b@example.test');
 });
 it('does not touch operational browser storage while signed out or authenticated',async()=>{const read=vi.spyOn(window.Storage.prototype,'getItem');expect(read).not.toHaveBeenCalled();auth(makeUser('user-a'));await flush();expect(read).not.toHaveBeenCalled();expect(host.textContent).not.toContain('Operational app shell');});
 it('probes all operational storage keys only after explicit Demo Guest entry',async()=>{const read=vi.spyOn(dom.window.Storage.prototype,'getItem');expect(read).not.toHaveBeenCalled();button('Continue as Demo Guest').click();await flush();expect(read).toHaveBeenCalledTimes(5);expect(read).toHaveBeenNthCalledWith(1,'prot_ops_personnel_v2');expect(read).toHaveBeenNthCalledWith(2,'prot_ops_incidents_v2');expect(read).toHaveBeenNthCalledWith(3,'prot_ops_cyber_v2');expect(read).toHaveBeenNthCalledWith(4,'prot_ops_checklist_v2');expect(host.textContent).toContain('Operational app shell');});
 it('unmounts the Demo Guest workspace when an authenticated identity appears and revokes retained access',async()=>{const read=vi.spyOn(dom.window.Storage.prototype,'getItem');button('Continue as Demo Guest').click();await flush();expect(read).toHaveBeenCalledTimes(5);auth(makeUser('user-a'));await flush();expect(host.textContent).not.toContain('Operational app shell');expect(host.textContent).toContain('Account verified — workspace not yet released');expect(read).toHaveBeenCalledTimes(5);expect(()=>retainedRepository?.loadSnapshot()).toThrow(/session has ended/);expect(read).toHaveBeenCalledTimes(5);});
 it('restores the authenticated lifecycle when Firebase sign-out fails but the same user remains current',async()=>{
  vi.mocked(resolveTenantMembership).mockResolvedValue({uid:'user-a',orgId:'org-a',role:'manager',status:'active'});
  auth(makeUser('user-a'));await flush();
  vi.mocked(signOut).mockRejectedValueOnce(new Error('network unavailable'));
  button('Sign out').click();await flush();
  expect(host.textContent).toContain('Signed in: user-a@example.test');
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('Your account session remains active');
  const field=host.querySelector('input[placeholder="Enter organisation ID"]') as HTMLInputElement;
  change(field,'org-a');await flush();submit(field.closest('form')!);await flush();
  expect(verifiedWorkspace()).not.toBeNull();
  expect(verifiedWorkspace()?.textContent).toContain('Manager');
  expect(resolveTenantMembership).toHaveBeenCalledWith({name:'test-db'},{uid:'user-a'},'org-a');
 });
 it('revokes retained repository access during Demo Guest sign-out',async()=>{const read=vi.spyOn(dom.window.Storage.prototype,'getItem');button('Continue as Demo Guest').click();await flush();expect(retainedRepository).not.toBeNull();button('Sign out').click();await flush();expect(host.textContent).toContain('Continue as Demo Guest');expect(()=>retainedRepository?.loadSnapshot()).toThrow(/session has ended/);expect(read).toHaveBeenCalledTimes(5);});
 it('revokes the Demo Guest workspace when another tab signals an account boundary',async()=>{const read=vi.spyOn(dom.window.Storage.prototype,'getItem');button('Continue as Demo Guest').click();await flush();expect(retainedRepository).not.toBeNull();act(()=>window.dispatchEvent(new StorageEvent('storage',{key:'safer:session-boundary-signal',newValue:'other-tab-signout'})));await flush();expect(host.textContent).toContain('Continue as Demo Guest');expect(host.textContent).not.toContain('Operational app shell');expect(()=>retainedRepository?.loadSnapshot()).toThrow(/session has ended/);expect(read).toHaveBeenCalledTimes(5);});

 it('allows an authenticated user to re-check membership after a peer-tab boundary',async()=>{
  vi.mocked(resolveTenantMembership).mockResolvedValue({uid:'user-a',orgId:'org-b',role:'manager',status:'active'});
  auth(makeUser('user-a'));await flush();
  act(()=>window.dispatchEvent(new StorageEvent('storage',{key:'safer:session-boundary-signal',newValue:'peer-boundary-recovery'})));
  await flush();
  expect(host.textContent).toContain('Account verified — workspace not yet released');
  expect(host.textContent).toContain('Current Firestore Rules independently permit only the explicitly modelled owner/admin operations');
  expect(verifiedWorkspace()).toBeNull();
  const field=host.querySelector('input[placeholder="Enter organisation ID"]') as HTMLInputElement;
  expect(field.value).toBe('');
  change(field,'org-b');await flush();submit(field.closest('form')!);await flush();
  expect(verifiedWorkspace()).not.toBeNull();
  expect(verifiedWorkspace()?.textContent).toContain('Manager');
  expect(resolveTenantMembership).toHaveBeenCalledWith({name:'test-db'},{uid:'user-a'},'org-b');
 });
 it('discards an in-flight membership response after a peer-tab boundary while allowing a new check',async()=>{
  let finish!:(v:{uid:string;orgId:string;role:'owner';status:'active'})=>void;
  vi.mocked(resolveTenantMembership).mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}))
    .mockResolvedValueOnce({uid:'user-a',orgId:'org-b',role:'manager',status:'active'});
  auth(makeUser('user-a'));await flush();
  let field=host.querySelector('input[placeholder="Enter organisation ID"]') as HTMLInputElement;
  change(field,'org-a');await flush();submit(field.closest('form')!);await flush();
  expect(host.textContent).toContain('Checking…');
  act(()=>window.dispatchEvent(new StorageEvent('storage',{key:'safer:session-boundary-signal',newValue:'peer-boundary-inflight'})));
  await flush();
  await act(async()=>finish({uid:'user-a',orgId:'org-a',role:'owner',status:'active'}));
  await flush();
  expect(verifiedWorkspace()).toBeNull();
  field=host.querySelector('input[placeholder="Enter organisation ID"]') as HTMLInputElement;
  change(field,'org-b');await flush();submit(field.closest('form')!);await flush();
  expect(verifiedWorkspace()?.textContent).toContain('Manager');
  expect(resolveTenantMembership).toHaveBeenCalledTimes(2);
 });

 it('cannot restore a pending membership result after sign-out begins',async()=>{
  let finishMembership!:(value:{uid:string;orgId:string;role:'owner';status:'active'})=>void;
  let finishSignOut!:()=>void;
  vi.mocked(resolveTenantMembership).mockReturnValueOnce(new Promise(resolve=>{finishMembership=resolve;}));
  vi.mocked(signOut).mockReturnValueOnce(new Promise<void>(resolve=>{finishSignOut=resolve;}));
  auth(makeUser('user-a'));await flush();
  const field=host.querySelector('input[placeholder="Enter organisation ID"]') as HTMLInputElement;
  change(field,'org-a');await flush();submit(field.closest('form')!);await flush();
  expect(host.textContent).toContain('Checking…');
  button('Sign out').click();await flush();
  expect(verifiedWorkspace()).toBeNull();
  expect(host.textContent).toContain('Signed in: user-a@example.test');
  await act(async()=>finishMembership({uid:'user-a',orgId:'org-a',role:'owner',status:'active'}));
  await flush();
  expect(verifiedWorkspace()).toBeNull();
  expect(host.textContent).not.toContain('Organisation administrator');
  await act(async()=>{finishSignOut();});
  auth(null);await flush();
  expect(host.textContent).toContain('Continue as Demo Guest');
 });
 it('rejects an unsupported role returned by the membership adapter',async()=>{
  vi.mocked(resolveTenantMembership).mockResolvedValue({uid:'user-a',orgId:'org-a',role:'platform_super_admin' as any,status:'active'});
  auth(makeUser('user-a'));await flush();
  const field=host.querySelector('input[placeholder="Enter organisation ID"]') as HTMLInputElement;
  change(field,'org-a');await flush();submit(field.closest('form')!);await flush();
  expect(verifiedWorkspace()).toBeNull();
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('No active membership could be verified.');
 });
 it('rejects a membership response bound to a different UID or organisation',async()=>{
  vi.mocked(resolveTenantMembership).mockResolvedValue({uid:'user-b',orgId:'org-other',role:'owner',status:'active'});
  auth(makeUser('user-a'));await flush();
  const field=host.querySelector('input[placeholder="Enter organisation ID"]') as HTMLInputElement;
  change(field,'org-a');await flush();submit(field.closest('form')!);await flush();
  expect(verifiedWorkspace()).toBeNull();
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('No active membership could be verified.');
 });
 it('resolves the exact organisation for the authenticated UID',async()=>{vi.mocked(resolveTenantMembership).mockResolvedValue({uid:'user-a',orgId:'org-a',role:'manager',status:'active'});auth(makeUser('user-a'));await flush();const field=host.querySelector('input[placeholder="Enter organisation ID"]') as HTMLInputElement;change(field,'org-a');await flush();submit(field.closest('form')!);await flush();expect(verifiedWorkspace()).not.toBeNull();expect(verifiedWorkspace()?.textContent).toContain('Manager');expect(resolveTenantMembership).toHaveBeenCalledWith({name:'test-db'},{uid:'user-a'},'org-a');});
 it('removes previously verified workspace metadata while re-verification is pending and after it fails',async()=>{
  let failSecond!:(reason:Error)=>void;
  vi.mocked(resolveTenantMembership)
    .mockResolvedValueOnce({uid:'user-a',orgId:'org-a',role:'owner',status:'active'})
    .mockReturnValueOnce(new Promise((_resolve,reject)=>{failSecond=reject;}));
  auth(makeUser('user-a'));await flush();
  const field=host.querySelector('input[placeholder="Enter organisation ID"]') as HTMLInputElement;
  change(field,'org-a');await flush();
  const form=field.closest('form')!;
  submit(form);await flush();
  expect(verifiedWorkspace()).not.toBeNull();
  expect(verifiedWorkspace()?.textContent).toContain('Organisation owner');

  submit(form);await flush();
  expect(verifiedWorkspace()).toBeNull();
  expect(host.textContent).toContain('Checking the exact membership record');
  await act(async()=>failSecond(new Error('permission-denied')));
  await flush();

  expect(verifiedWorkspace()).toBeNull();
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('Membership could not be verified.');
  expect(host.textContent).not.toContain('Organisation owner');
  expect(host.textContent).not.toContain('Organisation profile');
 });

 it('fails closed with generic feedback when lookup is denied',async()=>{vi.mocked(resolveTenantMembership).mockRejectedValue(new Error('permission-denied'));auth(makeUser('user-a'));await flush();const field=host.querySelector('input[placeholder="Enter organisation ID"]') as HTMLInputElement;change(field,'org-a');await flush();submit(field.closest('form')!);await flush();expect(host.querySelector('[role="alert"]')?.textContent).toContain('Membership could not be verified.');expect(host.textContent).not.toContain('Role:');});
 it('keeps only the newest membership result when duplicate requests overlap',async()=>{
  let finishFirst!:(value:{uid:string;orgId:string;role:'owner';status:'active'})=>void;
  let finishSecond!:(value:{uid:string;orgId:string;role:'manager';status:'active'})=>void;
  vi.mocked(resolveTenantMembership)
    .mockReturnValueOnce(new Promise(resolve=>{finishFirst=resolve;}))
    .mockReturnValueOnce(new Promise(resolve=>{finishSecond=resolve;}));
  auth(makeUser('user-a'));await flush();
  const field=host.querySelector('input[placeholder="Enter organisation ID"]') as HTMLInputElement;
  change(field,'org-a');await flush();
  const form=field.closest('form')!;
  await act(async()=>{submit(form);});
  await flush();
  await act(async()=>{submit(form);});
  await flush();
  expect(resolveTenantMembership).toHaveBeenCalledTimes(2);
  expect(host.querySelector('[role="status"]')?.textContent).toContain('Checking the exact membership record');

  await act(async()=>finishSecond({uid:'user-a',orgId:'org-a',role:'manager',status:'active'}));
  await flush();
  expect(verifiedWorkspace()?.textContent).toContain('Manager');
  await act(async()=>finishFirst({uid:'user-a',orgId:'org-a',role:'owner',status:'active'}));
  await flush();
  expect(verifiedWorkspace()?.textContent).toContain('Manager');
  expect(verifiedWorkspace()?.textContent).not.toContain('Organisation administrator');
 });

 it('discards pending results when the organisation locator changes',async()=>{let finish!:(v:{uid:string;orgId:string;role:'owner';status:'active'})=>void;vi.mocked(resolveTenantMembership).mockReturnValue(new Promise(resolve=>{finish=resolve;}));auth(makeUser('user-a'));await flush();const field=host.querySelector('input[placeholder="Enter organisation ID"]') as HTMLInputElement;change(field,'org-a');await flush();submit(field.closest('form')!);await flush();change(field,'org-b');await flush();await act(async()=>finish({uid:'user-a',orgId:'org-a',role:'owner',status:'active'}));expect(verifiedWorkspace()).toBeNull();});
 it('publishes a boundary for each real account transition without duplicating same-UID callbacks',async()=>{
  const publish=vi.spyOn(sessionInvalidation,'publishSessionInvalidation');
  expect(publish).not.toHaveBeenCalled();
  auth(makeUser('user-a'));await flush();
  expect(publish).toHaveBeenCalledTimes(1);
  auth(makeUser('user-a'));await flush();
  expect(publish).toHaveBeenCalledTimes(1);
  auth(makeUser('user-b'));await flush();
  expect(publish).toHaveBeenCalledTimes(2);
  auth(null);await flush();
  expect(publish).toHaveBeenCalledTimes(3);
  auth(makeUser('user-c'));await flush();
  expect(publish).toHaveBeenCalledTimes(4);
  publish.mockRestore();
 });
 it('discards a delayed membership response after a rapid account switch',async()=>{
  let finish!:(value:{uid:string;orgId:string;role:'owner';status:'active'})=>void;
  vi.mocked(resolveTenantMembership).mockReturnValue(new Promise(resolve=>{finish=resolve;}));
  auth(makeUser('user-a'));await flush();
  const field=host.querySelector('input[placeholder="Enter organisation ID"]') as HTMLInputElement;
  change(field,'org-a');await flush();submit(field.closest('form')!);await flush();
  expect(host.textContent).toContain('Checking…');
  expect(resolveTenantMembership).toHaveBeenCalledWith({name:'test-db'},{uid:'user-a'},'org-a');
  auth(makeUser('user-b'));await flush();
  await act(async()=>finish({uid:'user-a',orgId:'org-a',role:'owner',status:'active'}));
  await flush();
  expect(verifiedWorkspace()).toBeNull();
  expect(verifiedWorkspace()).toBeNull();
  expect(host.textContent).toContain('Account verified — workspace not yet released');
 });
 it('clears membership on account switch and sign-out',async()=>{vi.mocked(resolveTenantMembership).mockResolvedValue({uid:'user-a',orgId:'org-a',role:'admin',status:'active'});auth(makeUser('user-a'));await flush();let field=host.querySelector('input[placeholder="Enter organisation ID"]') as HTMLInputElement;change(field,'org-a');await flush();submit(field.closest('form')!);await flush();expect(verifiedWorkspace()?.textContent).toContain('Organisation administrator');auth(makeUser('user-b'));await flush();expect(verifiedWorkspace()).toBeNull();field=host.querySelector('input[placeholder="Enter organisation ID"]') as HTMLInputElement;expect(field.value).toBe('');change(field,'org-b');await flush();submit(field.closest('form')!);await flush();expect(verifiedWorkspace()?.textContent).toContain('Organisation administrator');button('Sign out').click();await flush();expect(verifiedWorkspace()).toBeNull();expect(host.textContent).toContain('Continue as Demo Guest');expect(resolveTenantMembership).toHaveBeenCalledTimes(2);});

 it('revokes Demo Guest access and pending authority when the auth observer errors',async()=>{
  const read=vi.spyOn(dom.window.Storage.prototype,'getItem');
  const publish=vi.spyOn(sessionInvalidation,'publishSessionInvalidation');
  button('Continue as Demo Guest').click();await flush();
  expect(host.textContent).toContain('Operational app shell');
  expect(retainedRepository).not.toBeNull();
  act(()=>authError?.(new Error('auth observer unavailable')));
  await flush();
  expect(host.textContent).toContain('Continue as Demo Guest');
  expect(host.textContent).not.toContain('Operational app shell');
  expect(host.textContent).toContain('Unable to verify the current account session.');
  expect(()=>retainedRepository?.loadSnapshot()).toThrow(/session has ended/);
  expect(read).toHaveBeenCalledTimes(5);
  expect(publish).toHaveBeenCalledTimes(1);
  publish.mockRestore();
 });

 it('discards a pending membership response after auth observer failure and recovers with a fresh identity',async()=>{
  let finishMembership!:(value:{uid:string;orgId:string;role:'owner';status:'active'})=>void;
  vi.mocked(resolveTenantMembership).mockReturnValueOnce(new Promise(resolve=>{finishMembership=resolve;}));
  auth(makeUser('user-a'));await flush();
  const field=host.querySelector('input[placeholder="Enter organisation ID"]') as HTMLInputElement;
  change(field,'org-a');await flush();submit(field.closest('form')!);await flush();
  expect(host.textContent).toContain('Checking…');
  act(()=>authError?.(new Error('auth observer unavailable')));
  await flush();
  expect(verifiedWorkspace()).toBeNull();
  expect(host.textContent).toContain('Retry account verification');
  await act(async()=>finishMembership({uid:'user-a',orgId:'org-a',role:'owner',status:'active'}));
  await flush();
  expect(verifiedWorkspace()).toBeNull();
  expect(host.textContent).toContain('Retry account verification');
  expect(host.textContent).not.toContain('Organisation administrator');
  button('Retry account verification').click();await flush();
  auth(makeUser('user-recovered'));await flush();
  expect(verifiedWorkspace()).toBeNull();
  expect(host.textContent).toContain('Signed in: user-recovered@example.test');
  const recoveredField=host.querySelector('input[placeholder="Enter organisation ID"]') as HTMLInputElement;
  expect(recoveredField.value).toBe('');
 });
 it('re-subscribes to Firebase auth state after an observer failure',async()=>{
  const replacedObserver = listener;
  act(()=>authError?.(new Error('auth observer unavailable')));
  await flush();
  expect(host.textContent).toContain('Retry account verification');
  expect(onAuthStateChanged).toHaveBeenCalledTimes(1);
  button('Retry account verification').click();
  await flush();
  expect(onAuthStateChanged).toHaveBeenCalledTimes(2);
  expect(host.textContent).not.toContain('Retry account verification');
  auth(makeUser('user-recovered'));
  await flush();
  expect(host.textContent).toContain('Account verified — workspace not yet released');
  expect(host.textContent).toContain('Signed in: user-recovered@example.test');
  expect(host.textContent).not.toContain('Continue as Demo Guest');
  act(()=>replacedObserver?.(makeUser('user-stale')));
  await flush();
  expect(host.textContent).toContain('Signed in: user-recovered@example.test');
  expect(host.textContent).not.toContain('user-stale@example.test');
 });
 it('does not resurrect a previous Demo Guest workspace after an auth identity appears and signs out',async()=>{
  const read=vi.spyOn(dom.window.Storage.prototype,'getItem');
  button('Continue as Demo Guest').click();await flush();
  expect(host.textContent).toContain('Operational app shell');
  expect(retainedRepository).not.toBeNull();
  auth(makeUser('user-a'));await flush();
  expect(host.textContent).toContain('Account verified — workspace not yet released');
  expect(host.textContent).not.toContain('Operational app shell');
  expect(()=>retainedRepository?.loadSnapshot()).toThrow(/session has ended/);
  auth(null);await flush();
  expect(host.textContent).toContain('Continue as Demo Guest');
  expect(host.textContent).not.toContain('Operational app shell');
  expect(read).toHaveBeenCalledTimes(5);
  button('Continue as Demo Guest').click();await flush();
  expect(host.textContent).toContain('Operational app shell');
  expect(read).toHaveBeenCalledTimes(10);
 });
});
