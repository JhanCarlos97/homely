import {requireChatGPTUser} from '@/app/chatgpt-auth';
import {isAdmin} from '@/lib/server';
import Dashboard from './dashboard';
export const dynamic='force-dynamic';
export default async function AdminPage(){const user=await requireChatGPTUser('/admin');if(!isAdmin(user))return <main><h1>Access restricted / Acceso restringido</h1><p>This dashboard is available to the site administrator only.</p><a href="/">Return to Homely / Volver a Homely</a></main>;return <Dashboard/>;}
