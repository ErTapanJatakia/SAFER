import {describe,expect,it,vi} from 'vitest';
import {getLocale,isSupportedLocale,localeDirection,translate,SUPPORTED_LOCALES,setLocale,LOCALE_STORAGE_KEY} from './locale';

describe('SAFER locale support',()=>{
  it('supports the complete configured language set',()=>expect(SUPPORTED_LOCALES).toEqual(['en','fr','pl','de','it','tr','es','cs','ru','ar','ur']));
  it('rejects unsupported locale values',()=>{expect(isSupportedLocale('en')).toBe(true);expect(isSupportedLocale('xx')).toBe(false);});
  it('uses English as a safe fallback when browser storage is unavailable',()=>{vi.stubGlobal('window',undefined);expect(getLocale()).toBe('en');vi.unstubAllGlobals();});
  it('marks Arabic and Urdu as right-to-left',()=>{expect(localeDirection('ar')).toBe('rtl');expect(localeDirection('ur')).toBe('rtl');expect(localeDirection('de')).toBe('ltr');});
  it('provides translated labels and falls back to English for missing keys',()=>{expect(translate('login','fr')).toBe('Se connecter');expect(translate('login','en')).toBe('Log In');});
  it('persists locale selection and updates document language and direction',()=>{setLocale('ar');expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('ar');expect(document.documentElement.lang).toBe('ar');expect(document.documentElement.dir).toBe('rtl');setLocale('en');expect(document.documentElement.dir).toBe('ltr');});
});
