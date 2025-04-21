import type { ArtistInterface } from '$lib/server/common';
import { insertTable } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import { isAuthorized } from '$lib/server/apiAuth';
import { auth_code } from '$env/static/private';
import type { QueryResult } from 'pg';

export async function POST({ request, cookies }) {
	// Check Authorization
	const pafeAuth = cookies.get('pafe_auth');

	if (!request.headers.has('Authorization')) {
		return json({ result: 'error', reason: 'Unauthorized' }, { status: 401 });
	}

	if (pafeAuth != auth_code && !isAuthorized(request.headers.get('Authorization'))) {
		return json({ result: 'error', reason: 'Unauthorized' }, { status: 403 });
	}

	const { full_name, role, years_active, alias } = await request.json();
	const artist: ArtistInterface = {
		id: null,
		full_name: full_name,
		role: role,
		years_active: years_active,
		notes: alias
	};

	if (!artist.full_name || !artist.years_active) {
		return json({ result: 'error', reason: 'Missing Field' }, { status: 400 });
	} else {
		let result: QueryResult;
		try {
			result = await insertTable('artist', artist);
		} catch {
			return json({ result: 'error', reason: 'Failed to process the request' }, { status: 500 });
		}
		if (result.rowCount != null && result.rowCount > 0) {
			return json({ id: result.rows[0].id }, { status: 201 });
		} else {
			return json({ result: 'error', reason: 'Update Failed' }, { status: 500 });
		}
	}
}
