import React, {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {JSDOM} from 'jsdom';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {AuthGate} from './AuthGate';
import {useDemoWorkspaceRepository} from './DemoGuestWorkspaceProvider';
import type {DemoWorkspaceRepository} from '../lib/demoWorkspace';
import {resolveTenantMembership} from '../lib/tenantMembership';
import {onAuthStateChanged,signOut} from 'firebase/auth';

vi.mock('firebase/auth',()=>({GoogleAuthProvider:vi.fn(),createUserWithEmailAndPassword:vi.fn(),onAuthStateChanged:vi.fn(),sendEmailVerification:vi.fn(),sendPasswordResetEmail:vi.fn(),signInWithEmailAndPassword:vi.fn(),signInWithPopup:vi.fn(),signOut:vi.fn()}));
vi.mock('../lib/firebase.ts',()=>({auth:{name:'test-auth'},db:{name:'test-db'},isFirebaseConfigured:true}));
vi.mock('../lib/tenantMembership.ts',()=>({resolveTenantMembership:vi.fn()}));
const makeUser=(uid:string)=>({uid,email:uid+'@example.test',emailVerified:true});
let retainedRepository: DemoWorkspaceRepository | null = null;
const StorageProbe=()=>{const repository=useDemoWorkspaceRepository();retainedRepository=repository;const [stored]=React.useState(()=>window.localStorage.getItem('prot_ops_personnel_v2'));return <div>Operational app shell {stored||''}</div>;};

let dom: JSDOM, root:Root, host:HTMLElement, listener:((user:ReturnType<typeof makeUser>|null)=>void)|undefined;
const flush=async()=>{await act(async()=>{await Promise.resolve();await Promise.resolve();});};
const button=(name:string)=>[...host.querySelectorAll('button')].find(b=>b.textContent?.trim()===name) as HTMLButtonElement;
const change=(el:HTMLInputElement,value:string)=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set; if (setter) setter.call(el,value); el.dispatchEvent(new dom.window.Event('input',{bubbles:true}));el.dispatchEvent(new dom.window.Event('change',{bubbles:true}));};
const submit=(form:HTMLFormElement)=>form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
const auth=(user:ReturnType<typeof makeUser>|null)=>{act(()=>listener?.(user));};
beforeEach(async()=>{
 dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost'});
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,HTMLInputElement:dom.window.HTMLInputElement,Event:dom.window.Event,IS_REACT_ACT_ENVIRONMENT:true});
 host=document.createElement('div');document.body.append(host);root=createRoot(host);listener=undefined;retainedRepository=null;
 vi.mocked(onAuthStateChanged).mockImplementation((_auth,cb)=>{listener=cb as typeof listener;listener!(null);return vi.fn();});
 vi.mocked(signOut).mockImplementation(async()=>{listener?.(null);});
 await act(async()=>{root.render(<AuthGate><StorageProbe /></AuthGate>);});
 await flush();
});
afterEach(async()=>{await act(async()=>root.unmount());dom.window.close();vi.clearAllMocks();});

