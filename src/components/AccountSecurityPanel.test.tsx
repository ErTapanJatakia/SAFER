import React, {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {JSDOM} from 'jsdom';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {AccountSecurityPanel} from './AccountSecurityPanel';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  reload,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
} from 'firebase/auth';
import * as sessionInvalidation from '../lib/sessionInvalidation';

vi.mock('firebase/auth', () => ({
  EmailAuthProvider: {credential: vi.fn(() => ({providerId:'password'}))},
  GoogleAuthProvider: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  reauthenticateWithPopup: vi.fn(),
  reload: vi.fn(),
  updatePassword: vi.fn(),
  updateProfile: vi.fn(),
  verifyBeforeUpdateEmail: vi.fn(),
}));
vi.mock('../lib/sessionInvalidation', () => ({publishSessionInvalidation: vi.fn()}));

let dom:JSDOM, host:HTMLElement, root:Root;
const makeUser=(providers:string[]=['password'])=>({
  uid:'user-a',email:'user-a@example.test',displayName:'Existing User',
  providerData:providers.map(providerId=>({providerId})),
  reload:vi.fn(),
}) as any;
const input=(label:string)=>[...host.querySelectorAll('label')].find(node=>node.textContent?.includes(label))?.querySelector('input') as HTMLInputElement;
const change=(el:HTMLInputElement,value:string)=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;if(setter)setter.call(el,value);el.dispatchEvent(new dom.window.Event('input',{bubbles:true}));el.dispatchEvent(new dom.window.Event('change',{bubbles:true}));};
const submit=(heading:string)=>{const form=[...host.querySelectorAll('form')].find(node=>node.textContent?.includes(heading)) as HTMLFormElement;form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));};
const flush=async()=>{await act(async()=>{await Promise.resolve();await Promise.resolve();});};
let user:any;
beforeEach(async()=>{
 dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost'});
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,HTMLInputElement:dom.window.HTMLInputElement,Event:dom.window.Event,IS_REACT_ACT_ENVIRONMENT:true});
 host=document.createElement('div');document.body.append(host);root=createRoot(host);user=makeUser();
 await act(async()=>root.render(<AccountSecurityPanel user={user}/>));
});
afterEach(async()=>{await act(async()=>root.unmount());dom.window.close();vi.clearAllMocks();});

describe('authenticated account security lifecycle',()=>{
 it('updates the display name and refreshes the Firebase user',async()=>{
  change(input('Display name'),'Updated Operator');submit('Save profile');await flush();
  expect(updateProfile).toHaveBeenCalledWith(user,{displayName:'Updated Operator'});
  expect(reload).toHaveBeenCalledWith(user);
  expect(host.textContent).toContain('Display name updated.');
  expect(sessionInvalidation.publishSessionInvalidation).toHaveBeenCalledTimes(1);
 });
 it('rejects weak passwords without attempting re-authentication',async()=>{
  change(input('Current password'),'CurrentPass!123');change(input('New password'),'short');change(input('Confirm new password'),'short');
  submit('Change password');await flush();
  expect(host.textContent).toContain('12–128 characters');
  expect(reauthenticateWithCredential).not.toHaveBeenCalled();
  expect(updatePassword).not.toHaveBeenCalled();
 });
 it('reauthenticates email/password users before changing passwords',async()=>{
  change(input('Current password'),'CurrentPass!123');
  change(input('New password'),'NewSecurePass!456');
  change(input('Confirm new password'),'NewSecurePass!456');
  submit('Change password');await flush();
  expect(EmailAuthProvider.credential).toHaveBeenCalledWith(user.email,'CurrentPass!123');
  expect(reauthenticateWithCredential).toHaveBeenCalledTimes(1);
  expect(updatePassword).toHaveBeenCalledWith(user,'NewSecurePass!456');
  expect(host.textContent).toContain('Password updated.');
 });
 it('does not change the password if re-authentication fails',async()=>{
  vi.mocked(reauthenticateWithCredential).mockRejectedValueOnce({code:'auth/wrong-password'});
  change(input('Current password'),'WrongPass!123');change(input('New password'),'NewSecurePass!456');change(input('Confirm new password'),'NewSecurePass!456');
  submit('Change password');await flush();
  expect(updatePassword).not.toHaveBeenCalled();
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('verification details were not accepted');
 });
 it('uses Google popup re-authentication for Google-only email changes',async()=>{
  user=makeUser(['google.com']);
  await act(async()=>root.render(<AccountSecurityPanel user={user}/>));
  change(input('New email address'),'new-address@example.test');submit('Change email address');await flush();
  expect(reauthenticateWithPopup).toHaveBeenCalledTimes(1);
  expect(reauthenticateWithCredential).not.toHaveBeenCalled();
  expect(verifyBeforeUpdateEmail).toHaveBeenCalledWith(user,'new-address@example.test');
  expect(host.textContent).toContain('verification link has been sent');
 });
 it('reauthenticates password users before requesting a verified email change',async()=>{
  change(input('Current password'),'CurrentPass!123');
  change(input('New email address'),'new-address@example.test');submit('Change email address');await flush();
  expect(reauthenticateWithCredential).toHaveBeenCalledTimes(1);
  expect(verifyBeforeUpdateEmail).toHaveBeenCalledWith(user,'new-address@example.test');
 });
 it('does not request an email change if re-authentication fails',async()=>{
  vi.mocked(reauthenticateWithCredential).mockRejectedValueOnce({code:'auth/wrong-password'});
  change(input('Current password'),'WrongPass!123');change(input('New email address'),'new-address@example.test');submit('Change email address');await flush();
  expect(verifyBeforeUpdateEmail).not.toHaveBeenCalled();
 });
 it('does not expose password change for Google-only accounts',async()=>{
  user=makeUser(['google.com']);
  await act(async()=>root.render(<AccountSecurityPanel user={user}/>));
  expect(host.textContent).toContain('no email/password provider');
  expect(host.querySelector('button[type="submit"]')).not.toBeNull();
  expect(host.textContent).not.toContain('Current password');
 });
 it('rejects malformed and unchanged email addresses',async()=>{
  change(input('New email address'),'not-an-email');submit('Change email address');await flush();
  expect(verifyBeforeUpdateEmail).not.toHaveBeenCalled();
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('valid new email address');
 });
});
