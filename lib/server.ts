import {env} from 'cloudflare:workers';
import {database} from '@/db/raw';
import {getChatGPTUser,ChatGPTUser} from '@/app/chatgpt-auth';
import {DEFAULT_POLICY,Policy} from './policy';
export class HttpError extends Error{constructor(message:string,public status=400){super(message);}}
export function isAdmin(user:ChatGPTUser|null){return !!user&&(env.ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean).includes(user.email.toLowerCase());}
export async function identity(admin=false){const user=await getChatGPTUser();if(!user)throw new HttpError('Sign in to continue / Inicia sesión para continuar',401);if(admin&&!isAdmin(user))throw new HttpError('Administrator access required / Acceso de administrador requerido',403);return user;}
export function sameOrigin(request:Request){if(request.headers.get('origin')!==new URL(request.url).origin)throw new HttpError('Invalid origin',403);}
export async function policy():Promise<Policy>{const row:any=await database().prepare('SELECT value FROM settings WHERE key=?').bind('policy').first();return row?JSON.parse(row.value):DEFAULT_POLICY;}
export async function overrides(){const row:any=await database().prepare('SELECT value FROM settings WHERE key=?').bind('providers').first();return row?JSON.parse(row.value):{};}
export function auditStatement(actor:string,action:string,target:string,detail:any){return database().prepare('INSERT INTO audit(id,actor,action,target,detail,created) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),actor,action,target,JSON.stringify(detail),new Date().toISOString());}
export async function log(actor:string,action:string,target:string,detail:any){await auditStatement(actor,action,target,detail).run();}
export function failure(e:unknown){console.error(e);return Response.json({error:e instanceof HttpError?e.message:'Unable to save. Check your input and retry / No se pudo guardar. Revisa los datos e intenta de nuevo.'},{status:e instanceof HttpError?e.status:400});}
export async function compareAndSet(row:any,data:any,actor:string,action:string){const db=database();const r=await db.prepare('UPDATE contracts SET data=?,version=version+1 WHERE id=? AND version=?').bind(JSON.stringify(data),row.id,row.version).run();if(r.meta.changes!==1)throw new HttpError('This project changed. Refresh and retry / El proyecto cambió. Actualiza e intenta de nuevo',409);await log(actor,action,row.id,{from:JSON.parse(row.data).status,to:data.status,version:row.version+1});}
