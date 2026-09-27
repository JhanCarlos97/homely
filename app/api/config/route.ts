import {getChatGPTUser} from '@/app/chatgpt-auth';
import {policy,isAdmin,overrides,failure} from '@/lib/server';
export async function GET(){try{return Response.json({policy:await policy(),admin:isAdmin(await getChatGPTUser()),overrides:await overrides()},{headers:{'Cache-Control':'no-store'}});}catch(e){return failure(e);}}
