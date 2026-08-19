import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { isAbsolute, resolve } from 'node:path';
import type { Provider } from './types.js';
import { resolveWithin } from './utils/path.js';

export const PLUGIN_API_VERSION=1;
export type PluginSlot='provider'|'releasePublisher'|'secretScanner'|'versionSource'|'packagePublisher'|'reviewAnalyzer';
export interface HeadbangPluginManifest { name:string; version:string; apiVersion:number; slots:PluginSlot[]; entry:string }
export interface HeadbangPlugin { manifest:HeadbangPluginManifest; adapters:Partial<Record<PluginSlot,unknown>> }
const SLOTS=new Set<PluginSlot>(['provider','releasePublisher','secretScanner','versionSource','packagePublisher','reviewAnalyzer']);
export async function loadPlugin(specifier:string,base=process.cwd()):Promise<HeadbangPlugin>{const root=isAbsolute(specifier)?resolve(specifier):resolveWithin(base,specifier,'plugin path'),manifestPath=resolveWithin(root,'headbang-plugin.json','plugin manifest');const manifest=JSON.parse(await readFile(manifestPath,'utf8')) as HeadbangPluginManifest;if(manifest.apiVersion!==PLUGIN_API_VERSION)throw new Error(`Plugin '${manifest.name}' requires API ${manifest.apiVersion}; HEADBANG supports ${PLUGIN_API_VERSION}.`);if(!manifest.name||!manifest.version||!manifest.entry||!Array.isArray(manifest.slots)||new Set(manifest.slots).size!==manifest.slots.length||manifest.slots.some(slot=>!SLOTS.has(slot)))throw new Error(`Invalid plugin manifest at ${manifestPath}.`);const entry=resolveWithin(root,manifest.entry,'plugin entry');const loaded=await import(pathToFileURL(entry).href);const plugin=(loaded.default??loaded) as HeadbangPlugin;if(!plugin.adapters||typeof plugin.adapters!=='object')throw new Error(`Plugin '${manifest.name}' does not export an adapters object.`);for(const slot of manifest.slots){const adapter=plugin.adapters[slot];if(adapter===undefined||(typeof adapter!=='object'&&typeof adapter!=='function'))throw new Error(`Plugin '${manifest.name}' does not provide a valid declared slot '${slot}'.`);}return{...plugin,manifest};}
export async function loadPlugins(specifiers:string[]|undefined,base?:string){const plugins=[];for(const specifier of specifiers??[])plugins.push(await loadPlugin(specifier,base));return plugins;}
export class PluginRegistry{
  constructor(readonly plugins:HeadbangPlugin[]){}
  resolve<T=unknown>(slot:PluginSlot,pluginName?:string):T{const matches=this.plugins.filter(plugin=>plugin.manifest.slots.includes(slot)&&(!pluginName||plugin.manifest.name===pluginName));if(!matches.length)throw new Error(`No plugin adapter is registered for slot '${slot}'${pluginName?` and plugin '${pluginName}'`:''}.`);if(matches.length>1&&!pluginName)throw new Error(`Multiple plugins provide slot '${slot}'; select one by name.`);return matches[0]!.adapters[slot] as T;}
}
export async function createPluginRegistry(specifiers:string[]|undefined,base?:string){return new PluginRegistry(await loadPlugins(specifiers,base));}
export interface ProviderPluginAdapter { provider:Provider; capabilities():Record<string,boolean>; }
