import {describe,expect,it,vi} from 'vitest';
import {getLocale,isSupportedLocale,localeDirection,translate,SUPPORTED_LOCALES} from './locale';

describe('SAFER locale support',()=>{
  it('supports the complete configured language set',()=>expect(SUPPORTED_LOCALES).toEqual(['en','fr','pl','de','it','tr','es','cs','ru','ar','ur']));
  it('rejects unsupported locale values',()=>{expect(isSupportedLocale('en')).toBe(true);expect(isSupportedLocale('xx')).toBe(false);});
  it('uses English as a safe fallback when browser storage is unavailable',()=>{vi.stubGlobal('window',undefined);expect(getLocale()).toBe('en');vi.unstubAllGlobals();});
  it('marks Arabic and Urdu as right-to-left',()=>{expect(localeDirection('ar')).toBe('rtl');expect(localeDirection('ur')).toBe('rtl');expect(localeDirection('de')).toBe('ltr');});
  it('provides translated labels and falls back to English for missing keys',()=>{expect(translate('login','fr')).toBe('Se connecter');expect(translate('login','en')).toBe('Log In');});
});