describe('AuthGate membership session handling',()=>{
 it('does not resolve membership for Demo Guest',async()=>{button('Continue as Demo Guest').click();await flush();expect(host.textContent).toContain('Demo Guest session');expect(host.querySelector('input[placeholder="Enter organisation ID"]')).toBeNull();expect(resolveTenantMembership).not.toHaveBeenCalled();});
 it('keeps the operational app shell unmounted for authenticated sessions',async()=>{auth(makeUser('user-a'));await flush();expect(host.textContent).toContain('Account verified — workspace not yet released');expect(host.textContent).not.toContain('App shell');expect(host.textContent).not.toContain('Demo Guest session');});
 it('does not touch operational browser storage while signed out or authenticated',async()=>{const read=vi.spyOn(dom.window.Storage.prototype,'getItem');expect(read).not.toHaveBeenCalled();auth(makeUser('user-a'));await flush();expect(read).not.toHaveBeenCalled();expect(host.textContent).not.toContain('Operational app shell');});
 it('initializes operational browser storage only after explicit Demo Guest entry',async()=>{const read=vi.spyOn(dom.window.Storage.prototype,'getItem');expect(read).not.toHaveBeenCalled();button('Continue as Demo Guest').click();await flush();expect(read).toHaveBeenCalledTimes(1);expect(read).toHaveBeenCalledWith('prot_ops_personnel_v2');expect(host.textContent).toContain('Operational app shell');});
 it('unmounts the Demo Guest workspace when an authenticated identity appears and revokes retained access',async()=>{const read=vi.spyOn(dom.window.Storage.prototype,'getItem');button('Continue as Demo Guest').click();await flush();expect(read).toHaveBeenCalledTimes(1);auth(makeUser('user-a'));await flush();expect(host.textContent).not.toContain('Operational app shell');expect(host.textContent).toContain('Account verified — workspace not yet released');expect(read).toHaveBeenCalledTimes(1);expect(()=>retainedRepository?.loadSnapshot()).toThrow(/session has ended/);expect(read).toHaveBeenCalledTimes(1);});
 it('revokes retained repository access during Demo Guest sign-out',async()=>{const read=vi.spyOn(dom.window.Storage.prototype,'getItem');button('Continue as Demo Guest').click();await flush();expect(retainedRepository).not.toBeNull();button('Sign out').click();await flush();expect(host.textContent).toContain('Continue as Demo Guest');expect(()=>retainedRepository?.loadSnapshot()).toThrow(/session has ended/);expect(read).toHaveBeenCalledTimes(1);});
 it('revokes the Demo Guest workspace when another tab signals an account boundary',async()=>{const read=vi.spyOn(dom.window.Storage.prototype,'getItem');button('Continue as Demo Guest').click();await flush();expect(retainedRepository).not.toBeNull();act(()=>window.dispatchEvent(new StorageEvent('storage',{key:'safer:session-boundary-signal',newValue:'other-tab-signout'})));await flush();expect(host.textContent).toContain('Continue as Demo Guest');expect(host.textContent).not.toContain('Operational app shell');expect(()=>retainedRepository?.loadSnapshot()).toThrow(/session has ended/);expect(read).toHaveBeenCalledTimes(1);});
 it('broadcasts Demo Guest sign-out to peer tabs',async()=>{const setItem=vi.spyOn(dom.window.localStorage,'setItem');button('Continue as Demo Guest').click();await flush();button('Sign out').click();await flush();expect(setItem).toHaveBeenCalledWith('safer:session-boundary-signal',expect.any(String));expect(host.textContent).toContain('Continue as Demo Guest');});

 it('resolves the exact organisation for the authenticated UID',async()=>{vi.mocked(resolveTenantMembership).mockResolvedValue({uid:'user-a',orgId:'org-a',role:'manager',status:'active'});auth(makeUser('user-a'));await flush();const field=host.querySelector('input[placeholder="Enter organisation ID"]') as HTMLInputElement;change(field,'org-a');await flush();submit(field.closest('form')!);await flush();expect(host.textContent).toContain('Verified active membership');expect(host.textContent).toContain('Role: manager');expect(resolveTenantMembership).toHaveBeenCalledWith({name:'test-db'},{uid:'user-a'},'org-a');});
 it('fails closed with generic feedback when lookup is denied',async()=>{vi.mocked(resolveTenantMembership).mockRejectedValue(new Error('permission-denied'));auth(makeUser('user-a'));await flush();const field=host.querySelector('input[placeholder="Enter organisation ID"]') as HTMLInputElement;change(field,'org-a');await flush();submit(field.closest('form')!);await flush();expect(host.querySelector('[role="alert"]')?.textContent).toContain('Membership could not be verified.');expect(host.textContent).not.toContain('Role:');});
 it('discards pending results when the organisation locator changes',async()=>{let finish!:(v:{uid:string;orgId:string;role:'owner';status:'active'})=>void;vi.mocked(resolveTenantMembership).mockReturnValue(new Promise(resolve=>{finish=resolve;}));auth(makeUser('user-a'));await flush();const field=host.querySelector('input[placeholder="Enter organisation ID"]') as HTMLInputElement;change(field,'org-a');await flush();submit(field.closest('form')!);await flush();change(field,'org-b');await flush();await act(async()=>finish({uid:'user-a',orgId:'org-a',role:'owner',status:'active'}));expect(host.textContent).not.toContain('Verified active membership');});
 it('clears membership on account switch and sign-out',async()=>{vi.mocked(resolveTenantMembership).mockResolvedValue({uid:'user-a',orgId:'org-a',role:'admin',status:'active'});auth(makeUser('user-a'));await flush();let field=host.querySelector('input[placeholder="Enter organisation ID"]') as HTMLInputElement;change(field,'org-a');await flush();submit(field.closest('form')!);await flush();expect(host.textContent).toContain('Role: admin');auth(makeUser('user-b'));await flush();expect(host.textContent).not.toContain('Role: admin');field=host.querySelector('input[placeholder="Enter organisation ID"]') as HTMLInputElement;expect(field.value).toBe('');change(field,'org-b');await flush();submit(field.closest('form')!);await flush();expect(host.textContent).toContain('Role: admin');button('Sign out').click();await flush();expect(host.textContent).not.toContain('Role: admin');expect(host.textContent).toContain('Continue as Demo Guest');expect(resolveTenantMembership).toHaveBeenCalledTimes(2);});
});
