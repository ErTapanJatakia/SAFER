import React, {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {JSDOM} from 'jsdom';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {AuthGate} from './AuthGate';
import {resolveTenantMembership} from '../lib/tenantMembership';
import {onAuthStateChanged,signOut} from 'firebase/auth';

vi.mock('firebase/auth',()=>({GoogleAuthProvider:vi.fn(),createUserWithEmailAndPassword:vi.fn(),onAuthStateChanged:vi.fn(),sendEmailVerification:vi.fn(),sendPasswordResetEmail:vi.fn(),signInWithEmailAndPassword:vi.fn(),signInWithPopup:vi.fn(),signOut:vi.fn()}));
vi.mock('../lib/firebase.ts',()=>({auth:{name:'test-auth'},db:{name:'test-db'},isFirebaseConfigured:true}));
vi.mock('../lib/tenantMembership.ts',()=>({resolveTenantMembership:vi.fn()}));
const makeUser=(uid:string)=>({uid,email:uid+'@example.test',emailVerified:true});
let dom: JSDOM, root:Root, host:HTMLElement, listener:((user:ReturnType<typeof makeUser>|null)=>void)|undefined;
const flush=async()=>{await act(async()=>{await Promise.resolve();await Promise.resolve();});};
const button=(name:string)=>[...host.querySelectorAll('button')].find(b=>b.textContent?.trim()===name) as HTMLButtonElement;
const change=(el:HTMLInputElement,value:string)=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set; if (setter) setter.call(el,value); el.dispatchEvent(new dom.window.Event('input',{bubbles:true}));el.dispatchEvent(new dom.window.Event('change',{bubbles:true}));};
const submit=(form:HTMLFormElement)=>form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
const auth=(user:ReturnType<typeof makeUser>|null)=>{act(()=>listener?.(user));};
beforeEach(async()=>{
 dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost'});
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,HTMLInputElement:dom.window.HTMLInputElement,Event:dom.window.Event,IS_REACT_ACT_ENVIRONMENT:true});
 host=document.createElement('div');document.body.append(host);root=createRoot(host);listener=undefined;
 vi.mocked(onAuthStateChanged).mockImplementation((_auth,cb)=>{listener=cb as typeof listener;listener(null);return vi.fn();});
 vi.mocked(signOut).mockImplementation(async()=>{listener?.(null);});
 await act(async()=>{root.render(<AuthGate><div>App shell</div></AuthGate>);});
 await flush();
});
afterEach(async()=>{await act(async()=>root.unmount());dom.window.close();vi.clearAllMocks();});

describe('AuthGate membership session handling',()=>{
 it('does not resolve membership for Demo Guest',async()=>{button('Continue as Demo Guest').click();await flush();expect(host.textContent).toContain('Demo Guest session');expect(host.querySelector('input[placeholder="Enter organisation ID"]')).toBeNull();expect(resolveTenantMembership).not.toHaveBeenCalled();});
 it('resolves the exact organisation for the authenticated UID',async()=>{vi.mocked(resolveTenantMembership).mockResolvedValue({uid:'user-a',orgId:'org-a',role:'manager',status:'active'});auth(makeUser('user-a'));await flush();const field=host.querySelector('input[placeholder="Enter organisation ID"]') as HTMLInputElement;change(field,'org-a');await flush();submit(field.closest('form')!);await flush();expect(host.textContent).toContain('Verified active membership');expect(host.textContent).toContain('Role: manager');expect(resolveTenantMembership).toHaveBeenCalledWith({name:'test-db'},{uid:'user-a'},'org-a');});
 it('fails closed with generic feedback when lookup is denied',async()=>{vi.mocked(resolveTenantMembership).mockRejectedValue(new Error('permission-denied'));auth(makeUser('user-a'));await flush();const field=host.querySelector('input[placeholder="Enter organisation ID"]') as HTMLInputElement;change(field,'org-a');await flush();submit(field.closest('form')!);await flush();expect(host.querySelector('[role="alert"]')?.textContent).toContain('Membership could not be verified.');expect(host.textContent).not.toContain('Role:');});
 it('discards pending results when the organisation locator changes',async()=>{let finish!:(v:{uid:string;orgId:string;role:'owner';status:'active'})=>void;vi.mocked(resolveTenantMembership).mockReturnValue(new Promise(resolve=>{finish=resolve;}));auth(makeUser('user-a'));await flush();const field=host.querySelector('input[placeholder="Enter organisation ID"]') as HTMLInputElement;change(field,'org-a');await flush();submit(field.closest('form')!);await flush();change(field,'org-b');await flush();await act(async()=>finish({uid:'user-a',orgId:'org-a',role:'owner',status:'active'}));expect(host.textContent).not.toContain('Verified active membership');});
 it('clears membership on account switch and sign-out',async()=>{vi.mocked(resolveTenantMembership).mockResolvedValue({uid:'user-a',orgId:'org-a',role:'admin',status:'active'});auth(makeUser('user-a'));await flush();let field=host.querySelector('input[placeholder="Enter organisation ID"]') as HTMLInputElement;change(field,'org-a');await flush();submit(field.closest('form')!);await flush();expect(host.textContent).toContain('Role: admin');auth(makeUser('user-b'));await flush();expect(host.textContent).not.toContain('Role: admin');field=host.querySelector('input[placeholder="Enter organisation ID"]') as HTMLInputElement;expect(field.value).toBe('');change(field,'org-b');await flush();submit(field.closest('form')!);await flush();expect(host.textContent).toContain('Role: admin');button('Sign out').click();await flush();expect(host.textContent).not.toContain('Role: admin');expect(host.textContent).toContain('Continue as Demo Guest');expect(resolveTenantMembership).toHaveBeenCalledTimes(2);});
});
