import type { APIRoute } from 'astro';
import { jsonResponse, readSession } from '../../../lib/auth';

export const prerender = false;

export const GET: APIRoute = ({ request }) => {
  return jsonResponse(readSession(request));
};
